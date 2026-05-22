-- ============================================================
-- Migration: Initial Schema
-- Project:   Kish Auto Detailing Services
-- Created:   2026-05-21
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Tables ──────────────────────────────────────────────────────────────────

CREATE TABLE services (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL,
  description      TEXT,
  duration_minutes INTEGER     NOT NULL,
  price            NUMERIC(10, 2) NOT NULL,
  is_active        BOOLEAN     NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE availability_slots (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  date        DATE        NOT NULL,
  start_time  TIME        NOT NULL,
  end_time    TIME        NOT NULL,
  is_blocked  BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (date, start_time)
);

-- Phase 2: slot generation from recurring weekly templates.
-- Schema defined now so the future migration is non-breaking.
CREATE TABLE availability_templates (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week           INTEGER     NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time            TIME        NOT NULL,
  end_time              TIME        NOT NULL,
  slot_duration_minutes INTEGER     NOT NULL,
  is_active             BOOLEAN     NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE faq_entries (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  question   TEXT        NOT NULL,
  answer     TEXT        NOT NULL,
  tags       TEXT[],
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bookings (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_token TEXT        NOT NULL UNIQUE,
  service_id      UUID        NOT NULL REFERENCES services (id),
  slot_id         UUID        NOT NULL REFERENCES availability_slots (id),
  customer_name   TEXT        NOT NULL,
  customer_email  TEXT        NOT NULL,
  customer_phone  TEXT,
  address_line1   TEXT        NOT NULL,
  address_line2   TEXT,
  city            TEXT        NOT NULL,
  notes           TEXT,
  owner_notes     TEXT,                          -- private: never expose in public API responses
  status          TEXT        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'confirmed', 'on_the_way', 'completed', 'cancelled', 'declined')),
  completed_at    TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  declined_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chat_sessions (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id       TEXT           NOT NULL,
  question         TEXT           NOT NULL,
  answer           TEXT           NOT NULL,
  matched_faq_id   UUID           REFERENCES faq_entries (id),
  confidence_score NUMERIC(4, 3)  CHECK (confidence_score BETWEEN 0 AND 1),
  was_escalated    BOOLEAN        NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE TABLE email_notifications (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id          UUID        NOT NULL REFERENCES bookings (id),
  recipient_email     TEXT        NOT NULL,
  type                TEXT        NOT NULL
                      CHECK (type IN ('booking_confirmation', 'booking_confirmed', 'booking_cancelled', 'booking_declined', 'booking_reminder')),
  provider_message_id TEXT,
  status              TEXT        NOT NULL DEFAULT 'sent'
                      CHECK (status IN ('sent', 'failed', 'bounced')),
  error_message       TEXT,
  sent_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX idx_bookings_reference_token    ON bookings (reference_token);
CREATE INDEX idx_bookings_status             ON bookings (status);
CREATE INDEX idx_bookings_slot_id            ON bookings (slot_id);
CREATE INDEX idx_bookings_service_id         ON bookings (service_id);
CREATE INDEX idx_availability_slots_date     ON availability_slots (date);
CREATE INDEX idx_chat_sessions_session_id    ON chat_sessions (session_id);
CREATE INDEX idx_email_notifications_booking ON email_notifications (booking_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE services               ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots     ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq_entries            ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings               ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_notifications    ENABLE ROW LEVEL SECURITY;

-- ─── RLS Policies: services ──────────────────────────────────────────────────

CREATE POLICY "Public can read active services"
  ON services FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "Owners can manage services"
  ON services FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ─── RLS Policies: availability_slots ────────────────────────────────────────

CREATE POLICY "Public can read available slots"
  ON availability_slots FOR SELECT TO anon
  USING (is_blocked = false);

CREATE POLICY "Owners can manage availability slots"
  ON availability_slots FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ─── RLS Policies: availability_templates ────────────────────────────────────

CREATE POLICY "Owners can manage availability templates"
  ON availability_templates FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ─── RLS Policies: faq_entries ───────────────────────────────────────────────

CREATE POLICY "Public can read active FAQ entries"
  ON faq_entries FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "Owners can manage FAQ entries"
  ON faq_entries FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ─── RLS Policies: bookings ──────────────────────────────────────────────────

-- Anonymous users may read bookings only by reference_token.
-- The USING (true) policy permits the row access; the service layer is
-- responsible for always filtering with .eq('reference_token', token).
-- owner_notes is never included in public SELECT column lists (enforced in
-- booking.service.ts — not possible to restrict at column level via RLS).
CREATE POLICY "Public can read bookings by reference token"
  ON bookings FOR SELECT TO anon
  USING (true);

CREATE POLICY "Owners can manage all bookings"
  ON bookings FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ─── RLS Policies: chat_sessions ─────────────────────────────────────────────

CREATE POLICY "Anyone can log a chat session"
  ON chat_sessions FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Owners can read chat sessions"
  ON chat_sessions FOR SELECT TO authenticated
  USING (true);

-- ─── RLS Policies: email_notifications ───────────────────────────────────────

-- INSERT is done via the service role (admin client) which bypasses RLS.
-- Owners can read the log; anonymous users have no access.
CREATE POLICY "Owners can read email notifications"
  ON email_notifications FOR SELECT TO authenticated
  USING (true);

-- ─── Updated_at Trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_faq_entries_updated_at
  BEFORE UPDATE ON faq_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Table-level Grants ───────────────────────────────────────────────────────
-- RLS policies require the underlying GRANT to be present for the anon role.

GRANT SELECT ON public.services         TO anon;
GRANT SELECT ON public.add_ons          TO anon;
GRANT SELECT ON public.faq_entries      TO anon;
GRANT SELECT ON public.bookings         TO anon;
GRANT INSERT ON public.bookings         TO anon;

-- NOTE: booking_items and booking_add_ons are created in migration 001.
-- Their GRANT statements live there, after the tables are defined.
