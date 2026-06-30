-- ============================================================
-- Migration: Dashboard Counts RPC Schema Cache Refresh
-- Project:   Kish Auto Detailing Services
-- Created:   2026-06-30
-- ============================================================
-- Recreates the dashboard count-only RPC with the exact parameter names used by
-- the app and asks PostgREST to reload its schema cache. The function returns
-- aggregate counts only; it does not expose customer personal data.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_booking_counts(
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
    COUNT(*)                                      AS total,
    COUNT(*) FILTER (
      WHERE status = 'completed'
        AND completed_at >= p_start
        AND completed_at <  p_end
    ) AS completed_today
  FROM public.bookings;
$$;

GRANT EXECUTE ON FUNCTION public.get_booking_counts(TIMESTAMPTZ, TIMESTAMPTZ)
  TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
