const Anthropic = require('@anthropic-ai/sdk');
const pexels = require('./pexels.cjs');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SEARCH_PEXELS_TOOL = {
  name: 'search_pexels',
  description: 'Search Pexels for a royalty-free image and download it to the media library. Returns a URL you can use directly in component props. Use this when you need an image for a component and no existing media library image is a good match. Search in Danish or English — Pexels handles both.',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search keyword(s). Be specific: "dansk webdesigner arbejder ved skrivebord" is better than "webdesign"',
      },
      orientation: {
        type: 'string',
        enum: ['landscape', 'portrait', 'square'],
        description: 'Image orientation. Use "landscape" for hero sections and immersive-content-visual, "portrait" for team photos, "square" for gallery grids',
      },
      size: {
        type: 'string',
        enum: ['large', 'medium', 'small'],
        description: 'Image size. Default "large" for hero/full-width, "medium" for cards and splits',
      },
    },
    required: ['query'],
  },
};

const PEXELS_MAX_PER_GENERATION = parseInt(process.env.PEXELS_MAX_PER_GENERATION, 10) || 6;

/**
 * Generate page content using Claude Sonnet (with Pexels tool-use loop)
 * @param {string} userPrompt - User's page description
 * @param {object} context - Dynamic context from /ai/context endpoint
 * @param {number} [uploadedBy] - User ID for media attribution
 * @returns {Promise<object>} - { components: [...], seo, usage: {...} }
 */
async function generatePageContent(userPrompt, context, uploadedBy = null) {
  const systemPrompt = buildSystemPrompt(context);
  const messages = [{ role: 'user', content: userPrompt }];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let toolCallCount = 0;
  const toolCallsUsed = [];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      temperature: 0.3,
      system: systemPrompt,
      tools: [SEARCH_PEXELS_TOOL],
      tool_choice: { type: 'auto' },
      messages,
    });

    totalInputTokens += message.usage?.input_tokens ?? 0;
    totalOutputTokens += message.usage?.output_tokens ?? 0;

    const toolUseBlocks = (message.content || []).filter((b) => b.type === 'tool_use');
    const textBlocks = (message.content || []).filter((b) => b.type === 'text');

    if (message.stop_reason === 'end_turn' && toolUseBlocks.length === 0) {
      const response = textBlocks.map((b) => b.text).join('\n') || '';
      const parsed = parseComponentsFromResponse(response);
      return {
        components: parsed.components,
        seo: parsed.seo,
        usage: {
          input_tokens: totalInputTokens,
          output_tokens: totalOutputTokens,
          model: 'claude-sonnet-4-20250514',
          tool_calls: toolCallCount,
          tools_used: toolCallsUsed,
        },
      };
    }

    if (toolUseBlocks.length === 0) break;

    const toolResults = [];
    for (const block of toolUseBlocks) {
      if (block.name !== 'search_pexels') continue;
      toolCallCount += 1;
      if (toolCallCount > PEXELS_MAX_PER_GENERATION) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: 'Pexels-grænse nået for denne generation. Brug et billede fra mediebiblioteket eller en placeholder.',
        });
        continue;
      }
      toolCallsUsed.push('search_pexels');
      try {
        const result = await pexels.handleSearchPexelsTool(block.input || {}, uploadedBy);
        const content = result.error
          ? JSON.stringify({ error: result.error })
          : JSON.stringify({
              url: result.url,
              alt_text: result.alt_text,
              width: result.width,
              height: result.height,
              media_id: result.media_id,
            });
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content });
      } catch (err) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify({ error: err.message || 'Pexels-fejl' }),
        });
      }
    }

    messages.push({ role: 'assistant', content: message.content });
    messages.push({ role: 'user', content: toolResults });
  }

  throw new Error('AI response ended without valid JSON output');
}

/**
 * Build system prompt with component library context.
 * Includes full component schemas so the AI generates correct prop structures.
 */
