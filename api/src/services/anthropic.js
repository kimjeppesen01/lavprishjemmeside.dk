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
  const components = parseComponentsFromResponse(response);

  return {
    components,
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
  const { designTokens, componentLibrary, cssVariableSyntax, promptSettings = {} } = context;

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

## Output Format

Returnér et JSON array. Hvert element har præcis denne struktur:

\`\`\`json
[
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
\`\`\`

## Regler

1. **Kun brug komponenter fra biblioteket** (se index ovenfor)
2. **Props SKAL matche det eksakte schema** — brug præcis de prop-navne fra schemas ovenfor
3. **Brug danske tekster** — professionel tone
4. **Sorter komponenterne logisk** — start med hero, slut med CTA
5. **Brug 4-8 komponenter** per side
6. **Returnér KUN JSON** — ingen forklaring, kun arrayet

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
 * Parse components JSON from Claude's response
 */
function parseComponentsFromResponse(response) {
  // Extract JSON from markdown code blocks or raw JSON
  const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) ||
                    response.match(/```\n([\s\S]*?)\n```/) ||
                    response.match(/(\[[\s\S]*\])/);

  if (!jsonMatch) {
    throw new Error('Could not extract JSON from AI response');
  }

  const json = jsonMatch[1];
  const components = JSON.parse(json);

  // Validate structure
  if (!Array.isArray(components)) {
    throw new Error('AI response is not an array');
  }

  components.forEach((comp, index) => {
    if (!comp.component_slug || !comp.props_data) {
      throw new Error(`Invalid component at index ${index}`);
    }
  });

  return components;
}

module.exports = { generatePageContent };
