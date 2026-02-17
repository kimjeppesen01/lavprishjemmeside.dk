-- ============================================================
-- seed_components_v2.sql
-- Full component seed for schema_phase6 table structure.
--
-- For incremental updates (DB already seeded): run seed_components_incremental.sql
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
 '{"headline":{"type":"string","required":true},"description":{"type":"string","required":true},"primaryCta":{"type":"object","required":false,"properties":{"text":"string","href":"string"}},"secondaryCta":{"type":"object","required":false,"properties":{"text":"string","href":"string"}},"backgroundImage":{"type":"string","format":"image","required":false},"alignment":{"type":"string","enum":["left","center"],"default":"left"},"version":{"type":"string","enum":["default","minimal","split"],"default":"default"}}',
 '{"headline":"Hjemmeside til fast lav pris","description":"Vi bygger professionelle hjemmesider hurtigt og til priser alle kan følge med på.","primaryCta":{"text":"Se priser","href":"/priser"},"secondaryCta":{"text":"Læs mere","href":"/om-os"},"alignment":"left","version":"default"}',
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
 '{"stats":{"type":"array","required":true,"items":{"type":"object","properties":{"value":"string","label":"string","icon":"string"}}},"backgroundColor":{"type":"string","enum":["blue","dark","light"],"default":"blue"},"version":{"type":"string","enum":["cards","inline"],"default":"cards"}}',
 '{"stats":[{"value":"500+","label":"Tilfredse kunder","icon":"⭐"},{"value":"99%","label":"Oppetid","icon":"🚀"},{"value":"24t","label":"Support","icon":"💬"}],"backgroundColor":"blue","version":"cards"}',
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

('trust-badges-section',
 'Tillidsmærker',
 'trust',
 'SSL, betalingsikoner og garantier',
 1,
 '{"badges":{"type":"array","required":false,"items":{"type":"object","properties":{"type":"string","label":"string","icon":"string"}}},"layout":{"type":"string","enum":["horizontal","compact"],"default":"horizontal"}}',
 '{"badges":[{"type":"ssl","label":"Sikker betaling","icon":"🔒"},{"type":"guarantee","label":"30 dages fuld refusion","icon":"✓"},{"type":"payment","label":"Visa, Mastercard, MobilePay","icon":"💳"}],"layout":"horizontal"}',
 'trust-badges-section.md',
 1, 23),

('case-studies-section',
 'Referencer / Cases',
 'content',
 'Projektshowcase med billede, titel, kunde og resultat',
 1,
 '{"headline":{"type":"string","required":true},"description":{"type":"string","required":false},"cases":{"type":"array","required":true,"items":{"type":"object","properties":{"image":{"type":"string","format":"image"},"title":{"type":"string"},"client":{"type":"string"},"outcome":{"type":"string"},"link":{"type":"string"}}}},"columns":{"type":"number","enum":[2,3],"default":3}}',
 '{"headline":"Vores referencer","description":"Se hvordan vi har hjulpet andre virksomheder.","cases":[{"image":"","title":"Ny hjemmeside for detailhandler","client":"Jensen ApS","outcome":"40% stigning i online konvertering.","link":"/referencer/jensen"}],"columns":3}',
 'case-studies-section.md',
 1, 38),

('integrations-section',
 'Integrations',
 'content',
 'Grid af apps og værktøjer der fungerer med produktet',
 1,
 '{"headline":{"type":"string","required":true},"description":{"type":"string","required":false},"integrations":{"type":"array","required":true,"items":{"type":"object","properties":{"name":"string","logoUrl":{"type":"string","format":"image"},"link":"string","description":"string"}}},"columns":{"type":"number","enum":[2,3,4],"default":4}}',
 '{"headline":"Integrerer med dine værktøjer","description":"Vores løsning fungerer sammen med de mest populære platforme.","integrations":[{"name":"Mailchimp","logoUrl":"","link":"https://mailchimp.com"},{"name":"Stripe","logoUrl":"","description":"Betalingshåndtering"}],"columns":4}',
 'integrations-section.md',
 1, 39),

('founders-note-section',
 'Grundlæggerens note',
 'trust',
 'Personlig besked fra grundlæggeren: citat, foto, valgfri CTA',
 1,
 '{"quote":{"type":"string","required":true},"author":{"type":"string","required":true},"role":{"type":"string","required":false},"photo":{"type":"string","format":"image","required":false},"cta":{"type":"object","required":false,"properties":{"text":"string","href":"string"}}}',
 '{"quote":"Jeg startede denne virksomhed for at gøre professionelle hjemmesider tilgængelige for alle.","author":"Kim Jeppesen","role":"Grundlægger & CEO","photo":"","cta":{"text":"Kontakt mig","href":"/kontakt"}}',
 'founders-note-section.md',
 1, 24),

