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

  // 3. Load all component docs
  const componentDocs = loadAllComponentDocs();

  // 4. Build dynamic context
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
      components: componentDocs
    },
    cssVariableSyntax: {
      colors: 'bg-[var(--color-primary)]',
      text: 'text-[var(--color-text-primary)]',
      radius: 'rounded-[var(--radius-button)]',
      shadow: 'shadow-[var(--shadow-card)]',
      critical: 'NEVER use hardcoded Tailwind classes like bg-blue-600. Always use CSS variables.'
    }
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
