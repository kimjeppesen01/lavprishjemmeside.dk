-- ============================================================
-- Adds/updates immersive-content-visual component
-- Safe to run multiple times (upsert).
-- ============================================================

INSERT INTO components (
  slug, name_da, category, description_da, tier,
  schema_fields, default_content, doc_path, is_active, sort_order
) VALUES (
  'immersive-content-visual',
  'Immersive Content Visual',
  'content',
  'Langform tekst + visual komponent med split, overlap og lagdelte kort i én sektion.',
  1,
  JSON_OBJECT(
    'headline', JSON_OBJECT('type', 'string', 'required', true),
    'leadText', JSON_OBJECT('type', 'string', 'required', false),
    'content', JSON_OBJECT('type', 'string', 'required', true),
    'imageUrl', JSON_OBJECT('type', 'string', 'format', 'image', 'required', true),
    'imageAlt', JSON_OBJECT('type', 'string', 'required', false),
    'secondaryImageUrl', JSON_OBJECT('type', 'string', 'format', 'image', 'required', false),
    'secondaryImageAlt', JSON_OBJECT('type', 'string', 'required', false),
    'imagePlacement', JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('left', 'right'), 'default', 'right'),
    'variant', JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('editorial-split', 'cinematic-overlap', 'stacked-cards'), 'default', 'cinematic-overlap'),
    'theme', JSON_OBJECT('type', 'string', 'enum', JSON_ARRAY('default', 'accent'), 'default', 'default'),
    'overlapDepth', JSON_OBJECT('type', 'number', 'default', 56),
    'highlights', JSON_OBJECT('type', 'array', 'required', false, 'items', JSON_OBJECT('type', 'string')),
    'visualCards', JSON_OBJECT(
      'type', 'array',
      'required', false,
      'items', JSON_OBJECT(
        'type', 'object',
        'properties', JSON_OBJECT(
          'kicker', 'string',
          'title', 'string',
          'content', 'string'
        )
      )
    ),
    'cta', JSON_OBJECT('type', 'object', 'required', false, 'properties', JSON_OBJECT('text', 'string', 'href', 'string'))
  ),
  JSON_OBJECT(
    'headline', 'Dokumentation med visuel tyngde',
    'leadText', 'Når teksten er længere, skal layoutet skabe rytme og overblik.',
    'content', '<p>Denne komponent kombinerer overlap, dybde og klare fokuszoner for at gøre længere sektioner mere læsbare.</p>',
    'imageUrl', '',
    'imagePlacement', 'right',
    'variant', 'cinematic-overlap',
    'theme', 'accent',
    'overlapDepth', 64,
    'highlights', JSON_ARRAY(
      'Understøtter lange tekstafsnit',
      'Skaber tydelig visuel hierarki',
      'Samler split, overlap og kort i én komponent'
    ),
    'visualCards', JSON_ARRAY(
      JSON_OBJECT('kicker', 'Flow', 'title', 'Narrativ opdeling', 'content', 'Bryder lange sektioner i visuelle blokke.'),
      JSON_OBJECT('kicker', 'Signal', 'title', 'Fokusområder', 'content', 'Fremhæver nøglepunkter uden at bryde læseflowet.')
    ),
    'cta', JSON_OBJECT('text', 'Se løsning', 'href', '/kontakt')
  ),
  'immersive-content-visual.md',
  1,
  54
)
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
