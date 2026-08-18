/**
 * Second capture pass: opens the screens that only exist behind a tap.
 *
 *   node scripts/capture-brochure-flows.js
 *
 * The first pass (capture-brochure.js) walks routes. But most of this product
 * is not addressable by URL — Settings holds fourteen sub-pages, Reports has
 * seven tabs, and the create-forms for promos, zones and drivers only exist as
 * modals. A brochure that skipped those would be showing maybe a third of the
 * app, and several pages would be empty-state screens that sell nothing.
 *
 * Everything here drives the real app against the real demo store. No mockups.
 */
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const BASE = "https://kassenta.com";
const LICENSE = "BARMAGLY-8FBC-16DA-8BD9-E3B6";
const EMAIL = "admin@pizzalemon.ch";

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "docs", "brochure");
const SHOTS = path.join(OUT, "shots");
const AUTH_CACHE = path.join(OUT, ".brochure-auth.json");

const TABLET = { width: 1280, height: 800, deviceScaleFactor: 2 };

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const INVENTORY = {};

/**
 * Finds the deepest visible element whose *own* text is exactly `text`, scrolling
 * it into view first.
 *
 * The scroll is not optional: half the Settings menu sits below an 800px
 * viewport, and a finder that only considers what is already on screen silently
 * reports those rows as missing.
 */
