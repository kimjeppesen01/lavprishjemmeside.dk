const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'admin' && payload.role !== 'master') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Must run after requireAuth. Restricts access to users with role === 'master' (e.g. /admin/master and /master/*). */
function requireMaster(req, res, next) {
  if (!req.user || req.user.role !== 'master') {
    return res.status(403).json({ error: 'Master access required', code: 'MASTER_REQUIRED' });
  }
  next();
}

module.exports = { requireAuth, requireMaster };
