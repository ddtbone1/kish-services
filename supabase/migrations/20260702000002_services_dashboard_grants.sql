-- ============================================================
-- Migration: Services Dashboard Grants
-- Project:   Kish Auto Detailing Services
-- Created:   2026-07-02
-- ============================================================
-- The services table already has an authenticated owner RLS policy, but the
-- dashboard role also needs table privileges for service/pricing management.

GRANT SELECT, INSERT, UPDATE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;

NOTIFY pgrst, 'reload schema';
