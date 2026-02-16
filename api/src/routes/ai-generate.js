const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimit');
const { generatePageContent, generatePageContentAdvanced } = require('../services/anthropic');
const { buildAiContext } = require('../services/ai-context');

// POST /page — Generate page content with AI
router.post('/page', requireAuth, aiRateLimiter, async (req, res) => {
  try {
    const { prompt, page_path } = req.body;

    if (!prompt || !page_path) {
      return res.status(400).json({
        error: 'prompt og page_path er påkrævet'
      });
    }

    // 1. Build AI context directly (no HTTP call needed)
    console.log('Building AI context...');
    const context = await buildAiContext();

    // 2. Call Anthropic API
    console.log('Generating page content with AI...');
    const { components, seo, usage } = await generatePageContent(prompt, context, req.user.id);
    console.log(`✓ Generated ${components.length} components`);

    // 3. Save components to database
    const componentIds = [];

    for (const comp of components) {
      // Get component ID from slug
      const [componentRows] = await pool.execute(
        'SELECT id FROM components WHERE slug = ?',
        [comp.component_slug]
      );

      if (componentRows.length === 0) {
        console.warn(`Component not found: ${comp.component_slug}`);
        continue;
      }

      const component_id = componentRows[0].id;

      // Insert page_component (schema uses 'content' column for props/props_data)
      const [result] = await pool.execute(
        `INSERT INTO page_components
         (page_path, component_id, content, sort_order, is_published, created_by)
         VALUES (?, ?, ?, ?, 1, ?)`,
        [
          (page_path || '').trim(),
          component_id,
          JSON.stringify(comp.props_data),
          comp.sort_order || 0,
          req.user.id
        ]
      );

      componentIds.push(result.insertId);
    }

    // 4. Save page meta (SEO) if AI provided it
    if (seo) {
      try {
        const schemaMarkup = buildSchemaMarkup(page_path, seo, components);
        await pool.execute(
          `INSERT INTO page_meta (page_path, meta_title, meta_description, schema_markup, created_by)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             meta_title = VALUES(meta_title),
             meta_description = VALUES(meta_description),
             schema_markup = VALUES(schema_markup)`,
          [
            (page_path || '').trim(),
            seo.meta_title || null,
            seo.meta_description || null,
            JSON.stringify(schemaMarkup),
            req.user.id
          ]
        );
        console.log('✓ Saved page meta (SEO)');
      } catch (metaErr) {
        console.warn('Could not save page meta:', metaErr.message);
      }
    }

    // 5. Log AI usage
    const costPerToken = 0.000003; // $3 per 1M tokens (Sonnet pricing)
    const totalTokens = usage.input_tokens + usage.output_tokens;
    const cost = (totalTokens * costPerToken).toFixed(4);

    await pool.execute(
      `INSERT INTO ai_usage
       (user_id, operation, model, prompt_tokens, completion_tokens, total_tokens, cost_usd, output_metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'page_assembly',
        usage.model,
        usage.input_tokens,
        usage.output_tokens,
        totalTokens,
        cost,
        JSON.stringify({
          page_path,
          component_count: components.length,
          tool_calls: usage.tool_calls ?? 0,
          tools_used: usage.tools_used ?? [],
        }),
      ]
    );

    // 5. Log to security_logs
    await pool.execute(
      'INSERT INTO security_logs (action, ip_address, user_agent, user_id, details) VALUES (?, ?, ?, ?, ?)',
      [
        'ai.page.generate',
        req.ip,
        req.headers['user-agent'],
        req.user.id,
        JSON.stringify({ page_path, components: componentIds.length })
      ]
    );

    res.json({
      ok: true,
      page_path,
      components: componentIds,
      count: componentIds.length,
      usage: {
        tokens: totalTokens,
        cost_usd: parseFloat(cost)
      }
    });

  } catch (error) {
    console.error('Error generating page content:', error.message);
    console.error('Full error:', error);
    res.status(500).json({
      error: 'Kunne ikke generere sideindhold'
    });
  }
});

// POST /page-advanced — Advanced flow: transform human-written markdown into components (PRO)
router.post('/page-advanced', requireAuth, aiRateLimiter, async (req, res) => {
  try {
    const { page_path, content_markdown } = req.body;

    if (!page_path || !content_markdown) {
      return res.status(400).json({
        error: 'page_path og content_markdown er påkrævet'
      });
    }

    console.log('Building AI context for advanced flow...');
    const context = await buildAiContext();

    console.log('Generating page with Advanced (transformation) model...');
    const { components, seo, usage } = await generatePageContentAdvanced(
      String(content_markdown).trim(),
      context,
      req.user.id
    );
    console.log(`✓ Advanced: Generated ${components.length} components`);

    const componentIds = [];
    for (const comp of components) {
      const [componentRows] = await pool.execute(
        'SELECT id FROM components WHERE slug = ?',
        [comp.component_slug]
      );
      if (componentRows.length === 0) {
        console.warn(`Component not found: ${comp.component_slug}`);
        continue;
      }
      const [result] = await pool.execute(
        `INSERT INTO page_components (page_path, component_id, content, sort_order, is_published, created_by)
         VALUES (?, ?, ?, ?, 1, ?)`,
        [(page_path || '').trim(), componentRows[0].id, JSON.stringify(comp.props_data), comp.sort_order || 0, req.user.id]
      );
      componentIds.push(result.insertId);
    }

    if (seo) {
      try {
        const schemaMarkup = buildSchemaMarkup(page_path, seo, components);
        await pool.execute(
          `INSERT INTO page_meta (page_path, meta_title, meta_description, schema_markup, created_by)
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE meta_title = VALUES(meta_title), meta_description = VALUES(meta_description), schema_markup = VALUES(schema_markup)`,
          [(page_path || '').trim(), seo.meta_title || null, seo.meta_description || null, JSON.stringify(schemaMarkup), req.user.id]
        );
      } catch (metaErr) {
        console.warn('Could not save page meta:', metaErr.message);
      }
    }

    const totalTokens = usage.input_tokens + usage.output_tokens;
    const cost = (totalTokens * 0.000003).toFixed(4);
    await pool.execute(
      `INSERT INTO ai_usage (user_id, operation, model, prompt_tokens, completion_tokens, total_tokens, cost_usd, output_metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'page_assembly_advanced',
        usage.model,
        usage.input_tokens,
        usage.output_tokens,
        totalTokens,
        cost,
        JSON.stringify({
          page_path,
          component_count: components.length,
          tool_calls: usage.tool_calls ?? 0,
          tools_used: usage.tools_used ?? [],
        }),
      ]
    );

    await pool.execute(
      'INSERT INTO security_logs (action, ip_address, user_agent, user_id, details) VALUES (?, ?, ?, ?, ?)',
      ['ai.page.generate.advanced', req.ip, req.headers['user-agent'], req.user.id, JSON.stringify({ page_path, components: componentIds.length })]
    );

    res.json({
      ok: true,
      page_path,
      components: componentIds,
      count: componentIds.length,
      usage: { tokens: totalTokens, cost_usd: parseFloat(cost) }
    });
  } catch (error) {
    console.error('Error in advanced generation:', error.message);
    res.status(500).json({ error: 'Kunne ikke generere sideindhold' });
  }
});

