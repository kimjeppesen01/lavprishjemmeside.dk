const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const agentEnterprise = require('../services/agent-enterprise');

router.get('/status', requireAuth, async (req, res) => {
  try {
    const payload = await agentEnterprise.getRolloutStatus();
    res.json(payload);
  } catch (error) {
    console.error('GET /rollout/status error:', error.message);
    res.status(error.statusCode || 502).json({
      error: error.message || 'Kunne ikke hente opdateringsstatus',
      status: 'status_unavailable',
    });
  }
});

module.exports = router;
