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

module.exports = { loginRateLimiter, eventRateLimiter };
