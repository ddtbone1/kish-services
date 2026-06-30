-- ============================================================
-- Migration: Booking consent & on-site safety fields
-- Project:   Kish Auto Detailing Services
-- Created:   2026-06-30
-- ============================================================
-- Phase 2 (consent & terms) + Phase 3 (on-site safety) of the compliance
-- roadmap. Adds recorded consent (which policy version, and when) plus
-- structured site-readiness data so the owner can judge feasibility.
--
-- All new columns are nullable/defaulted — existing bookings stay valid.
-- The create_booking() RPC gains matching params (appended, DEFAULT NULL) and
-- stamps customer_consent_at server-side when consent versions are provided.
-- ============================================================

-- ─── 1. Additive columns (backward-compatible) ────────────────────────────────
ALTER TABLE bookings
  -- Consent (Phase 2)
  ADD COLUMN IF NOT EXISTS privacy_notice_version        text,
  ADD COLUMN IF NOT EXISTS terms_version                 text,
  ADD COLUMN IF NOT EXISTS customer_consent_at           timestamptz,
  ADD COLUMN IF NOT EXISTS transactional_contact_consent boolean NOT NULL DEFAULT false,
  -- On-site safety (Phase 3)
  ADD COLUMN IF NOT EXISTS vehicle_type        text,
  ADD COLUMN IF NOT EXISTS vehicle_details     text,
  ADD COLUMN IF NOT EXISTS parking_available   boolean,
  ADD COLUMN IF NOT EXISTS water_available     boolean,
  ADD COLUMN IF NOT EXISTS electric_available  boolean,
  ADD COLUMN IF NOT EXISTS access_instructions text,
  ADD COLUMN IF NOT EXISTS site_safety_notes   text;

COMMENT ON COLUMN bookings.transactional_contact_consent IS
  'Booking implies consent to lifecycle (transactional) emails; set true by the server. Marketing consent is intentionally not collected.';
COMMENT ON COLUMN bookings.water_available IS
  'Tri-state: true=yes, false=no, NULL=not sure / not provided.';
COMMENT ON COLUMN bookings.electric_available IS
  'Tri-state: true=yes, false=no, NULL=not sure / not provided.';

-- ─── 2. Recreate create_booking() with consent + site params ──────────────────
-- The arg count changes, so we DROP the exact prior 10-arg signature first to
-- avoid creating an ambiguous overload ("function is not unique"). New params
-- are appended with DEFAULT NULL and consent values are stamped server-side.
DROP FUNCTION IF EXISTS create_booking(
  uuid, uuid[], uuid[], text, text, text, text, text, text, text
);

CREATE FUNCTION create_booking(
  p_slot_id        uuid,
  p_service_ids    uuid[],
  p_add_on_ids     uuid[],
  p_customer_name  text,
  p_customer_email text,
  p_customer_phone text,
  p_address_line1  text,
  p_address_line2  text,
  p_city           text,
  p_notes          text,
  p_privacy_notice_version        text    DEFAULT NULL,
  p_terms_version                 text    DEFAULT NULL,
  p_transactional_contact_consent boolean DEFAULT false,
  p_vehicle_type        text    DEFAULT NULL,
  p_vehicle_details     text    DEFAULT NULL,
  p_parking_available   boolean DEFAULT NULL,
  p_water_available     boolean DEFAULT NULL,
  p_electric_available  boolean DEFAULT NULL,
  p_access_instructions text    DEFAULT NULL,
  p_site_safety_notes   text    DEFAULT NULL
)
RETURNS bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot      availability_slots%ROWTYPE;
  v_booking   bookings%ROWTYPE;
  v_requested integer;
  v_found     integer;
