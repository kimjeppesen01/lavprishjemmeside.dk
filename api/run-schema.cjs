/**
 * Run schema and seed SQL files in order. Called by scripts/setup.cjs.
 * Usage: from repo root, node api/run-schema.cjs
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mysql = require('mysql2/promise');

const SCHEMA_ORDER = [
  'schema.sql',
  'schema_password_reset.sql',
  'schema_phase6.sql',
  'schema_header_footer.sql',
  'schema_media.sql',
  'schema_page_meta.sql',
  'schema_ai_prompt_settings.sql',
  'schema_design_features.sql',
  'schema_theme_modes.sql',
  'schema_theme_settings.sql',
  'schema_master.sql',
  'schema_ian_control_plane.sql',
  'schema_indexes.sql',
];
const SEED_FILE = 'seed_components_v2.sql';
const MASTER_SEED_FILE = 'seed_master.sql';
const SRC = path.join(__dirname, 'src');

async function runSql(conn, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  try {
    await conn.query(sql);
  } catch (err) {
    if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.code === 'ER_DUP_FIELDNAME' || err.message.includes('Duplicate') || err.message.includes('already exists')) {
      return;
    }
    throw err;
  }
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true,
  });

  try {
    for (const file of SCHEMA_ORDER) {
      const fp = path.join(SRC, file);
      if (fs.existsSync(fp)) {
        console.log('  Running', file);
        await runSql(conn, fp);
      }
    }
    const seedPath = path.join(SRC, SEED_FILE);
    if (fs.existsSync(seedPath)) {
      console.log('  Running', SEED_FILE);
      await runSql(conn, seedPath);
    }
    const masterSeedPath = path.join(SRC, MASTER_SEED_FILE);
    if (fs.existsSync(masterSeedPath)) {
      console.log('  Running', MASTER_SEED_FILE);
      await runSql(conn, masterSeedPath);
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
