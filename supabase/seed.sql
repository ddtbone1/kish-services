-- ============================================================
-- Seed: Kish Home Services Detailing
-- Purpose: Seed services and add-ons for development/staging
-- Added:   2026-05-21
-- ============================================================
-- NOTE: Update prices to match your actual pricing before
-- applying to production.
-- ============================================================

-- ─── Services ─────────────────────────────────────────────────────────────────

INSERT INTO services (id, name, description, price, duration_minutes, is_active) VALUES
  (
    gen_random_uuid(),
    'Interior Detailing',
    'Deep clean for a fresh feel. Vacuuming, upholstery wipe-down, dashboard polish, and window cleaning throughout the cabin.',
    800.00,
    90,
    true
  ),
  (
    gen_random_uuid(),
    'Lens Restoration',
    'Clearer headlights, safer driving. Removes oxidation and yellowing from headlight lenses for improved visibility.',
    500.00,
    45,
    true
  ),
  (
    gen_random_uuid(),
    'Buffing',
    'Restore shine and remove swirl marks. Machine polishing to eliminate light scratches and restore your paint''s gloss.',
    1500.00,
    120,
    true
  ),
  (
    gen_random_uuid(),
    'Back to Zero Odor / Disinfection',
    'Eliminate bad odors and bacteria for a healthier car. Ozone or enzyme treatment to neutralise odors and sanitise surfaces.',
    800.00,
    60,
    true
  );

-- ─── Add-ons ──────────────────────────────────────────────────────────────────

INSERT INTO add_ons (id, name, description, price, is_active) VALUES
  (
    gen_random_uuid(),
    'Engine Bay Cleaning',
    'Degrease and rinse the engine bay for a clean, detailed look under the hood.',
    400.00,
    true
  ),
  (
    gen_random_uuid(),
    'Tire Dressing',
    'Rejuvenate and protect tires with a long-lasting dressing for a showroom-ready finish.',
    250.00,
    true
  ),
  (
    gen_random_uuid(),
    'Ceramic Coating (Basic)',
    'Entry-level hydrophobic ceramic coating for paint protection and enhanced gloss.',
    2000.00,
    true
  );
