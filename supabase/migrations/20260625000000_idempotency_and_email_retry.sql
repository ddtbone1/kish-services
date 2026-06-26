-- ============================================================
-- Migration: Idempotency, Email Retry, Dashboard Optimization
-- Project:   Kish Auto Detailing Services
-- Created:   2026-06-25
-- ============================================================
-- Changes:
--   1. idempotency_keys table — prevents duplicate booking submissions
--      on client retry (network timeout / double-tap)
--   2. email_notifications retry columns — tracks SMTP retry attempts
--      with exponential backoff in email.service.ts
--   3. get_booking_counts() SQL function — replaces 8 parallel count
--      queries in getDashboardMetrics() with a single aggregation call
-- ============================================================

-- ─── 1. Idempotency keys ─────────────────────────────────────────────────────
-- Stores the response for any POST /api/bookings request that included an
-- Idempotency-Key header. Keys expire after 24 hours; expired rows are pruned
-- lazily on each lookup (no pg_cron required).

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key           TEXT        NOT NULL UNIQUE,
  body_hash     TEXT        NOT NULL,
  response_body JSONB       NOT NULL,
  status_code   INTEGER     NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_key
  ON idempotency_keys (key);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at
  ON idempotency_keys (expires_at);

ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;
-- All access goes through service_role (createAdminClient). No anon/auth
-- policies are needed — the table is invisible to all non-admin callers.

-- ─── 2. Email notification retry tracking ────────────────────────────────────
-- retry_count: how many SMTP attempts were made (0 = first attempt succeeded)
-- next_retry_at: reserved for future background-queue support; NULL for now
--                (inline retry in email.service.ts does not write this column)

ALTER TABLE email_notifications
  ADD COLUMN IF NOT EXISTS retry_count   INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;

-- Extend the status CHECK to include 'pending' (reserved for future queue use)
ALTER TABLE email_notifications
  DROP CONSTRAINT IF EXISTS email_notifications_status_check;

ALTER TABLE email_notifications
  ADD CONSTRAINT email_notifications_status_check
  CHECK (status IN ('sent', 'failed', 'bounced', 'pending'));

-- ─── 3. Dashboard booking count aggregation function ─────────────────────────
-- Collapses 6+ parallel COUNT(*) queries in getDashboardMetrics() into a
-- single table scan with conditional aggregation. Reduces Supabase API calls
-- from 8 → 2 per dashboard load.
--
-- Parameters:
--   p_start  — UTC start of the Manila calendar day (for completed_today)
--   p_end    — UTC end of the Manila calendar day (for completed_today)

CREATE OR REPLACE FUNCTION get_booking_counts(
  p_start TIMESTAMPTZ,
  p_end   TIMESTAMPTZ
)
RETURNS TABLE (
  pending         BIGINT,
  confirmed       BIGINT,
  on_the_way      BIGINT,
  completed       BIGINT,
  cancelled       BIGINT,
  declined        BIGINT,
  total           BIGINT,
  completed_today BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (WHERE status = 'pending')    AS pending,
    COUNT(*) FILTER (WHERE status = 'confirmed')  AS confirmed,
    COUNT(*) FILTER (WHERE status = 'on_the_way') AS on_the_way,
    COUNT(*) FILTER (WHERE status = 'completed')  AS completed,
    COUNT(*) FILTER (WHERE status = 'cancelled')  AS cancelled,
    COUNT(*) FILTER (WHERE status = 'declined')   AS declined,
    COUNT(*)                                       AS total,
    COUNT(*) FILTER (
      WHERE status = 'completed'
        AND completed_at >= p_start
        AND completed_at  < p_end
    )                                              AS completed_today
  FROM bookings;
$$;

GRANT EXECUTE ON FUNCTION get_booking_counts(TIMESTAMPTZ, TIMESTAMPTZ)
  TO authenticated, service_role;
