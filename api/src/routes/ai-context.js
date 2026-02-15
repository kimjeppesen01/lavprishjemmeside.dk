const express = require('express');
const router = express.Router();
const pool = require('../db');
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../middleware/auth');

// GET /ai/context — Generate dynamic AI context from design_settings + component docs
router.get('/context', requireAuth, async (req, res) => {
  try {
    // 1. Load current design settings from database
    const [settings] = await pool.execute(
      'SELECT * FROM design_settings WHERE site_id = 1'
    );

    if (settings.length === 0) {
      return res.status(404).json({ error: 'Design indstillinger ikke fundet' });
    }

    const tokens = settings[0];

    // 2. Load component library index
    const indexPath = path.join(__dirname, '../component-docs/_COMPONENT_LIBRARY_INDEX.md');
    let libraryIndex = '';

    if (fs.existsSync(indexPath)) {
      libraryIndex = fs.readFileSync(indexPath, 'utf-8');
    } else {
      console.warn('Component library index not found - will be created in Stage 2');
      libraryIndex = '# Component Library Index\n\n(To be created in Phase 6 Stage 2)';
    }

    // 3. Load all component docs (if they exist)
    const componentDocs = loadAllComponentDocs();

    // 4. Build dynamic context
    const context = {
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
          border_radius: tokens.border_radius, // 'small', 'medium', 'large', etc.
          shadow_style: tokens.shadow_style     // 'none', 'subtle', 'medium', 'dramatic'
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

    res.json(context);
  } catch (error) {
    console.error('Error generating AI context:', error.message);
    res.status(500).json({ error: 'Kunne ikke generere AI-kontekst' });
  }
});

// Helper: Load all component docs
function loadAllComponentDocs() {
  const docsDir = path.join(__dirname, '../component-docs');

  // Check if docs directory exists
  if (!fs.existsSync(docsDir)) {
    console.warn('Component docs directory not found - will be created in Stage 2');
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

module.exports = router;