function buildSystemPrompt(context) {
  const { designTokens, componentLibrary, cssVariableSyntax, promptSettings = {}, availableMedia = [] } = context;

  // Build a concise but exact schema reference from the component docs
  const componentSchemas = buildComponentSchemaReference(componentLibrary.components);

  const emne = promptSettings.prompt_emne || 'Forretningsudvikling og professionel kommunikation';
  const kundesegment = promptSettings.prompt_kundesegment || 'Små virksomheder og selvstændige';
  const personlighed = promptSettings.prompt_personlighed || 'Professionel og venlig';
  const intention = promptSettings.prompt_intention || 'Informere og få læseren til at tage kontakt';
  const formatStyle = promptSettings.prompt_format || 'Professionel hjemmesidetekst med korte afsnit';
  const avanceret = (promptSettings.prompt_avanceret_personlighed || '').trim();

  const avanceretSection = avanceret
    ? `

## Avanceret personlighed (supplerende regler – følg disse bindende instruktioner)

Følg nøje disse regler for tone, språgbrug og stil. De supplerer og uddyber indholdsprofilen ovenfor.

${avanceret}

`
    : '';

  return `Du er en professionel dansk hjemmeside-designer. Din opgave er at sammensætte sider ved hjælp af en komponentbibliotek.

## Indholdsprofil (brug denne profil for al genereret tekst)

- **Emne:** ${emne}
- **Kundesegment:** ${kundesegment}
- **Personlighed:** ${personlighed}
- **Intention:** ${intention}
- **Format/stil:** ${formatStyle}

Alle overskrifter, beskrivelser og CTA-tekster skal følge denne profil. Tilpas tonen og indholdet herefter.
${avanceretSection}

## Tilgængelige Komponenter

${componentLibrary.index}
${(componentLibrary.customComponents && componentLibrary.customComponents.length > 0)
  ? `

## Egne komponenter (custom)

Du kan også bruge disse egne komponenter. Brug \`component_slug\` præcis som angivet.

${componentLibrary.customComponents.map((c) => {
  const schemaStr = typeof c.schema_fields === 'object' ? JSON.stringify(c.schema_fields, null, 2) : (c.schema_fields || '{}');
  const defaultStr = typeof c.default_content === 'object' ? JSON.stringify(c.default_content, null, 2) : (c.default_content || '{}');
  return `### ${c.slug}\n- **Navn:** ${c.name_da}\n- **Schema:**\n\`\`\`json\n${schemaStr}\n\`\`\`\n- **Default content (brug som skabelon for props_data):**\n\`\`\`json\n${defaultStr}\n\`\`\``;
}).join('\n\n')}`
  : ''}

## KRITISK: Eksakte Komponent-Schemas

Du SKAL bruge præcis de prop-navne og strukturer der er defineret herunder. Brug IKKE alternative navne (f.eks. "items" i stedet for "faqs", eller "plans" i stedet for "tiers").

${componentSchemas}

## Design Tokens (Aktuelle Farver & Stile)

**Farver:**
- Primary: ${designTokens.colors.primary}
- Secondary: ${designTokens.colors.secondary}
- Accent: ${designTokens.colors.accent}

**Typografi:**
- Skrifttype (overskrifter): ${designTokens.typography.font_heading}
- Skrifttype (brødtekst): ${designTokens.typography.font_body}
- Basisstørrelse: ${designTokens.typography.font_size_base}

**Former:**
- Border radius: ${designTokens.shapes.border_radius}
- Shadow style: ${designTokens.shapes.shadow_style}

## CSS Variable Syntax

${cssVariableSyntax.critical}

Eksempler:
- Farver: ${cssVariableSyntax.colors}
- Tekst: ${cssVariableSyntax.text}
- Radius: ${cssVariableSyntax.radius}
- Shadow: ${cssVariableSyntax.shadow}

${availableMedia.length > 0
    ? `## Tilgængelige Billeder (mediebibliotek)

Brug disse billeder i stedet for placeholder-URLs. Vælg billeder baseret på alt-teksten og sidens indhold.

${availableMedia.map((m) => {
      const dims = m.width && m.height ? ` (${m.width}x${m.height})` : '';
      const tags = m.tags ? ` [${m.tags}]` : '';
      return `- ${m.url} — "${m.alt}"${dims}${tags}`;
    }).join('\n')}

Hvis intet billede passer, kald \`search_pexels\` (se nedenfor). Brug ALDRIG placehold.co.
`
    : `## Billeder

Ingen billeder i mediebiblioteket endnu. Brug \`search_pexels\` til at hente billeder fra Pexels for alle billedfelter.`}

## Billedsøgning med Pexels

