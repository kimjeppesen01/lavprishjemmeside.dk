function requireEnv(name) {
  const value = String(process.env[name] || '').trim();

  if (!value) {
    const error = new Error(`${name} is not configured`);
    error.statusCode = 503;
    throw error;
  }

  return value;
}

function assistantBaseUrl() {
  const origin = requireEnv('AGENT_ENTERPRISE_URL').replace(/\/+$/, '');
  const siteKey = requireEnv('AGENT_ENTERPRISE_SITE_KEY');

  return `${origin}/api/lavpris/sites/${encodeURIComponent(siteKey)}/assistant`;
}

async function parseResponse(response) {
  let payload = null;

  try {
    payload = await response.json();
  } catch (_) {
    payload = null;
  }

  if (!response.ok) {
    const error = new Error(payload?.error || `Agent Enterprise request failed (${response.status})`);
    error.statusCode = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

function siteHeaders() {
  return {
    'content-type': 'application/json',
    'x-lavpris-site-token': requireEnv('AGENT_ENTERPRISE_SITE_TOKEN'),
  };
}

function provisionHeaders() {
  return {
    'content-type': 'application/json',
    'x-lavpris-provision-token': requireEnv('AGENT_ENTERPRISE_PROVISION_TOKEN'),
  };
}

function masterHeaders() {
  return {
    'content-type': 'application/json',
    'x-lavpris-master-token': requireEnv('AGENT_ENTERPRISE_LAVPRIS_MASTER_TOKEN'),
  };
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  return parseResponse(response);
}

async function getAssistant(options = {}) {
  const sessionId = String(options.sessionId || "").trim();
  const url = sessionId
    ? `${assistantBaseUrl()}?sessionId=${encodeURIComponent(sessionId)}`
    : assistantBaseUrl();

  return request(url, {
    headers: siteHeaders(),
  });
}

async function updateAssistantSetup(payload = {}) {
  return request(`${assistantBaseUrl()}/setup`, {
    method: 'PATCH',
    headers: siteHeaders(),
    body: JSON.stringify(payload),
  });
}

async function createAssistantSession(payload = {}) {
  return request(`${assistantBaseUrl()}/sessions`, {
    method: 'POST',
    headers: siteHeaders(),
    body: JSON.stringify(payload),
  });
}

async function sendAssistantMessage(sessionId, payload = {}) {
  return request(`${assistantBaseUrl()}/sessions/${encodeURIComponent(sessionId)}/messages`, {
    method: 'POST',
    headers: siteHeaders(),
    body: JSON.stringify(payload),
  });
}

async function createAssistantTicket(payload = {}) {
  return request(`${assistantBaseUrl()}/tickets`, {
    method: 'POST',
    headers: siteHeaders(),
    body: JSON.stringify(payload),
  });
}

async function provisionClientAgent(payload = {}) {
  const origin = requireEnv('AGENT_ENTERPRISE_URL').replace(/\/+$/, '');

  return request(`${origin}/api/lavpris/client-agents/provision`, {
    method: 'POST',
    headers: provisionHeaders(),
    body: JSON.stringify(payload),
  });
}

function hasMasterRolloutAccess() {
  return Boolean(String(process.env.AGENT_ENTERPRISE_LAVPRIS_MASTER_TOKEN || '').trim());
}

async function getRolloutStatus() {
  const origin = requireEnv('AGENT_ENTERPRISE_URL').replace(/\/+$/, '');
  const siteKey = requireEnv('AGENT_ENTERPRISE_SITE_KEY');

  if (hasMasterRolloutAccess()) {
    return request(`${origin}/api/lavpris/rollout/status`, {
      headers: masterHeaders(),
    });
  }

  return request(`${origin}/api/lavpris/sites/${encodeURIComponent(siteKey)}/rollout-status`, {
    headers: siteHeaders(),
  });
}

module.exports = {
  getAssistant,
  updateAssistantSetup,
  createAssistantSession,
  sendAssistantMessage,
  createAssistantTicket,
  provisionClientAgent,
  getRolloutStatus,
  hasMasterRolloutAccess,
  requireEnv,
};