async function findByText(page, text) {
  return page.evaluate(async (t) => {
    const own = (el) =>
      [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
    const hits = [...document.querySelectorAll("*")].filter((el) => {
      if (own(el) !== t) return false;
      const r = el.getBoundingClientRect();
      return r.width > 4 && r.height > 4;
    });
    if (!hits.length) return null;
    // Deepest match: the shallow ones are containers that merely wrap the label.
    const el = hits[hits.length - 1];
    el.scrollIntoView({ block: "center" });
    await new Promise((r) => setTimeout(r, 700));
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return null;
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, text);
}

async function tap(page, text, settleMs = 2500) {
  const at = await findByText(page, text);
  if (!at) return false;
  await page.mouse.click(at.x, at.y);
  await wait(settleMs);
  return true;
}

/** Reads every control the user can actually see and press on the current screen. */
async function inventory(page) {
  return page.evaluate(() => {
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 8 && r.height > 8 && s.visibility !== "hidden" && s.opacity !== "0";
    };
    const own = (el) =>
      [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
    const controls = new Set(), text = new Set();
    for (const el of document.querySelectorAll("*")) {
      if (!visible(el)) continue;
      const t = own(el);
      if (!t || t.length > 60) continue;
      const tag = el.tagName.toLowerCase();
      const clickable = ["button", "a"].includes(tag) ||
        ["button", "tab", "link"].includes(el.getAttribute("role")) ||
        getComputedStyle(el).cursor === "pointer";
      (clickable ? controls : text).add(t);
    }
    const inputs = [...document.querySelectorAll("input, textarea, select")].filter(visible)
      .map((i) => i.placeholder || i.getAttribute("aria-label") || i.name || i.type).filter(Boolean);
    return { controls: [...controls], text: [...text].slice(0, 100), inputs: [...new Set(inputs)] };
  });
}

async function shoot(page, key) {
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.evaluate(async () => {
    document.querySelectorAll("img[loading=lazy]").forEach((i) => (i.loading = "eager"));
    await new Promise((r) => setTimeout(r, 400));
  });
  await page.screenshot({ path: path.join(SHOTS, `${key}.png`) });
  INVENTORY[key] = await inventory(page);
}

async function goto(page, route, settleMs = 4500) {
  try {
    await page.goto(BASE + route, { waitUntil: "networkidle2", timeout: 90000 });
  } catch { /* screens that poll never reach networkidle; they render fine */ }
  await wait(settleMs);
}

// Settings sub-pages, addressed by the label on the settings menu row.
const SETTINGS_PAGES = [
  ["Employees", "set-employees"],
  ["Branches", "set-branches"],
  ["Store Settings", "set-store"],
  ["Payment Gateways", "set-payments"],
  ["Bulk Import", "set-import"],
  ["QR Tables", "set-qr-tables"],
  ["Suppliers", "set-suppliers"],
  ["Expenses", "set-expenses"],
  ["Attendance", "set-attendance"],
  ["Shift Monitor", "set-shifts"],
  ["Purchase Orders", "set-purchase-orders"],
  ["Activity Log", "set-activity"],
  ["Returns & Refunds", "set-returns"],
  ["Cash Drawer", "set-cash-drawer"],
];

const REPORT_TABS = [
  ["Overview", "rep-overview"],
  ["Sales", "rep-sales"],
  ["Inventory", "rep-inventory"],
  ["Returns", "rep-returns"],
  ["Finance", "rep-finance"],
  ["Activity", "rep-activity"],
  ["Delivery", "rep-delivery"],
];

const ORDER_TABS = [
  ["All Orders", "ord-all"],
  ["Online", "ord-online"],
  ["Tables", "ord-tables"],
  ["POS", "ord-pos"],
];

(async () => {
  if (!fs.existsSync(AUTH_CACHE)) {
    console.error("no cached auth — run scripts/capture-brochure.js first");
    process.exit(1);
  }
  const auth = JSON.parse(fs.readFileSync(AUTH_CACHE, "utf8"));

  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport(TABLET);
  await page.evaluateOnNewDocument((license, email, tid, emp, tok) => {
    localStorage.setItem("barmagly_license_key", license);
    localStorage.setItem("barmagly_store_email", email);
    localStorage.setItem("barmagly_tenant_id", String(tid));
    localStorage.setItem("barmagly_employee", JSON.stringify(emp));
    if (tok) localStorage.setItem("kassenta_employee_token", tok);
    localStorage.setItem("kassenta_theme", "light");
    localStorage.setItem("kassenta_lang", "en");
    localStorage.setItem("app_language", "en");
    localStorage.setItem("hasSeenIntro", "true");
  }, LICENSE, EMAIL, auth.tenantId, auth.employee, auth.token);

  const done = [];
  const missed = [];
  const log = (key, ok) => {
    (ok ? done : missed).push(key);
    console.log(`  ${ok ? "ok  " : "MISS"} ${key}`);
  };

  // ── selling screen with a real ticket ───────────────────────────────────
  //
  // Two different add-to-cart paths exist and both need showing:
  //   - a product with no variants goes straight into the cart on tap
  //   - a product with sizes opens a size list, and picking a size opens the
  //     extras sheet (toppings, sauces, crust) with its own Add to Cart
  // Tapping a sized product and pressing Escape, which is the obvious script,
  // adds nothing at all and leaves an empty cart in the shot.
  console.log("\nselling screen");
  await goto(page, "/app/");
  const SIMPLE = ["Calzone", "Calzone Kebab", "Calzone Verdura"];
  let added = 0;
  for (const n of SIMPLE) if (await tap(page, n, 1400)) added++;
  console.log(`  added ${added} simple products`);
  await shoot(page, "pos-sell-cart");
  log("pos-sell-cart", added > 0);

  // The extras sheet: size list -> size -> toppings and sauces.
  const sized = await tap(page, "Margherita", 1600);
  const size = sized && (await tap(page, "33cm", 2200));
  if (size) { await shoot(page, "pos-extras"); log("pos-extras", true); }
  else log("pos-extras", false);

  if (await tap(page, "Add to Cart", 2500)) console.log("  extras item added");
  else await page.keyboard.press("Escape").catch(() => {});
  await wait(1200);

  // Checkout / payment sheet
  if (await tap(page, "Checkout", 3500)) {
    await shoot(page, "pos-checkout");
    log("pos-checkout", true);
    await page.keyboard.press("Escape").catch(() => {});
    await wait(800);
  } else log("pos-checkout", false);

  // ── reports tabs ─────────────────────────────────────────────────────────
  console.log("\nreports");
  for (const [label, key] of REPORT_TABS) {
    await goto(page, "/app/reports", 4000);
    const ok = label === "Overview" ? true : await tap(page, label, 3000);
    if (ok) await shoot(page, key);
    log(key, ok);
  }

  // ── orders tabs ──────────────────────────────────────────────────────────
  console.log("\norders");
  for (const [label, key] of ORDER_TABS) {
    await goto(page, "/app/online-orders", 4000);
    const ok = label === "All Orders" ? true : await tap(page, label, 3000);
    if (ok) await shoot(page, key);
    log(key, ok);
  }

  // ── settings sub-pages ───────────────────────────────────────────────────
  console.log("\nsettings sub-pages");
  for (const [label, key] of SETTINGS_PAGES) {
    await goto(page, "/app/settings", 4000);
    const ok = await tap(page, label, 3500);
    if (ok) await shoot(page, key);
    log(key, ok);
  }

  // ── create-forms that only exist as modals ───────────────────────────────
  console.log("\ncreate forms");
  const FORMS = [
    ["/app/promo-codes", "+ Create Code", "form-promo"],
    ["/app/delivery-zones", "+ Create Zone", "form-zone"],
  ];
  for (const [route, label, key] of FORMS) {
    await goto(page, route, 4000);
    const ok = await tap(page, label, 3000);
    if (ok) await shoot(page, key);
    log(key, ok);
  }

  // driver management has tabs rather than a create button on load
  await goto(page, "/app/driver-management", 4000);
  await shoot(page, "pos-drivers");
  log("pos-drivers", true);
  if (await tap(page, "Stats", 2500)) { await shoot(page, "pos-drivers-stats"); log("pos-drivers-stats", true); }
  else log("pos-drivers-stats", false);

  fs.writeFileSync(
    path.join(OUT, "flows-result.json"),
    JSON.stringify({ captured: done, missed }, null, 2)
  );
  console.log(`\ncaptured ${done.length}, missed ${missed.length}`);
  if (missed.length) console.log("missed:", missed.join(", "));
  fs.writeFileSync(path.join(path.dirname(SHOTS), path.basename(__filename, ".js") + "-inventory.json"),
    JSON.stringify(INVENTORY, null, 2));
  await browser.close();
})();
