const pool = require('../db');
const {
  buildComponentLibraryIndex,
  loadActiveLibraryComponents,
  loadComponentDocsForLibrary,
  loadCustomComponents,
} = require('./component-library');
const { resolveTheme } = require('../lib/theme-resolver');

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

  // 2. Load active component registry and docs for the current CMS library.
  const libraryComponents = await loadActiveLibraryComponents(pool);
  const { docs: componentDocs, missingDocs } = loadComponentDocsForLibrary(libraryComponents);
  const libraryIndex = buildComponentLibraryIndex(libraryComponents);

  // 3. Load custom components from DB (source = 'custom')
  let customComponents = [];
  try {
    customComponents = await loadCustomComponents(pool);
  } catch (err) {
    console.warn('Could not load custom components:', err.message);
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

  // 6. Load active theme from site_theme_settings and resolve catalog entry
  let activeTheme = null;
  try {
    const [themeRows] = await pool.execute(
      'SELECT active_theme_key, motion_profile FROM site_theme_settings WHERE site_id = 1 LIMIT 1'
    );
    if (themeRows.length > 0) {
      const { active_theme_key, motion_profile } = themeRows[0];
      const entry = resolveTheme(active_theme_key);
      activeTheme = {
        theme_key: active_theme_key,
        motion_profile: motion_profile || 'standard',
        label: entry.label,
        supports_commerce: entry.supports_commerce,
        supports_page_builder: entry.supports_page_builder,
        supported_sections: entry.supported_sections ?? null,
        business_modes: entry.business_modes,
        constraint: `Generer kun komponenter og layouts der er kompatible med temaet '${active_theme_key}'.`,
      };
    }
  } catch (err) {
    console.warn('ai-context: could not load theme settings:', err.message);
  }

  // 7. Build dynamic context
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
      registry: libraryComponents,
      missingDocs,
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
    availableMedia,
    activeTheme
  };
}

module.exports = { buildAiContext };
