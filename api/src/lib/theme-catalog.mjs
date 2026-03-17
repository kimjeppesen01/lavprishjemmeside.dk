// api/src/lib/theme-catalog.mjs
// ESM re-export so scripts/ (which are ESM) can import from the same source.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { THEME_CATALOG, getThemeEntry, isValidThemeKey } = require('./theme-catalog.js');
export { THEME_CATALOG, getThemeEntry, isValidThemeKey };
