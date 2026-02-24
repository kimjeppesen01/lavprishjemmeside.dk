/**
 * Delete the two most recent Kanban items (e.g. Haiku/Sonnet test responses).
 * Usage: from repo root, node api/refresh-kanban.cjs
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const [rows] = await conn.query(
      'SELECT id, title, column_name FROM kanban_items ORDER BY id DESC LIMIT 2'
    );
    if (rows.length === 0) {
      console.log('No kanban items to delete.');
      return;
    }
    const ids = rows.map((r) => r.id);
    console.log('Deleting:', rows.map((r) => `#${r.id} "${r.title}" (${r.column_name})`).join(', '));
    const placeholders = ids.map(() => '?').join(',');
    await conn.query(`DELETE FROM kanban_items WHERE id IN (${placeholders})`, ids);
    console.log('Done. Kanban refreshed.');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
