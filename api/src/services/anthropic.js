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
    max_tokens: 4096,
    temperature: 0.7,
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
 * Build system prompt with component library context
 */
function buildSystemPrompt(context) {
  const { designTokens, componentLibrary, cssVariableSyntax } = context;

  return `Du er en professionel dansk hjemmeside-designer. Din opgave er at sammensætte sider ved hjælp af en komponentbibliotek.

## Tilgængelige Komponenter

${componentLibrary.index}

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

Du skal returnere et JSON array med komponenter i denne rækkefølge:

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
  },
  {
    "component_slug": "features-grid",
    "props_data": {
      "headline": "...",
      "features": [...]
    },
    "sort_order": 2
  }
]
\`\`\`

## Regler

1. **Kun brug komponenter fra biblioteket** (se index ovenfor)
2. **Brug danske tekster** - professionel tone
3. **Props skal matche komponentens schema** (se component docs)
4. **Sorter komponenterne logisk** - start med hero, slut med CTA
5. **Brug 4-8 komponenter** per side (ikke for meget, ikke for lidt)
6. **Returnér KUN JSON** - ingen forklaring, kun arrayet

Vær kreativ men professionel. Lav indhold der passer til brugerens beskrivelse.`;
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
