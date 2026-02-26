const pg = require('pg');
const { Pool } = pg;

const pool = new Pool({ 
  connectionString: "postgresql://neondb_owner:npg_eMqwIhUg8p2G@ep-long-sound-ajwt8qyz.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require" 
});

async function seed() {
  console.log('Force seeding starting...');
  try {
    // 1. Create a super admin
    await pool.query(`
      INSERT INTO super_admins (name, email, password_hash, role, is_active)
      VALUES ('Super Admin', 'admin@barmagly.com', 'admin123', 'super_admin', true)
      ON CONFLICT (email) DO NOTHING
    `);
    console.log('Super admin created or already exists');

    // 2. Create demo tenants
    const tenants = [
      ['Glow Beauty Salon', 'Sarah Johnson', 'sarah@glowsalon.com', '+1234567890', '456 Fashion Ave, NY', 'active', 2, 10],
      ['The Gentlemen''s Barber', 'Michael Brown', 'michael@gentbarber.com', '+1987654321', '789 Grooming St, CA', 'active', 1, 5],
      ['Serenity Wellness Spa', 'Emily Davis', 'emily@serenityspa.com', '+1555444333', '101 Peace Way, FL', 'active', 3, 15]
    ];

    for (const t of tenants) {
      const res = await pool.query(`
        INSERT INTO tenants (business_name, owner_name, owner_email, owner_phone, address, status, max_branches, max_employees)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (owner_email) DO NOTHING
        RETURNING id
      `, t);
      
      const tenantId = res.rows[0]?.id;
      if (tenantId) {
        console.log(\`Created tenant \${t[0]} with ID \${tenantId}\`);
        
        // 3. Create a subscription
        const subRes = await pool.query(`
          INSERT INTO tenant_subscriptions (tenant_id, plan_name, plan_type, price, status, start_date, end_date, auto_renew)
          VALUES ($1, 'Monthly Basic', 'monthly', '29.99', 'active', NOW(), NOW() + INTERVAL '1 month', true)
          RETURNING id
        `, [tenantId]);
        
        const subId = subRes.rows[0]?.id;
        
        // 4. Create a license key
        await pool.query(`
          INSERT INTO license_keys (license_key, tenant_id, subscription_id, status, max_activations, expires_at, notes)
          VALUES ($1, $2, $3, 'active', 3, NOW() + INTERVAL '1 month', 'Demo key')
        `, [\`DEMO-\${Math.random().toString(36).substring(7).toUpperCase()}\`, tenantId, subId]);
      }
    }
    console.log('Seeding finished!');
  } catch (err) {
    console.error('SEEDING ERROR:', err);
  } finally {
    await pool.end();
  }
}

seed();
