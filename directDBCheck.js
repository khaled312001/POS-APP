const pg = require('pg');
const { Pool } = pg;

const pool = new Pool({ 
  connectionString: "postgresql://neondb_owner:npg_eMqwIhUg8p2G@ep-long-sound-ajwt8qyz.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require" 
});

async function check() {
  try {
    const res = await pool.query('SELECT count(*) FROM tenants');
    console.log('TENANT COUNT:', res.rows[0].count);
    
    const tenants = await pool.query('SELECT * FROM tenants');
    console.log('TENANTS:', JSON.stringify(tenants.rows, null, 2));
  } catch (err) {
    console.error('DB ERROR:', err);
  } finally {
    await pool.end();
  }
}

check();