/**
 * Build structured data (JSON-LD) for a page based on AI's schema_type hint and actual component data.
 * Returns an array of schema.org objects.
 */
function buildSchemaMarkup(pagePath, seoData, components) {
  const siteUrl = 'https://www.lavprishjemmeside.dk';
  const schemas = [];

  // 1. BreadcrumbList — always included
  const segments = pagePath.replace(/^\//, '').replace(/\/$/, '').split('/').filter(Boolean);
  const breadcrumbItems = [
    { '@type': 'ListItem', position: 1, name: 'Forside', item: siteUrl + '/' }
  ];
  segments.forEach((seg, i) => {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: i + 2,
      name: seg.charAt(0).toUpperCase() + seg.slice(1),
      item: siteUrl + '/' + segments.slice(0, i + 1).join('/')
    });
  });
  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems
  });

  // 2. WebPage (base — always included)
  const webPage = {
    '@context': 'https://schema.org',
    '@type': seoData.schema_type || 'WebPage',
    '@id': siteUrl + pagePath + '#webpage',
    name: seoData.meta_title || segments[segments.length - 1] || 'Side',
    url: siteUrl + pagePath,
    description: seoData.meta_description || '',
    inLanguage: 'da-DK',
    isPartOf: {
      '@type': 'WebSite',
      '@id': siteUrl + '/#website',
      name: 'Lavprishjemmeside.dk',
      url: siteUrl + '/'
    },
    publisher: { '@id': siteUrl + '/#organization' }
  };
  schemas.push(webPage);

  // 3. FAQPage — if page has faq-accordion components
  const faqComponent = components.find(c => c.component_slug === 'faq-accordion');
  if (faqComponent && Array.isArray(faqComponent.props_data?.faqs)) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqComponent.props_data.faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer
        }
      }))
    });
  }

  // 4. Product — if page has pricing-table components
  const pricingComponent = components.find(c => c.component_slug === 'pricing-table');
  if (pricingComponent && Array.isArray(pricingComponent.props_data?.tiers)) {
    pricingComponent.props_data.tiers.forEach(tier => {
      if (!tier.price) return;
      const priceNum = String(tier.price).replace(/[^0-9.,]/g, '').replace(',', '.');
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: tier.name || tier.title || 'Pakke',
        description: tier.description || '',
        brand: { '@type': 'Brand', name: 'Lavprishjemmeside.dk' },
        offers: {
          '@type': 'Offer',
          priceCurrency: 'DKK',
          price: priceNum,
          availability: 'https://schema.org/InStock',
          seller: { '@id': siteUrl + '/#organization' }
        }
      });
    });
  }

  return schemas;
}

module.exports = router;