Du har adgang til værktøjet \`search_pexels\` som søger i Pexels' billedbibliotek og downloader billedet direkte til vores mediebibliotek.

### Regler for billedvalg:
1. **Tjek mediebiblioteket først** — brug eksisterende billeder hvis de passer
2. **Kald search_pexels** for hvert billedfelt hvor intet eksisterende billede passer
3. **Søg specifikt** — "kvinde der arbejder ved laptop i lyst kontor" er bedre end "kontor"
4. **Vælg korrekt orientation** — landscape til hero/splits, portrait til team, square til gallerier
5. **Maks 6 søgninger per side** — prioriter de vigtigste billedfelter (hero, splits)
6. **Brug URL'en præcist** som den returneres — ændr ikke URL'en

Brug ALDRIG placeholder-URLs (placehold.co). Alle sider skal have ægte billeder.

## SEO Metadata

Generer SEO-metadata til siden:
- **meta_title**: Maks 60 tegn. Inkluder sidens emne + "| Lavprishjemmeside.dk". Eksempel: "Priser på hjemmesider | Lavprishjemmeside.dk"
- **meta_description**: Maks 160 tegn. Kort, handlingsorienteret beskrivelse med CTA. Eksempel: "Se vores priser på professionelle hjemmesider. Fra 4.995 kr. Kontakt os i dag."
- **schema_type**: Vælg baseret på sidens indhold:
  - "FAQPage" — hvis siden har faq-accordion
  - "Product" — hvis siden har pricing-table
  - "AboutPage" — hvis siden har team-grid
  - "WebPage" — standard for alle andre sider

## Output Format

Returnér et JSON **objekt** (IKKE et array). Strukturen er:

\`\`\`json
{
  "seo": {
    "meta_title": "Sidetitel | Lavprishjemmeside.dk",
    "meta_description": "Kort SEO-beskrivelse med CTA...",
    "schema_type": "WebPage"
  },
  "components": [
    {
      "component_slug": "hero-section",
      "props_data": {
        "headline": "...",
        "description": "...",
        "primaryCta": { "text": "...", "href": "..." }
      },
      "sort_order": 1
    }
  ]
}
\`\`\`

## Regler

1. **Kun brug komponenter fra biblioteket** (se index ovenfor)
2. **Props SKAL matche det eksakte schema** — brug præcis de prop-navne fra schemas ovenfor
3. **Brug danske tekster** — professionel tone
4. **Sorter komponenterne logisk** — start med hero, slut med CTA
5. **Brug 4-8 komponenter** per side
6. **Returnér KUN JSON** — ingen forklaring, kun JSON-objektet
7. **Brug mediebiblioteket eller search_pexels** — vælg fra listen baseret på alt-tekst relevans, eller kald search_pexels for nye billeder. Aldrig placeholders
8. **SEO er påkrævet** — inkluder altid "seo" objektet med meta_title, meta_description og schema_type
9. **Sektionsbaggrunde** — alternerer automatisk (hvid/grå). Brug kun \`backgroundColor: "primary"\` på cta-section eller stats-banner. For immersive-content-visual: brug \`theme: "accent"\` eller \`theme: "default"\`. Brug aldrig backgroundColor på overlap-cards-section.

Vær kreativ men professionel. Lav indhold der passer til brugerens beskrivelse.`;
}

/**
 * Extract exact prop schemas from component docs into a concise reference.
 * Each component doc has a Props Schema section with TypeScript interfaces.
 */
