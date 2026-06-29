-- ============================================================
-- Migration: Slot Generation from Templates
-- Project:   Kish Auto Detailing Services
-- Created:   2026-05-22
-- ============================================================
-- Adds:
--   1. admin_booking_alert to email_notifications.type check
--   2. generate_slots_from_templates(p_from, p_to) SQL function
--   3. Default weekly templates (Mon–Sat, 08:00–17:00, 60-min slots)
--   4. Seeds availability slots for the next 90 days
-- ============================================================

-- ─── 1. Extend email_notifications type check ─────────────────────────────────
-- Drop the auto-generated check and replace with updated values.
ALTER TABLE email_notifications
  DROP CONSTRAINT IF EXISTS email_notifications_type_check;

ALTER TABLE email_notifications
  ADD CONSTRAINT email_notifications_type_check
  CHECK (type IN (
    'booking_confirmation',
    'booking_confirmed',
    'booking_cancelled',
    'booking_declined',
    'booking_reminder',
    'admin_booking_alert'
  ));

-- ─── 2. Slot generation function ─────────────────────────────────────────────
-- Iterates every date in [p_from, p_to], finds active templates matching that
-- day-of-week, and inserts time slots at slot_duration_minutes increments.
-- Uses ON CONFLICT DO NOTHING so it is safe to call multiple times (idempotent).
-- Returns the count of newly inserted rows.
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
  -- Loop over every calendar day in the requested range
  FOR v_date IN
    SELECT d::date
    FROM   generate_series(p_from, p_to, '1 day'::interval) AS d
  LOOP
    -- Find all active templates matching this day-of-week (0=Sun … 6=Sat)
    FOR v_template IN
      SELECT *
      FROM   availability_templates
      WHERE  is_active    = true
        AND  day_of_week  = EXTRACT(DOW FROM v_date)::integer
    LOOP
      v_slot_start := v_template.start_time;

      -- Walk forward in slot_duration_minutes steps until end_time is reached
      WHILE v_slot_start + (v_template.slot_duration_minutes || ' minutes')::interval
            <= v_template.end_time
      LOOP
        v_slot_end := v_slot_start
                    + (v_template.slot_duration_minutes || ' minutes')::interval;

        INSERT INTO availability_slots (date, start_time, end_time)
        VALUES (v_date, v_slot_start, v_slot_end)
        ON CONFLICT (date, start_time) DO NOTHING;

        -- FOUND is true when INSERT inserted a row (conflict = false)
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

-- ─── 3. Default weekly templates ─────────────────────────────────────────────
-- Monday(1) through Saturday(6), 08:00–17:00, one slot per hour.
-- Sunday(0) is intentionally excluded (closed).
INSERT INTO availability_templates (day_of_week, start_time, end_time, slot_duration_minutes, is_active)
SELECT v.day_of_week, v.start_time, v.end_time, v.slot_duration_minutes, v.is_active
FROM (VALUES
  (1, '08:00'::time, '17:00'::time, 60, true),  -- Monday
  (2, '08:00'::time, '17:00'::time, 60, true),  -- Tuesday
  (3, '08:00'::time, '17:00'::time, 60, true),  -- Wednesday
  (4, '08:00'::time, '17:00'::time, 60, true),  -- Thursday
  (5, '08:00'::time, '17:00'::time, 60, true),  -- Friday
  (6, '08:00'::time, '17:00'::time, 60, true)   -- Saturday
) AS v(day_of_week, start_time, end_time, slot_duration_minutes, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM availability_templates t WHERE t.day_of_week = v.day_of_week
);

-- ─── 5. Grant table privileges ───────────────────────────────────────────────
-- These GRANTs allow the service_role to manage templates/slots from server
-- routes, and authenticated owners to use the dashboard template panel.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_templates TO service_role;
GRANT INSERT, UPDATE, DELETE           ON public.availability_slots     TO authenticated;
GRANT INSERT, UPDATE, DELETE           ON public.availability_slots     TO service_role;

-- ─── 6. Seed slots for the next 90 days (development / staging) ──────────────
-- This makes the booking form immediately usable after running migrations.
SELECT generate_slots_from_templates(CURRENT_DATE, CURRENT_DATE + 89);
