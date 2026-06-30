-- ============================================================
-- Migration: Compliance Events and Booking Controls
-- Project:   Kish Auto Detailing Services
-- Created:   2026-06-30
-- ============================================================
-- Adds privacy-conscious internal audit events plus lightweight booking control
-- fields used for environmental acknowledgement and cancellation/status reasons.
-- Event payloads should store codes/counts only, not customer PII.
-- ============================================================

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS environmental_ack_version text,
  ADD COLUMN IF NOT EXISTS environmental_ack_at      timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason       text,
  ADD COLUMN IF NOT EXISTS cancellation_policy_version text,
  ADD COLUMN IF NOT EXISTS cancelled_by              text,
  ADD COLUMN IF NOT EXISTS status_reason             text;

ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_cancelled_by_check;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_cancelled_by_check
  CHECK (cancelled_by IS NULL OR cancelled_by IN ('customer', 'owner', 'system'));

CREATE TABLE IF NOT EXISTS public.booking_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  event_type  text NOT NULL,
  actor_type  text NOT NULL DEFAULT 'system',
  actor_id    uuid,
  source      text NOT NULL DEFAULT 'server',
  payload     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_events_booking_created
  ON public.booking_events (booking_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_booking_events_type
  ON public.booking_events (event_type);

ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can read booking events" ON public.booking_events;
CREATE POLICY "Owners can read booking events"
  ON public.booking_events FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Service role can manage booking events" ON public.booking_events;
CREATE POLICY "Service role can manage booking events"
  ON public.booking_events FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT ON public.booking_events TO authenticated;
GRANT ALL ON public.booking_events TO service_role;

NOTIFY pgrst, 'reload schema';