('tabs-section',
 'Faner',
 'content',
 'Fanegrænseflade til organisering af tæt indhold (funktioner, priser)',
 1,
 '{"headline":{"type":"string","required":true},"tabs":{"type":"array","required":true,"items":{"type":"object","properties":{"label":"string","content":"string"}}},"defaultTab":{"type":"number","default":0}}',
 '{"headline":"Vælg din plan","tabs":[{"label":"Basis","content":"<p>5 sider, SSL, e-mail support.</p>"},{"label":"Pro","content":"<p>10 sider, SEO, prioriteret support.</p>"}],"defaultTab":0}',
 'tabs-section.md',
 1, 49),

('modal-section',
 'Modal / Dialog',
 'structure',
 'Overlay-modal til formulare, CTA eller medieindhold',
 1,
 '{"triggerText":{"type":"string","required":true},"headline":{"type":"string","required":true},"content":{"type":"string","required":true}}',
 '{"triggerText":"Læs mere","headline":"Vigtig information","content":"<p>Indhold i modalen.</p>"}',
 'modal-section.md',
 1, 91)

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


INSERT INTO components
  (slug, name_da, category, description_da, tier, schema_fields, default_content, doc_path, is_active, sort_order)
VALUES



('bento-grid-section',
 'Bento Grid',
 'content',
 'Asymmetrisk grid med kort i varierende størrelser',
 1,
 '{"headline":{"type":"string","required":true},"items":{"type":"array","required":true,"items":{"type":"object","properties":{"title":"string","description":"string","size":{"type":"string","enum":["small","medium","large"]}}}}}',
 '{"headline":"Vores løsninger","items":[{"title":"Hjemmesider","description":"Moderne responsive sider.","size":"large"},{"title":"SEO","size":"small"},{"title":"Hosting","size":"medium"}]}',
 'bento-grid-section.md',
 1, 50),

('overlap-image-section',
 'Overlap Billede Sektion',
 'content',
 'Visuel sektion med overlap. Understøtter introText (centreret) eller kolonne-layout.',
 1,
 '{"headline":{"type":"string","required":true},"introText":{"type":"string","required":false},"content":{"type":"string","required":false},"bulletPoints":{"type":"array","required":false,"items":{"type":"string"}},"imageUrl":{"type":"string","format":"image","required":true},"imageAlt":{"type":"string","required":false},"imagePlacement":{"type":"string","enum":["left","right","center"],"default":"right"},"overlapAmount":{"type":"number","default":80},"theme":{"type":"string","enum":["teal","white"],"default":"white"},"bottomDivider":{"type":"string","enum":["none","straight"],"default":"none"},"cta":{"type":"object","required":false,"properties":{"text":"string","href":"string","icon":{"type":"string","enum":["chevron-down","arrow-right"]}}}}',
 '{"headline":"Produktionshistorik","introText":"Se hvordan systemet giver dig overblik.","content":"<p>Med vores platform har du altid fingeren på pulsen.</p>","imageUrl":"","imagePlacement":"right","overlapAmount":80,"theme":"teal","bottomDivider":"none","bulletPoints":["Sikker adgang","Sporbarhed online"],"cta":{"text":"Se specifikationer","href":"/specs","icon":"arrow-right"}}',
 'overlap-image-section.md',
 1, 51),

('overlap-cards-section',
 'Overlap Kort Sektion',
 'content',
 '2-3 kort i række med horisontal overlap',
 1,
 '{"headline":{"type":"string","required":false},"cards":{"type":"array","required":true,"items":{"type":"object","properties":{"imageUrl":{"type":"string","format":"image"},"imageAlt":{"type":"string"},"title":{"type":"string"},"content":{"type":"string"},"cta":{"type":"object","properties":{"text":"string","href":"string"}}}}},"overlapOffset":{"type":"number","default":40}}',
 '{"headline":"Vælg din løsning","cards":[{"title":"Produktvisning","content":"<p>Se hvordan det fungerer.</p>","cta":{"text":"Læs mere","href":"/produkt"}},{"title":"Funktioner","content":"<p>Punkt 1, punkt 2.</p>"}],"overlapOffset":40}',
 'overlap-cards-section.md',
 1, 52),

