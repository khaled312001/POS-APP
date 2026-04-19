const dotenv = require('dotenv');
dotenv.config();
const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: parseInt(process.env.MYSQL_PORT || '3306')
  });

  // 1. Create tables
  console.log('Creating tables...');

  await conn.query(`CREATE TABLE IF NOT EXISTS customer_favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    customer_id INT NOT NULL,
    product_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY fav_tenant_customer_product (tenant_id, customer_id, product_id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  )`);
  console.log('  customer_favorites created');

  await conn.query(`CREATE TABLE IF NOT EXISTS product_dietary_tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    product_id INT NOT NULL,
    tag TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  )`);
  console.log('  product_dietary_tags created');

  await conn.query(`CREATE TABLE IF NOT EXISTS help_tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    customer_id INT,
    order_id INT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT DEFAULT 'normal',
    response TEXT,
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
  )`);
  console.log('  help_tickets created');

  await conn.query(`CREATE TABLE IF NOT EXISTS faq_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    question TEXT NOT NULL,
    question_ar TEXT,
    answer TEXT NOT NULL,
    answer_ar TEXT,
    category TEXT DEFAULT 'general',
    sort_order INT DEFAULT 0,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  )`);
  console.log('  faq_entries created');

  // 2. Seed dummy data
  const tenantId = 24;
  const customerIds = [1, 12, 13, 14, 15];
  const productIds = [65803, 65804, 65805, 65806, 65807, 65808, 65809, 65810];

  console.log('\nSeeding customer_favorites...');
  for (let i = 0; i < 5; i++) {
    try {
      await conn.query('INSERT IGNORE INTO customer_favorites (tenant_id, customer_id, product_id) VALUES (?, ?, ?)',
        [tenantId, customerIds[i], productIds[i]]);
    } catch(e) { console.log('  skip fav:', e.message); }
  }
  console.log('  5 favorites added');

  console.log('Seeding product_dietary_tags...');
  const tags = ['halal', 'vegetarian', 'spicy', 'gluten_free', 'vegan', 'halal', 'vegetarian', 'spicy'];
  for (let i = 0; i < productIds.length; i++) {
    await conn.query('INSERT INTO product_dietary_tags (tenant_id, product_id, tag) VALUES (?, ?, ?)',
      [tenantId, productIds[i], tags[i]]);
  }
  console.log('  8 dietary tags added');

  console.log('Seeding help_tickets...');
  const tickets = [
    { cid: 1, subj: 'Order arrived cold', msg: 'My pizza order arrived cold. The delivery took over an hour.', status: 'open', priority: 'high', resp: null },
    { cid: 12, subj: 'Missing item from order', msg: 'I ordered 3 items but only received 2. The garlic bread was missing.', status: 'in_progress', priority: 'normal', resp: 'We are looking into this and will issue a refund for the missing item.' },
    { cid: 13, subj: 'Wrong delivery address', msg: 'Can you update my saved address? The driver went to the wrong building.', status: 'resolved', priority: 'low', resp: 'Address has been updated in your profile. Sorry for the inconvenience!' },
    { cid: 14, subj: 'Promo code not working', msg: 'I tried to use WELCOME20 but it says expired. Can you help?', status: 'open', priority: 'normal', resp: null },
    { cid: 15, subj: 'Refund request', msg: 'I would like a refund for my last order. The quality was not good.', status: 'in_progress', priority: 'high', resp: 'We have escalated this to our quality team.' },
  ];
  for (const t of tickets) {
    await conn.query(
      'INSERT INTO help_tickets (tenant_id, customer_id, subject, message, status, priority, response) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [tenantId, t.cid, t.subj, t.msg, t.status, t.priority, t.resp]
    );
  }
  console.log('  5 help tickets added');

  console.log('Seeding faq_entries...');
  const faqs = [
    { q: 'How do I place an order?', qAr: '\u0643\u064A\u0641 \u0623\u0637\u0644\u0628\u061F', a: 'Browse restaurants, add items to cart, and checkout. You can pay by cash or card.', aAr: '\u062A\u0635\u0641\u062D \u0627\u0644\u0645\u0637\u0627\u0639\u0645\u060C \u0623\u0636\u0641 \u0627\u0644\u0639\u0646\u0627\u0635\u0631 \u0625\u0644\u0649 \u0627\u0644\u0633\u0644\u0629\u060C \u0648\u0623\u0643\u0645\u0644 \u0627\u0644\u0637\u0644\u0628. \u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u062F\u0641\u0639 \u0646\u0642\u062F\u0627\u064B \u0623\u0648 \u0628\u0627\u0644\u0628\u0637\u0627\u0642\u0629.', cat: 'orders', sort: 1 },
    { q: 'How long does delivery take?', qAr: '\u0643\u0645 \u064A\u0633\u062A\u063A\u0631\u0642 \u0627\u0644\u062A\u0648\u0635\u064A\u0644\u061F', a: 'Average delivery time is 25-45 minutes depending on the restaurant and your location.', aAr: '\u0645\u062A\u0648\u0633\u0637 \u0648\u0642\u062A \u0627\u0644\u062A\u0648\u0635\u064A\u0644 25-45 \u062F\u0642\u064A\u0642\u0629 \u062D\u0633\u0628 \u0627\u0644\u0645\u0637\u0639\u0645 \u0648\u0645\u0648\u0642\u0639\u0643.', cat: 'delivery', sort: 2 },
    { q: 'Can I track my order?', qAr: '\u0647\u0644 \u064A\u0645\u0643\u0646\u0646\u064A \u062A\u062A\u0628\u0639 \u0637\u0644\u0628\u064A\u061F', a: 'Yes! After placing your order, you will receive a tracking link via SMS.', aAr: '\u0646\u0639\u0645! \u0628\u0639\u062F \u062A\u0642\u062F\u064A\u0645 \u0627\u0644\u0637\u0644\u0628\u060C \u0633\u062A\u062A\u0644\u0642\u0649 \u0631\u0627\u0628\u0637 \u062A\u062A\u0628\u0639 \u0639\u0628\u0631 \u0627\u0644\u0631\u0633\u0627\u0626\u0644.', cat: 'orders', sort: 3 },
    { q: 'What payment methods do you accept?', qAr: '\u0645\u0627 \u0637\u0631\u0642 \u0627\u0644\u062F\u0641\u0639 \u0627\u0644\u0645\u062A\u0627\u062D\u0629\u061F', a: 'We accept cash on delivery, credit/debit cards (Visa, Mastercard), and mobile wallets.', aAr: '\u0646\u0642\u0628\u0644 \u0627\u0644\u062F\u0641\u0639 \u0646\u0642\u062F\u0627\u064B \u0639\u0646\u062F \u0627\u0644\u0627\u0633\u062A\u0644\u0627\u0645\u060C \u0628\u0637\u0627\u0642\u0627\u062A \u0627\u0644\u0627\u0626\u062A\u0645\u0627\u0646\u060C \u0648\u0627\u0644\u0645\u062D\u0627\u0641\u0638 \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A\u0629.', cat: 'payment', sort: 4 },
    { q: 'How do I cancel an order?', qAr: '\u0643\u064A\u0641 \u0623\u0644\u063A\u064A \u0637\u0644\u0628\u064A\u061F', a: 'You can cancel within 2 minutes of placing the order from your tracking page.', aAr: '\u064A\u0645\u0643\u0646\u0643 \u0627\u0644\u0625\u0644\u063A\u0627\u0621 \u062E\u0644\u0627\u0644 \u062F\u0642\u064A\u0642\u062A\u064A\u0646 \u0645\u0646 \u062A\u0642\u062F\u064A\u0645 \u0627\u0644\u0637\u0644\u0628.', cat: 'orders', sort: 5 },
    { q: 'Is there a minimum order amount?', qAr: '\u0647\u0644 \u064A\u0648\u062C\u062F \u062D\u062F \u0623\u062F\u0646\u0649 \u0644\u0644\u0637\u0644\u0628\u061F', a: 'Minimum order varies by restaurant, typically between 30-50 EGP.', aAr: '\u0627\u0644\u062D\u062F \u0627\u0644\u0623\u062F\u0646\u0649 \u064A\u062E\u062A\u0644\u0641 \u062D\u0633\u0628 \u0627\u0644\u0645\u0637\u0639\u0645\u060C \u0639\u0627\u062F\u0629 \u0628\u064A\u0646 30-50 \u062C\u0646\u064A\u0647.', cat: 'orders', sort: 6 },
    { q: 'How do I earn loyalty points?', qAr: '\u0643\u064A\u0641 \u0623\u0643\u0633\u0628 \u0646\u0642\u0627\u0637 \u0627\u0644\u0648\u0644\u0627\u0621\u061F', a: 'You earn 1 point for every 10 EGP spent. Points can be redeemed for discounts.', aAr: '\u062A\u0643\u0633\u0628 \u0646\u0642\u0637\u0629 \u0648\u0627\u062D\u062F\u0629 \u0645\u0642\u0627\u0628\u0644 \u0643\u0644 10 \u062C\u0646\u064A\u0647.', cat: 'account', sort: 7 },
    { q: 'How do I contact support?', qAr: '\u0643\u064A\u0641 \u0623\u062A\u0648\u0627\u0635\u0644 \u0645\u0639 \u0627\u0644\u062F\u0639\u0645\u061F', a: 'Submit a support ticket from the Help section or call +20 123 456 789.', aAr: '\u0623\u0631\u0633\u0644 \u062A\u0630\u0643\u0631\u0629 \u062F\u0639\u0645 \u0645\u0646 \u0642\u0633\u0645 \u0627\u0644\u0645\u0633\u0627\u0639\u062F\u0629 \u0623\u0648 \u0627\u062A\u0635\u0644 \u0639\u0644\u0649 +20 123 456 789.', cat: 'general', sort: 8 },
    { q: 'Do you deliver to my area?', qAr: '\u0647\u0644 \u062A\u062A\u0648\u0635\u0644\u0648\u0646 \u0644\u0645\u0646\u0637\u0642\u062A\u064A\u061F', a: 'We deliver within defined zones. Enter your address to see available restaurants.', aAr: '\u0646\u0642\u0648\u0645 \u0628\u0627\u0644\u062A\u0648\u0635\u064A\u0644 \u0636\u0645\u0646 \u0645\u0646\u0627\u0637\u0642 \u0645\u062D\u062F\u062F\u0629. \u0623\u062F\u062E\u0644 \u0639\u0646\u0648\u0627\u0646\u0643 \u0644\u0631\u0624\u064A\u0629 \u0627\u0644\u0645\u0637\u0627\u0639\u0645.', cat: 'delivery', sort: 9 },
    { q: 'Can I schedule a delivery for later?', qAr: '\u0647\u0644 \u064A\u0645\u0643\u0646\u0646\u064A \u062C\u062F\u0648\u0644\u0629 \u062A\u0648\u0635\u064A\u0644 \u0644\u0627\u062D\u0642\u0627\u064B\u061F', a: 'Yes, during checkout you can choose scheduled delivery and pick a time slot.', aAr: '\u0646\u0639\u0645\u060C \u0623\u062B\u0646\u0627\u0621 \u0627\u0644\u062F\u0641\u0639 \u064A\u0645\u0643\u0646\u0643 \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u062A\u0648\u0635\u064A\u0644 \u0627\u0644\u0645\u062C\u062F\u0648\u0644.', cat: 'delivery', sort: 10 },
  ];
  for (const f of faqs) {
    await conn.query(
      'INSERT INTO faq_entries (tenant_id, question, question_ar, answer, answer_ar, category, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [tenantId, f.q, f.qAr, f.a, f.aAr, f.cat, f.sort]
    );
  }
  console.log('  10 FAQ entries added');

  console.log('\nDone! All tables created and seeded.');
  await conn.end();
}
run().catch(e => console.error('ERROR:', e.message));
