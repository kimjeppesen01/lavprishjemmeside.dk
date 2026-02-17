-- ============================================================
-- seed_components_v2.sql
-- Corrected component seed for schema_phase6 table structure.
--
-- Fixes vs seed_components.sql:
--   - Uses schema_fields      (was: props_schema)
--   - Uses doc_path           (was: docs_content)
--   - Uses default_content    (was: missing)
--   - Uses correct category ENUM: opener | trust | conversion | content | structure
--   - Adds tier, sort_order
--   - Image URL fields tagged with "format":"image" so the editor auto-shows the picker
--
-- Safe to run multiple times (ON DUPLICATE KEY UPDATE).
-- Run in phpMyAdmin SQL tab AFTER schema_phase6.sql.
-- ============================================================

INSERT INTO components
  (slug, name_da, category, description_da, tier, schema_fields, default_content, doc_path, is_active, sort_order)
VALUES

-- ─────────────────────────────────────────────
-- OPENER (1)
-- ─────────────────────────────────────────────
('hero-section',
 'Hero Sektion',
 'opener',
 'Stor overskrift med beskrivelse, CTA-knapper og valgfrit baggrundsbillede',
 1,
 '{"headline":{"type":"string","required":true},"description":{"type":"string","required":true},"primaryCta":{"type":"object","required":false,"properties":{"text":"string","href":"string"}},"secondaryCta":{"type":"object","required":false,"properties":{"text":"string","href":"string"}},"backgroundImage":{"type":"string","format":"image","required":false},"alignment":{"type":"string","enum":["left","center"],"default":"left"}}',
 '{"headline":"Hjemmeside til fast lav pris","description":"Vi bygger professionelle hjemmesider hurtigt og til priser alle kan følge med på.","primaryCta":{"text":"Se priser","href":"/priser"},"secondaryCta":{"text":"Læs mere","href":"/om-os"},"alignment":"left"}',
 'hero-section.md',
 1, 10),

-- ─────────────────────────────────────────────
-- TRUST (4)
-- ─────────────────────────────────────────────
('stats-banner',
 'Statistik Banner',
 'trust',
 'Iøjnefaldende nøgletal og statistikker',
 1,
 '{"stats":{"type":"array","required":true,"items":{"type":"object","properties":{"value":"string","label":"string","icon":"string"}}},"backgroundColor":{"type":"string","enum":["blue","dark","light"],"default":"blue"}}',
 '{"stats":[{"value":"500+","label":"Tilfredse kunder","icon":"⭐"},{"value":"99%","label":"Oppetid","icon":"🚀"},{"value":"24t","label":"Support","icon":"💬"}],"backgroundColor":"blue"}',
 'stats-banner.md',
 1, 20),

('testimonials-carousel',
 'Anmeldelser Karussel',
 'trust',
 'Kundeanmeldelser med fotos og vurderinger',
 1,
 '{"headline":{"type":"string","required":true},"testimonials":{"type":"array","required":true,"items":{"type":"object","properties":{"quote":"string","author":"string","role":"string","company":"string","photo":"string","rating":"number"}}}}',
 '{"headline":"Hvad siger vores kunder?","testimonials":[{"quote":"Fantastisk service og super hurtig levering!","author":"Lars Nielsen","role":"Ejer","company":"Nielsen & Co","photo":"","rating":5},{"quote":"Professionelt resultat til en rigtig god pris.","author":"Maria Jensen","role":"Direktør","company":"Jensen ApS","photo":"","rating":5}]}',
 'testimonials-carousel.md',
 1, 21),

('team-grid',
 'Team Grid',
 'trust',
 'Teammedlemmers kort med fotos og roller',
 1,
 '{"headline":{"type":"string","required":true},"members":{"type":"array","required":true,"items":{"type":"object","properties":{"name":"string","role":"string","photo":"string","bio":"string"}}}}',
 '{"headline":"Mød teamet","members":[{"name":"Kim Jeppesen","role":"Grundlægger & CEO","photo":"","bio":"Passioneret om at gøre professionelt webdesign tilgængeligt for alle"}]}',
 'team-grid.md',
 1, 22),

