const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireAuth } = require('../middleware/auth');
const agentEnterprise = require('../services/agent-enterprise');

async function ensureSettingsRow() {
  await pool.execute(
    `INSERT IGNORE INTO assistant_settings (site_id, assistant_status)
     VALUES (1, 'draft')`,
  );
}

function parseQuestionnaire(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (_) {
    return null;
  }
}

function toLocalSettings(row) {
  if (!row) {
    return {
      site_id: 1,
      assistant_status: 'draft',
      assistant_name: null,
      site_key: null,
      client_agent_id: null,
      last_session_id: null,
      last_synced_at: null,
      questionnaire: null,
      preview_user_md: null,
      preview_soul_md: null,
    };
  }

  return {
    site_id: row.site_id,
    assistant_status: row.assistant_status,
    assistant_name: row.assistant_name,
    site_key: row.site_key,
    client_agent_id: row.client_agent_id,
    last_session_id: row.last_session_id,
    last_synced_at: row.last_synced_at,
    questionnaire: parseQuestionnaire(row.questionnaire_json),
    preview_user_md: row.preview_user_md,
    preview_soul_md: row.preview_soul_md,
    updated_at: row.updated_at,
  };
}

async function getLocalSettings() {
  await ensureSettingsRow();
  const [rows] = await pool.execute(
    'SELECT * FROM assistant_settings WHERE site_id = 1',
  );

  return toLocalSettings(rows[0] || null);
}

async function saveLocalSettings(update = {}, userId = null) {
  const current = await getLocalSettings();
  const questionnaire =
    update.questionnaire !== undefined ? update.questionnaire : current.questionnaire;
  const values = {
    assistant_status:
      update.assistant_status || current.assistant_status || 'draft',
    assistant_name:
      update.assistant_name !== undefined
        ? update.assistant_name
        : current.assistant_name,
    site_key:
      update.site_key !== undefined
        ? update.site_key
        : current.site_key || process.env.AGENT_ENTERPRISE_SITE_KEY || null,
    client_agent_id:
      update.client_agent_id !== undefined
        ? update.client_agent_id
        : current.client_agent_id ||
          process.env.AGENT_ENTERPRISE_CLIENT_AGENT_ID ||
          null,
    last_session_id:
      update.last_session_id !== undefined
        ? update.last_session_id
        : current.last_session_id,
    last_synced_at: update.last_synced_at || current.last_synced_at || null,
    questionnaire_json: questionnaire ? JSON.stringify(questionnaire) : null,
    preview_user_md:
      update.preview_user_md !== undefined
        ? update.preview_user_md
        : current.preview_user_md,
    preview_soul_md:
      update.preview_soul_md !== undefined
        ? update.preview_soul_md
        : current.preview_soul_md,
    updated_by: userId,
  };

  await pool.execute(
    `UPDATE assistant_settings
        SET assistant_status = ?,
            assistant_name = ?,
            site_key = ?,
            client_agent_id = ?,
            last_session_id = ?,
            last_synced_at = ?,
            questionnaire_json = ?,
            preview_user_md = ?,
            preview_soul_md = ?,
            updated_by = ?
      WHERE site_id = 1`,
    [
      values.assistant_status,
      values.assistant_name,
      values.site_key,
      values.client_agent_id,
      values.last_session_id,
      values.last_synced_at,
      values.questionnaire_json,
      values.preview_user_md,
      values.preview_soul_md,
      values.updated_by,
    ],
  );

  return getLocalSettings();
}

async function syncFromRemote(req, remoteAssistant) {
  return saveLocalSettings(
    {
      assistant_status: remoteAssistant?.status || 'draft',
      assistant_name: remoteAssistant?.assistantName || null,
      site_key: remoteAssistant?.siteKey || null,
      client_agent_id: remoteAssistant?.clientAgentId || null,
      last_synced_at: new Date(),
      questionnaire: remoteAssistant?.questionnaire || null,
      preview_user_md: remoteAssistant?.preview?.userMd || null,
      preview_soul_md: remoteAssistant?.preview?.soulMd || null,
    },
    req.user.id,
  );
}

router.get('/', requireAuth, async (req, res) => {
  const localSettings = await getLocalSettings();
  const sessionId = String(req.query?.sessionId || '').trim();

  try {
    const remote = await agentEnterprise.getAssistant({ sessionId });
    const synced = await syncFromRemote(req, remote.assistant);

    res.json({
      configured: true,
      assistant: remote.assistant,
      local_settings: synced,
    });
  } catch (error) {
    if (error.statusCode === 503) {
      return res.json({
        configured: false,
        assistant: null,
        local_settings: localSettings,
        error: error.message,
      });
    }

    console.error('GET /assistant error:', error.message);
    res.status(error.statusCode || 502).json({
      configured: true,
      assistant: null,
      local_settings: localSettings,
      error: error.message || 'Kunne ikke hente assistant status',
    });
  }
});

router.post('/setup', requireAuth, async (req, res) => {
  try {
    const remote = await agentEnterprise.updateAssistantSetup(req.body || {});
    const synced = await syncFromRemote(req, remote.assistant);

    res.json({
      ok: true,
      assistant: remote.assistant,
      local_settings: synced,
    });
  } catch (error) {
    console.error('POST /assistant/setup error:', error.message);
    res.status(error.statusCode || 502).json({
      error: error.message || 'Kunne ikke gemme assistant setup',
    });
  }
});

router.post('/sessions', requireAuth, async (req, res) => {
  try {
    const payload = await agentEnterprise.createAssistantSession(req.body || {});
    const synced = await saveLocalSettings(
      {
        last_session_id: payload?.session?.id || null,
        last_synced_at: new Date(),
      },
      req.user.id,
    );

    res.status(201).json({
      ...payload,
      local_settings: synced,
    });
  } catch (error) {
    console.error('POST /assistant/sessions error:', error.message);
    res.status(error.statusCode || 502).json({
      error: error.message || 'Kunne ikke oprette assistant session',
    });
  }
});

router.post('/sessions/:sessionId/messages', requireAuth, async (req, res) => {
  try {
    const payload = await agentEnterprise.sendAssistantMessage(
      req.params.sessionId,
      req.body || {},
    );
    const synced = await saveLocalSettings(
      {
        last_session_id: req.params.sessionId,
        last_synced_at: new Date(),
      },
      req.user.id,
    );

    res.json({
      ok: true,
      ...payload,
      local_settings: synced,
    });
  } catch (error) {
    console.error('POST /assistant/sessions/:sessionId/messages error:', error.message);
    res.status(error.statusCode || 502).json({
      error: error.message || 'Kunne ikke sende besked til assistant',
    });
  }
});

router.post('/tickets', requireAuth, async (req, res) => {
  try {
    const payload = await agentEnterprise.createAssistantTicket(req.body || {});

    res.status(payload.accepted ? 201 : 202).json(payload);
  } catch (error) {
    console.error('POST /assistant/tickets error:', error.message);
    res.status(error.statusCode || 502).json({
      error: error.message || 'Kunne ikke oprette engineering ticket',
    });
  }
});

module.exports = router;