('alternating-feature-list',
 'Alternating Feature Liste',
 'content',
 '2-4 overlap-sektioner der flyder sammen som én blok. Teal/hvid skift, billeder overlapper.',
 1,
 '{"features":{"type":"array","required":true,"items":{"type":"object","properties":{"headline":{"type":"string"},"introText":{"type":"string"},"content":{"type":"string"},"bulletPoints":{"type":"array","items":{"type":"string"}},"imageUrl":{"type":"string","format":"image"},"imageAlt":{"type":"string"},"cta":{"type":"object","properties":{"text":"string","href":"string","icon":{"type":"string","enum":["chevron-down","arrow-right"]}}}}},"firstTheme":{"type":"string","enum":["teal","white"],"default":"teal"},"overlapAmount":{"type":"number","default":80}}',
 '{"features":[{"headline":"Produktionsoversigt","introText":"Se hvordan systemet giver dig overblik.","content":"<p>Med vores platform har du altid fingeren på pulsen.</p>","imageUrl":"","bulletPoints":["Sikker adgang","Sporbarhed online"],"cta":{"text":"Se specifikationer","href":"/specs","icon":"arrow-right"}},{"headline":"Avanceret rapportering","introText":"Detaljerede rapporter tilgængelige når det passer dig.","content":"<p>Træk data ud i Excel eller PDF.</p>","imageUrl":"","bulletPoints":["Fleksible filformater","Planlagte rapporter"],"cta":{"text":"Læs mere","href":"/rapporter","icon":"arrow-right"}}],"firstTheme":"teal","overlapAmount":80}',
 'alternating-feature-list.md',
 1, 53),

('logo-cloud',
 'Logo Sky',
 'trust',
 'Grid af kunde- eller partnerlogoer',
 1,
 '{"headline":{"type":"string","required":false},"logos":{"type":"array","required":true,"items":{"type":"object","properties":{"imageUrl":"string","alt":"string","link":"string"}}},"grayscale":{"type":"boolean","default":true}}',
 '{"headline":"Betroet af kendte brands","logos":[{"imageUrl":"","alt":"Kunde 1","link":""},{"imageUrl":"","alt":"Kunde 2","link":""}],"grayscale":true}',
 'logo-cloud.md',
 1, 23)

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


INSERT INTO components
  (slug, name_da, category, description_da, tier, schema_fields, default_content, doc_path, is_active, sort_order)
VALUES
-- ─────────────────────────────────────────────
-- CONVERSION (5)
-- ─────────────────────────────────────────────
('cta-section',
 'CTA Sektion',
 'conversion',
 'Call-to-action banner med centreret eller split layout',
 1,
 '{"headline":{"type":"string","required":true},"description":{"type":"string","required":true},"ctaButton":{"type":"object","required":true,"properties":{"text":"string","href":"string"}},"backgroundColor":{"type":"string","enum":["blue","dark","light"],"default":"blue"},"layout":{"type":"string","enum":["centered","split"],"default":"centered"},"version":{"type":"string","enum":["default","minimal"],"default":"default"}}',
 '{"headline":"Klar til en ny hjemmeside?","description":"Kom i gang i dag og få din side op at køre på ingen tid.","ctaButton":{"text":"Kom i gang","href":"/kontakt"},"layout":"centered","backgroundColor":"blue","version":"default"}',
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
-- CONTENT (10)
-- ─────────────────────────────────────────────
('problem-section',
 'Problem Sektion',
 'content',
 'Relaterbare udfordringer som din løsning adresserer',
 1,
 '{"headline":{"type":"string","required":true},"description":{"type":"string","required":false},"problems":{"type":"array","required":true,"items":{"type":"object","properties":{"icon":"string","title":"string","description":"string"}}}}',
 '{"headline":"Kender du disse udfordringer?","description":"Mange virksomheder står over for de samme udfordringer. Vi kan hjælpe.","problems":[{"icon":"⏱️","title":"For lange leveringstider","description":"Ubegrænset ventetid og utydelige frister fra udviklere."},{"icon":"💰","title":"Uforudsigelige priser","description":"Skjulte gebyrer og løbende omkostninger du ikke regnede med."},{"icon":"📞","title":"Svært at få svar","description":"Support der ikke svarer eller ikke forstår dit behov."}]}',
 'problem-section.md',
 1, 39),

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

('how-it-works-section',
 'Sådan fungerer det',
 'content',
 'Trin-for-trin procesforklaring',
 1,
 '{"headline":{"type":"string","required":true},"description":{"type":"string","required":false},"steps":{"type":"array","required":true,"items":{"type":"object","properties":{"title":"string","description":"string"}}}}',
 '{"headline":"Sådan fungerer det","description":"Tre enkle trin til din nye hjemmeside.","steps":[{"title":"Book en snak","description":"Kontakt os for en uforpligtende samtale om dine behov."},{"title":"Design og godkendelse","description":"Vi sender et forslag til din godkendelse inden vi bygger."},{"title":"Levering og opdateringer","description":"Din side går live, og vi hjælper med opdateringer og support."}]}',
 'how-it-works-section.md',
 1, 42)

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


INSERT INTO components
  (slug, name_da, category, description_da, tier, schema_fields, default_content, doc_path, is_active, sort_order)
VALUES

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