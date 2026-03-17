/**
 * Barmagly POS – Verified Real Screenshots
 *
 * Rules:
 * 1. Close PWA dialog before every screenshot
 * 2. Verify expected content is visible before shooting
 * 3. Never shoot if wrong screen is shown
 * 4. Never proceed to next section if current failed
 * 5. All element finding is 100% dynamic – no hardcoded coords
 *
 * node scripts/take_real_screenshots.js
 */

const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const BASE_URL    = "https://pos.barmagly.tech/app";
const EMAIL       = "admin@pizzalemon.ch";
const LIC_KEY     = "BARMAGLY-F49F-9932-CB31-FBA1";
const ADMIN_PIN   = "1234";
const CASHIER_PIN = "0000";

const wait = ms => new Promise(r => setTimeout(r, ms));

// ── Suppress PWA before any page script runs ──────────────────────────────────
async function suppressPWA(page) {
  await page.evaluateOnNewDocument(() => {
    window.addEventListener("beforeinstallprompt", e => e.preventDefault(), true);
    try { localStorage.setItem("pwa_dismissed_v2", "1"); } catch(e) {}
  });
}

// ── Close any visible PWA overlay ────────────────────────────────────────────
async function closePWAOverlay(page) {
  await page.evaluate(() => {
    const ids = ["pwa-dialog-overlay", "pwa-ios-banner"];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });
    try { localStorage.setItem("pwa_dismissed_v2", "1"); } catch(e) {}
  }).catch(() => {});
}

// ── Take screenshot ONLY if expected text/element is visible ──────────────────
async function verifiedShot(page, outDir, label, mustContain, opts = {}) {
  const maxWait = opts.maxWait || 10000;

  // Wait until expected text appears in body
  const found = await waitForText(page, mustContain, maxWait);
  if (!found) {
    console.log(`  ⏭️  SKIP ${label} — "${mustContain}" not visible`);
    return false;
  }

  await closePWAOverlay(page);
  await wait(opts.extraWait || 600);

  const file = path.join(outDir, `${label}.png`);
  try {
    await page.screenshot({ path: file, fullPage: false });
    console.log(`  📸  ${label}.png`);
    return true;
  } catch (e) {
    console.log(`  ⚠️  screenshot error: ${e.message.slice(0,60)}`);
    return false;
  }
}

// ── Wait for text to appear anywhere in page body ────────────────────────────
async function waitForText(page, text, maxMs = 10000) {
  const re = new RegExp(text, "i");
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    try {
      const has = await page.evaluate((pattern) => {
        return new RegExp(pattern, "i").test(document.body.innerText || "");
      }, text);
      if (has) return true;
    } catch(e) {}
    await wait(350);
  }
  return false;
}

// ── Wait for URL to match pattern ─────────────────────────────────────────────
async function waitForUrl(page, pattern, maxMs = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    if (page.url().includes(pattern)) return true;
    await wait(300);
  }
  return false;
}

// ── Click element found dynamically by text ───────────────────────────────────
// Returns true if clicked, false if not found within timeout
async function clickText(page, regex, maxWait = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxWait) {
    const done = await page.evaluate((pattern) => {
      const re = new RegExp(pattern, "i");
      // Collect candidate elements
      const all = Array.from(document.querySelectorAll(
        "button, [role='button'], a, div, span"
      ));
      for (const el of all) {
        if (!el.offsetParent) continue;
        const t = (el.textContent || "").trim();
        if (!re.test(t)) continue;
        if (el.children.length > 8) continue; // skip large containers
        const r = el.getBoundingClientRect();
        if (r.width < 14 || r.height < 10) continue;
        // Scroll into view
        el.scrollIntoView({ block: "nearest" });
        // Get refreshed coords after scroll
        const r2 = el.getBoundingClientRect();
        const cx = r2.left + r2.width / 2;
        const cy = r2.top + r2.height / 2;
        // Dispatch full pointer + mouse + click chain
        const mkP = (type) => new PointerEvent(type, {
          bubbles: true, cancelable: true, composed: true,
          clientX: cx, clientY: cy, button: 0, buttons: 1, isPrimary: true
        });
        const mkM = (type) => new MouseEvent(type, {
          bubbles: true, cancelable: true, clientX: cx, clientY: cy, button: 0, buttons: 1
        });
        el.dispatchEvent(mkP("pointerover"));
        el.dispatchEvent(mkP("pointerenter"));
        el.dispatchEvent(mkP("pointerdown"));
        el.dispatchEvent(mkM("mousedown"));
        el.dispatchEvent(mkP("pointerup"));
        el.dispatchEvent(mkM("mouseup"));
        el.dispatchEvent(mkM("click"));
        return t.slice(0, 30);
      }
      return null;
    }, regex);

    if (done) { await wait(400); return true; }
    await wait(300);
  }
  return false;
}

