const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimit');
const { generatePageContent } = require('../services/anthropic');

const API_BASE_URL = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

// POST /page — Generate page content with AI
router.post('/page', requireAuth, aiRateLimiter, async (req, res) => {
  try {
    const { prompt, page_path } = req.body;

    if (!prompt || !page_path) {
      return res.status(400).json({
        error: 'prompt og page_path er påkrævet'
      });
    }

    // 1. Fetch dynamic context
    const contextResponse = await fetch(`${API_BASE_URL}/ai/context`, {
      headers: { 'Authorization': req.headers.authorization }
    });

    if (!contextResponse.ok) {
      throw new Error('Could not fetch AI context');
    }

    const context = await contextResponse.json();

    // 2. Call Anthropic API
    console.log('Generating page content with AI...');
    const { components, usage } = await generatePageContent(prompt, context);
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
         VALUES (?, ?, ?, ?, 0, ?)`,
        [
          page_path,
          component_id,
          JSON.stringify(comp.props_data),
          comp.sort_order || 0,
          req.user.id
        ]
      );

      componentIds.push(result.insertId);
    }

    // 4. Log AI usage
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
        JSON.stringify({ page_path, component_count: components.length })
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
    res.status(500).json({
      error: 'Kunne ikke generere sideindhold',
      debug: error.message
    });
  }
});

module.exports = router;