function buildComponentSchemaReference(componentDocs) {
  if (!componentDocs || Object.keys(componentDocs).length === 0) {
    return '(Komponent-dokumentation ikke tilgængelig)';
  }

  const schemas = [];

  for (const [slug, docContent] of Object.entries(componentDocs)) {
    // Extract the Props Schema code block
    const schemaMatch = docContent.match(/## Props Schema[\s\S]*?```typescript\n([\s\S]*?)```/);
    // Extract the Example Props Object code block
    const exampleMatch = docContent.match(/### Example Props Object[\s\S]*?```json\n([\s\S]*?)```/);

    if (schemaMatch) {
      let entry = `### \`${slug}\`\n\`\`\`typescript\n${schemaMatch[1].trim()}\n\`\`\``;
      if (exampleMatch) {
        entry += `\n**Eksempel:**\n\`\`\`json\n${exampleMatch[1].trim()}\n\`\`\``;
      }
      schemas.push(entry);
    }
  }

  return schemas.join('\n\n');
}

/**
 * Parse components and SEO data from Claude's response.
 * Supports both new object format { seo, components } and legacy array format.
 */
function parseComponentsFromResponse(response) {
  // Extract JSON from markdown code blocks or raw JSON
  const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) ||
                    response.match(/```\n([\s\S]*?)\n```/) ||
                    response.match(/(\{[\s\S]*\})/) ||
                    response.match(/(\[[\s\S]*\])/);

  if (!jsonMatch) {
    throw new Error('Could not extract JSON from AI response');
  }

  const json = jsonMatch[1];
  const parsed = JSON.parse(json);

  let components;
  let seo = null;

  if (Array.isArray(parsed)) {
    // Legacy format: flat array of components
    components = parsed;
  } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.components)) {
    // New format: { seo: {...}, components: [...] }
    components = parsed.components;
    seo = parsed.seo || null;
  } else {
    throw new Error('AI response is not a valid format');
  }

  // Validate components
  components.forEach((comp, index) => {
    if (!comp.component_slug || !comp.props_data) {
      throw new Error(`Invalid component at index ${index}`);
    }
  });

  return { components, seo };
}

/**
 * ADVANCED FLOW: Transform human-written markdown into page components.
 * Content is PROVIDED — the model does NOT write content. It ONLY:
 * - Maps content sections to the right components
 * - Populates component props from the markdown
 * - Selects images from the media library or search_pexels
 * - Extracts/generates SEO metadata from content structure
 *
 * @param {string} contentMarkdown - Human-written markdown (tone, topics, intent already set)
 * @param {object} context - designTokens, componentLibrary, availableMedia, etc.
 * @param {number} [uploadedBy] - User ID for media attribution
 * @returns {Promise<object>} - { components, seo, usage }
 */
async function generatePageContentAdvanced(contentMarkdown, context, uploadedBy = null) {
  const systemPrompt = buildAdvancedSystemPrompt(context);
  const userContent = `Her er det færdige indhold der skal transformeres til vores komponentbibliotek:\n\n---\n\n${contentMarkdown}\n\n---\n\nTransformér ovenstående indhold til JSON med komponenter. Omskriv og tilpas teksten så den passer til hver komponents struktur (headline, content, bulletPoints, cards, steps osv.). Brug 8–12 komponenter for varieret, professionel UX. Vælg billeder fra mediebiblioteket eller brug search_pexels.`;
  const messages = [{ role: 'user', content: userContent }];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let toolCallCount = 0;
  const toolCallsUsed = [];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      temperature: 0.2,
      system: systemPrompt,
      tools: [SEARCH_PEXELS_TOOL],
      tool_choice: { type: 'auto' },
      messages,
    });

    totalInputTokens += message.usage?.input_tokens ?? 0;
    totalOutputTokens += message.usage?.output_tokens ?? 0;

    const toolUseBlocks = (message.content || []).filter((b) => b.type === 'tool_use');
    const textBlocks = (message.content || []).filter((b) => b.type === 'text');

    if (message.stop_reason === 'end_turn' && toolUseBlocks.length === 0) {
      const response = textBlocks.map((b) => b.text).join('\n') || '';
      const parsed = parseComponentsFromResponse(response);
      return {
        components: parsed.components,
        seo: parsed.seo,
        usage: {
          input_tokens: totalInputTokens,
          output_tokens: totalOutputTokens,
          model: 'claude-sonnet-4-20250514',
          tool_calls: toolCallCount,
          tools_used: toolCallsUsed,
        },
      };
    }

    if (toolUseBlocks.length === 0) break;

    const toolResults = [];
    for (const block of toolUseBlocks) {
      if (block.name !== 'search_pexels') continue;
      toolCallCount += 1;
      if (toolCallCount > PEXELS_MAX_PER_GENERATION) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: 'Pexels-grænse nået for denne generation. Brug et billede fra mediebiblioteket.',
        });
        continue;
      }
      toolCallsUsed.push('search_pexels');
      try {
        const result = await pexels.handleSearchPexelsTool(block.input || {}, uploadedBy);
        const content = result.error
          ? JSON.stringify({ error: result.error })
          : JSON.stringify({
              url: result.url,
              alt_text: result.alt_text,
              width: result.width,
              height: result.height,
              media_id: result.media_id,
            });
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content });
      } catch (err) {
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify({ error: err.message || 'Pexels-fejl' }),
        });
      }
    }

    messages.push({ role: 'assistant', content: message.content });
    messages.push({ role: 'user', content: toolResults });
  }

  throw new Error('AI response ended without valid JSON output');
}

