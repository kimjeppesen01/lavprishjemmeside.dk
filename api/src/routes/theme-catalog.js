'use strict';
const express = require('express');
const router = express.Router();
const { THEME_CATALOG } = require('../lib/theme-catalog');

// GET /theme-catalog — public, no auth required
router.get('/', (req, res) => {
  res.json({ themes: THEME_CATALOG });
});

module.exports = router;
