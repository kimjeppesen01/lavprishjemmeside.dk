const pool = require('../db');
const fs = require('fs');
const path = require('path');

/**
 * Build AI context from database and filesystem
 * Used by both /ai/context and /ai-generate endpoints
 */
async function buildAiContext() {
  // 1. Load current design settings from database
  const [settings] = await pool.execute(
    'SELECT * FROM design_settings WHERE site_id = 1'
  );

  if (settings.length === 0) {
    throw new Error('Design indstillinger ikke fundet');
  }

  const tokens = settings[0];

  // 2. Load component library index
  const indexPath = path.join(__dirname, '../component-docs/_COMPONENT_LIBRARY_INDEX.md');
  let libraryIndex = '';

  if (fs.existsSync(indexPath)) {
    libraryIndex = fs.readFileSync(indexPath, 'utf-8');
  } else {
    console.warn('Component library index not found');
    libraryIndex = '# Component Library Index\n\n(To be created)';
  }

  // 3. Load all component docs (library only — from disk)
  const componentDocs = loadAllComponentDocs();

  // 3b. Load custom components from DB (source = 'custom')
  let customComponents = [];
  try {
    const [customRows] = await pool.execute(
      `SELECT slug, name_da, schema_fields, default_content FROM components WHERE source = 'custom' AND is_active = 1 ORDER BY sort_order ASC, name_da ASC`
    );
    customComponents = (customRows || []).map((row) => ({
      slug: row.slug,
      name_da: row.name_da,
      schema_fields: typeof row.schema_fields === 'string' ? JSON.parse(row.schema_fields || '{}') : (row.schema_fields || {}),
      default_content: typeof row.default_content === 'string' ? JSON.parse(row.default_content || '{}') : (row.default_content || {}),
    }));
  } catch (err) {
    if (err.code === 'ER_BAD_FIELD_ERROR') {
      try {
        const [customRows] = await pool.execute(
          `SELECT slug, name_da, schema_fields, default_content FROM components WHERE slug LIKE 'custom/%' AND is_active = 1 ORDER BY sort_order ASC, name_da ASC`
        );
        customComponents = (customRows || []).map((row) => ({
          slug: row.slug,
          name_da: row.name_da,
          schema_fields: typeof row.schema_fields === 'string' ? JSON.parse(row.schema_fields || '{}') : (row.schema_fields || {}),
          default_content: typeof row.default_content === 'string' ? JSON.parse(row.default_content || '{}') : (row.default_content || {}),
        }));
      } catch (e2) {
        console.warn('Could not load custom components:', e2.message);
      }
    } else {
      console.warn('Could not load custom components:', err.message);
    }
  }

  // 4. Load AI prompt settings (optional – table may not exist yet)
  let promptSettings = {
    prompt_emne: 'Forretningsudvikling for kreative og tidsstyring',
    prompt_kundesegment: 'Freelance grafiske designere, der kæmper med at finde kunder.',
    prompt_personlighed: 'Vittig, samtalende og let sarkastisk, som en troværdig mentor.',
    prompt_intention: 'Uddan læseren og få dem til at tage handling (f.eks. kontakt eller tilbud).',
    prompt_format: 'Professionel hjemmesidetekst. Brug korte afsnit. Undgå klichéfyldte AI-ord.',
  };
  try {
    const [promptRows] = await pool.execute('SELECT * FROM ai_prompt_settings WHERE site_id = 1');
    if (promptRows.length > 0) {
      const p = promptRows[0];
      if (p.prompt_emne) promptSettings.prompt_emne = p.prompt_emne;
      if (p.prompt_kundesegment) promptSettings.prompt_kundesegment = p.prompt_kundesegment;
      if (p.prompt_personlighed) promptSettings.prompt_personlighed = p.prompt_personlighed;
      if (p.prompt_intention) promptSettings.prompt_intention = p.prompt_intention;
      if (p.prompt_format) promptSettings.prompt_format = p.prompt_format;
      if (p.prompt_avanceret_personlighed) promptSettings.prompt_avanceret_personlighed = p.prompt_avanceret_personlighed;
    }
    if (!promptSettings.prompt_avanceret_personlighed) {
      const avanceretPath = path.join(__dirname, '../content/avanceret-personlighed.md');
      if (fs.existsSync(avanceretPath)) {
        promptSettings.prompt_avanceret_personlighed = fs.readFileSync(avanceretPath, 'utf-8');
      }
    }
  } catch (err) {
    console.warn('ai_prompt_settings table not found or error:', err.message);
  }

  // 5. Load available media for AI image selection
  let availableMedia = [];
  try {
    const { getMediaForAi } = require('../routes/media');
    availableMedia = await getMediaForAi();
  } catch (err) {
    console.warn('Could not load media for AI:', err.message);
  }

  // 6. Build dynamic context
  return {
    designTokens: {
      colors: {
        primary: tokens.color_primary,
        primary_hover: tokens.color_primary_hover,
        primary_light: tokens.color_primary_light,
        secondary: tokens.color_secondary,
        secondary_hover: tokens.color_secondary_hover,
        secondary_light: tokens.color_secondary_light,
        accent: tokens.color_accent,
        accent_hover: tokens.color_accent_hover,
        neutral_50: tokens.color_neutral_50,
        neutral_100: tokens.color_neutral_100,
        neutral_200: tokens.color_neutral_200,
        neutral_300: tokens.color_neutral_300,
        neutral_600: tokens.color_neutral_600,
        neutral_700: tokens.color_neutral_700,
        neutral_800: tokens.color_neutral_800,
        neutral_900: tokens.color_neutral_900
      },
      typography: {
        font_heading: tokens.font_heading,
        font_body: tokens.font_body,
        font_size_base: tokens.font_size_base
      },
      shapes: {
        border_radius: tokens.border_radius,
        shadow_style: tokens.shadow_style
      }
    },
    componentLibrary: {
      index: libraryIndex,
      components: componentDocs,
      customComponents
    },
    cssVariableSyntax: {
      colors: 'bg-[var(--color-primary)]',
      text: 'text-[var(--color-text-primary)]',
      radius: 'rounded-[var(--radius-button)]',
      shadow: 'shadow-[var(--shadow-card)]',
      critical: 'NEVER use hardcoded Tailwind classes like bg-blue-600. Always use CSS variables.'
    },
    promptSettings,
    availableMedia
  };
}

function loadAllComponentDocs() {
  const docsDir = path.join(__dirname, '../component-docs');

  if (!fs.existsSync(docsDir)) {
    console.warn('Component docs directory not found');
    return {};
  }

  const files = fs.readdirSync(docsDir).filter(f =>
    f.endsWith('.md') && f !== '_COMPONENT_LIBRARY_INDEX.md'
  );

  const docs = {};
  for (const file of files) {
    const slug = file.replace('.md', '');
    try {
      docs[slug] = fs.readFileSync(path.join(docsDir, file), 'utf-8');
    } catch (error) {
      console.error(`Error reading component doc ${file}:`, error.message);
    }
  }

  return docs;
}

module.exports = { buildAiContext };
