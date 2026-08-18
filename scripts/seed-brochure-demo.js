/**
 * Fills the empty screens of the demo store with plausible data, so the
 * brochure shows a working shop rather than a row of "nothing here yet".
 *
 *   node scripts/seed-brochure-demo.js          # create
 *   node scripts/seed-brochure-demo.js --check  # report only, change nothing
 *
 * This writes to the LIVE Pizza Lemon demo store (tenant 24). Everything it
 * creates is named so it can be found again: zones and promos carry ordinary
 * shop names, batches use a DEMO- prefix, purchase orders use PO-DEMO-.
 *
 * It is idempotent by name: run it twice and it will skip what already exists
 * rather than pile up duplicates.
 */
const BASE = "https://kassenta.com";
const LICENSE = "BARMAGLY-8FBC-16DA-8BD9-E3B6";
const TENANT = 24;
const EMPLOYEE_ID = 151; // Terence, admin — the action is attributed to a real person

const CHECK = process.argv.includes("--check");
const H = { "Content-Type": "application/json", "x-license-key": LICENSE, "x-tenant-id": String(TENANT) };

const get = (p) => fetch(BASE + p, { headers: H }).then((r) => r.json()).catch(() => null);
async function post(p, body) {
  if (CHECK) return { skipped: true };
  const r = await fetch(BASE + p, { method: "POST", headers: H, body: JSON.stringify(body) });
  const text = await r.text();
  try { return { ok: r.ok, status: r.status, body: JSON.parse(text) }; }
  catch { return { ok: r.ok, status: r.status, body: text.slice(0, 200) }; }
}

const ZONES = [
  { name: "Zürich Zentrum", deliveryFee: "3.50", minOrderAmount: "20.00", estimatedMinutes: 25, radiusKm: "2.50" },
  { name: "Oerlikon",       deliveryFee: "5.00", minOrderAmount: "25.00", estimatedMinutes: 35, radiusKm: "5.00" },
  { name: "Altstetten",     deliveryFee: "6.50", minOrderAmount: "30.00", estimatedMinutes: 45, radiusKm: "7.50" },
];

const PROMOS = [
  { code: "WELCOME10", description: "10% off your first order",   discountType: "percent",       discountValue: "10.00", minOrderAmount: "20.00", usageLimit: 500, perCustomerLimit: 1 },
  { code: "FREEDEL",   description: "Free delivery over CHF 40",  discountType: "free_delivery", discountValue: "0.00",  minOrderAmount: "40.00", usageLimit: 200, perCustomerLimit: 2 },
  { code: "LUNCH5",    description: "CHF 5 off weekday lunch",    discountType: "fixed",         discountValue: "5.00",  minOrderAmount: "25.00", usageLimit: 300, perCustomerLimit: 3 },
  { code: "WEEKEND15", description: "15% off at the weekend",     discountType: "percent",       discountValue: "15.00", minOrderAmount: "35.00", usageLimit: 150, perCustomerLimit: 1, maxDiscountCap: "12.00" },
];

const day = (n) => new Date(Date.now() + n * 86400000).toISOString();