('logo-cloud',
 'Logo Sky',
 'trust',
 'Grid af kunde- eller partnerlogoer',
 1,
 '{"headline":{"type":"string","required":false},"logos":{"type":"array","required":true,"items":{"type":"object","properties":{"imageUrl":"string","alt":"string","link":"string"}}},"grayscale":{"type":"boolean","default":true}}',
 '{"headline":"Betroet af kendte brands","logos":[{"imageUrl":"","alt":"Kunde 1","link":""},{"imageUrl":"","alt":"Kunde 2","link":""}],"grayscale":true}',
 'logo-cloud.md',
 1, 23),

-- ─────────────────────────────────────────────
-- CONVERSION (5)
-- ─────────────────────────────────────────────
('cta-section',
 'CTA Sektion',
 'conversion',
 'Call-to-action banner med centreret eller split layout',
 1,
 '{"headline":{"type":"string","required":true},"description":{"type":"string","required":true},"ctaButton":{"type":"object","required":true,"properties":{"text":"string","href":"string"}},"backgroundColor":{"type":"string","enum":["blue","dark","light"],"default":"blue"},"layout":{"type":"string","enum":["centered","split"],"default":"centered"}}',
 '{"headline":"Klar til en ny hjemmeside?","description":"Kom i gang i dag og få din side op at køre på ingen tid.","ctaButton":{"text":"Kom i gang","href":"/kontakt"},"layout":"centered","backgroundColor":"blue"}',
 'cta-section.md',
 1, 30),

('pricing-table',
 'Priser Tabel',
 'conversion',
 'Prisniveauer med funktioner og CTA-knapper',
 1,
 '{"headline":{"type":"string","required":true},"tiers":{"type":"array","required":true,"items":{"type":"object","properties":{"name":"string","price":"string","period":"string","features":"array","cta":"object","featured":"boolean"}}}}',
 '{"headline":"Simple, transparente priser","tiers":[{"name":"Basis","price":"2.995","period":"kr/md","features":["5 sider","SSL certifikat","Mobilvenlig"],"cta":{"text":"Kom i gang","href":"/kontakt"},"featured":false},{"name":"Pro","price":"4.995","period":"kr/md","features":["10 sider","SSL certifikat","SEO optimering","Prioritet support"],"cta":{"text":"Vælg Pro","href":"/kontakt"},"featured":true}]}',
 'pricing-table.md',
 1, 31),

('comparison-table',
 'Sammenlignings Tabel',
 'conversion',
 'Side-om-side produkt- eller tjeneste sammenligning',
 1,
 '{"headline":{"type":"string","required":true},"products":{"type":"array","required":true},"features":{"type":"array","required":true},"data":{"type":"array","required":true}}',
 '{"headline":"Sammenlign vores pakker","products":["Basis","Pro","Enterprise"],"features":["Antal sider","SSL","Support","SEO"],"data":[[5,10,"Ubegrænset"],[true,true,true],["Email","Chat","Telefon"],[false,true,true]]}',
 'comparison-table.md',
 1, 32),

('contact-form',
 'Kontaktformular',
 'conversion',
 'Kontaktformular med validering og indsendelse',
 1,
 '{"headline":{"type":"string","required":true},"fields":{"type":"array","required":true,"items":{"type":"object","properties":{"type":"string","name":"string","label":"string","required":"boolean"}}},"submitText":{"type":"string","required":true},"successMessage":{"type":"string","required":true}}',
 '{"headline":"Kontakt os","fields":[{"type":"text","name":"name","label":"Navn","required":true},{"type":"email","name":"email","label":"Email","required":true},{"type":"textarea","name":"message","label":"Besked","required":true}],"submitText":"Send besked","successMessage":"Tak! Vi vender tilbage hurtigst muligt."}',
 'contact-form.md',
 1, 33),

