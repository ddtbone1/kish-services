-- ============================================================
-- Migration: Booking & Slot Integrity (Phase 1)
-- Project:   Kish Auto Detailing Services
-- Created:   2026-06-24
-- ============================================================
-- Guarantees, at the database level, that:
--   1. A slot can be held by at most ONE active booking at a time.
--   2. Booking creation is atomic — booking + items + add-ons all succeed
--      or nothing is written (full rollback on any failure).
--   3. Public availability never shows blocked, past, or reserved slots.
--   4. Concurrent attempts to book the same slot are serialized and only
--      one wins (the rest receive a conflict error).
--
-- Scheduling model (DECISION — documented here as the source of truth):
--   A booking occupies EXACTLY ONE availability slot. The slot's fixed
--   duration (from availability_templates) is the unit of scheduling.
--   When a customer selects multiple services/add-ons, they are all
--   performed within that single slot. Each service's `duration_minutes`
--   is informational (display / estimation) and does NOT cause a booking
--   to span multiple slots. If per-service durations should ever drive
--   multi-slot reservations, that is a separate, larger change.
--
-- Slot occupancy (DECISION):
--   Statuses that OCCUPY a slot: pending, confirmed, on_the_way, completed.
--   Statuses that RELEASE a slot: cancelled, declined.
--   (A completed booking really happened, so it keeps the slot occupied;
--    cancelled/declined free the slot for re-booking.)
-- ============================================================

-- ─── 1. DB-level double-booking guard ─────────────────────────────────────────
-- Partial unique index: at most one OCCUPYING booking per slot. cancelled/
-- declined rows are excluded, so a released slot can be booked again.
-- This is the ultimate backstop even if application logic is bypassed.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_booking_per_slot
  ON bookings (slot_id)
  WHERE status IN ('pending', 'confirmed', 'on_the_way', 'completed');

-- ─── 2. Atomic booking creation ───────────────────────────────────────────────
-- Validates the slot and all line items, then inserts the booking header,
-- booking_items, and booking_add_ons in a single transaction. Any RAISE
-- aborts the whole function, rolling back every insert.
--
-- Error signalling (mapped to HTTP status in the service/API layer):
--   SQLSTATE 'PT409' — slot is unavailable (missing / blocked / past / taken) → 409
--   SQLSTATE 'PT422' — services or add-ons are invalid / inactive           → 422
--   SQLSTATE '23505' — unique-index race backstop (treated as conflict)      → 409
--
-- SECURITY DEFINER: runs as the function owner so it can write across the
-- booking tables regardless of the caller's RLS role. search_path is pinned
-- to public to prevent search-path hijacking.
CREATE OR REPLACE FUNCTION create_booking(
  p_slot_id        uuid,
  p_service_ids    uuid[],
  p_add_on_ids     uuid[],
  p_customer_name  text,
  p_customer_email text,
  p_customer_phone text,
  p_address_line1  text,
  p_address_line2  text,
  p_city           text,
  p_notes          text
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
  INSERT INTO bookings (
    reference_token, slot_id, customer_name, customer_email, customer_phone,
    address_line1, address_line2, city, notes, status
  ) VALUES (
    gen_random_uuid()::text, p_slot_id, p_customer_name, p_customer_email,
    p_customer_phone, p_address_line1, p_address_line2, p_city, p_notes, 'pending'
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

-- ─── 3. Public availability (reserved/past/blocked excluded) ──────────────────
-- Returns bookable slots for a date: not blocked, still in the future
-- (Asia/Manila), and not already occupied by an active booking. SECURITY
-- DEFINER lets anon read availability without direct SELECT on bookings
-- (whose RLS hides rows from anon). Single set-based query — no N+1.
CREATE OR REPLACE FUNCTION get_available_slots(p_date date)
RETURNS SETOF availability_slots
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.*
  FROM availability_slots s
  WHERE s.date = p_date
    AND s.is_blocked = false
    AND (s.date + s.start_time) > (now() AT TIME ZONE 'Asia/Manila')
    AND NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.slot_id = s.id
        AND b.status IN ('pending', 'confirmed', 'on_the_way', 'completed')
    )
  ORDER BY s.start_time;
$$;

-- ─── 4. Grants ────────────────────────────────────────────────────────────────
-- Public booking flow runs as anon; owner dashboard as authenticated; server
-- routes as service_role. All three may create bookings / read availability.
GRANT EXECUTE ON FUNCTION create_booking(
  uuid, uuid[], uuid[], text, text, text, text, text, text, text
) TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION get_available_slots(date)
  TO anon, authenticated, service_role;