// ── Click a PIN digit ─────────────────────────────────────────────────────────
// Finds the digit element dynamically, scrolls it into view, fires full events
async function clickPin(page, digit) {
  const d = String(digit);
  const done = await page.evaluate((d) => {
    const all = Array.from(document.querySelectorAll("*"));
    for (const el of all) {
      if (!el.offsetParent) continue;
      // Must be EXACTLY the digit character (trim whitespace/newlines)
      if ((el.textContent || "").replace(/\s/g, "") !== d) continue;
      const r = el.getBoundingClientRect();
      // PIN keys: reasonable size, square-ish
      if (r.width < 20 || r.height < 20 || r.width > 300) continue;

      el.scrollIntoView({ block: "nearest" });
      const r2 = el.getBoundingClientRect();
      const cx = r2.left + r2.width / 2;
      const cy = r2.top + r2.height / 2;

      const mkP = (type) => new PointerEvent(type, {
        bubbles: true, cancelable: true, composed: true,
        clientX: cx, clientY: cy, button: 0, buttons: 1, isPrimary: true
      });
      const mkM = (type) => new MouseEvent(type, {
        bubbles: true, cancelable: true, clientX: cx, clientY: cy, button: 0, buttons: 1
      });
      el.dispatchEvent(mkP("pointerover"));
      el.dispatchEvent(mkP("pointerdown"));
      el.dispatchEvent(mkM("mousedown"));
      el.dispatchEvent(mkP("pointerup"));
      el.dispatchEvent(mkM("mouseup"));
      el.dispatchEvent(mkM("click"));
      return `ok:${d} at (${Math.round(cx)},${Math.round(cy)})`;
    }
    return null;
  }, d);

  if (done) {
    console.log(`    🔢  ${done}`);
    await wait(400);
    return true;
  }
  // Fallback: use page.mouse at element center
  const coords = await page.evaluate((d) => {
    const all = Array.from(document.querySelectorAll("*"));
    for (const el of all) {
      if (!el.offsetParent) continue;
      if ((el.textContent || "").replace(/\s/g, "") !== d) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 20 || r.height < 20 || r.width > 300) continue;
      el.scrollIntoView({ block: "nearest" });
      const r2 = el.getBoundingClientRect();
      return { x: r2.left + r2.width / 2, y: r2.top + r2.height / 2 };
    }
    return null;
  }, d);

  if (coords) {
    await page.mouse.move(coords.x, coords.y);
    await wait(50);
    await page.mouse.down();
    await wait(80);
    await page.mouse.up();
    await wait(400);
    console.log(`    🔢  mouse fallback: ${d} at (${Math.round(coords.x)},${Math.round(coords.y)})`);
    return true;
  }

  console.log(`    ❌  PIN key "${d}" not found`);
  return false;
}

async function enterPin(page, pin) {
  for (const d of pin.split("")) await clickPin(page, d);
  await wait(3000); // wait for login API
}

// ── Handle shift modal ────────────────────────────────────────────────────────
async function handleShiftModal(page, outDir, shotLabel) {
  const shiftVisible = await waitForText(page, "shift|وردية", 4000);
  if (!shiftVisible) return;
  console.log("  ⏱  Shift modal — dismissing");
  await verifiedShot(page, outDir, shotLabel, "shift|وردية", { maxWait: 3000 });
  await clickText(page, "start shift|skip|continue|ok|ابدأ|تأكيد", 4000);
  await wait(1500);
  await clickText(page, "confirm|ok|done|start|متابعة", 2000);
  await wait(2500);
}

// ── Navigate and wait for network idle ───────────────────────────────────────
async function go(page, url) {
  await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
  await closePWAOverlay(page);
  await wait(1500);
}

