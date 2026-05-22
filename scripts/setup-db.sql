-- ============================================================
-- One-time setup: run this in the Supabase SQL Editor
-- https://supabase.com/dashboard/project/aribqrdakgsruvkfxvmn/sql/new
--
-- What this does:
--   1. Comprehensive GRANT block for service_role and authenticated on all
--      tables (initial migration only granted to anon; FGAK keys need explicit grants)
--   2. Creates the generate_slots_from_templates() SQL function
--   3. Extends email_notifications.type to include admin_booking_alert
--   4. Inserts default Mon–Sat templates (skips if already exist)
--   5. Generates slots for the next 28 days
--   6. Fixes broken/missing anon RLS policies on bookings, booking_items,
--      booking_add_ons (INSERT policies, correct SELECT, cancellation UPDATE)
-- ============================================================

-- ─── 1. Grant privileges ─────────────────────────────────────────────────────
-- The initial migration only granted privileges to the anon Postgres role.
-- With modern FGAK (sb_secret_) keys, service_role must be granted explicitly
-- on every table it touches — it no longer inherits access automatically.
-- authenticated grants are included for completeness (dashboard owner actions).

-- Core booking flow (createBooking, getBookingByToken, cancelBookingByToken)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings        TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_items   TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_add_ons TO service_role;
GRANT SELECT                         ON public.services        TO service_role;
GRANT SELECT                         ON public.add_ons         TO service_role;

-- Email notifications (sendAdminNotification in email.service.ts)
GRANT SELECT, INSERT ON public.email_notifications TO service_role;

-- Availability tables (template management + slot generation)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_templates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_slots     TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_slots     TO authenticated;

-- Dashboard / authenticated owner access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_items   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_add_ons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.add_ons         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faq_entries     TO authenticated;
GRANT SELECT, INSERT                 ON public.email_notifications TO authenticated;

-- ─── 2. Email notifications: full type list ────────────────────────────────
ALTER TABLE email_notifications
  DROP CONSTRAINT IF EXISTS email_notifications_type_check;

ALTER TABLE email_notifications
  ADD CONSTRAINT email_notifications_type_check
  CHECK (type IN (
    'booking_confirmation',
    'booking_confirmed',
    'booking_on_the_way',
    'booking_completed',
    'booking_cancelled',
    'booking_declined',
    'booking_reminder',
    'admin_booking_alert'
  ));

-- ─── 3. Slot generation function ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_slots_from_templates(p_from date, p_to date)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_date        date;
  v_template    record;
  v_slot_start  time;
  v_slot_end    time;
  v_inserted    integer := 0;
BEGIN
  FOR v_date IN
    SELECT d::date
    FROM   generate_series(p_from, p_to, '1 day'::interval) AS d
  LOOP
    FOR v_template IN
      SELECT *
      FROM   availability_templates
      WHERE  is_active    = true
        AND  day_of_week  = EXTRACT(DOW FROM v_date)::integer
    LOOP
      v_slot_start := v_template.start_time;

      WHILE v_slot_start + (v_template.slot_duration_minutes || ' minutes')::interval
            <= v_template.end_time
      LOOP
        v_slot_end := v_slot_start
                    + (v_template.slot_duration_minutes || ' minutes')::interval;

        INSERT INTO availability_slots (date, start_time, end_time)
        VALUES (v_date, v_slot_start, v_slot_end)
        ON CONFLICT (date, start_time) DO NOTHING;

        IF FOUND THEN
          v_inserted := v_inserted + 1;
        END IF;

        v_slot_start := v_slot_end;
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN v_inserted;
END;
$$;

-- ─── 4. Default weekly templates (Mon–Sat, 08:00–17:00, 60-min slots) ─────────
INSERT INTO availability_templates (day_of_week, start_time, end_time, slot_duration_minutes, is_active)
SELECT * FROM (VALUES
  (1, '08:00'::time, '17:00'::time, 60, true),
  (2, '08:00'::time, '17:00'::time, 60, true),
  (3, '08:00'::time, '17:00'::time, 60, true),
  (4, '08:00'::time, '17:00'::time, 60, true),
  (5, '08:00'::time, '17:00'::time, 60, true),
  (6, '08:00'::time, '17:00'::time, 60, true)
) AS v(day_of_week, start_time, end_time, slot_duration_minutes, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM availability_templates t
  WHERE t.day_of_week = v.day_of_week
);

-- ─── 5. Generate slots for the next 28 days ───────────────────────────────────
SELECT generate_slots_from_templates(CURRENT_DATE, CURRENT_DATE + 27);

-- ─── 6. Remove anon RLS policies on bookings ────────────────────────────────
-- All public booking operations use createAdminClient() (service_role) which
-- bypasses RLS entirely. These anon policies were dead code that exposed all
-- booking rows to anyone with the public anon key via the REST API.
DROP POLICY IF EXISTS "Public can read bookings by reference token" ON public.bookings;
DROP POLICY IF EXISTS "Public can read own booking"                  ON public.bookings;
DROP POLICY IF EXISTS "Anyone can create a booking"                  ON public.bookings;
DROP POLICY IF EXISTS "Customers can cancel own booking"             ON public.bookings;

-- Remove anon INSERT policies on booking line-item tables — all inserts go
-- through createAdminClient() (service_role) which bypasses RLS entirely.
DROP POLICY IF EXISTS "Anyone can insert booking items"    ON public.booking_items;
DROP POLICY IF EXISTS "Anyone can insert booking add-ons" ON public.booking_add_ons;

-- Tighten over-broad SELECT policies that exposed every customer's line items
-- to any anonymous user.  The admin client now handles all public reads, so
-- anon SELECT on these tables is not needed.
DROP POLICY IF EXISTS "Public can read booking items"    ON public.booking_items;
DROP POLICY IF EXISTS "Public can read booking add-ons" ON public.booking_add_ons;

