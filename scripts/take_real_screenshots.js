/**
 * Barmagly POS – Real Screenshots (Puppeteer)
 * - Dismisses PWA dialog before anything
 * - Verifies each page loaded correctly before screenshotting
 * - Uses real mouse.click() for PIN pad
 *
 *   node scripts/take_real_screenshots.js
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

// ── Dismiss PWA dialog immediately (before screenshots) ───────────────────────
async function dismissPWA(page) {
  await page.evaluate(() => {
    // Prevent beforeinstallprompt from showing
    window.__pwa_prevented = true;
    // Close custom PWA dialog if it exists
    const overlay = document.getElementById("pwa-dialog-overlay");
    if (overlay) { overlay.style.display = "none"; overlay.remove(); }
    const banner = document.getElementById("pwa-ios-banner");
    if (banner) { banner.style.display = "none"; banner.remove(); }
    // Mark as dismissed so it won't show again
    try { localStorage.setItem("pwa_dismissed_v2", "1"); } catch(e) {}
  });
}

// ── Set localStorage to suppress PWA on next load ────────────────────────────
async function suppressPWAForSession(page) {
  await page.evaluateOnNewDocument(() => {
    // Run before any page scripts — suppress beforeinstallprompt
    window.addEventListener("beforeinstallprompt", e => e.preventDefault(), true);
    // Pre-set dismissed flag so custom dialog never shows
    Object.defineProperty(window, "__pwa_prevented", { value: true });
    try { localStorage.setItem("pwa_dismissed_v2", "1"); } catch(e) {}
  });
}

// ── Screenshot helper ─────────────────────────────────────────────────────────
async function sc(page, outDir, label) {
  const file = path.join(outDir, `${label}.png`);
  try {
    await page.screenshot({ path: file, fullPage: false });
    console.log(`  📸  ${label}.png`);
  } catch (e) { console.log(`  ⚠️  screenshot failed: ${e.message.slice(0, 60)}`); }
}

// ── Wait for a condition function ─────────────────────────────────────────────
async function waitFor(page, condFn, maxMs = 10000, interval = 300) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    try { if (await page.evaluate(condFn)) return true; } catch(e) {}
    await wait(interval);
  }
  return false;
}

// ── Wait for URL to include pattern ──────────────────────────────────────────
async function waitForUrl(page, pattern, maxMs = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    if (page.url().includes(pattern)) return true;
    await wait(400);
  }
  return false;
}

// ── Click element by text (with real mouse coords) ────────────────────────────
async function clickByText(page, regex, maxWaitMs = 8000) {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const coords = await page.evaluate((pattern) => {
      const re = new RegExp(pattern, "i");
      const all = Array.from(document.querySelectorAll("div,button,span,a,[role='button']"));
      for (const el of all) {
        if (!el.offsetParent) continue;
        const t = (el.textContent || "").trim();
        if (!re.test(t)) continue;
        if (el.children.length > 6) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 16 || r.height < 10) continue;
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }
      return null;
    }, regex);

    if (coords) {
      await page.mouse.click(coords.x, coords.y);
      await wait(400);
      return true;
    }
    await wait(350);
  }
  return false;
}

// ── Click a PIN digit using real mouse coordinates ────────────────────────────
async function clickPinKey(page, digit) {
  const coords = await page.evaluate((d) => {
    const all = Array.from(document.querySelectorAll("*"));
    for (const el of all) {
      if (!el.offsetParent) continue;
      const t = (el.textContent || "").trim();
      if (t !== d) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 20 || r.height < 20 || r.width > 250) continue;
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    return null;
  }, String(digit));

  if (coords) {
    await page.mouse.click(coords.x, coords.y);
    await wait(400);
    return true;
  }
  console.log(`    ⚠️  PIN "${digit}" not found`);
  return false;
}

async function enterPin(page, pin) {
  for (const d of pin.split("")) await clickPinKey(page, d);
  // Wait for login API response
  await wait(3000);
}

// ── Navigate to a page and wait for it to load properly ──────────────────────
async function navTo(page, url, readyCheck = null, maxMs = 15000) {
  await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
  await dismissPWA(page);
  await wait(2000);
  if (readyCheck) await waitFor(page, readyCheck, maxMs);
  await wait(500);
}

// ── Handle shift modal after login ────────────────────────────────────────────
async function handleShiftModal(page, outDir, prefix) {
  const hasModal = await waitFor(page, () => {
    return Array.from(document.querySelectorAll("div,span")).some(el => {
      const t = (el.textContent || "").toLowerCase();
      return t.includes("shift") && el.offsetParent && t.length < 200;
    });
  }, 4000);

  if (hasModal) {
    console.log("  ⏱  Shift modal — handling");
    await sc(page, outDir, `${prefix}_shift_modal`);
    // Click "Start Shift" or opening cash confirm
    await clickByText(page, "start shift|skip|continue|ok|تأكيد|ابدأ", 4000);
    await wait(1500);
    await clickByText(page, "confirm|ok|done|start|متابعة", 3000);
    await wait(2000);
  }
}

// ── Click bottom tab bar ──────────────────────────────────────────────────────
async function clickTab(page, label) {
  const ok = await clickByText(page, `^${label}$`, 6000);
  if (ok) {
    await wait(2500);
    await dismissPWA(page);
  }
  return ok;
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN FLOW
// ═════════════════════════════════════════════════════════════════════════════
async function runViewport(browser, vp) {
  const outDir = path.join(__dirname, `../assets/images/screenshots/${vp.name}`);
  fs.mkdirSync(outDir, { recursive: true });
  // Clear old screenshots
  fs.readdirSync(outDir).forEach(f => fs.unlinkSync(path.join(outDir, f)));

  console.log(`\n${"═".repeat(64)}`);
  console.log(`  ${vp.name.toUpperCase()}  ${vp.w}×${vp.h}`);
  console.log(`${"═".repeat(64)}`);

  const page = await browser.newPage();
  await suppressPWAForSession(page);
  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: vp.dpr });
  page.setDefaultNavigationTimeout(30000);

  const s = (label) => sc(page, outDir, label);

  try {

    // ══════════════════════════════════════════════════════════════════════════
    // 1. INTRO SCREEN
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n── 1. INTRO");
    await navTo(page, BASE_URL, null, 5000);
    await wait(2000);
    // Verify: intro page has "Barmagly POS" heading and language selector
    const onIntro = await waitFor(page, () =>
      document.body.textContent.includes("Barmagly POS") ||
      document.body.textContent.includes("Get Started"), 5000);
    await s("01_intro_welcome");

    // Language selection visible
    await s("02_intro_language_select");

    // Click Get Started
    await clickByText(page, "get started", 6000);
    await wait(2000);

    // ══════════════════════════════════════════════════════════════════════════
    // 2. LICENSE GATE
    // ══════════════════════════════════════════════════════════════════════════
    const urlNow = page.url();
    console.log(`\n── 2. LICENSE GATE (url: ${urlNow})`);

    if (urlNow.includes("login") || urlNow.includes("tabs")) {
      console.log("  Already licensed");
    } else {
      if (!urlNow.includes("license")) {
        await navTo(page, `${BASE_URL}/license-gate`, null, 5000);
      }

      // Wait for inputs to appear
      await waitFor(page, () => document.querySelectorAll("input").length >= 2, 8000);
      await s("03_license_gate");

      // Fill email field
      await page.evaluate(() => {
        const inp = document.querySelectorAll("input")[0];
        if (inp) { inp.focus(); inp.click(); }
      });
      await wait(300);
      await page.keyboard.down("Control"); await page.keyboard.press("a"); await page.keyboard.up("Control");
      await page.keyboard.type(EMAIL, { delay: 35 });
      await wait(400);

      // Fill license key field
      await page.evaluate(() => {
        const inp = document.querySelectorAll("input")[1];
        if (inp) { inp.focus(); inp.click(); }
      });
      await wait(300);
      await page.keyboard.down("Control"); await page.keyboard.press("a"); await page.keyboard.up("Control");
      await page.keyboard.type(LIC_KEY, { delay: 35 });
      await wait(400);

      await s("04_license_filled");

      // Click Activate Store
      await clickByText(page, "activate store|activate", 6000);
      await wait(2000);
      await s("05_license_activating");

      // Wait for redirect to login (up to 30s)
      console.log("  Waiting for license validation...");
      const redirected = await waitForUrl(page, "login", 30000);
      if (!redirected) {
        console.log("  ⚠️  No redirect after 30s — navigating manually");
        await navTo(page, `${BASE_URL}/login`, null, 5000);
      }
      await wait(2000);
      await s("06_license_success");
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 3. LOGIN — EMPLOYEE SELECTION
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n── 3. LOGIN");
    if (!page.url().includes("login")) {
      await navTo(page, `${BASE_URL}/login`, null, 5000);
    }
    // Wait for employee cards to load
    await waitFor(page, () =>
      document.body.textContent.includes("Admin") ||
      document.body.textContent.includes("Cashier"), 10000);
    await wait(1500);
    await s("07_login_employees");

    // ══════════════════════════════════════════════════════════════════════════
    // 4. ADMIN — PIN ENTRY
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n── 4. ADMIN PIN");
    // Click Admin card
    await clickByText(page, "admin lemon|admin", 8000);
    await wait(1500);
    // Verify PIN pad appeared (digit "1" is visible)
    await waitFor(page, () => {
      const all = Array.from(document.querySelectorAll("*"));
      return all.some(el => {
        if (!el.offsetParent) return false;
        const t = (el.textContent || "").trim();
        if (t !== "1") return false;
        const r = el.getBoundingClientRect();
        return r.width > 20 && r.height > 20 && r.width < 250;
      });
    }, 5000);
    await s("08_admin_pin_pad");

    // Enter PIN 1-2-3-4
    await enterPin(page, ADMIN_PIN);
    await s("09_pin_entering");

    // Wait for login to complete (URL changes or tabs appear)
    const loginDone = await waitFor(page, () =>
      !window.location.href.includes("/login") ||
      document.body.textContent.includes("shift") ||
      document.body.textContent.includes("POS"), 8000);

    await handleShiftModal(page, outDir, "10");
    await wait(2000);
    await s("11_logged_in");
    console.log(`  URL: ${page.url()}`);

    // Verify we're NOT still on login
    if (page.url().includes("login")) {
      console.log("  ⚠️  Still on login — PIN may have failed. Trying again...");
      await clickByText(page, "admin lemon|admin", 5000);
      await wait(1500);
      await enterPin(page, ADMIN_PIN);
      await handleShiftModal(page, outDir, "10b");
      await wait(3000);
    }
    console.log(`  URL after login: ${page.url()}`);

    // ══════════════════════════════════════════════════════════════════════════
    // 5. POS SCREEN
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n── 5. POS");
    // Navigate to POS tab
    if (!page.url().includes("tabs") && !page.url().endsWith("/app/")) {
      await navTo(page, BASE_URL, null, 5000);
    }
    // Wait for product cards with prices
    await waitFor(page, () =>
      /CHF|USD|EUR|SAR/.test(document.body.textContent), 10000);
    await wait(1000);
    await s("12_pos_main");

    // Category tabs
    for (const cat of ["Pizza", "Calzone", "Pide", "Fingerfood"]) {
      const found = await clickByText(page, `^${cat}$`, 3000);
      if (found) {
        await waitFor(page, () => /CHF|USD|EUR/.test(document.body.textContent), 3000);
        await wait(800);
        await s(`13_pos_cat_${cat.toLowerCase()}`);
      }
    }
    await clickByText(page, "^All$", 3000);
    await wait(800);
    await s("14_pos_all_products");

    // Add 3 products to cart
    for (let i = 0; i < 3; i++) {
      const coords = await page.evaluate((idx) => {
        const all = Array.from(document.querySelectorAll("*"));
        const cards = all.filter(el => {
          if (!el.offsetParent) return false;
          const r = el.getBoundingClientRect();
          return r.width > 80 && r.width < 500 && r.height > 70 && r.height < 350
            && /CHF|USD|EUR|SAR/.test(el.textContent || "");
        });
        const target = cards[idx + 2];
        if (!target) return null;
        const r = target.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }, i);
      if (coords) {
        await page.mouse.click(coords.x, coords.y);
        await wait(700);
      }
    }
    // Verify cart has items
    await waitFor(page, () =>
      !document.body.textContent.includes("Cart is empty"), 5000);
    await s("15_pos_cart_items");

    // Increase qty
    await clickByText(page, "^\\+$", 2000);
    await wait(600);
    await s("16_pos_qty_increased");

    // Open checkout
    await clickByText(page, "^checkout$|^الدفع$", 5000);
    await waitFor(page, () =>
      document.body.textContent.toLowerCase().includes("cash") ||
      document.body.textContent.toLowerCase().includes("payment"), 6000);
    await s("17_pos_checkout_modal");

    // Select cash payment
    await clickByText(page, "^cash$|نقد|كاش", 4000);
    await wait(800);
    await s("18_pos_cash_selected");

    // Confirm
    await clickByText(page, "confirm|complete|print|إتمام|تأكيد", 4000);
    await waitFor(page, () =>
      document.body.textContent.toLowerCase().includes("receipt") ||
      document.body.textContent.toLowerCase().includes("فاتورة") ||
      document.body.textContent.toLowerCase().includes("new order"), 8000);
    await s("19_pos_receipt");

    // Close receipt
    await clickByText(page, "new order|close|done|جديد|إغلاق", 4000);
    await wait(1000);
    await page.keyboard.press("Escape");
    await wait(800);
    await s("20_pos_after_checkout");

    // Orders panel
    await clickByText(page, "^orders$", 3000);
    await waitFor(page, () => document.body.textContent.includes("order"), 4000);
    await s("21_pos_orders_panel");
    await page.keyboard.press("Escape"); await wait(600);

    // Invoices panel
    await clickByText(page, "^invoices$|فواتير", 3000);
    await wait(2000);
    await s("22_pos_invoices_panel");
    await page.keyboard.press("Escape"); await wait(600);

    // Customer search
    await clickByText(page, "select customer|phone number|walk-in", 3000);
    await wait(1500);
    await s("23_pos_customer_search");
    await page.keyboard.press("Escape"); await wait(600);

    // ══════════════════════════════════════════════════════════════════════════
    // 6. PRODUCTS TAB
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n── 6. PRODUCTS");
    await clickTab(page, "Products");
    await waitFor(page, () =>
      document.body.textContent.includes("product") ||
      /CHF|USD|EUR/.test(document.body.textContent), 8000);
    await s("24_products_list");

    await page.evaluate(() => window.scrollBy(0, 400));
    await wait(700); await s("25_products_scrolled");
    await page.evaluate(() => window.scrollBy(0, -400));

    // Search
    const si = await page.$("input");
    if (si) {
      await si.click(); await page.keyboard.type("pizza", { delay: 60 });
      await wait(1500); await s("26_products_search");
      await si.click({ clickCount: 3 }); await page.keyboard.press("Backspace");
      await wait(600);
    }

    // Open product edit
    const prodCoords = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll("*"));
      const cards = all.filter(el => {
        if (!el.offsetParent) return false;
        const r = el.getBoundingClientRect();
        return r.width > 120 && r.height > 70 && /CHF|USD|EUR/.test(el.textContent || "");
      });
      if (!cards[1]) return null;
      const r = cards[1].getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    if (prodCoords) {
      await page.mouse.click(prodCoords.x, prodCoords.y);
      await waitFor(page, () =>
        document.body.textContent.toLowerCase().includes("save") ||
        document.body.textContent.toLowerCase().includes("edit"), 5000);
      await s("27_product_edit");
      await page.evaluate(() => window.scrollBy(0, 300));
      await wait(600); await s("28_product_edit_scroll");
      await page.keyboard.press("Escape"); await wait(800);
    }

    // Add new product
    await clickByText(page, "add product|new product|إضافة", 3000);
    await waitFor(page, () =>
      document.body.textContent.toLowerCase().includes("name") ||
      document.body.textContent.toLowerCase().includes("price"), 5000);
    await s("29_product_new_form");
    await page.keyboard.press("Escape"); await wait(600);

    // ══════════════════════════════════════════════════════════════════════════
    // 7. CUSTOMERS TAB
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n── 7. CUSTOMERS");
    await clickTab(page, "Customers");
    await waitFor(page, () =>
      document.body.textContent.toLowerCase().includes("customer") ||
      document.body.textContent.toLowerCase().includes("عميل"), 8000);
    await s("30_customers_list");

    await page.evaluate(() => window.scrollBy(0, 400));
    await wait(700); await s("31_customers_scroll");
    await page.evaluate(() => window.scrollBy(0, -400));

    // Open customer
    const custCoords = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll("*"));
      const rows = all.filter(el => {
        if (!el.offsetParent) return false;
        const r = el.getBoundingClientRect();
        return r.height > 55 && r.height < 160 && r.width > 220;
      });
      if (!rows[1]) return null;
      const r = rows[1].getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    if (custCoords) {
      await page.mouse.click(custCoords.x, custCoords.y);
      await wait(2000); await s("32_customer_detail");
      await page.keyboard.press("Escape"); await wait(600);
    }

    // Add customer
    await clickByText(page, "add customer|new customer|إضافة|\\+", 3000);
    await waitFor(page, () =>
      document.body.textContent.toLowerCase().includes("name") ||
      document.body.textContent.toLowerCase().includes("phone"), 4000);
    await s("33_customer_add_form");
    await page.keyboard.press("Escape"); await wait(600);

    // ══════════════════════════════════════════════════════════════════════════
    // 8. REPORTS TAB
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n── 8. REPORTS");
    await clickTab(page, "Reports");
    await waitFor(page, () =>
      document.body.textContent.toLowerCase().includes("total") ||
      document.body.textContent.toLowerCase().includes("revenue") ||
      document.body.textContent.toLowerCase().includes("sales"), 10000);
    await s("34_reports_overview");
    await page.evaluate(() => window.scrollBy(0, 350)); await wait(700);
    await s("35_reports_charts");
    await page.evaluate(() => window.scrollBy(0, 350)); await wait(500);
    await s("36_reports_bottom");
    await page.evaluate(() => window.scrollBy(0, -700));

    for (const [lbl, rgx] of [["today","^today$|اليوم"],["week","^week$|أسبوع"],["month","^month$|شهر"]]) {
      if (await clickByText(page, rgx, 3000)) {
        await waitFor(page, () =>
          document.body.textContent.toLowerCase().includes("total"), 3000);
        await wait(1200); await s(`37_reports_${lbl}`);
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 9. ONLINE ORDERS TAB
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n── 9. ONLINE ORDERS");
    await clickTab(page, "Online Orders");
    await waitFor(page, () =>
      document.body.textContent.toLowerCase().includes("order"), 8000);
    await s("38_online_orders");
    await page.evaluate(() => window.scrollBy(0, 400)); await wait(700);
    await s("39_online_orders_scroll");
    await page.evaluate(() => window.scrollBy(0, -400));

    // Open order
    const orderCoords = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll("*"));
      const rows = all.filter(el => {
        if (!el.offsetParent) return false;
        const r = el.getBoundingClientRect();
        return r.height > 65 && r.height < 300 && r.width > 220;
      });
      if (!rows[1]) return null;
      const r = rows[1].getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    if (orderCoords) {
      await page.mouse.click(orderCoords.x, orderCoords.y);
      await wait(2000); await s("40_online_order_detail");
      await clickByText(page, "accept|approve|قبول|تأكيد", 3000);
      await wait(1500); await s("41_online_order_accepted");
      await page.keyboard.press("Escape"); await wait(800);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 10. MORE / SETTINGS
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n── 10. SETTINGS");
    await clickTab(page, "More");
    await waitFor(page, () =>
      document.body.textContent.toLowerCase().includes("settings") ||
      document.body.textContent.toLowerCase().includes("الإعدادات"), 5000);
    await s("42_more_menu");

    await clickByText(page, "^settings$|^الإعدادات$|^اعدادات$", 5000);
    await waitFor(page, () =>
      document.body.textContent.toLowerCase().includes("employee") ||
      document.body.textContent.toLowerCase().includes("language"), 6000);
    await s("43_settings_main");
    await page.evaluate(() => window.scrollBy(0, 400)); await wait(600);
    await s("44_settings_scroll");
    await page.evaluate(() => window.scrollBy(0, -400));

    // Employees
    if (await clickByText(page, "employee|staff|موظفين", 3000)) {
      await waitFor(page, () =>
        document.body.textContent.toLowerCase().includes("add") ||
        document.body.textContent.toLowerCase().includes("admin"), 5000);
      await s("45_employees_list");
      if (await clickByText(page, "add|\\+|إضافة", 3000)) {
        await wait(1500); await s("46_employee_add_form");
        await page.keyboard.press("Escape"); await wait(600);
      }
      await page.goBack({ waitUntil: "networkidle2" }).catch(() => {});
      await wait(1500);
    }

    // Back to settings
    await clickTab(page, "More");
    await clickByText(page, "^settings$|الإعدادات|اعدادات", 4000);
    await wait(2000);

    // Printers
    if (await clickByText(page, "printer|طابعة", 3000)) {
      await wait(1500); await s("47_printers");
      await page.keyboard.press("Escape"); await wait(600);
    }

    // Subscription
    if (await clickByText(page, "subscription|plan|اشتراك", 3000)) {
      await wait(1500); await s("48_subscription");
      await page.keyboard.press("Escape"); await wait(600);
    }

    // Language → Arabic
    if (await clickByText(page, "language|لغة", 3000)) {
      await wait(800); await s("49_language_settings");
      await clickByText(page, "arabic|العربية|عربي|sa", 3000);
      await wait(2500);
      await dismissPWA(page);
      await s("50_arabic_rtl");

      await clickTab(page, "نقطة البيع|POS|المتجر");
      await wait(1500); await s("51_arabic_pos");
      await clickTab(page, "منتجات|Products");
      await wait(1500); await s("52_arabic_products");
      await clickTab(page, "تقارير|Reports");
      await wait(1500); await s("53_arabic_reports");

      // Restore English
      await clickTab(page, "المزيد|More");
      await clickByText(page, "الإعدادات|settings|اعدادات", 3000);
      await wait(1500);
      await clickByText(page, "language|لغة", 3000);
      await wait(800);
      await clickByText(page, "english|الإنجليزية|gb", 3000);
      await wait(2000);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 11. CASHIER LOGIN
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n── 11. CASHIER");
    await navTo(page, `${BASE_URL}/login`, null, 5000);
    await waitFor(page, () =>
      document.body.textContent.includes("Cashier") ||
      document.body.textContent.includes("كاشير"), 10000);
    await s("54_login_cashier");

    await clickByText(page, "cashier lemon|cashier", 8000);
    await waitFor(page, () => {
      const all = Array.from(document.querySelectorAll("*"));
      return all.some(el => {
        if (!el.offsetParent) return false;
        const t = (el.textContent || "").trim();
        if (t !== "1") return false;
        const r = el.getBoundingClientRect();
        return r.width > 20 && r.height > 20 && r.width < 250;
      });
    }, 5000);
    await s("55_cashier_pin_pad");

    await enterPin(page, CASHIER_PIN);
    await handleShiftModal(page, outDir, "55b");
    await wait(2000);
    await s("56_cashier_logged_in");

    // Cashier POS
    await clickTab(page, "POS");
    await waitFor(page, () => /CHF|USD|EUR/.test(document.body.textContent), 8000);
    await s("57_cashier_pos");

    // Add items
    for (let i = 0; i < 2; i++) {
      const c = await page.evaluate((idx) => {
        const cards = Array.from(document.querySelectorAll("*")).filter(el => {
          if (!el.offsetParent) return false;
          const r = el.getBoundingClientRect();
          return r.width > 80 && r.height > 70 && /CHF|USD|EUR/.test(el.textContent || "");
        });
        const t = cards[idx + 2];
        if (!t) return null;
        const r = t.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }, i);
      if (c) { await page.mouse.click(c.x, c.y); await wait(700); }
    }
    await waitFor(page, () => !document.body.textContent.includes("Cart is empty"), 4000);
    await s("58_cashier_cart");

    await clickByText(page, "^checkout$|الدفع", 5000);
    await wait(2500);
    await s("59_cashier_checkout");
    await page.keyboard.press("Escape"); await wait(600);

    console.log(`\n  ✅  ${vp.name.toUpperCase()} COMPLETE`);

  } catch (err) {
    console.error(`\n  ❌  (${vp.name}): ${err.message}`);
    try { await sc(page, outDir, "ZZ_error"); } catch (_) {}
  }

  await page.close().catch(() => {});
}

// ── Entry point ───────────────────────────────────────────────────────────────
(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-web-security", "--lang=en-US"],
    defaultViewport: null,
  });

  for (const vp of [
    { name: "phone",  w: 430,  h: 932, dpr: 3 },
    { name: "tablet", w: 1194, h: 834, dpr: 2 },
  ]) {
    await runViewport(browser, vp);
  }

  await browser.close().catch(() => {});

  for (const vp of ["phone", "tablet"]) {
    const dir = path.join(__dirname, `../assets/images/screenshots/${vp}`);
    const count = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith(".png")).length : 0;
    console.log(`  ${vp}: ${count} screenshots`);
  }
  console.log("\n🎉  Done!\n");
})();
