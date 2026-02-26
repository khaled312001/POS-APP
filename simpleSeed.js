const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const { addDays, addMonths } = require('date-fns');

const pool = new Pool({ 
  connectionString: "postgresql://neondb_owner:npg_eMqwIhUg8p2G@ep-long-sound-ajwt8qyz.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require" 
});

async function seed() {
  console.log('Simplified seeding starting...');
  try {
    // Helper
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const pick = (arr) => arr[rand(0, arr.length - 1)];

    // 1. Super Admin
    await pool.query(`
      INSERT INTO super_admins (name, email, password_hash, role, is_active)
      VALUES ('System Admin', 'admin@barmagly.com', '$2b$10$Q8j8u8Q8j8u8Q8j8u8Q8jO', 'super_admin', true)
      ON CONFLICT (email) DO NOTHING
    `);
    console.log('Super Admin ensured.');

    // 2. Tenants
    const tenantsRes = await pool.query('SELECT id FROM tenants');
    if (tenantsRes.rows.length === 0) {
        console.log('No tenants found, creating demo ones...');
        // (Simplified tenant creation if needed, but skipped for now if they exist)
    }

    const allTenants = (await pool.query('SELECT * FROM tenants')).rows;
    for (const t of allTenants) {
        console.log(`Processing tenant: ${t.business_name}`);
        
        // Ensure Categories
        const catsExist = await pool.query('SELECT count(*) FROM categories');
        if (parseInt(catsExist.rows[0].count) === 0) {
            await pool.query(`INSERT INTO categories (name, name_ar, color, icon, is_active) VALUES ('Food', 'طعام', '#EF4444', 'utensils', true)`);
            await pool.query(`INSERT INTO categories (name, name_ar, color, icon, is_active) VALUES ('Beverages', 'مشروبات', '#3B82F6', 'coffee', true)`);
        }
        const categories = (await pool.query('SELECT * FROM categories')).rows;

        // Ensure Branches
        let branches = (await pool.query('SELECT * FROM branches WHERE tenant_id = $1', [t.id])).rows;
        if (branches.length === 0) {
            const res = await pool.query(`INSERT INTO branches (tenant_id, name, is_active, is_main) VALUES ($1, 'Main Branch', true, true) RETURNING *`, [t.id]);
            branches = res.rows;
        }
        const branchIds = branches.map(b => b.id);

        // Ensure Employees
        let employees = (await pool.query('SELECT * FROM employees WHERE branch_id = ANY($1)', [branchIds])).rows;
        if (employees.length === 0) {
            await pool.query(`INSERT INTO employees (name, pin, role, branch_id, is_active) VALUES ('Manager', '1234', 'admin', $1, true)`, [branchIds[0]]);
            employees = (await pool.query('SELECT * FROM employees WHERE branch_id = ANY($1)', [branchIds])).rows;
        }
        const employeeIds = employees.map(e => e.id);

        // Ensure Products
        let products = (await pool.query('SELECT * FROM products WHERE tenant_id = $1', [t.id])).rows;
        if (products.length === 0) {
            for (const cat of categories) {
                await pool.query(`INSERT INTO products (tenant_id, name, price, category_id, is_active) VALUES ($1, $2, $3, $4, true)`, [t.id, 'Demo ' + cat.name, '10.00', cat.id]);
            }
            products = (await pool.query('SELECT * FROM products WHERE tenant_id = $1', [t.id])).rows;
        }
        const productIds = products.map(p => p.id);

        // Seed Sales & SaleItems
        const salesCount = await pool.query('SELECT count(*) FROM sales WHERE branch_id = ANY($1)', [branchIds]);
        if (parseInt(salesCount.rows[0].count) < 20) {
            console.log(`Seeding sales for tenant ${t.id}...`);
            for (let i = 0; i < 20; i++) {
                const bId = pick(branchIds);
                const eId = pick(employeeIds);
                const pId = pick(productIds);
                const total = 10.00;
                const recNum = 'RCP-' + t.id + '-' + bId + '-' + Date.now() + '-' + i;
                
                const saleRes = await pool.query(`
                    INSERT INTO sales (receipt_number, branch_id, employee_id, subtotal, total_amount, payment_method, payment_status, status, created_at)
                    VALUES ($1, $2, $3, $4, $5, 'cash', 'completed', 'completed', NOW() - interval '1 day' * $6)
                    RETURNING id
                `, [recNum, bId, eId, total, total, rand(0, 30)]);
                
                const saleId = saleRes.rows[0].id;
                await pool.query(`
                    INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total)
                    VALUES ($1, $2, 'Demo Product', 1, '10.00', '10.00')
                `, [saleId, pId]);

                // Kitchen Order
                await pool.query(`
                    INSERT INTO kitchen_orders (sale_id, branch_id, status, items)
                    VALUES ($1, $2, 'served', $3)
                `, [saleId, bId, JSON.stringify([{name: 'Demo Product', quantity: 1, status: 'served'}])]);
            }
        }

        // Returns
        const returnsCount = await pool.query('SELECT count(*) FROM returns WHERE branch_id = ANY($1)', [branchIds]);
        if (parseInt(returnsCount.rows[0].count) === 0) {
            const sale = (await pool.query('SELECT id FROM sales WHERE branch_id = $1 LIMIT 1', [branchIds[0]])).rows[0];
            if (sale) {
                const retRes = await pool.query(`
                    INSERT INTO returns (original_sale_id, employee_id, reason, total_amount, branch_id, status)
                    VALUES ($1, $2, 'test', '10.00', $3, 'completed')
                    RETURNING id
                `, [sale.id, employeeIds[0], branchIds[0]]);
                
                await pool.query(`
                    INSERT INTO return_items (return_id, product_id, product_name, quantity, unit_price, total)
                    VALUES ($1, $2, 'Demo Product', 1, '10.00', '10.00')
                `, [retRes.rows[0].id, productIds[0]]);
            }
        }

        // Shifts & Cash Operations
        const shiftsCount = await pool.query('SELECT count(*) FROM shifts WHERE branch_id = ANY($1)', [branchIds]);
        if (parseInt(shiftsCount.rows[0].count) === 0) {
            const shiftRes = await pool.query(`
                INSERT INTO shifts (employee_id, branch_id, start_time, end_time, status, opening_cash, total_sales)
                VALUES ($1, $2, NOW() - interval '1 day', NOW(), 'closed', '100.00', '50.00')
                RETURNING id
            `, [employeeIds[0], branchIds[0]]);
            
            await pool.query(`
                INSERT INTO cash_drawer_operations (shift_id, employee_id, type, amount, reason)
                VALUES ($1, $2, 'cash_in', '100.00', 'opening')
            `, [shiftRes.rows[0].id, employeeIds[0]]);
        }

        // Inventory
        for (const pId of productIds) {
            for (const bId of branchIds) {
                await pool.query(`
                    INSERT INTO inventory (product_id, branch_id, quantity)
                    VALUES ($1, $2, 100)
                    ON CONFLICT DO NOTHING
                `, [pId, bId]);
            }
        }
        
        // Product Batches & Movements
        const batchExists = await pool.query('SELECT count(*) FROM product_batches WHERE product_id = $1', [productIds[0]]);
        if (parseInt(batchExists.rows[0].count) === 0) {
            await pool.query(`
                INSERT INTO product_batches (product_id, batch_number, quantity, branch_id)
                VALUES ($1, 'BAT-001', 100, $2)
            `, [productIds[0], branchIds[0]]);
            
            await pool.query(`
                INSERT INTO inventory_movements (product_id, branch_id, type, quantity)
                VALUES ($1, $2, 'initial', 100)
            `, [productIds[0], branchIds[0]]);
        }

        // Tables
        const tableExist = await pool.query('SELECT count(*) FROM tables WHERE branch_id = $1', [branchIds[0]]);
        if (parseInt(tableExist.rows[0].count) === 0) {
            await pool.query(`INSERT INTO tables (branch_id, name, capacity, status) VALUES ($1, 'T1', 4, 'available')`, [branchIds[0]]);
        }

        // Notifications & Activity Logs
        await pool.query(`INSERT INTO activity_log (employee_id, action, details) VALUES ($1, 'seed', 'Seeded via simplified script')`, [employeeIds[0]]);
        await pool.query(`INSERT INTO notifications (recipient_id, type, title, message) VALUES ($1, 'info', 'Seeded', 'Data seeded')`, [employeeIds[0]]);
    }

    console.log('Seeding finished!');
  } catch (err) {
    console.error('SEEDING ERROR:', err);
  } finally {
    await pool.end();
  }
}

seed();