(async () => {
  console.log(CHECK ? "CHECK ONLY — nothing will be written\n" : "seeding demo data into tenant " + TENANT + "\n");

  // ── delivery zones ──────────────────────────────────────────────────────
  const existingZones = (await get("/api/delivery/manage/zones")) || [];
  const zoneNames = new Set((Array.isArray(existingZones) ? existingZones : []).map((z) => z.name));
  console.log(`zones: ${zoneNames.size} existing`);
  for (const z of ZONES) {
    if (zoneNames.has(z.name)) { console.log(`  skip  ${z.name}`); continue; }
    const r = await post("/api/delivery/manage/zones", { ...z, tenantId: TENANT, isActive: true });
    console.log(`  ${r.skipped ? "would add" : r.ok ? "added" : "FAILED " + r.status} ${z.name}`, r.ok ? "" : JSON.stringify(r.body || "").slice(0, 120));
  }

  // ── promo codes ─────────────────────────────────────────────────────────
  const existingPromos = (await get("/api/delivery/promos")) || [];
  const promoCodes = new Set((Array.isArray(existingPromos) ? existingPromos : []).map((p) => p.code));
  console.log(`\npromos: ${promoCodes.size} existing`);
  for (const p of PROMOS) {
    if (promoCodes.has(p.code)) { console.log(`  skip  ${p.code}`); continue; }
    const r = await post("/api/delivery/promos", {
      ...p, tenantId: TENANT, isActive: true,
      // validFrom / validUntil are deliberately omitted: the server sanitiser
      // calls toISOString() on whatever arrives, which throws on a string and
      // returns a 500. Both columns are nullable, so an open-ended promo is a
      // valid promo.
      applicableOrderTypes: ["delivery", "pickup"],
    });
    console.log(`  ${r.skipped ? "would add" : r.ok ? "added" : "FAILED " + r.status} ${p.code}`, r.ok ? "" : JSON.stringify(r.body || "").slice(0, 120));
  }

  // ── things that need existing rows to point at ──────────────────────────
  const [suppliers, products, branches] = await Promise.all([
    // These three require tenantId on the query string; the header alone
    // returns "tenantId is required" and an empty list that looks like an
    // empty shop rather than a rejected request.
    get(`/api/suppliers?tenantId=${TENANT}`),
    get(`/api/products?tenantId=${TENANT}`),
    get(`/api/branches?tenantId=${TENANT}`),
  ]);
  const supplierList = Array.isArray(suppliers) ? suppliers : [];
  const productList = Array.isArray(products) ? products : [];
  const branchId = Array.isArray(branches) && branches[0] ? branches[0].id : null;
  console.log(`\nreferences: ${supplierList.length} suppliers, ${productList.length} products, branch ${branchId}`);

  // ── purchase orders ─────────────────────────────────────────────────────
  const existingPOs = (await get(`/api/purchase-orders?tenantId=${TENANT}`)) || [];
  const poNumbers = new Set((Array.isArray(existingPOs) ? existingPOs : []).map((p) => p.orderNumber));
  console.log(`\npurchase orders: ${poNumbers.size} existing`);
  const PO_STATUS = ["pending", "ordered", "received"];
  for (let i = 0; i < Math.min(3, supplierList.length); i++) {
    const orderNumber = `PO-DEMO-${1001 + i}`;
    if (poNumbers.has(orderNumber)) { console.log(`  skip  ${orderNumber}`); continue; }
    const r = await post("/api/purchase-orders", {
      orderNumber, supplierId: supplierList[i].id, branchId,
      status: PO_STATUS[i % PO_STATUS.length],
      totalAmount: (450 + i * 275).toFixed(2),
      notes: "Weekly restock",
      expectedDate: day(3 + i),
    });
    console.log(`  ${r.skipped ? "would add" : r.ok ? "added" : "FAILED " + r.status} ${orderNumber} -> ${supplierList[i].name}`, r.ok ? "" : JSON.stringify(r.body || "").slice(0, 120));
  }

  // ── product batches ─────────────────────────────────────────────────────
  const existingBatches = (await get(`/api/product-batches?tenantId=${TENANT}`)) || [];
  const batchNumbers = new Set((Array.isArray(existingBatches) ? existingBatches : []).map((b) => b.batchNumber));
  console.log(`\nproduct batches: ${batchNumbers.size} existing`);
  for (let i = 0; i < Math.min(5, productList.length); i++) {
    const batchNumber = `DEMO-B${2401 + i}`;
    if (batchNumbers.has(batchNumber)) { console.log(`  skip  ${batchNumber}`); continue; }
    const r = await post("/api/product-batches", {
      productId: productList[i].id, batchNumber,
      quantity: 40 + i * 15,
      expiryDate: day(30 + i * 20),
      costPrice: (6 + i * 1.4).toFixed(2),
      branchId,
      supplierId: supplierList[i % Math.max(1, supplierList.length)]?.id ?? null,
      isActive: true,
    });
    console.log(`  ${r.skipped ? "would add" : r.ok ? "added" : "FAILED " + r.status} ${batchNumber} -> ${productList[i].name}`, r.ok ? "" : JSON.stringify(r.body || "").slice(0, 120));
  }

  // ── returns need a real sale to point at ────────────────────────────────
  const sales = await get(`/api/sales?tenantId=${TENANT}&limit=5`);
  const saleList = Array.isArray(sales) ? sales : sales?.sales || [];
  const existingReturns = (await get(`/api/returns?tenantId=${TENANT}`)) || [];
  const returnCount = Array.isArray(existingReturns) ? existingReturns.length : 0;
  console.log(`\nreturns: ${returnCount} existing, ${saleList.length} sales available to return against`);
  if (returnCount === 0 && saleList.length) {
    const REASONS = ["Wrong item delivered", "Customer changed their mind"];
    for (let i = 0; i < Math.min(2, saleList.length); i++) {
      const sale = saleList[i];
      const r = await post("/api/returns", {
        originalSaleId: sale.id, branchId,
        // Without an employee the activity-log row this triggers violates its
        // foreign key and the whole return fails.
        employeeId: EMPLOYEE_ID, approvedBy: EMPLOYEE_ID,
        reason: REASONS[i], type: "refund", refundMethod: i === 0 ? "cash" : "card",
        totalAmount: Number(sale.totalAmount ?? sale.total ?? 20).toFixed(2),
        status: "completed",
      });
      console.log(`  ${r.skipped ? "would add" : r.ok ? "added" : "FAILED " + r.status} return on sale ${sale.id}`, r.ok ? "" : JSON.stringify(r.body || "").slice(0, 160));
    }
  } else if (returnCount) {
    console.log("  skip  returns already present");
  } else {
    console.log("  SKIP  no sales found to return against");
  }

  console.log("\ndone");
})();
