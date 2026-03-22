const pg = require('pg');
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  console.log('Adding is_addon column to products...');
  try {
    await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_addon BOOLEAN DEFAULT FALSE`);
    console.log('Done! is_addon column added successfully.');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await pool.end();
  }
}

migrate();
