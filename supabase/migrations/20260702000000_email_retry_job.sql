-- ============================================================
-- Migration: Email Retry Job Index
-- Project:   Kish Auto Detailing Services
-- Created:   2026-07-02
-- ============================================================
-- Activates the existing next_retry_at retry column by indexing failed,
-- due email rows for the protected /api/jobs/email-retries cron route.

CREATE INDEX IF NOT EXISTS idx_email_notifications_failed_due
  ON public.email_notifications (next_retry_at)
  WHERE status = 'failed' AND next_retry_at IS NOT NULL;

UPDATE public.email_notifications
SET next_retry_at = now()
WHERE status = 'failed'
  AND next_retry_at IS NULL
  AND retry_count < 8;
