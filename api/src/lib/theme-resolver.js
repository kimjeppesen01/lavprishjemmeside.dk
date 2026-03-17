// api/src/lib/theme-resolver.js
'use strict';
const { getThemeEntry, THEME_CATALOG } = require('./theme-catalog');

/**
 * Resolves a theme key to its catalog entry.
 * Throws a descriptive error if the key is not found.
 * Use this everywhere a theme must be guaranteed to exist.
 *
 * @param {string} key - e.g. 'simple', 'modern', 'kreativ'
 * @returns {object} The matching catalog entry
 * @throws {Error} If key is not in the catalog
 */
function resolveTheme(key) {
  const entry = getThemeEntry(key);
  if (!entry) {
    const validKeys = THEME_CATALOG.map((t) => t.theme_key).join(', ');
    throw new Error(
      `Ukendt active_theme_key: '${key}'. Gyldige nøgler: ${validKeys}. ` +
      `Tilføj temaet til api/src/lib/theme-catalog.js for at fortsætte.`
    );
  }
  return entry;
}

module.exports = { resolveTheme };
