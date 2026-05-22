-- ============================================================
-- Migration: Add booking_items, add_ons, booking_add_ons
-- Project:   Kish Auto Detailing Services
-- Reason:    Bookings now support multiple service packages
--            and optional add-ons per booking.
-- Added:     2026-05-21
-- ============================================================

-- Remove the single service_id from bookings (replaced by booking_items)
ALTER TABLE bookings DROP COLUMN IF EXISTS service_id;

-- ─── add_ons ─────────────────────────────────────────────────────────────────
-- Global add-ons that can be selected on top of any base package.

CREATE TABLE add_ons (
  id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT           NOT NULL,
  description TEXT,
  price       NUMERIC(10, 2) NOT NULL,
  is_active   BOOLEAN        NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ    NOT NULL DEFAULT now()
);

-- ─── booking_items ────────────────────────────────────────────────────────────
-- One row per service/package selected in a booking.
-- price_at_booking snapshots the price so future changes don't affect history.

CREATE TABLE booking_items (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id       UUID           NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
  service_id       UUID           NOT NULL REFERENCES services (id),
  price_at_booking NUMERIC(10, 2) NOT NULL
);

-- ─── booking_add_ons ──────────────────────────────────────────────────────────
-- One row per add-on selected in a booking.
-- price_at_booking snapshots the price so future changes don't affect history.

CREATE TABLE booking_add_ons (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id       UUID           NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
  add_on_id        UUID           NOT NULL REFERENCES add_ons (id),
  price_at_booking NUMERIC(10, 2) NOT NULL
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX idx_booking_items_booking_id    ON booking_items (booking_id);
CREATE INDEX idx_booking_items_service_id    ON booking_items (service_id);
CREATE INDEX idx_booking_add_ons_booking_id  ON booking_add_ons (booking_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE add_ons         ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_add_ons ENABLE ROW LEVEL SECURITY;

-- add_ons: public can read active; owners manage
CREATE POLICY "Public can read active add-ons"
  ON add_ons FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "Owners can manage add-ons"
  ON add_ons FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- booking_items: anonymous can read (service layer filters by booking/token)
CREATE POLICY "Public can read booking items"
  ON booking_items FOR SELECT TO anon
  USING (true);

CREATE POLICY "Owners can manage booking items"
  ON booking_items FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- booking_add_ons: anonymous can read (service layer filters by booking/token)
CREATE POLICY "Public can read booking add-ons"
  ON booking_add_ons FOR SELECT TO anon
  USING (true);

CREATE POLICY "Owners can manage booking add-ons"
  ON booking_add_ons FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ─── Updated_at Trigger ───────────────────────────────────────────────────────

CREATE TRIGGER trg_add_ons_updated_at
  BEFORE UPDATE ON add_ons
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Table-level Grants ───────────────────────────────────────────────────────
-- These tables are created in this migration, so grants belong here.

GRANT SELECT ON public.booking_items    TO anon;
GRANT SELECT ON public.booking_add_ons  TO anon;
GRANT INSERT ON public.booking_items    TO anon;
GRANT INSERT ON public.booking_add_ons  TO anon;
