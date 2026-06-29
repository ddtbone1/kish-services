-- ============================================================
-- Migration: Align active catalog and future booking slots
-- Project:   Kish Auto Detailing Services
-- Created:   2026-06-29
-- ============================================================
-- The customer-facing catalog now contains only the four core services:
-- Interior Detailing, Lens Restoration, Buffing, and Back to Zero Odor /
-- Disinfection. Add-on tables are retained for historical compatibility, but
-- existing add-on rows are deactivated so they no longer appear anywhere that
-- still reads active add-ons.
--
-- The booking date picker allows 90 days, so generate matching future slots.
-- ============================================================

UPDATE add_ons
SET is_active = false,
    updated_at = now()
WHERE is_active = true;

SELECT generate_slots_from_templates(CURRENT_DATE, CURRENT_DATE + 89);
