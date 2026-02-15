const rateLimit = require('express-rate-limit');

// Strict rate limit for login (prevents brute-force attacks)
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many login attempts, please try again in 15 minutes' });
  }
});

// Lenient rate limit for event tracking (prevents spam)
const eventRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many events, please slow down' });
  }
});

// Password reset rate limiter (prevents abuse)
const passwordResetRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 reset requests per email per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'For mange anmodninger. Prøv igen om 15 minutter' });
  },
  // Key by email from request body (prevents per-email abuse)
  keyGenerator: (req) => {
    return req.body.email || 'anonymous';
  },
  skip: (req) => !req.body.email // Skip rate limit if no email provided
});

// AI rate limiter (shared across Phase 6 & Phase 7)
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 AI operations per hour per user
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({ error: 'For mange AI-forespørgsler. Prøv igen om en time' });
  },
  keyGenerator: (req) => {
    return req.user?.id ? `user:${req.user.id}` : 'anonymous';
  },
  skip: (req) => !req.user?.id // Skip rate limit if not authenticated
});

module.exports = {
  loginRateLimiter,
  eventRateLimiter,
  passwordResetRateLimiter,
  aiRateLimiter
};
