/**
 * Set admin user email and password. Called by scripts/setup.cjs.
 * Usage: ADMIN_EMAIL=... ADMIN_PASSWORD=... node api/set-admin.cjs
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD');
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, 10);
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  await conn.execute(
    "UPDATE users SET email = ?, password_hash = ? WHERE role = 'admin' LIMIT 1",
    [email, hash]
  );
  await conn.end();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
