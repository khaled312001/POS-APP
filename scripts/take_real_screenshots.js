/**
 * Barmagly POS – Real Screenshots via Puppeteer
 * Navigates the actual live app and captures every screen
 *
 * Usage: node scripts/take_real_screenshots.js
 */

const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

// ── Config ────────────────────────────────────────────────────────────────────
const BASE_URL   = "https://pos.barmagly.tech/app";
const EMAIL      = "admin@pizzalemon.ch";
const LIC_KEY    = "BARMAGLY-F49F-9932-CB31-FBA1";
const ADMIN_PIN  = "1234";
const CASHIER_PIN = "0000";

const OUT_PHONE  = path.join(__dirname, "../assets/images/screenshots/phone");
const OUT_TABLET = path.join(__dirname, "../assets/images/screenshots/tablet");
fs.mkdirSync(OUT_PHONE,  { recursive: true });
fs.mkdirSync(OUT_TABLET, { recursive: true });

const wait = ms => new Promise(r => setTimeout(r, ms));

// ── Screenshot helper ─────────────────────────────────────────────────────────
async function shot(page, outDir, label) {
  const safe = label.replace(/[^a-z0-9_]/gi, "_");
  const file = path.join(outDir, `${safe}.png`);
  try {
    await page.screenshot({ path: file, fullPage: false });
    console.log(`  📸  ${safe}.png`);
  } catch (e) {
    console.log(`  ⚠️  Screenshot failed: ${e.message}`);
  }
}

