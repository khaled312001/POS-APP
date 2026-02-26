const pg = require('pg');
const { Pool } = pg;

const pool = new Pool({ 
  connectionString: "postgresql://neondb_owner:npg_eMqwIhUg8p2G@ep-long-sound-ajwt8qyz.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require" 
});

async function migrate() {
  console.log('Migration starting...');
  const tables = ['branches', 'products', 'categories', 'customers', 'suppliers', 'sales', 'shifts', 'expenses', 'tables'];
  
  try {
    for (const table of tables) {
      console.log(`Adding tenant_id to ${table}...`);
      await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS tenant_id INTEGER REFERENCES tenants(id)`);
    }
    console.log('Migration finished successfully!');
  } catch (err) {
    console.error('MIGRATION ERROR:', err);
  } finally {
    await pool.end();
  }
}

migrate();