/**
 * Advanced system prompt — world-class UX, many components, REWRITE text to fit.
 * Content is provided; AI adapts and rewrites it to fit component structures.
 */
function buildAdvancedSystemPrompt(context) {
  const { designTokens, componentLibrary, cssVariableSyntax, availableMedia = [] } = context;
  const componentSchemas = buildComponentSchemaReference(componentLibrary.components);

  const mediaSection = availableMedia.length > 0
    ? `## Mediebibliotek — BRUG DISSE BILLEDER

Vælg billeder fra denne liste når alt-tekst matcher konteksten. Eller kald \`search_pexels\` for nye billeder.

${availableMedia.map((m) => {
      const dims = m.width && m.height ? ` (${m.width}x${m.height})` : '';
      return `- **${m.url}** — Alt: "${m.alt}"${dims}`;
    }).join('\n')}

Hvis intet billede passer, brug \`search_pexels\` (se nedenfor). Brug ALDRIG placehold.co.`
    : `## Mediebibliotek

Ingen billeder er uploadet endnu. Brug \`search_pexels\` til at hente billeder til hvert billedfelt.`;

  const pexelsSection = `
## Billedsøgning med Pexels

Du har adgang til \`search_pexels\`. Kald det når du har brug for et billede og intet i mediebiblioteket passer.
- Søg specifikt: "webdesigner samarbejder med kunde" er bedre end "kontor"
- orientation: landscape til hero/splits/overlap, portrait til team, square til gallerier
- Maks 6 kald per side. Brug URL'en præcist som den returneres.`;

  return `Du er en verdensklasse UX-arkitekt der transformerer menneskeskrevet indhold til et moderne komponentbibliotek. Din opgave er at levere WORLD-CLASS brugeroplevelser ved at:

1. **Læse** det leverede markdown-indhold grundigt
2. **Omskrive og tilpasse** teksten så den passer præcist til hver komponents struktur og formål — dette er KRITISK
3. **Bruge så mange komponenter som muligt** for variation, rytme og professionel sideopbygning (målet: 8–12 komponenter for typisk sideindhold)
4. **Vælge** billeder fra mediebiblioteket eller search_pexels der matcher konteksten
5. **Udtrække** SEO-metadata fra indholdet

## KRITISK: Omskriv teksten til at passe komponenterne

Du SKAL omskrive og tilpasse indholdet — ikke blot kopiere det 1:1. Hver komponent har en bestemt struktur; teksten skal passe ind:

- **headline + content** (f.eks. immersive-content-visual): Træk hovedpointen ud som overskrift, kondensér brødtekst til 1–3 korte afsnit. Brug \`<p>\` tags i content.
- **highlights** (immersive-content-visual, problem-section): Konverter lange lister eller punkter til korte, skarpe bullet points (3–6 pr. sektion).
- **features/cards** (features-grid, icon-cards, overlap-cards-section): Del lang indhold op i separate kort — hver med titel + kort beskrivelse. Vælg passende ikoner (✓, ⚡, 📋, 🎯, etc.).
- **steps** (how-it-works-section): Konverter procesbeskrivelser til 3–4 trin med titel + beskrivelse.
- **faqs** (faq-accordion): Udled spørgsmål og svar fra indholdet — formulér som konkrete Q&A.
- **tabs** (tabs-section): Hvis indholdet har flere underemner, brug tabs — ét tab per emne med label + content.
- **bento-grid**: For løsninger/ydelser — varier size (small/medium/large) for visuel interesse.
- **immersive-content-visual**: Ideel til "sådan fungerer det" eller produktfeatures med længere tekst. Brug \`leadText\`, \`content\`, \`highlights\`, \`variant\` og \`theme\` (accent/default) for premium layout.
- **alternating-feature-list**: Foretræk denne når indholdet har 2–4 overlapping tekst/billede-blokke der skal flyde sammen.
- **overlap-cards-section**: Perfekt til 2–3 relaterede features eller trin — kort, skarpe tekster per kort.
- Bevar tone og budskab; formuleringer må og skal tilpasses.

## Komponentbibliotek — Brug flest muligt

${componentLibrary.index}
${(componentLibrary.customComponents && componentLibrary.customComponents.length > 0)
  ? `

## Egne komponenter (custom)

Du kan også bruge disse. Brug \`component_slug\` præcis som angivet.

${componentLibrary.customComponents.map((c) => {
  const schemaStr = typeof c.schema_fields === 'object' ? JSON.stringify(c.schema_fields, null, 2) : (c.schema_fields || '{}');
  const defaultStr = typeof c.default_content === 'object' ? JSON.stringify(c.default_content, null, 2) : (c.default_content || '{}');
  return `### ${c.slug}\n- **Navn:** ${c.name_da}\n- **Schema:**\n\`\`\`json\n${schemaStr}\n\`\`\`\n- **Default (props_data skabelon):**\n\`\`\`json\n${defaultStr}\n\`\`\``;
}).join('\n\n')}`
  : ''}

**Anbefalet rækkefølge for varieret, professionel side:**
1. hero-section (opener)
2. problem-section ELLER stats-banner (engagement)
3. 2–4 indholdssektioner: immersive-content-visual, alternating-feature-list, features-grid, how-it-works-section, icon-cards, overlap-cards-section, bento-grid-section, tabs-section — VÆLG UD FRA INDHOLD
4. case-studies-section ELLER testimonials-carousel (social proof)
5. faq-accordion (hvis spørgsmål findes i indholdet)
6. cta-section (afslutning)

**Variation:** Bland ikke kun immersive-content-visual. Brug alternating-feature-list (når 2+ overlap-blokke), overlap-cards-section, how-it-works-section, tabs-section for visuel variation og dybde.

## EKSAKTE Komponent-Schemas (props SKAL matche præcist)

${componentSchemas}

## Design Tokens

- Primary: ${designTokens.colors.primary} | Secondary: ${designTokens.colors.secondary} | Accent: ${designTokens.colors.accent}
- Font heading: ${designTokens.typography.font_heading} | Font body: ${designTokens.typography.font_body}
- Border radius: ${designTokens.shapes.border_radius} | Shadow: ${designTokens.shapes.shadow_style}

## CSS: Brug ${cssVariableSyntax.critical}

## Sektionsbaggrunde — harmonisk blanding

Sektioner alternerer automatisk (hvid/grå). For immersive-content-visual: \`theme: "accent"\` eller \`theme: "default"\`. Kun cta-section og stats-banner må bruge \`backgroundColor: "primary"\`.

${mediaSection}
${pexelsSection}

## SEO

- **meta_title**: Første H1/overskrift (maks 60 tegn) + " | Lavprishjemmeside.dk"
- **meta_description**: Første meningsfulde afsnit (maks 160 tegn)
- **schema_type**: FAQPage hvis faq, Product hvis priser, WebPage standard

## Output

Returnér KUN dette JSON-objekt (ingen forklaring):

\`\`\`json
{
  "seo": {
    "meta_title": "...",
    "meta_description": "...",
    "schema_type": "WebPage"
  },
  "components": [
    {
      "component_slug": "hero-section",
      "props_data": { "headline": "...", "description": "...", "primaryCta": {...} },
      "sort_order": 1
    }
  ]
}
\`\`\`

## Regler

1. **8–12 komponenter** — brug mange komponenter for world-class UX og visuel variation
2. **Omskriv til komponentstrukturer** — tilpas hver tekst til headline/content/bulletPoints/cards/steps osv.
3. **Props MATCHER schema** — præcis prop-navne fra schemas
4. **Variation** — bland immersive-content-visual, alternating-feature-list (ved 2+ overlap-blokke), overlap-cards-section, features-grid, how-it-works-section, tabs-section, bento-grid-section
5. **Billeder** — mediebibliotek eller search_pexels, aldrig placeholders
6. **Logisk rækkefølge** — hero først, CTA til sidst
7. **Dansk** — behold sproget
8. **immersive-content-visual**: \`theme: "accent"\` eller \`theme: "default"\`, \`variant\` efter behov (editorial-split/cinematic-overlap/stacked-cards).`;
}

module.exports = { generatePageContent, generatePageContentAdvanced };
