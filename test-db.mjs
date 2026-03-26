
import pg from 'pg';

const connectionString = 'postgresql://neondb_owner:npg_HFhrVY7sSDp3@ep-polished-sun-amr4cmn7.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require';
const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function check() {
  try {
    const res = await pool.query('SELECT * FROM customers WHERE tenant_id=24 LIMIT 1');
    console.log('--- RAW COLUMNS IN DB ---');
    console.log(Object.keys(res.rows[0]));
    console.log('\n--- FIRST ROW DATA ---');
    console.log(res.rows[0]);
  } catch (e) {
    console.error(e.message);
  } finally {
    await pool.end();
  }
}

check();
