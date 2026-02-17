-- ============================================================
-- Component Versions — add version field for styling variants
-- Run after schema_phase6.sql and seed_components_v2.sql
--
-- Adds a "version" enum to schema_fields for components that
-- support multiple visual styles. The editor renders this as
-- an A/B button group in the component edit form.
-- ============================================================

-- HeroSection: default (current) | minimal (tighter, no overlay) | split (text left, image right)
UPDATE components
SET schema_fields = JSON_SET(
  schema_fields,
  '$.version',
  JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('default', 'minimal', 'split'), 'default', 'default')
)
WHERE slug = 'hero-section';

-- StatsBanner: cards (Saren-style with cards) | inline (simple horizontal row)
UPDATE components
SET schema_fields = JSON_SET(
  schema_fields,
  '$.version',
  JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('cards', 'inline'), 'default', 'cards')
)
WHERE slug = 'stats-banner';

-- CtaSection: default | minimal (headline + button only, compact)
UPDATE components
SET schema_fields = JSON_SET(
  schema_fields,
  '$.version',
  JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('default', 'minimal'), 'default', 'default')
)
WHERE slug = 'cta-section';