('newsletter-signup',
 'Nyhedsbrev Tilmelding',
 'conversion',
 'E-mail tilmeldingsformular med privatlivserklæring',
 1,
 '{"headline":{"type":"string","required":true},"description":{"type":"string","required":false},"placeholder":{"type":"string","required":false},"buttonText":{"type":"string","required":true},"privacyText":{"type":"string","required":false}}',
 '{"headline":"Tilmeld dig vores nyhedsbrev","description":"Få tips og tricks til din hjemmeside direkte i indbakken","placeholder":"din@email.dk","buttonText":"Tilmeld mig","privacyText":"Vi deler aldrig din email med tredjepart."}',
 'newsletter-signup.md',
 1, 34),

-- ─────────────────────────────────────────────
-- CONTENT (9)
-- ─────────────────────────────────────────────
('features-grid',
 'Funktions Grid',
 'content',
 'Grid af funktioner med ikoner, overskrifter og beskrivelser',
 1,
 '{"headline":{"type":"string","required":true},"description":{"type":"string","required":false},"features":{"type":"array","required":true,"items":{"type":"object","properties":{"icon":"string","title":"string","description":"string"}}},"columns":{"type":"number","enum":[2,3,4],"default":3}}',
 '{"headline":"Vores funktioner","description":"Alt hvad du behøver til din hjemmeside","features":[{"icon":"⚡","title":"Hurtig levering","description":"Din side er klar på få dage"},{"icon":"🎨","title":"Professionelt design","description":"Moderne og indbydende"},{"icon":"📱","title":"Mobilvenlig","description":"Fungerer på alle enheder"}],"columns":3}',
 'features-grid.md',
 1, 40),

('icon-cards',
 'Ikon Kort',
 'content',
 'Kort-baseret layout med ikoner og kort tekst',
 1,
 '{"headline":{"type":"string","required":true},"cards":{"type":"array","required":true,"items":{"type":"object","properties":{"icon":"string","title":"string","description":"string","link":"string"}}},"columns":{"type":"number","enum":[2,3,4],"default":3}}',
 '{"headline":"Vores services","cards":[{"icon":"🌐","title":"Webdesign","description":"Professionelle hjemmesider","link":"/webdesign"},{"icon":"📈","title":"SEO","description":"Bliv fundet på Google","link":"/seo"},{"icon":"📞","title":"Support","description":"Vi er her for dig","link":"/kontakt"}],"columns":3}',
 'icon-cards.md',
 1, 41),

('content-image-split',
 'Indhold-Billede Split',
 'content',
 'Tekstindhold ved siden af et billede med venstre/højre varianter',
 1,
 '{"headline":{"type":"string","required":true},"content":{"type":"string","required":true},"imageUrl":{"type":"string","format":"image","required":true},"imagePosition":{"type":"string","enum":["left","right"],"default":"right"},"backgroundColor":{"type":"string","enum":["white","light","blue"],"default":"white"}}',
 '{"headline":"Hvorfor vælge os?","content":"Vi leverer professionelle hjemmesider til fast lav pris. Ingen overraskelser, ingen skjulte gebyrer.","imageUrl":"https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800","imagePosition":"right","backgroundColor":"white"}',
 'content-image-split.md',
 1, 42),

('video-embed',
 'Video Indlejring',
 'content',
 'Responsiv videospiller med titel og beskrivelse',
 1,
 '{"videoUrl":{"type":"string","required":true},"title":{"type":"string","required":true},"description":{"type":"string","required":false},"thumbnail":{"type":"string","format":"image","required":false},"provider":{"type":"string","enum":["youtube","vimeo"],"default":"youtube"}}',
 '{"videoUrl":"","title":"Se hvordan det virker","description":"En kort gennemgang af vores platform","provider":"youtube"}',
 'video-embed.md',
 1, 43),

('timeline',
 'Tidslinje',
 'content',
 'Vertikal tidslinje for processer eller virksomhedshistorie',
 1,
 '{"headline":{"type":"string","required":true},"events":{"type":"array","required":true,"items":{"type":"object","properties":{"year":"string","title":"string","description":"string"}}}}',
 '{"headline":"Vores historie","events":[{"year":"2020","title":"Grundlagt","description":"Virksomheden blev startet med visionen om billige hjemmesider for alle"},{"year":"2022","title":"500 kunder","description":"Vi nåede 500 tilfredse kunder"},{"year":"2024","title":"Ny platform","description":"Lancering af vores nye AI-drevne platform"}]}',
 'timeline.md',
 1, 44),