BEGIN
  -- 1. Lock the slot row FOR UPDATE. This serializes concurrent create_booking
  --    calls for the same slot, so the occupancy check below is race-free.
  SELECT * INTO v_slot
  FROM availability_slots
  WHERE id = p_slot_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Selected slot was not found' USING ERRCODE = 'PT409';
  END IF;

  IF v_slot.is_blocked THEN
    RAISE EXCEPTION 'Selected slot is no longer available' USING ERRCODE = 'PT409';
  END IF;

  -- Future check uses Asia/Manila wall-clock (the business timezone).
  IF (v_slot.date + v_slot.start_time) <= (now() AT TIME ZONE 'Asia/Manila') THEN
    RAISE EXCEPTION 'Selected slot is in the past' USING ERRCODE = 'PT409';
  END IF;

  -- 2. Reject if an active booking already occupies this slot.
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE slot_id = p_slot_id
      AND status IN ('pending', 'confirmed', 'on_the_way', 'completed')
  ) THEN
    RAISE EXCEPTION 'Selected slot has already been reserved' USING ERRCODE = 'PT409';
  END IF;

  -- 3. Validate services: every requested id must exist, be active, and be
  --    free of duplicates (distinct count must match the rows we can match).
  IF p_service_ids IS NULL OR array_length(p_service_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'At least one service is required' USING ERRCODE = 'PT422';
  END IF;

  v_requested := (SELECT count(DISTINCT u) FROM unnest(p_service_ids) AS u);
  IF v_requested <> array_length(p_service_ids, 1) THEN
    RAISE EXCEPTION 'Duplicate services are not allowed' USING ERRCODE = 'PT422';
  END IF;

  SELECT count(*) INTO v_found
  FROM services
  WHERE id = ANY(p_service_ids) AND is_active = true;

  IF v_found <> v_requested THEN
    RAISE EXCEPTION 'One or more selected services are unavailable' USING ERRCODE = 'PT422';
  END IF;

  -- 4. Validate add-ons (optional).
  IF p_add_on_ids IS NOT NULL AND array_length(p_add_on_ids, 1) IS NOT NULL THEN
    v_requested := (SELECT count(DISTINCT u) FROM unnest(p_add_on_ids) AS u);
    IF v_requested <> array_length(p_add_on_ids, 1) THEN
      RAISE EXCEPTION 'Duplicate add-ons are not allowed' USING ERRCODE = 'PT422';
    END IF;

    SELECT count(*) INTO v_found
    FROM add_ons
    WHERE id = ANY(p_add_on_ids) AND is_active = true;

    IF v_found <> v_requested THEN
      RAISE EXCEPTION 'One or more selected add-ons are unavailable' USING ERRCODE = 'PT422';
    END IF;
  END IF;

  -- 5. Insert the booking header. The partial unique index is the final
  --    backstop: a concurrent winner would make this raise 23505.
  --    customer_consent_at is stamped here (server-trusted) when both policy
  --    versions were provided — i.e. the customer accepted Terms & Privacy.
  INSERT INTO bookings (
    reference_token, slot_id, customer_name, customer_email, customer_phone,
    address_line1, address_line2, city, notes, status,
    privacy_notice_version, terms_version, customer_consent_at,
    transactional_contact_consent,
    vehicle_type, vehicle_details, parking_available, water_available,
    electric_available, access_instructions, site_safety_notes
  ) VALUES (
    gen_random_uuid()::text, p_slot_id, p_customer_name, p_customer_email,
    p_customer_phone, p_address_line1, p_address_line2, p_city, p_notes, 'pending',
    p_privacy_notice_version, p_terms_version,
    CASE
      WHEN p_privacy_notice_version IS NOT NULL AND p_terms_version IS NOT NULL
      THEN now()
      ELSE NULL
    END,
    COALESCE(p_transactional_contact_consent, false),
    p_vehicle_type, p_vehicle_details, p_parking_available, p_water_available,
    p_electric_available, p_access_instructions, p_site_safety_notes
  )
  RETURNING * INTO v_booking;

  -- 6. Insert booking_items with snapshotted prices (distinct active services).
  INSERT INTO booking_items (booking_id, service_id, price_at_booking)
  SELECT v_booking.id, s.id, s.price
  FROM services s
  WHERE s.id = ANY(p_service_ids) AND s.is_active = true;

  -- 7. Insert booking_add_ons with snapshotted prices, if any.
  IF p_add_on_ids IS NOT NULL AND array_length(p_add_on_ids, 1) IS NOT NULL THEN
    INSERT INTO booking_add_ons (booking_id, add_on_id, price_at_booking)
    SELECT v_booking.id, a.id, a.price
    FROM add_ons a
    WHERE a.id = ANY(p_add_on_ids) AND a.is_active = true;
  END IF;

  RETURN v_booking;
END;
$$;

-- ─── 3. Grants (dropped with the function above; re-grant the new signature) ───
GRANT EXECUTE ON FUNCTION create_booking(
  uuid, uuid[], uuid[], text, text, text, text, text, text, text,
  text, text, boolean, text, text, boolean, boolean, boolean, text, text
) TO anon, authenticated, service_role;
