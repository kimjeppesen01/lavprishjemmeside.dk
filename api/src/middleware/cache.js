const NodeCache = require('node-cache');

/**
 * Cache keys registry:
 * - 'events:summary' → invalidated by: POST /events
 * - 'sessions:summary' → invalidated by: POST /events
 */

// Create cache instance (60 second TTL, check expired keys every 120s)
const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

/**
 * Cache middleware factory
 * @param {string} key - Cache key (e.g., 'events:summary')
 * @returns {function} Express middleware
 */
function cacheMiddleware(key) {
  return (req, res, next) => {
    try {
      const cached = cache.get(key);
      if (cached !== undefined) {
        console.log(`Cache hit: ${key}`);
        return res.json(cached);
      }

      // Intercept res.json to cache successful responses
      const originalJson = res.json.bind(res);
      res.json = (data) => {
        // Only cache 2xx responses with data (no errors)
        if (res.statusCode >= 200 && res.statusCode < 300 && data && !data.error) {
          cache.set(key, data);
          console.log(`Cache set: ${key}`);
        }
        return originalJson(data);
      };

      next();
    } catch (err) {
      // Don't break requests if caching fails (silent error handling)
      console.error('Cache middleware error:', err.message);
      next();
    }
  };
}

/**
 * Invalidate cache keys
 * @param {string[]} keys - Array of cache keys to delete
 */
function invalidateCache(keys) {
  try {
    keys.forEach(key => {
      const deleted = cache.del(key);
      if (deleted > 0) {
        console.log(`Cache invalidated: ${key}`);
      }
    });
  } catch (err) {
    console.error('Cache invalidation error:', err.message);
  }
}

module.exports = { cacheMiddleware, invalidateCache };
