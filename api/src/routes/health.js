const express = require('express');
const pool = require('../db');
const { getCmsVersionInfo } = require('../services/cms-version');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const cms = await getCmsVersionInfo(pool);
    await pool.execute('SELECT 1');
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
      cms
    });
  } catch (err) {
    const cms = await getCmsVersionInfo(pool);
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      reason: err.message || String(err),
      cms
    });
  }
});

module.exports = router;