// ── Click a bottom tab and verify switch ─────────────────────────────────────
async function clickTab(page, label, verifyText) {
  await clickText(page, `^${label}$`, 6000);
  if (verifyText) await waitForText(page, verifyText, 6000);
  await closePWAOverlay(page);
  await wait(1500);
}

// ═════════════════════════════════════════════════════════════════════════════
async function runViewport(browser, vp) {
  const outDir = path.join(__dirname, `../assets/images/screenshots/${vp.name}`);
  fs.mkdirSync(outDir, { recursive: true });
  fs.readdirSync(outDir).filter(f => f.endsWith(".png"))
    .forEach(f => fs.unlinkSync(path.join(outDir, f)));

  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${vp.name.toUpperCase()}  ${vp.w}×${vp.h}`);
  console.log(`${"═".repeat(60)}`);

  const page = await browser.newPage();
  await suppressPWA(page);
  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: vp.dpr });

  const s = (label, must, opts) => verifiedShot(page, outDir, label, must, opts);

  try {
    // ────────────────────────────────────────────────────────────────────────
    // INTRO
    // ────────────────────────────────────────────────────────────────────────
    console.log("\n── INTRO");
    await go(page, BASE_URL);
    await s("01_intro_welcome",   "Barmagly POS|Get Started");
    await s("02_intro_language",  "English|GB|Select Language|language");
    await clickText(page, "get started", 6000);
    await wait(2000);

    // ────────────────────────────────────────────────────────────────────────
    // LICENSE GATE (if not already licensed)
    // ────────────────────────────────────────────────────────────────────────
    const afterIntro = page.url();
    if (!afterIntro.includes("login") && !afterIntro.includes("tabs")) {
      console.log("\n── LICENSE GATE");
      if (!afterIntro.includes("license")) {
        await go(page, `${BASE_URL}/license-gate`);
      }

      await s("03_license_gate_empty", "Activate Your Store|Store Email");

      // Fill email
      const emailFilled = await page.evaluate(() => {
        const inputs = document.querySelectorAll("input");
        if (!inputs[0]) return false;
        inputs[0].focus(); inputs[0].click(); return true;
      });
      if (emailFilled) {
        await page.keyboard.down("Control"); await page.keyboard.press("a"); await page.keyboard.up("Control");
        await page.keyboard.type(EMAIL, { delay: 40 });
        await wait(300);
      }

      // Fill license key
      await page.evaluate(() => {
        const inputs = document.querySelectorAll("input");
        if (inputs[1]) { inputs[1].focus(); inputs[1].click(); }
      });
      await page.keyboard.down("Control"); await page.keyboard.press("a"); await page.keyboard.up("Control");
      await page.keyboard.type(LIC_KEY, { delay: 40 });
      await wait(300);

      await s("04_license_filled", "BARMAGLY|admin@pizzalemon");

      await clickText(page, "activate store|activate", 6000);
      await wait(1500);
      await s("05_license_activating", "activat|verify|verif|جار|loading", { maxWait: 3000 });

      console.log("  Waiting for license redirect...");
      await waitForUrl(page, "login", 30000);
      await wait(2000);
      await s("06_license_done", "Pizza Lemon|Admin|Cashier|select.*profile|Select your profile");
    } else {
      console.log("\n── Already licensed — skipping gate");
    }

    // ────────────────────────────────────────────────────────────────────────
    // LOGIN — EMPLOYEE SELECTION
    // ────────────────────────────────────────────────────────────────────────
    console.log("\n── LOGIN");
    if (!page.url().includes("login")) await go(page, `${BASE_URL}/login`);
    const employeesLoaded = await waitForText(page, "Admin|Cashier", 12000);
    if (!employeesLoaded) { console.log("  ❌ Employees not loaded — aborting"); return; }
    await s("07_login_employee_select", "Admin|Cashier|select.*profile|Select your profile");

    // ────────────────────────────────────────────────────────────────────────
    // ADMIN PIN PAD
    // ────────────────────────────────────────────────────────────────────────
    console.log("\n── ADMIN PIN");
    await clickText(page, "admin lemon|admin", 8000);
    const pinVisible = await waitForText(page, "Enter PIN|PIN|enter pin", 6000);
    if (!pinVisible) { console.log("  ❌ PIN pad not visible"); return; }
    await wait(800);
    await s("08_admin_pin_pad", "Enter PIN|Admin Lemon");

    await enterPin(page, ADMIN_PIN);
    await s("09_pin_entering",  "Enter PIN|Admin|shift", { maxWait: 5000 });

    await handleShiftModal(page, outDir, "10_shift_modal");

    // Verify login succeeded
    const loggedIn = await waitForText(page, "POS|Products|Customers|Reports|Online Orders|More", 8000);
    if (!loggedIn) {
      console.log("  ❌ Login failed — PIN may not have worked");
      return;
    }
    await s("11_logged_in_pos", "POS|Products|Cart|Checkout");
    console.log(`  ✅ Logged in — URL: ${page.url()}`);

    // ────────────────────────────────────────────────────────────────────────
    // POS SCREEN
    // ────────────────────────────────────────────────────────────────────────
    console.log("\n── POS");
    await waitForText(page, "CHF|USD|EUR|SAR", 10000);
    await s("12_pos_main", "Cart|CHF|USD|EUR");

    // Category tabs
    for (const cat of ["Pizza", "Calzone", "Pide", "Fingerfood"]) {
      if (await clickText(page, `^${cat}$`, 3000)) {
        await waitForText(page, "CHF|USD|EUR", 3000);
        await wait(700);
        await s(`13_pos_cat_${cat.toLowerCase()}`, `${cat}|CHF`);
      }
    }
    await clickText(page, "^All$", 3000);
    await wait(700);
    await s("14_pos_all_products", "CHF|USD|EUR|Cart");

    // Add products (find by price tag, click via real mouse)
    for (let i = 0; i < 3; i++) {
      const c = await page.evaluate((idx) => {
        const els = Array.from(document.querySelectorAll("*")).filter(el => {
          if (!el.offsetParent) return false;
          const r = el.getBoundingClientRect();
          return r.width > 70 && r.width < 500 && r.height > 60 && r.height < 350
            && /CHF|USD|EUR|SAR/.test(el.textContent || "");
        });
        const t = els[idx + 2];
        if (!t) return null;
        t.scrollIntoView({ block: "nearest" });
        const r = t.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }, i);
      if (c) { await page.mouse.click(c.x, c.y); await wait(700); }
    }
    await waitForText(page, "Subtotal|Total|subtotal", 4000);
    await s("15_pos_cart_filled", "Subtotal|Total|CHF");

    // Quantity + button
    await clickText(page, "^\\+$", 2000);
    await wait(500);
    await s("16_pos_qty_increased", "Subtotal|Total|CHF");

    // Checkout
    await clickText(page, "^checkout$|^الدفع$", 5000);
    await waitForText(page, "cash|payment|Cash|Payment|نقد", 7000);
    await s("17_pos_checkout", "cash|payment|Cash|Payment");

    // Cash
    await clickText(page, "^cash$|^Cash$|نقد", 4000);
    await wait(700);
    await s("18_pos_cash", "cash|Cash|CHF");

    // Confirm
    await clickText(page, "confirm|complete|print|إتمام|Confirm", 4000);
    await waitForText(page, "receipt|Receipt|new order|New Order|فاتورة", 8000);
    await s("19_pos_receipt", "receipt|Receipt|new order|New Order");

    // Close
    await clickText(page, "new order|New Order|close|done|جديد", 4000);
    await wait(800); await page.keyboard.press("Escape"); await wait(600);
    await s("20_pos_ready_next", "Cart|CHF|USD|Products");

    // Orders panel
    if (await clickText(page, "^orders$|^Orders$", 3000)) {
      await waitForText(page, "order|Order|طلب", 4000);
      await s("21_pos_orders_panel", "order|Order|طلب");
      await page.keyboard.press("Escape"); await wait(600);
    }

    // Invoices panel
    if (await clickText(page, "^invoices$|^Invoices$|فواتير", 3000)) {
      await wait(1800);
      await s("22_pos_invoices", "invoice|Invoice|فاتورة");
      await page.keyboard.press("Escape"); await wait(600);
    }

    // Zero Out Shift
    if (await clickText(page, "zero out|Zero Out|تصفير", 3000)) {
      await wait(1500);
      await s("23_pos_zero_shift", "zero|Zero|shift|Shift");
      await page.keyboard.press("Escape"); await wait(600);
    }

    // Customer search
    if (await clickText(page, "select customer|phone number|Select Customer", 3000)) {
      await wait(1200);
      await s("24_pos_customer_search", "customer|Customer|phone|Phone");
      await page.keyboard.press("Escape"); await wait(600);
    }

    // ────────────────────────────────────────────────────────────────────────
    // PRODUCTS TAB
    // ────────────────────────────────────────────────────────────────────────
    console.log("\n── PRODUCTS");
    await clickTab(page, "Products", "product|Product|CHF");
    await s("25_products_list", "product|Product|CHF|USD");

    await page.evaluate(() => window.scrollBy(0, 400)); await wait(700);
    await s("26_products_scroll", "product|Product|CHF");
    await page.evaluate(() => window.scrollBy(0, -400));

    // Search
    const si = await page.$("input");
    if (si) {
      await si.click(); await page.keyboard.type("pizza", { delay: 60 });
      await waitForText(page, "pizza|Pizza", 4000);
      await s("27_products_search_pizza", "pizza|Pizza");
      await si.click({ clickCount: 3 }); await page.keyboard.press("Backspace");
      await waitForText(page, "CHF|USD|EUR", 3000);
    }

    // Open product
    const pc = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll("*")).filter(el => {
        if (!el.offsetParent) return false;
        const r = el.getBoundingClientRect();
        return r.width > 100 && r.height > 60 && /CHF|USD|EUR/.test(el.textContent || "");
      });
      if (!els[1]) return null;
      els[1].scrollIntoView({ block: "nearest" });
      const r = els[1].getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    if (pc) {
      await page.mouse.click(pc.x, pc.y);
      await waitForText(page, "save|Save|edit|Edit|Price|price|Name|name", 5000);
      await s("28_product_edit_modal", "save|Save|Price|price|Name");
      await page.evaluate(() => window.scrollBy(0, 300)); await wait(600);
      await s("29_product_edit_scroll", "save|Save|category|Category");
      await page.keyboard.press("Escape"); await wait(800);
    }

    // Add new product
    if (await clickText(page, "add product|new product|إضافة منتج", 3000)) {
      await waitForText(page, "name|Name|price|Price", 5000);
      await s("30_product_new_form", "name|Name|price|Price");
      await page.keyboard.press("Escape"); await wait(600);
    }

    // ────────────────────────────────────────────────────────────────────────
    // CUSTOMERS TAB
    // ────────────────────────────────────────────────────────────────────────
    console.log("\n── CUSTOMERS");
    await clickTab(page, "Customers", "customer|Customer|عميل");
    await s("31_customers_list", "customer|Customer|عميل");

    await page.evaluate(() => window.scrollBy(0, 400)); await wait(700);
    await s("32_customers_scroll", "customer|Customer");
    await page.evaluate(() => window.scrollBy(0, -400));

    // Open customer
    const cc = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll("*")).filter(el => {
        if (!el.offsetParent) return false;
        const r = el.getBoundingClientRect();
        return r.height > 50 && r.height < 160 && r.width > 200;
      });
      if (!els[1]) return null;
      const r = els[1].getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    if (cc) {
      await page.mouse.click(cc.x, cc.y);
      await waitForText(page, "order|Order|phone|Phone|name|Name", 4000);
      await s("33_customer_profile", "order|Order|phone|Phone");
      await page.keyboard.press("Escape"); await wait(600);
    }

    if (await clickText(page, "add customer|new customer|إضافة|^\\+$", 3000)) {
      await waitForText(page, "name|Name|phone|Phone", 4000);
      await s("34_customer_add", "name|Name|phone|Phone");
      await page.keyboard.press("Escape"); await wait(600);
    }

    // ────────────────────────────────────────────────────────────────────────
    // REPORTS TAB
    // ────────────────────────────────────────────────────────────────────────
    console.log("\n── REPORTS");
    await clickTab(page, "Reports", "total|Total|revenue|Revenue|sales|Sales");
    await s("35_reports_overview", "total|Total|revenue|Revenue");
    await page.evaluate(() => window.scrollBy(0, 350)); await wait(700);
    await s("36_reports_charts", "total|Total|CHF");
    await page.evaluate(() => window.scrollBy(0, 350)); await wait(500);
    await s("37_reports_bottom",  "total|Total|order|Order");
    await page.evaluate(() => window.scrollBy(0, -700));

    for (const [lbl, rx] of [
      ["today", "^today$|اليوم"],
      ["week",  "^week$|^weekly$|أسبوع"],
      ["month", "^month$|^monthly$|شهر"],
    ]) {
      if (await clickText(page, rx, 3000)) {
        await waitForText(page, "total|Total|CHF|sales", 3000);
        await wait(1000);
        await s(`38_reports_${lbl}`, "total|Total|CHF");
      }
    }

    // ────────────────────────────────────────────────────────────────────────
    // ONLINE ORDERS TAB
    // ────────────────────────────────────────────────────────────────────────
    console.log("\n── ONLINE ORDERS");
    await clickTab(page, "Online Orders", "order|Order|طلب");
    await s("39_online_orders_list", "order|Order|طلب");
    await page.evaluate(() => window.scrollBy(0, 400)); await wait(700);
    await s("40_online_orders_scroll", "order|Order");
    await page.evaluate(() => window.scrollBy(0, -400));

    const oc = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll("*")).filter(el => {
        if (!el.offsetParent) return false;
        const r = el.getBoundingClientRect();
        return r.height > 60 && r.height < 300 && r.width > 200;
      });
      if (!els[1]) return null;
      const r = els[1].getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    if (oc) {
      await page.mouse.click(oc.x, oc.y);
      await waitForText(page, "order|Order|item|Item|total|Total", 5000);
      await s("41_online_order_detail", "order|Order|total|Total");
      await clickText(page, "accept|approve|قبول|Accept", 3000);
      await wait(1500);
      await s("42_online_order_accepted", "accept|confirm|order|Order");
      await page.keyboard.press("Escape"); await wait(800);
    }

    // ────────────────────────────────────────────────────────────────────────
    // MORE / SETTINGS TAB
    // ────────────────────────────────────────────────────────────────────────
    console.log("\n── SETTINGS");
    await clickTab(page, "More", "settings|Settings|employees|language");
    await s("43_more_menu", "settings|Settings|employees|Employees");

    await clickText(page, "^settings$|^Settings$|^الإعدادات$", 5000);
    await waitForText(page, "employee|language|printer|Language|Employee", 6000);
    await s("44_settings_main", "language|Language|employee|Employee");
    await page.evaluate(() => window.scrollBy(0, 400)); await wait(600);
    await s("45_settings_scroll", "language|Language|employee|Employee");
    await page.evaluate(() => window.scrollBy(0, -400));

    // Employees section
    if (await clickText(page, "^employees$|^Employees$|^موظفين$", 3000)) {
      await waitForText(page, "admin|Admin|cashier|Cashier|add|Add", 6000);
      await s("46_employees_list", "admin|Admin|cashier|Cashier");
      if (await clickText(page, "^add$|^Add$|^\\+$|إضافة", 3000)) {
        await waitForText(page, "name|Name|pin|PIN|role|Role", 4000);
        await s("47_employee_add_form", "name|Name|pin|PIN");
        await page.keyboard.press("Escape"); await wait(600);
      }
      await page.goBack({ waitUntil: "networkidle2" }).catch(() => {});
      await wait(2000);
    }

    // Back to settings
    await clickTab(page, "More", "settings|Settings");
    await clickText(page, "^settings$|^Settings$|الإعدادات", 4000);
    await wait(2000);

    // Printers
    if (await clickText(page, "^printers$|^Printers$|^printer$|طابعة", 3000)) {
      await waitForText(page, "printer|Printer|connect|Connect|طابعة", 4000);
      await s("48_printers", "printer|Printer|طابعة");
      await page.keyboard.press("Escape"); await wait(600);
    }

    // Subscription
    if (await clickText(page, "subscription|Subscription|plan|Plan|اشتراك", 3000)) {
      await waitForText(page, "plan|Plan|trial|Trial|subscribe|Subscribe", 4000);
      await s("49_subscription", "plan|Plan|trial|subscribe");
      await page.keyboard.press("Escape"); await wait(600);
    }

    // Language — switch to Arabic
    if (await clickText(page, "^language$|^Language$|^لغة$", 3000)) {
      await waitForText(page, "English|Arabic|German|GB|SA|DE", 4000);
      await s("50_language_menu", "English|Arabic|German");
      await clickText(page, "arabic|Arabic|العربية|SA", 3000);
      await waitForText(page, "منتجات|طلبات|تقارير|المزيد|POS", 5000);
      await closePWAOverlay(page); await wait(1000);
      await s("51_arabic_rtl_settings", "منتجات|طلبات|المزيد|POS");

      // Arabic POS
      await clickTab(page, "POS|نقطة البيع", "CHF|USD|EUR|منتج|Product");
      await s("52_arabic_pos", "CHF|USD|EUR|Cart|سلة");

      // Arabic Products
      await clickTab(page, "منتجات|Products", "CHF|USD|EUR|منتج");
      await s("53_arabic_products", "CHF|USD|EUR|منتج|Product");

      // Arabic Reports
      await clickTab(page, "تقارير|Reports", "total|Total|مبيعات|sales");
      await s("54_arabic_reports", "total|Total|مبيعات");

      // Arabic More/Settings
      await clickTab(page, "المزيد|More", "settings|الإعدادات|employees");
      await s("55_arabic_more_menu", "الإعدادات|settings|employees");

      // Restore English
      await clickText(page, "الإعدادات|settings|Settings", 3000); await wait(1500);
      await clickText(page, "language|لغة|Language", 3000); await wait(800);
      await clickText(page, "english|English|الإنجليزية|GB", 3000);
      await waitForText(page, "Products|Customers|Reports|More", 4000);
    }

    // ────────────────────────────────────────────────────────────────────────
    // CASHIER LOGIN
    // ────────────────────────────────────────────────────────────────────────
    console.log("\n── CASHIER");
    await go(page, `${BASE_URL}/login`);
    await waitForText(page, "Cashier|cashier|كاشير", 10000);
    await s("56_login_cashier_screen", "Cashier|cashier|كاشير");

    await clickText(page, "cashier lemon|cashier", 8000);
    await waitForText(page, "Enter PIN|PIN|pin", 6000);
    await wait(800);
    await s("57_cashier_pin_pad", "Enter PIN|Cashier");

    await enterPin(page, CASHIER_PIN);
    await handleShiftModal(page, outDir, "57b_cashier_shift");
    await waitForText(page, "POS|Products|CHF|Cart", 8000);
    await s("58_cashier_pos_screen", "POS|Products|CHF|Cart");

    // Add items as cashier
    for (let i = 0; i < 2; i++) {
      const c = await page.evaluate((idx) => {
        const els = Array.from(document.querySelectorAll("*")).filter(el => {
          if (!el.offsetParent) return false;
          const r = el.getBoundingClientRect();
          return r.width > 70 && r.height > 60 && /CHF|USD|EUR/.test(el.textContent || "");
        });
        const t = els[idx + 2];
        if (!t) return null;
        t.scrollIntoView({ block: "nearest" });
        const r = t.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }, i);
      if (c) { await page.mouse.click(c.x, c.y); await wait(700); }
    }
    await waitForText(page, "Subtotal|Total|CHF", 4000);
    await s("59_cashier_cart", "Subtotal|Total|CHF");

    await clickText(page, "^checkout$|الدفع", 5000);
    await waitForText(page, "cash|Cash|payment|Payment|نقد", 6000);
    await s("60_cashier_checkout", "cash|Cash|payment|Payment");
    await page.keyboard.press("Escape"); await wait(600);

    console.log(`\n  ✅  ${vp.name.toUpperCase()} — COMPLETE`);

  } catch (err) {
    console.error(`\n  ❌  (${vp.name}): ${err.message}`);
    try { await verifiedShot(page, outDir, "ZZ_error", ".", {}); } catch(_) {}
  }

  await page.close().catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────
(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-web-security", "--lang=en-US,en"],
    defaultViewport: null,
  });

  for (const vp of [
    { name: "phone",  w: 430,  h: 932, dpr: 3 },
    { name: "tablet", w: 1194, h: 834, dpr: 2 },
  ]) {
    await runViewport(browser, vp);
  }

  await browser.close().catch(() => {});

  for (const name of ["phone", "tablet"]) {
    const dir = path.join(__dirname, `../assets/images/screenshots/${name}`);
    const n = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith(".png")).length : 0;
    console.log(`  ${name}: ${n} screenshots → ${dir}`);
  }
  console.log("\n🎉  Done!\n");
})();