('faq-accordion',
 'FAQ Akkordeon',
 'content',
 'Sammenfoldelige FAQ-elementer',
 1,
 '{"headline":{"type":"string","required":true},"faqs":{"type":"array","required":true,"items":{"type":"object","properties":{"question":"string","answer":"string"}}},"defaultOpen":{"type":"number","default":0}}',
 '{"headline":"Ofte stillede spørgsmål","faqs":[{"question":"Hvad koster en hjemmeside?","answer":"Vores priser starter fra 2.995 kr/md med alt inkluderet."},{"question":"Hvor hurtigt er siden klar?","answer":"De fleste sider er klar inden for 5-10 hverdage."},{"question":"Hvad sker der hvis jeg vil afmelde?","answer":"Du kan opsige med 1 måneds varsel uden begrundelse."}],"defaultOpen":0}',
 'faq-accordion.md',
 1, 45),

('gallery-grid',
 'Galleri Grid',
 'content',
 'Billedgalleri med lightbox-understøttelse',
 1,
 '{"images":{"type":"array","required":true,"items":{"type":"object","properties":{"url":"string","alt":"string","caption":"string"}}},"columns":{"type":"number","enum":[2,3,4],"default":3},"lightbox":{"type":"boolean","default":true}}',
 '{"images":[{"url":"https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400","alt":"Billede 1","caption":""},{"url":"https://images.unsplash.com/photo-1551434678-e076c223a692?w=400","alt":"Billede 2","caption":""}],"columns":3,"lightbox":true}',
 'gallery-grid.md',
 1, 46),

('product-carousel',
 'Produkt Karussel',
 'content',
 'Scroll-pinned horisontal karussel — sektion holder sig fast mens slides bevæger sig',
 1,
 '{"slides":{"type":"array","required":true,"items":{"type":"object","properties":{"img":"string","alt":"string","caption":"string"}}},"heading":{"type":"string","required":false}}',
 '{"slides":[{"img":"https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800","alt":"Produkt 1","caption":""}],"heading":"Udvalgte produkter"}',
 'product-carousel.md',
 1, 47),

('sticky-column-section',
 'Sticky Kolonne Sektion',
 'content',
 'Sticky sidebar med overskrift og scrollbart kort-grid',
 1,
 '{"tagline":{"type":"string","required":false},"heading":{"type":"string","required":true},"description":{"type":"string","required":false},"items":{"type":"array","required":true,"items":{"type":"object","properties":{"img":"string","title":"string","desc":"string"}}}}',
 '{"heading":"Vores løsninger","description":"Klik for at lære mere","items":[{"img":"https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=64","title":"Element","desc":"Beskrivelse af elementet"}]}',
 'sticky-column-section.md',
 1, 48),

-- ─────────────────────────────────────────────
-- STRUCTURE (1)
-- ─────────────────────────────────────────────
('breadcrumbs',
 'Brødkrummer',
 'structure',
 'Navigations brødkrumme spor',
 1,
 '{"items":{"type":"array","required":true,"items":{"type":"object","properties":{"label":"string","href":"string"}}},"separator":{"type":"string","default":"/"}}',
 '{"items":[{"label":"Hjem","href":"/"},{"label":"Services","href":"/services"}],"separator":"/"}',
 'breadcrumbs.md',
 1, 90)

ON DUPLICATE KEY UPDATE
  name_da        = VALUES(name_da),
  category       = VALUES(category),
  description_da = VALUES(description_da),
  tier           = VALUES(tier),
  schema_fields  = VALUES(schema_fields),
  default_content= VALUES(default_content),
  doc_path       = VALUES(doc_path),
  is_active      = VALUES(is_active),
  sort_order     = VALUES(sort_order);

-- ── Verify ──────────────────────────────────────────────────
SELECT
  slug,
  category,
  JSON_LENGTH(schema_fields) AS schema_field_count,
  JSON_LENGTH(default_content) AS default_content_keys
FROM components
ORDER BY sort_order;
