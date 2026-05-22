-- ============================================================
-- Migration: Security Hardening
-- Project:   Kish Auto Detailing Services
-- Created:   2026-05-22
-- ============================================================
-- Changes:
--   1. Add missing email notification types to CHECK constraint
--   2. Drop unused anon RLS policies on bookings
--      (app uses service_role / createAdminClient for all public booking ops —
--       these policies were dead code that exposed all booking rows to the anon key)
-- ============================================================

-- ─── 1. Fix email_notifications.type CHECK constraint ────────────────────────
-- Original constraint (migration 000) only had 5 values.
-- Migration 002 added admin_booking_alert.
-- This migration adds booking_on_the_way and booking_completed.

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

-- ─── 2. Drop unused anon RLS policies on bookings ────────────────────────────
-- All public booking operations (createBooking, getBookingByToken,
-- cancelBookingByToken) use createAdminClient() which bypasses RLS entirely.
-- These anon policies were never exercised by the application but allowed
-- anyone with the anon key to enumerate all booking rows via the REST API.

DROP POLICY IF EXISTS "Public can read bookings by reference token" ON bookings;
DROP POLICY IF EXISTS "Public can read own booking"                  ON bookings;
DROP POLICY IF EXISTS "Anyone can create a booking"                  ON bookings;
DROP POLICY IF EXISTS "Customers can cancel own booking"             ON bookings;
