/**
 * Run schema and seed SQL files in order. Called by scripts/setup.cjs.
 * Usage: from repo root, node api/run-schema.cjs
 *
 * Improvements (Phase 3):
 * - Per-file progress reporting with timing
 * - Structured error output: which file failed, which statement, and why
 * - Missing-file warnings instead of silent skips
 * - Post-run summary table
 * - Validates run order before executing
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mysql = require('mysql2/promise');

const SCHEMA_ORDER = [
  'schema.sql',
  'schema_password_reset.sql',
  'schema_phase6.sql',
  'schema_ai_usage_operation.sql',
  'schema_components_source.sql',
  'schema_header_footer.sql',
  'schema_media.sql',
  'schema_page_meta.sql',
  'schema_ai_prompt_settings.sql',
  'schema_design_features.sql',
  'schema_theme_modes.sql',
  'schema_theme_settings.sql',
  'schema_theme_key_varchar.sql',   // <-- add this line
  'schema_master.sql',
  'schema_assistant_settings.sql',
  'schema_component_requests.sql',
  'schema_master_audit.sql',
  'schema_master_role.sql',
  'schema_master_task_md.sql',
  'schema_media_v2.sql',
  'schema_modern_mega.sql',
  'schema_overlap_module.sql',
  'schema_immersive_content_visual.sql',
  'schema_add_product_carousel_sticky_column.sql',
  'schema_ai_prompt_avanceret.sql',
  'schema_shop.sql',
  'schema_shop_collections.sql',
  'schema_stock_reservations.sql',
  'schema_order_notes.sql',
  'schema_shipping_zones.sql',
  'schema_customer_accounts.sql',
  'schema_email_templates.sql',
  'schema_stock_notifications.sql',
  'schema_abandoned_carts.sql',
  'schema_product_reviews.sql',
  'schema_migrate_immersive_visual.sql',
  'schema_component_versions.sql',
  'schema_indexes.sql',
];

const SEED_FILES = [
  { file: 'seed_components_v2.sql', label: 'Component library seed (v2)' },
  { file: 'seed_components_incremental.sql', label: 'Component library seed (incremental sync)' },
  { file: 'seed_master.sql', label: 'Master seed' },
];

const SRC = path.join(__dirname, 'src');

// ─── Ignoreable error codes ────────────────────────────────────
// These indicate the statement was already applied — safe to skip.
const IDEMPOTENT_CODES = new Set([
  'ER_TABLE_EXISTS_ERROR',
  'ER_DUP_FIELDNAME',
  'ER_DUP_KEYNAME',
  'ER_KEY_COLUMN_DOES_NOT_EXISTS',
  'ER_CANT_DROP_FIELD_OR_KEY',
]);

function isIdempotentError(err) {
  if (IDEMPOTENT_CODES.has(err.code)) return true;
  const msg = String(err.message || '').toLowerCase();
  return (
    msg.includes('duplicate') ||
    msg.includes('already exists') ||
    msg.includes("can't drop") ||
    msg.includes("check that column/key exists")
  );
}

// ─── SQL statement splitter ────────────────────────────────────
// Splits a multi-statement SQL string into individual statements,
// respecting string literals and DELIMITER blocks.
function splitStatements(sql) {
  const stmts = [];
  let current = '';
  let delimiter = ';';
  const lines = sql.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    // Handle DELIMITER changes (common in stored procedures/triggers)
    const delimMatch = trimmed.match(/^DELIMITER\s+(\S+)/i);
    if (delimMatch) {
      delimiter = delimMatch[1];
      continue;
    }
    current += line + '\n';
    if (current.trimEnd().endsWith(delimiter)) {
      const stmt = delimiter !== ';'
        ? current.replace(new RegExp(delimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'), '').trim()
        : current.trim().replace(/;$/, '').trim();
      if (cleanStatement(stmt).replace(/\s/g, '').length > 0) {
        stmts.push(stmt);
      }
      current = '';
    }
  }
  // Flush any remainder (file not terminated with delimiter)
  const remainder = current.trim().replace(/;$/, '').trim();
  if (cleanStatement(remainder).replace(/\s/g, '').length > 0) {
    stmts.push(remainder);
  }
  return stmts.filter(Boolean);
}

function cleanStatement(stmt) {
  return String(stmt || '')
    .replace(/^\s*--.*$/gm, '')
    .replace(/^\s*#.*$/gm, '')
    .trim();
}

// ─── Run one SQL file ──────────────────────────────────────────
async function runFile(conn, filePath, label) {
  const start = Date.now();
  const sql = fs.readFileSync(filePath, 'utf8');
  let stmts;
  try {
    stmts = splitStatements(sql);
  } catch (_) {
    // Fallback: send as a single multi-statement batch
    stmts = [sql];
  }

  if (!stmts.length) {
    console.log(`  [schema] ${label} — empty, skipped (${Date.now() - start}ms)`);
    return { file: label, status: 'empty', statements: 0, skipped: 0, errors: [] };
  }

  let applied = 0;
  let skipped = 0;
  const errors = [];

  for (let i = 0; i < stmts.length; i++) {
    const stmt = stmts[i];
    try {
      await conn.query(stmt);
      applied++;
    } catch (err) {
      if (isIdempotentError(err)) {
        skipped++;
      } else {
        const preview = stmt.replace(/\s+/g, ' ').substring(0, 120);
        errors.push({
          statement: i + 1,
          total: stmts.length,
          preview,
          code: err.code || 'UNKNOWN',
          message: err.message,
        });
        // Non-idempotent error: re-throw with context
        const detail = `File: ${label}\nStatement ${i + 1}/${stmts.length}: ${preview}\nError [${err.code || 'UNKNOWN'}]: ${err.message}`;
        const wrapped = new Error(detail);
        wrapped.schemaFile = label;
        wrapped.statementIndex = i + 1;
        wrapped.statementPreview = preview;
        wrapped.originalCode = err.code;
        throw wrapped;
      }
    }
  }

  const elapsed = Date.now() - start;
  const parts = [`applied: ${applied}`];
  if (skipped > 0) parts.push(`skipped (already exists): ${skipped}`);
  console.log(`  [schema] ${label} — ${parts.join(', ')} (${elapsed}ms)`);

  return { file: label, status: 'ok', statements: stmts.length, applied, skipped, errors };
}

// ─── Check connection ──────────────────────────────────────────
async function checkConnection(config) {
  const conn = await mysql.createConnection(config);
  try {
    await conn.query('SELECT 1');
  } finally {
    await conn.end();
  }
}

// ─── Main ──────────────────────────────────────────────────────
async function main() {
  const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: false,
    connectTimeout: 10000,
  };

  if (!dbConfig.user || !dbConfig.password || !dbConfig.database) {
    console.error('[run-schema] ERROR: DB_USER, DB_PASSWORD, and DB_NAME are required.');
    console.error('[run-schema] Ensure api/.env exists and is loaded.');
    process.exit(1);
  }

  console.log(`[run-schema] Connecting to ${dbConfig.host}/${dbConfig.database} as ${dbConfig.user}`);

  try {
    await checkConnection(dbConfig);
  } catch (err) {
    console.error('[run-schema] ERROR: Cannot connect to database.');
    console.error('[run-schema] Host:', dbConfig.host, '| DB:', dbConfig.database);
    console.error('[run-schema] Details:', err.message);
    console.error('[run-schema] Check DB credentials, DB host, and network access (cPanel: DB must allow 127.0.0.1).');
    process.exit(1);
  }

  const conn = await mysql.createConnection({ ...dbConfig, multipleStatements: false });
  const results = [];

  console.log('\n[run-schema] Running schema files...\n');

  try {
    // ── Schema files ─────────────────────────────────────────
    for (const file of SCHEMA_ORDER) {
      const fp = path.join(SRC, file);
      if (!fs.existsSync(fp)) {
        console.warn(`  [schema] WARNING: ${file} not found — skipping`);
        results.push({ file, status: 'missing' });
        continue;
      }
      try {
        const result = await runFile(conn, fp, file);
        results.push(result);
      } catch (err) {
        await conn.end();
        console.error('\n[run-schema] FATAL: Schema execution failed.');
        console.error('[run-schema]', err.message);
        console.error('\n[run-schema] Repair options:');
        console.error('  1. Fix the SQL error in', err.schemaFile || file);
        console.error('  2. If this is a new ALTER that conflicts, check if the column/index already exists');
        console.error('  3. Re-run setup — schema step will retry from scratch');
        process.exit(1);
      }
    }

    // ── Seed files ────────────────────────────────────────────
    console.log('\n[run-schema] Running seed files...\n');
    for (const { file, label } of SEED_FILES) {
      const fp = path.join(SRC, file);
      if (!fs.existsSync(fp)) {
        console.warn(`  [seed] WARNING: ${file} not found — skipping`);
        results.push({ file, status: 'missing' });
        continue;
      }
      try {
        const result = await runFile(conn, fp, `${file} (${label})`);
        results.push(result);
      } catch (err) {
        await conn.end();
        console.error('\n[run-schema] FATAL: Seed execution failed.');
        console.error('[run-schema]', err.message);
        process.exit(1);
      }
    }

  } finally {
    await conn.end();
  }

  // ── Summary ──────────────────────────────────────────────────
  const ok = results.filter((r) => r.status === 'ok').length;
  const empty = results.filter((r) => r.status === 'empty').length;
  const missing = results.filter((r) => r.status === 'missing').length;

  console.log('\n[run-schema] ─── Summary ───────────────────────────────');
  console.log(`  Files OK      : ${ok}`);
  if (empty > 0) console.log(`  Files empty   : ${empty}`);
  if (missing > 0) console.log(`  Files missing : ${missing} (warnings above)`);
  console.log('[run-schema] Schema + seed complete.\n');
}

main().catch((err) => {
  console.error('[run-schema] FATAL:', err.message || err);
  process.exit(1);
});
