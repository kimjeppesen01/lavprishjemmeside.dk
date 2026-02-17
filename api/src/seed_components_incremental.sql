-- ============================================================
-- seed_components_incremental.sql — HERE AND NOW
--
-- Run this when seed_components_v2.sql has ALREADY been run,
-- and you need to apply the latest component changes only.
--
-- Current scope: overlap-image-section, alternating-feature-list
-- (zigzag removed, overlap module updates)
--
-- Uses JSON_OBJECT() to satisfy schema_fields CHECK constraint.
-- Safe to run multiple times (upsert).
-- ============================================================

INSERT INTO components (
  slug, name_da, category, description_da, tier,
  schema_fields, default_content, doc_path, is_active, sort_order
) VALUES

('overlap-image-section',
 'Overlap Billede Sektion',
 'content',
 'Visuel sektion med overlap. Understøtter introText (centreret) eller kolonne-layout.',
 1,
 JSON_OBJECT(
   'headline', JSON_OBJECT('type', 'string', 'required', true),
   'introText', JSON_OBJECT('type', 'string', 'required', false),
   'content', JSON_OBJECT('type', 'string', 'required', false),
   'bulletPoints', JSON_OBJECT('type', 'array', 'required', false, 'items', JSON_OBJECT('type', 'string')),
   'imageUrl', JSON_OBJECT('type', 'string', 'format', 'image', 'required', true),
   'imageAlt', JSON_OBJECT('type', 'string', 'required', false),
   'imagePlacement', JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('left', 'right', 'center'), 'default', 'right'),
   'overlapAmount', JSON_OBJECT('type', 'number', 'default', 80),
   'theme', JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('teal', 'white'), 'default', 'white'),
   'bottomDivider', JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('none', 'straight'), 'default', 'none'),
   'cta', JSON_OBJECT('type', 'object', 'required', false, 'properties', JSON_OBJECT('text', 'string', 'href', 'string', 'icon', 'string'))
 ),
 JSON_OBJECT(
   'headline', 'Produktionshistorik',
   'introText', 'Se hvordan systemet giver dig overblik.',
   'content', '<p>Med vores platform har du altid fingeren på pulsen.</p>',
   'imageUrl', '',
   'imagePlacement', 'right',
   'overlapAmount', 80,
   'theme', 'teal',
   'bottomDivider', 'none',
   'bulletPoints', JSON_ARRAY('Sikker adgang', 'Sporbarhed online'),
   'cta', JSON_OBJECT('text', 'Se specifikationer', 'href', '/specs', 'icon', 'arrow-right')
 ),
 'overlap-image-section.md',
 1, 51),

('alternating-feature-list',
 'Alternating Feature Liste',
 'content',
 '2-4 overlap-sektioner der flyder sammen som én blok. Teal/hvid skift, billeder overlapper.',
 1,
 JSON_OBJECT(
   'features', JSON_OBJECT(
     'type', 'array',
     'required', true,
     'items', JSON_OBJECT(
       'type', 'object',
       'properties', JSON_OBJECT(
         'headline', 'string',
         'introText', 'string',
         'content', 'string',
         'bulletPoints', JSON_OBJECT('type', 'array', 'items', JSON_OBJECT('type', 'string')),
         'imageUrl', JSON_OBJECT('type', 'string', 'format', 'image'),
         'imageAlt', 'string',
         'cta', JSON_OBJECT('type', 'object', 'properties', JSON_OBJECT('text', 'string', 'href', 'string', 'icon', 'string'))
       )
     )
   ),
   'firstTheme', JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('teal', 'white'), 'default', 'teal'),
   'overlapAmount', JSON_OBJECT('type', 'number', 'default', 80)
 ),
 JSON_OBJECT(
   'features', JSON_ARRAY(
     JSON_OBJECT(
       'headline', 'Produktionsoversigt',
       'introText', 'Se hvordan systemet giver dig overblik.',
       'content', '<p>Med vores platform har du altid fingeren på pulsen.</p>',
       'imageUrl', '',
       'bulletPoints', JSON_ARRAY('Sikker adgang', 'Sporbarhed online'),
       'cta', JSON_OBJECT('text', 'Se specifikationer', 'href', '/specs', 'icon', 'arrow-right')
     ),
     JSON_OBJECT(
       'headline', 'Avanceret rapportering',
       'introText', 'Detaljerede rapporter tilgængelige når det passer dig.',
       'content', '<p>Træk data ud i Excel eller PDF.</p>',
       'imageUrl', '',
       'bulletPoints', JSON_ARRAY('Fleksible filformater', 'Planlagte rapporter'),
       'cta', JSON_OBJECT('text', 'Læs mere', 'href', '/rapporter', 'icon', 'arrow-right')
     )
   ),
   'firstTheme', 'teal',
   'overlapAmount', 80
 ),
 'alternating-feature-list.md',
 1, 53)

ON DUPLICATE KEY UPDATE
  name_da         = VALUES(name_da),
  category        = VALUES(category),
  description_da  = VALUES(description_da),
  tier            = VALUES(tier),
  schema_fields   = VALUES(schema_fields),
  default_content = VALUES(default_content),
  doc_path        = VALUES(doc_path),
  is_active       = VALUES(is_active),
  sort_order      = VALUES(sort_order);
