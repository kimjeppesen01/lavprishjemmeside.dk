const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Generate page content using Claude Sonnet
 * @param {string} userPrompt - User's page description
 * @param {object} context - Dynamic context from /ai/context endpoint
 * @returns {Promise<object>} - { components: [...], usage: {...} }
 */
async function generatePageContent(userPrompt, context) {
  const systemPrompt = buildSystemPrompt(context);

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    temperature: 0.3,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  });

  // Extract JSON from response
  const response = message.content[0].text;
  const parsed = parseComponentsFromResponse(response);

  return {
    components: parsed.components,
    seo: parsed.seo,
    usage: {
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
      model: 'claude-sonnet-4-20250514',
    },
  };
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
    ? `## Tilgængelige Billeder

Brug disse billeder i stedet for placeholder-URLs. Vælg billeder baseret på alt-teksten og sidens indhold.

${availableMedia.map(m => '- ' + m.url + ' — "' + m.alt + '"').join('\n')}

Hvis intet billede passer, brug "https://placehold.co/800x600/e2e8f0/64748b?text=Billede" som fallback.`
    : `## Billeder

Ingen billeder er uploadet endnu. Brug "https://placehold.co/800x600/e2e8f0/64748b?text=Billede" som placeholder for alle billedfelter.`}

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
7. **Brug uploadede billeder** — vælg fra listen ovenfor baseret på alt-tekst relevans. Brug placeholder kun som sidste udvej
8. **SEO er påkrævet** — inkluder altid "seo" objektet med meta_title, meta_description og schema_type

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
 * - Selects images from the media library
 * - Extracts/generates SEO metadata from content structure
 *
 * @param {string} contentMarkdown - Human-written markdown (tone, topics, intent already set)
 * @param {object} context - designTokens, componentLibrary, availableMedia, etc.
 * @returns {Promise<object>} - { components, seo, usage }
 */
async function generatePageContentAdvanced(contentMarkdown, context) {
  const systemPrompt = buildAdvancedSystemPrompt(context);

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    temperature: 0.2,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Her er det færdige indhold der skal transformeres til vores komponentbibliotek:\n\n---\n\n${contentMarkdown}\n\n---\n\nTransformér ovenstående indhold til JSON med komponenter. Brug KUN tekster fra indholdet — skriv ikke nyt. Vælg det bedste billede fra mediebiblioteket til hvert billedfelt.`,
      },
    ],
  });

  const response = message.content[0].text;
  const parsed = parseComponentsFromResponse(response);

  return {
    components: parsed.components,
    seo: parsed.seo,
    usage: {
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
      model: 'claude-sonnet-4-20250514',
    },
  };
}

/**
 * Advanced system prompt — hyper-focused on transformation and component mastery.
 * NO content writing. Content is provided. Emphasis on components + media.
 */
function buildAdvancedSystemPrompt(context) {
  const { designTokens, componentLibrary, cssVariableSyntax, availableMedia = [] } = context;
  const componentSchemas = buildComponentSchemaReference(componentLibrary.components);

  const mediaSection = availableMedia.length > 0
    ? `## Mediebibliotek — BRUG DISSE BILLEDER

Du SKAL vælge billeder fra denne liste. Vælg det billede hvis alt-tekst bedst matcher konteksten. Brug KUN disse URL'er — ingen placeholders.

${availableMedia.map(m => `- **${m.url}** — Alt: "${m.alt}"`).join('\n')}

Hvis intet billede passer perfekt, vælg det nærmeste match. Brug ALDRIG https://placehold.co eller andre eksterne URLs.`
    : `## Mediebibliotek

Ingen billeder er uploadet endnu. Brug tom streng "" eller udelad billedfelter for komponenter der har valgfrie billeder.`;

  return `Du er en ekspert i at transformere menneskeskrevet indhold til et specifikt komponentbibliotek. Din OPGAVE er IKKE at skrive indhold — det er allerede skrevet og leveret. Din opgave er udelukkende at:

1. **Læse** det leverede markdown-indhold
2. **Mappe** hver sektion til den rette komponent fra biblioteket
3. **Kopiere** teksten fra indholdet direkte ind i komponent-props — ændr ikke formuleringer
4. **Vælge** billeder fra mediebiblioteket baseret på alt-tekst og kontekst
5. **Udtrække** SEO-metadata fra indholdets struktur (første overskrift = meta_title, første afsnit = meta_description)

## KRITISK: Du skriver IKKE nyt indhold

- Brug KUN tekster der står i det leverede indhold
- Kopier overskrifter, beskrivelser, CTAs direkte — ingen omskrivning
- Hvis indholdet har en sektion der ikke passer til nogen komponent, vælg den nærmeste komponent og brug indholdet
- Prioriter at bevare den præcise tone og formulering fra kilden

## Komponentbibliotek — Mester disse

${componentLibrary.index}

Du skal kende HVER komponent og vide når den bruges:
- **hero-section**: Første store sektion, overskrift + beskrivelse + CTA
- **cta-section**: Opfordring til handling, centreret eller split
- **content-image-split**: Tekst + billede side om side
- **features-grid**: Liste af fordele/features med ikoner
- **faq-accordion**: Spørgsmål og svar
- **pricing-table**: Prispakker med features
- **testimonials-carousel**: Anmeldelser/citater
- **team-grid**: Teammedlemmer med billeder
- **timeline**: Tidslinje eller proces
- **stats-banner**: Tal/statistikker
- **gallery-grid**: Billedgalleri
- Og alle andre — læs index og schemas nøje

## EKSAKTE Komponent-Schemas (props SKAL matche præcist)

${componentSchemas}

## Design Tokens

- Primary: ${designTokens.colors.primary} | Secondary: ${designTokens.colors.secondary} | Accent: ${designTokens.colors.accent}
- Font heading: ${designTokens.typography.font_heading} | Font body: ${designTokens.typography.font_body}
- Border radius: ${designTokens.shapes.border_radius} | Shadow: ${designTokens.shapes.shadow_style}

## CSS: Brug ${cssVariableSyntax.critical}

${mediaSection}

## SEO

Udtræk fra indholdet:
- **meta_title**: Første H1 eller overskrift (maks 60 tegn) + " | Lavprishjemmeside.dk"
- **meta_description**: Første meningsfulde afsnit eller indholdsoversigt (maks 160 tegn)
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

1. **4-10 komponenter** — vælg det rigtige antal baseret på indholdets længde
2. **Props MATCHER schema** — brug præcis prop-navne fra schemas
3. **Tekst fra indhold** — ingen nye formuleringer
4. **Billeder fra mediebibliotek** — vælg bedste match, ingen placeholders
5. **Logisk rækkefølge** — hero først, CTA til sidst
6. **Dansk** — indholdet er på dansk, behold det`;
}

module.exports = { generatePageContent, generatePageContentAdvanced };
