-- ============================================================
-- Migration: Replace legacy content-image-split + overlap-image-section
-- with immersive-content-visual
-- ============================================================

START TRANSACTION;

-- Ensure new component exists and is active.
UPDATE components
SET is_active = 1
WHERE slug = 'immersive-content-visual';

-- Migrate existing page components using legacy slugs.
-- Note: assumes page_components.content is JSON.
UPDATE page_components pc
JOIN components legacy ON legacy.id = pc.component_id
JOIN components modern ON modern.slug = 'immersive-content-visual'
SET
  pc.component_id = modern.id,
  pc.content = CASE
    WHEN legacy.slug = 'content-image-split' THEN
      JSON_SET(
        JSON_REMOVE(pc.content, '$.imagePosition', '$.backgroundColor'),
        '$.variant', 'editorial-split',
        '$.theme', 'default',
        '$.imagePlacement', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(pc.content, '$.imagePosition')), 'right')
      )
    WHEN legacy.slug = 'overlap-image-section' THEN
      JSON_SET(
        JSON_REMOVE(pc.content, '$.introText', '$.bulletPoints', '$.bottomDivider', '$.overlapAmount', '$.backgroundColor'),
        '$.variant', 'cinematic-overlap',
        '$.theme', IF(
          COALESCE(JSON_UNQUOTE(JSON_EXTRACT(pc.content, '$.theme')), '') = 'teal',
          'accent',
          'default'
        ),
        '$.leadText', COALESCE(JSON_UNQUOTE(JSON_EXTRACT(pc.content, '$.introText')), ''),
        '$.highlights', COALESCE(JSON_EXTRACT(pc.content, '$.bulletPoints'), JSON_ARRAY()),
        '$.overlapDepth', COALESCE(JSON_EXTRACT(pc.content, '$.overlapAmount'), 64),
        '$.imagePlacement', IF(
          COALESCE(JSON_UNQUOTE(JSON_EXTRACT(pc.content, '$.imagePlacement')), 'right') = 'center',
          'right',
          COALESCE(JSON_UNQUOTE(JSON_EXTRACT(pc.content, '$.imagePlacement')), 'right')
        )
      )
    ELSE pc.content
  END
WHERE legacy.slug IN ('content-image-split', 'overlap-image-section');

-- Deactivate legacy components after migration.
UPDATE components
SET is_active = 0
WHERE slug IN ('content-image-split', 'overlap-image-section');

COMMIT;
