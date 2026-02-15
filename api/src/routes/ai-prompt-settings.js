const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');

const DEFAULTS = {
  prompt_emne: 'Forretningsudvikling for kreative og tidsstyring',
  prompt_kundesegment: 'Freelance grafiske designere, der kæmper med at finde kunder.',
  prompt_personlighed: 'Vittig, samtalende og let sarkastisk, som en troværdig mentor.',
  prompt_intention: 'Uddan læseren og få dem til at tage handling (f.eks. kontakt eller tilbud).',
  prompt_format: 'Professionel hjemmesidetekst. Brug korte afsnit. Undgå klichéfyldte AI-ord.',
};

// GET /ai-prompt-settings — Authenticated
router.get('/', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM ai_prompt_settings WHERE site_id = 1');
    if (rows.length === 0) {
      return res.json({ ...DEFAULTS, prompt_avanceret_personlighed: '' });
    }
    const r = rows[0];
    res.json({
      prompt_emne: r.prompt_emne ?? DEFAULTS.prompt_emne,
      prompt_kundesegment: r.prompt_kundesegment ?? DEFAULTS.prompt_kundesegment,
      prompt_personlighed: r.prompt_personlighed ?? DEFAULTS.prompt_personlighed,
      prompt_intention: r.prompt_intention ?? DEFAULTS.prompt_intention,
      prompt_format: r.prompt_format ?? DEFAULTS.prompt_format,
      prompt_avanceret_personlighed: r.prompt_avanceret_personlighed ?? '',
    });
  } catch (error) {
    console.error('Error fetching AI prompt settings:', error.message);
    res.json({ ...DEFAULTS, prompt_avanceret_personlighed: '' });
  }
});

// GET /ai-prompt-settings/default-avanceret — Returns default .md file content
router.get('/default-avanceret', requireAuth, (req, res) => {
  const filePath = path.join(__dirname, '../content/avanceret-personlighed.md');
  if (!fs.existsSync(filePath)) {
    return res.json({ content: '' });
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    res.json({ content });
  } catch (err) {
    console.error('Error reading avanceret-personlighed.md:', err.message);
    res.json({ content: '' });
  }
});

// POST /ai-prompt-settings/update — Authenticated
router.post('/update', requireAuth, async (req, res) => {
  try {
    const { prompt_emne, prompt_kundesegment, prompt_personlighed, prompt_intention, prompt_format, prompt_avanceret_personlighed } = req.body;

    const [existing] = await pool.execute('SELECT id FROM ai_prompt_settings WHERE site_id = 1');

    const emne = (prompt_emne ?? '').toString().slice(0, 500) || DEFAULTS.prompt_emne;
    const kundesegment = (prompt_kundesegment ?? '').toString().slice(0, 500) || DEFAULTS.prompt_kundesegment;
    const personlighed = (prompt_personlighed ?? '').toString().slice(0, 500) || DEFAULTS.prompt_personlighed;
    const intention = (prompt_intention ?? '').toString().slice(0, 500) || DEFAULTS.prompt_intention;
    const format = (prompt_format ?? '').toString().slice(0, 500) || DEFAULTS.prompt_format;
    const avanceret = (prompt_avanceret_personlighed ?? '').toString().slice(0, 16000) || null;

    if (existing.length > 0) {
      await pool.execute(
        `UPDATE ai_prompt_settings SET
          prompt_emne = ?, prompt_kundesegment = ?, prompt_personlighed = ?,
          prompt_intention = ?, prompt_format = ?, prompt_avanceret_personlighed = ?, updated_by = ?
        WHERE site_id = 1`,
        [emne, kundesegment, personlighed, intention, format, avanceret, req.user.id]
      );
    } else {
      await pool.execute(
        `INSERT INTO ai_prompt_settings (site_id, prompt_emne, prompt_kundesegment, prompt_personlighed, prompt_intention, prompt_format, prompt_avanceret_personlighed, updated_by)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
        [emne, kundesegment, personlighed, intention, format, avanceret, req.user.id]
      );
    }

    res.json({
      ok: true,
      data: { prompt_emne: emne, prompt_kundesegment: kundesegment, prompt_personlighed: personlighed, prompt_intention: intention, prompt_format: format, prompt_avanceret_personlighed: avanceret ?? '' },
    });
  } catch (error) {
    console.error('Error updating AI prompt settings:', error.message);
    res.status(500).json({ error: 'Kunne ikke opdatere indstillinger' });
  }
});

module.exports = router;