// ── Fill React Native TextInput (renders as <input> on web) ──────────────────
async function fillInput(page, index, value) {
  await page.evaluate((idx, val) => {
    const inputs = Array.from(document.querySelectorAll("input"));
    const el = inputs[idx];
    if (!el) return;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(el, val);
    el.dispatchEvent(new Event("input",  { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.focus();
  }, index, value);
  await wait(500);
}

// ── Click element whose exact/partial text matches ────────────────────────────
async function clickText(page, regex, timeout = 8000) {
  try {
    await page.waitForFunction(
      (pattern) => {
        const re = new RegExp(pattern, "i");
        const all = Array.from(document.querySelectorAll("div,button,span,a"));
        return all.some(el => {
          if (!el.offsetParent) return false;
          if (el.children.length > 5) return false;
          const t = el.textContent?.trim() || "";
          if (!re.test(t)) return false;
          const r = el.getBoundingClientRect();
          return r.width > 20 && r.height > 14;
        });
      },
      { timeout },
      regex
    );
  } catch (_) {
    // element may not appear — fall through and try anyway
  }
  return page.evaluate((pattern) => {
    const re = new RegExp(pattern, "i");
    const all = Array.from(document.querySelectorAll("div,button,span,a"));
    for (const el of all) {
      if (!el.offsetParent) continue;
      if (el.children.length > 5) continue;
      const t = el.textContent?.trim() || "";
      if (!re.test(t)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 20 || r.height < 14) continue;
      // Walk up to find clickable ancestor
      let cur = el;
      for (let i = 0; i < 6; i++) {
        if (!cur) break;
        if (cur.getAttribute("role") === "button" || cur.tagName === "BUTTON") {
          cur.click(); return t;
        }
        cur = cur.parentElement;
      }
      el.click();
      return t;
    }
    return null;
  }, regex);
}

// ── Click one PIN digit (exact digit text, large square element) ──────────────
async function clickDigit(page, digit) {
  const clicked = await page.evaluate((d) => {
    const str = String(d);
    const all = Array.from(document.querySelectorAll("div,button,span"));
    for (const el of all) {
      if (!el.offsetParent) continue;
      // Must be EXACTLY the digit
      const t = el.textContent?.trim();
      if (t !== str) continue;
      const r = el.getBoundingClientRect();
      // Must be a reasonably large square (PIN pad keys are big)
      if (r.width < 30 || r.height < 30) continue;
      let cur = el;
      for (let i = 0; i < 6; i++) {
        if (!cur) break;
        if (cur.getAttribute("role") === "button" || cur.tagName === "BUTTON") {
          cur.click(); return `clicked ${d}`;
        }
        cur = cur.parentElement;
      }
      el.click();
      return `clicked ${d} fallback`;
    }
    return null;
  }, digit);
  await wait(280);
  return clicked;
}

async function enterPin(page, pin) {
  for (const d of pin.split("")) {
    const r = await clickDigit(page, d);
    if (!r) console.log(`    ⚠️  digit ${d} not found`);
  }
  await wait(1200);
}

// ── Click a bottom tab ────────────────────────────────────────────────────────
async function clickTab(page, label) {
  // Tab bar items have short text labels: POS, Products, Customers, Reports, Online Orders, More
  await clickText(page, `^${label}$`);
  await wait(2500);
}

// ── Navigate to base URL then click Get Started + license ────────────────────
async function doFullSetup(page) {
  console.log("\n  ── INTRO");
  await page.goto(BASE_URL, { waitUntil: "networkidle2", timeout: 30000 });
  await wait(3000);

  // It might skip straight to license or login if already cached
  const url = page.url();
  if (url.includes("login") || url.includes("tabs") || url.includes("index")) {
    console.log("  Already past intro — skipping setup");
    return;
  }

  // Click "Get Started"
  await clickText(page, "get started");
  await wait(2000);

  // We might be on /intro with language select, then "Get Started"
  await clickText(page, "get started");
  await wait(2000);

  const url2 = page.url();
  console.log("  URL after Get Started:", url2);

  if (url2.includes("license") || (!url2.includes("login") && !url2.includes("tabs"))) {
    console.log("\n  ── LICENSE GATE");
    // Fill email
    await fillInput(page, 0, EMAIL);
    await fillInput(page, 1, LIC_KEY);
    await wait(500);

    // Click "Activate Store"
    await clickText(page, "activate store|activate");
    await wait(1500);

    // Wait for redirect to login (up to 20s)
    const start = Date.now();
    while (!page.url().includes("login") && Date.now() - start < 20000) {
      await wait(600);
    }
    await wait(1500);
    console.log("  URL after activation:", page.url());
  }
}

// ── Main flow ─────────────────────────────────────────────────────────────────
async function runForViewport(browser, vp, outDir) {
  console.log(`\n${"═".repeat(64)}`);
  console.log(`  ${vp.name.toUpperCase()}  ${vp.w}×${vp.h}`);
  console.log(`${"═".repeat(64)}`);

  const page = await browser.newPage();
  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: vp.dpr });
  page.setDefaultNavigationTimeout(30000);

  const sc = (label) => shot(page, outDir, label);

  try {

    // ── 1. INTRO ──────────────────────────────────────────────────────────────
    await page.goto(BASE_URL, { waitUntil: "networkidle2", timeout: 30000 });
    await wait(3000);
    await sc("01_intro_welcome");

    // Language options are visible — pick English (already selected by default)
    await sc("02_intro_language_select");

    // Click "Get Started"
    await clickText(page, "get started");
    await wait(2500);
    await sc("03_after_get_started");

    // ── 2. LICENSE GATE ───────────────────────────────────────────────────────
    if (!page.url().includes("login")) {
      console.log("\n  ── LICENSE GATE");
      await wait(500);
      await sc("04_license_gate_empty");

      await fillInput(page, 0, EMAIL);
      await fillInput(page, 1, LIC_KEY);
      await sc("05_license_gate_filled");

      await clickText(page, "activate store|activate");
      await wait(1500);
      await sc("06_license_activating");

      // Wait for login redirect
      const t0 = Date.now();
      while (!page.url().includes("login") && Date.now() - t0 < 20000) await wait(500);
      await wait(1500);
      await sc("07_license_success");
    }

    // ── 3. LOGIN SCREEN ───────────────────────────────────────────────────────
    console.log("\n  ── LOGIN");
    if (!page.url().includes("login")) {
      await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle2" });
    }
    await wait(2500);
    await sc("08_login_employee_select");

    // Click Admin card
    await clickText(page, "admin lemon|admin");
    await wait(1200);
    await sc("09_login_admin_pin_pad");

    // Enter PIN
    await enterPin(page, ADMIN_PIN);
    await sc("10_login_pin_entering");
    await wait(3000);
    await sc("11_logged_in");
    console.log("  URL after login:", page.url());

    // ── 4. POS SCREEN ─────────────────────────────────────────────────────────
    console.log("\n  ── POS");
    // If not on POS, click POS tab
    if (!page.url().includes("index") && !page.url().endsWith("/app/")) {
      await clickTab(page, "POS");
    }
    await wait(2000);
    await sc("12_pos_empty_cart");

    // Click category tabs
    const categories = ["Pizza", "Calzone", "Pide", "Lahmacun", "Fingerfood"];
    for (let i = 0; i < Math.min(categories.length, 3); i++) {
      const ok = await clickText(page, `^${categories[i]}$`);
      if (ok) {
        await wait(1000);
        await sc(`13_pos_category_${categories[i].toLowerCase()}`);
      }
    }
    // Back to All
    await clickText(page, "^All$");
    await wait(1000);

    // Add 3 products to cart by clicking product cards
    for (let i = 0; i < 3; i++) {
      const added = await page.evaluate((idx) => {
        const all = Array.from(document.querySelectorAll("div"));
        // Product cards have a "+" button or are clickable squares with price text
        const cards = all.filter(el => {
          if (!el.offsetParent) return false;
          const r = el.getBoundingClientRect();
          if (r.width < 80 || r.width > 350) return false;
          if (r.height < 80 || r.height > 300) return false;
          const t = el.textContent || "";
          // Has price (CHF or currency)
          return /CHF|USD|EUR|SAR|\d+\.\d\d/.test(t);
        });
        // skip first 2 (may be cart totals)
        const target = cards[idx + 2];
        if (!target) return null;
        target.click();
        return target.textContent?.trim().slice(0, 30);
      }, i);
      if (added) { await wait(700); }
    }
    await sc("14_pos_products_in_cart");

    // Increase quantity with + button in cart
    await clickText(page, "^\\+$");
    await wait(600);
    await sc("15_pos_qty_increased");

    // Open checkout
    await clickText(page, "checkout|الدفع");
    await wait(2500);
    await sc("16_pos_checkout_modal");

    // Select cash payment
    await clickText(page, "^cash$|نقد|كاش");
    await wait(800);
    await sc("17_pos_cash_selected");

    // Confirm payment
    await clickText(page, "confirm|complete|print|إتمام|تأكيد");
    await wait(3000);
    await sc("18_pos_receipt");

    // New order / close
    await clickText(page, "new order|close|done|جديد|إغلاق");
    await wait(1000);
    await page.keyboard.press("Escape");
    await wait(800);
    await sc("19_pos_new_order");

    // Barcode scanner button
    await clickText(page, "scan|barcode|باركود");
    await wait(1000);
    await sc("20_pos_barcode_scan");
    await page.keyboard.press("Escape");
    await wait(600);

    // Select Customer
    await clickText(page, "select customer|walk-in|اختر عميل");
    await wait(1500);
    await sc("21_pos_customer_select");
    await page.keyboard.press("Escape");
    await wait(600);

    // Zero Out Shift
    await clickText(page, "zero out shift|تصفير");
    await wait(1500);
    await sc("22_pos_zero_shift");
    await page.keyboard.press("Escape");
    await wait(600);

    // Invoices button in top bar
    await clickText(page, "^invoices$|فواتير");
    await wait(2000);
    await sc("23_pos_invoices");
    await page.keyboard.press("Escape");
    await wait(600);

    // Orders button in top bar
    await clickText(page, "^orders$|طلبات");
    await wait(2000);
    await sc("24_pos_orders");
    await page.keyboard.press("Escape");
    await wait(600);

    // ── 5. PRODUCTS TAB ───────────────────────────────────────────────────────
    console.log("\n  ── PRODUCTS");
    await clickTab(page, "Products");
    await sc("25_products_list");

    // Scroll to see more
    await page.evaluate(() => window.scrollBy(0, 400));
    await wait(700);
    await sc("26_products_scrolled");
    await page.evaluate(() => window.scrollBy(0, -400));

    // Search
    const prodSearch = await page.$("input");
    if (prodSearch) {
      await prodSearch.click();
      await prodSearch.type("pizza", { delay: 70 });
      await wait(1500);
      await sc("27_products_search_results");
      await prodSearch.click({ clickCount: 3 });
      await prodSearch.press("Backspace");
      await wait(800);
    }

    // Open a product for editing
    const prodCard = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll("div"));
      const cards = all.filter(el => {
        if (!el.offsetParent) return false;
        const r = el.getBoundingClientRect();
        return r.width > 100 && r.height > 60 && /CHF|USD|EUR|\d+\.\d\d/.test(el.textContent || "");
      });
      if (cards[1]) { cards[1].click(); return true; }
      return false;
    });
    await wait(2000);
    await sc("28_product_edit_modal");

    // Scroll inside modal
    await page.evaluate(() => window.scrollBy(0, 300));
    await wait(600);
    await sc("29_product_edit_scrolled");
    await page.keyboard.press("Escape");
    await wait(800);

    // Add new product
    await clickText(page, "add product|new product|\\+.*product|إضافة منتج");
    await wait(2000);
    await sc("30_product_add_form");
    await page.keyboard.press("Escape");
    await wait(600);

    // ── 6. CUSTOMERS TAB ──────────────────────────────────────────────────────
    console.log("\n  ── CUSTOMERS");
    await clickTab(page, "Customers");
    await wait(2000);
    await sc("31_customers_list");

    await page.evaluate(() => window.scrollBy(0, 400));
    await wait(700);
    await sc("32_customers_scrolled");
    await page.evaluate(() => window.scrollBy(0, -400));

    // Search customer
    const custSearch = await page.$("input");
    if (custSearch) {
      await custSearch.click();
      await custSearch.type("pizza", { delay: 70 });
      await wait(1500);
      await sc("33_customers_search");
      await custSearch.click({ clickCount: 3 });
      await custSearch.press("Backspace");
      await wait(600);
    }

    // Open customer profile
    await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll("div"));
      const rows = all.filter(el => {
        if (!el.offsetParent) return false;
        const r = el.getBoundingClientRect();
        return r.height > 55 && r.height < 150 && r.width > 250;
      });
      if (rows[1]) rows[1].click();
    });
    await wait(2000);
    await sc("34_customer_profile");
    await page.keyboard.press("Escape");
    await wait(600);

    // Add customer
    await clickText(page, "add|new|\\+|إضافة|جديد");
    await wait(2000);
    await sc("35_customer_add_form");
    await page.keyboard.press("Escape");
    await wait(600);

    // ── 7. REPORTS TAB ────────────────────────────────────────────────────────
    console.log("\n  ── REPORTS");
    await clickTab(page, "Reports");
    await sc("36_reports_overview");

    await page.evaluate(() => window.scrollBy(0, 300));
    await wait(700);
    await sc("37_reports_charts");
    await page.evaluate(() => window.scrollBy(0, 300));
    await wait(500);
    await sc("38_reports_bottom");
    await page.evaluate(() => window.scrollBy(0, -600));

    // Period filters
    for (const [label, regex] of [
      ["today", "today|اليوم"],
      ["week",  "week|أسبوع|weekly"],
      ["month", "month|شهر|monthly"],
    ]) {
      const ok = await clickText(page, regex);
      if (ok) { await wait(1500); await sc(`39_reports_${label}`); }
    }

    // ── 8. ONLINE ORDERS TAB ─────────────────────────────────────────────────
    console.log("\n  ── ONLINE ORDERS");
    await clickTab(page, "Online Orders");
    await sc("40_online_orders_list");

    await page.evaluate(() => window.scrollBy(0, 400));
    await wait(700);
    await sc("41_online_orders_scrolled");
    await page.evaluate(() => window.scrollBy(0, -400));

    // Open an order
    await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll("div"));
      const rows = all.filter(el => {
        if (!el.offsetParent) return false;
        const r = el.getBoundingClientRect();
        return r.height > 60 && r.height < 300 && r.width > 250;
      });
      if (rows[1]) rows[1].click();
    });
    await wait(2000);
    await sc("42_online_order_detail");

    await clickText(page, "accept|approve|قبول");
    await wait(1500);
    await sc("43_online_order_accepted");
    await page.keyboard.press("Escape");
    await wait(800);

    // Filter orders
    await clickText(page, "pending|new|جديد|قيد");
    await wait(1000);
    await sc("44_online_orders_pending");

    // ── 9. MORE / SETTINGS TAB ───────────────────────────────────────────────
    console.log("\n  ── MORE / SETTINGS");
    await clickTab(page, "More");
    await sc("45_more_menu");

    // Go to settings
    await clickText(page, "settings|الإعدادات|اعدادات");
    await wait(2000);
    await sc("46_settings_main");

    await page.evaluate(() => window.scrollBy(0, 400));
    await wait(700);
    await sc("47_settings_scrolled");
    await page.evaluate(() => window.scrollBy(0, -400));

    // Employees section
    await clickText(page, "employee|staff|موظف");
    await wait(2000);
    await sc("48_settings_employees");

    await clickText(page, "add|\\+|إضافة");
    await wait(1500);
    await sc("49_employee_add_form");
    await page.keyboard.press("Escape");
    await wait(600);
    await page.goBack({ waitUntil: "networkidle2" }).catch(() => {});
    await wait(1500);

    // Branches section
    await clickText(page, "branch|فرع");
    await wait(2000);
    await sc("50_settings_branches");
    await page.goBack({ waitUntil: "networkidle2" }).catch(() => {});
    await wait(1500);

    // Printers section
    await clickText(page, "printer|طابعة");
    await wait(1500);
    await sc("51_settings_printers");
    await page.keyboard.press("Escape");
    await wait(600);

    // Subscription info
    await clickText(page, "subscription|plan|اشتراك");
    await wait(1500);
    await sc("52_settings_subscription");
    await page.keyboard.press("Escape");
    await wait(600);

    // Language settings
    await clickText(page, "language|لغة");
    await wait(1000);
    await sc("53_settings_language");
    // Switch to Arabic
    await clickText(page, "arabic|العربية|عربي");
    await wait(2500);
    await sc("54_arabic_rtl_pos");

    // Navigate in Arabic mode
    await clickTab(page, "منتجات|Products");
    await wait(1500);
    await sc("55_arabic_products");
    await clickTab(page, "تقارير|Reports");
    await wait(1500);
    await sc("56_arabic_reports");

    // Restore English
    await clickTab(page, "المزيد|More");
    await wait(1000);
    await clickText(page, "settings|الإعدادات");
    await wait(1500);
    await clickText(page, "language|لغة");
    await wait(800);
    await clickText(page, "english|الإنجليزية");
    await wait(2000);

    // ── 10. CASHIER LOGIN ─────────────────────────────────────────────────────
    console.log("\n  ── CASHIER");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle2" });
    await wait(2500);
    await sc("57_login_screen_cashier");

    await clickText(page, "cashier lemon|cashier");
    await wait(1200);
    await sc("58_cashier_pin_pad");

    await enterPin(page, CASHIER_PIN);
    await wait(3000);
    await sc("59_cashier_logged_in");

    await clickTab(page, "POS");
    await sc("60_cashier_pos_screen");

    // Cashier: add items and checkout
    for (let i = 0; i < 2; i++) {
      await page.evaluate((idx) => {
        const all = Array.from(document.querySelectorAll("div"));
        const cards = all.filter(el => {
          if (!el.offsetParent) return false;
          const r = el.getBoundingClientRect();
          return r.width > 80 && r.height > 80 && /CHF|USD|EUR|\d+\.\d\d/.test(el.textContent || "");
        });
        if (cards[idx + 2]) cards[idx + 2].click();
      }, i);
      await wait(600);
    }
    await sc("61_cashier_cart_with_items");

    await clickText(page, "checkout|الدفع");
    await wait(2500);
    await sc("62_cashier_checkout");
    await page.keyboard.press("Escape");
    await wait(600);

    console.log(`\n  ✅  ${vp.name} DONE`);

  } catch (err) {
    console.error(`\n  ❌  Error (${vp.name}):`, err.message);
    try { await sc("ERROR_state"); } catch (_) {}
  }

  await page.close().catch(() => {});
}

// ── Entry point ───────────────────────────────────────────────────────────────
(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-web-security", "--start-maximized"],
    defaultViewport: null,
  });

  const VIEWPORTS = [
    { name: "phone",  w: 430,  h: 932,  dpr: 3, outDir: OUT_PHONE  },
    { name: "tablet", w: 1194, h: 834,  dpr: 2, outDir: OUT_TABLET },
  ];

  for (const vp of VIEWPORTS) {
    await runForViewport(browser, vp, vp.outDir);
  }

  await browser.close().catch(() => {});

  const phone  = fs.readdirSync(OUT_PHONE).filter(f => f.endsWith(".png")).length;
  const tablet = fs.readdirSync(OUT_TABLET).filter(f => f.endsWith(".png")).length;
  console.log(`\n${"═".repeat(64)}`);
  console.log(`🎉  DONE — ${phone} phone + ${tablet} tablet screenshots`);
  console.log(`    Phone:  ${OUT_PHONE}`);
  console.log(`    Tablet: ${OUT_TABLET}`);
  console.log(`${"═".repeat(64)}\n`);
})().catch(err => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
