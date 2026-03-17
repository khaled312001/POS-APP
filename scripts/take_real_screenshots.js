/**
 * Barmagly POS – Real App Screenshots (Puppeteer)
 * Navigates the live web app and takes screenshots of every screen & flow
 *
 *   node scripts/take_real_screenshots.js
 */

const puppeteer = require("puppeteer");
const path      = require("path");
const fs        = require("fs");

// ── Config ────────────────────────────────────────────────────────────────────
const BASE_URL    = "https://pos.barmagly.tech/app";
const EMAIL       = "admin@pizzalemon.ch";
const LIC_KEY     = "BARMAGLY-F49F-9932-CB31-FBA1";
const ADMIN_PIN   = "1234";
const CASHIER_PIN = "0000";

const wait = ms => new Promise(r => setTimeout(r, ms));

// ── Screenshot helper ─────────────────────────────────────────────────────────
async function sc(page, outDir, label) {
  const file = path.join(outDir, `${label}.png`);
  try {
    await page.screenshot({ path: file, fullPage: false });
    console.log(`  📸  ${label}.png`);
  } catch (e) { console.log(`  ⚠️  skip: ${e.message.slice(0, 60)}`); }
}

// ── Fill React Native TextInput reliably ─────────────────────────────────────
// React Native Web renders TextInput as <input>. Using keyboard.type() triggers
// the proper synthetic events so React state updates.
async function fillInput(page, inputIndex, value) {
  await page.evaluate((idx) => {
    const inputs = Array.from(document.querySelectorAll("input"));
    if (inputs[idx]) {
      inputs[idx].focus();
      inputs[idx].click();
    }
  }, inputIndex);
  await wait(300);

  // Select all existing text and replace
  await page.keyboard.down("Control");
  await page.keyboard.press("a");
  await page.keyboard.up("Control");
  await wait(100);
  await page.keyboard.type(value, { delay: 40 });
  await wait(400);
}

// ── Click element by text regex ───────────────────────────────────────────────
async function clickByText(page, regex, maxWaitMs = 10000) {
  const re = new RegExp(regex, "i");
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    const clicked = await page.evaluate((pattern) => {
      const re = new RegExp(pattern, "i");
      const all = Array.from(document.querySelectorAll(
        "div, button, span, a, [role='button']"
      ));
      for (const el of all) {
        if (!el.offsetParent && el.tagName !== "BODY") continue;
        const t = (el.textContent || "").trim();
        if (!re.test(t)) continue;
        if (el.children.length > 6) continue; // skip containers
        const r = el.getBoundingClientRect();
        if (r.width < 16 || r.height < 10) continue;
        // find nearest clickable ancestor
        let cur = el;
        for (let i = 0; i < 6; i++) {
          if (!cur) break;
          const tag = cur.tagName;
          const role = cur.getAttribute("role");
          if (tag === "BUTTON" || role === "button" || role === "link") {
            cur.click();
            return t;
          }
          cur = cur.parentElement;
        }
        el.click();
        return t;
      }
      return null;
    }, regex);

    if (clicked) {
      await wait(300);
      return clicked;
    }
    await wait(400);
  }
  return null;
}

// ── Click a PIN digit using real mouse coordinates ────────────────────────────
// React Native Web Pressable doesn't respond to el.click() reliably.
// page.mouse.click(x, y) fires real pointer events that React Native Web handles.
async function clickPinKey(page, digit) {
  const str = String(digit);

  // Get the center coordinates of the element containing exactly this digit
  const coords = await page.evaluate((d) => {
    const all = Array.from(document.querySelectorAll("*"));
    for (const el of all) {
      if (!el.offsetParent) continue;
      const t = (el.textContent || "").trim();
      if (t !== d) continue;
      const r = el.getBoundingClientRect();
      // PIN keys are square-ish, not too wide, not too narrow
      if (r.width < 20 || r.height < 20 || r.width > 250) continue;
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
    }
    return null;
  }, str);

  if (coords) {
    // Use real mouse click at element center — React Native Web responds to this
    await page.mouse.click(coords.x, coords.y);
    await wait(350);
    return true;
  }

  console.log(`    ⚠️  PIN key "${digit}" not found`);
  return false;
}

async function enterPin(page, pin) {
  for (const d of pin.split("")) {
    await clickPinKey(page, d);
  }
  await wait(1500); // wait for login API call
}

// ── Click a bottom tab by label ───────────────────────────────────────────────
async function clickTab(page, label) {
  const ok = await clickByText(page, `^${label}$`, 5000);
  if (ok) await wait(2500);
  return ok;
}

// ── Handle the "Start Shift?" modal that appears after login ──────────────────
async function handleShiftModal(page) {
  await wait(2000);
  // Check if shift modal is visible
  const hasShiftModal = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll("div, span"));
    return all.some(el => {
      const t = (el.textContent || "").toLowerCase();
      return t.includes("shift") && t.includes("start") && el.offsetParent;
    });
  });
  if (hasShiftModal) {
    console.log("  ⏱  Shift modal detected — starting shift");
    await sc(page, currentOutDir, "shift_modal");
    await clickByText(page, "start shift|ابدأ وردية|start|ابدأ", 5000);
    await wait(2000);
    // Opening cash modal
    await clickByText(page, "confirm|ok|continue|done|تأكيد|متابعة", 3000);
    await wait(2000);
  }
}

// ── Full app flow for one viewport ───────────────────────────────────────────
let currentOutDir = "";

async function runViewport(browser, vp) {
  const outDir = path.join(__dirname, `../assets/images/screenshots/${vp.name}`);
  fs.mkdirSync(outDir, { recursive: true });
  currentOutDir = outDir;

  console.log(`\n${"═".repeat(64)}`);
  console.log(`  ${vp.name.toUpperCase()}  ${vp.w}×${vp.h}  (${vp.w > vp.h ? "landscape" : "portrait"})`);
  console.log(`${"═".repeat(64)}`);

  const page = await browser.newPage();
  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: vp.dpr });
  page.setDefaultNavigationTimeout(30000);

  const s = (label) => sc(page, outDir, label);

  try {

    // ══════════════════════════════════════════════════════════════════════════
    // 1. SPLASH / INTRO
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n── 1. SPLASH / INTRO");
    await page.goto(BASE_URL, { waitUntil: "networkidle2", timeout: 35000 });
    await wait(3500);
    await s("01_splash");
    await s("02_intro_welcome");

    // Click "Get Started"
    await clickByText(page, "get started", 8000);
    await wait(2500);
    await s("03_language_selected");

    // ══════════════════════════════════════════════════════════════════════════
    // 2. LICENSE GATE
    // ══════════════════════════════════════════════════════════════════════════
    // If already licensed, skip to login
    const urlAfterIntro = page.url();
    console.log(`\n── 2. URL after intro: ${urlAfterIntro}`);

    if (!urlAfterIntro.includes("login") && !urlAfterIntro.includes("tabs")) {
      // Navigate to license gate if needed
      if (!urlAfterIntro.includes("license")) {
        await page.goto(`${BASE_URL}/license-gate`, { waitUntil: "networkidle2" });
        await wait(2000);
      }

      await s("04_license_gate_empty");

      // Click email field, clear, type
      const emailClicked = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll("input"));
        if (inputs[0]) { inputs[0].click(); inputs[0].focus(); return true; }
        return false;
      });
      await wait(400);
      await page.keyboard.down("Control"); await page.keyboard.press("a"); await page.keyboard.up("Control");
      await page.keyboard.type(EMAIL, { delay: 30 });
      await wait(500);

      // Click key field
      await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll("input"));
        if (inputs[1]) { inputs[1].click(); inputs[1].focus(); }
      });
      await wait(400);
      await page.keyboard.down("Control"); await page.keyboard.press("a"); await page.keyboard.up("Control");
      await page.keyboard.type(LIC_KEY, { delay: 30 });
      await wait(500);

      await s("05_license_filled");

      // Click "Activate Store"
      await clickByText(page, "activate store|activate", 5000);
      await wait(1500);
      await s("06_license_activating");

      // Wait for redirect to login (up to 25s)
      console.log("  Waiting for license validation...");
      const t0 = Date.now();
      while (!page.url().includes("login") && Date.now() - t0 < 25000) {
        await wait(500);
      }
      await wait(2000);
      await s("07_license_validated");
      console.log(`  URL: ${page.url()}`);
    } else {
      console.log("  Already licensed — skipping");
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 3. LOGIN – EMPLOYEE SELECTION
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n── 3. LOGIN");
    if (!page.url().includes("login")) {
      await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle2" });
    }
    await wait(3000); // wait for employees to load from API
    await s("08_login_employees");

    // ══════════════════════════════════════════════════════════════════════════
    // 4. ADMIN PIN
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n── 4. ADMIN PIN");
    // Click Admin card
    await clickByText(page, "admin lemon|admin", 8000);
    await wait(1500);
    await s("09_admin_pin_screen");

    // Enter 1-2-3-4
    await enterPin(page, ADMIN_PIN);
    await s("10_pin_entered");

    // Handle shift modal if it appears
    await handleShiftModal(page);
    await s("11_pos_after_login");
    console.log(`  URL after login: ${page.url()}`);

    // ══════════════════════════════════════════════════════════════════════════
    // 5. POS SCREEN
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n── 5. POS");
    // Make sure we're on POS tab
    if (!page.url().includes("tabs") && !page.url().includes("index")) {
      await page.goto(BASE_URL, { waitUntil: "networkidle2" });
      await wait(3000);
    }
    await s("12_pos_main");

    // Category tabs (Pizza, Calzone, Pide)
    for (const cat of ["Pizza", "Calzone", "Pide", "Fingerfood"]) {
      const ok = await clickByText(page, `^${cat}$`, 3000);
      if (ok) { await wait(900); await s(`13_pos_cat_${cat.toLowerCase()}`); }
    }
    // Back to All
    await clickByText(page, "^All$", 3000);
    await wait(800);
    await s("14_pos_all_products");

    // Add 3 products to cart (click product cards that have a price)
    for (let i = 0; i < 3; i++) {
      await page.evaluate((idx) => {
        const all = Array.from(document.querySelectorAll("[role='button'], div"));
        const priceCards = all.filter(el => {
          if (!el.offsetParent) return false;
          const r = el.getBoundingClientRect();
          if (r.width < 80 || r.width > 500) return false;
          if (r.height < 70 || r.height > 350) return false;
          const t = el.textContent || "";
          return /CHF|USD|EUR|SAR|\d+\.\d\d/.test(t) && t.trim().length > 3;
        });
        // skip first few (may be cart totals)
        const target = priceCards[idx + 2];
        if (target) target.click();
      }, i);
      await wait(700);
    }
    await s("15_pos_cart_items");

    // Increase qty
    await clickByText(page, "^\\+$", 2000);
    await wait(500);
    await s("16_pos_qty_increased");

    // Checkout modal
    await clickByText(page, "^checkout$|^الدفع$", 5000);
    await wait(2500);
    await s("17_pos_checkout");

    // Cash payment
    await clickByText(page, "^cash$|نقد|كاش", 3000);
    await wait(800);
    await s("18_pos_cash");

    // Confirm
    await clickByText(page, "confirm|complete|print receipt|إتمام|تأكيد|proceed", 3000);
    await wait(3000);
    await s("19_pos_receipt");

    // Close receipt / new order
    await clickByText(page, "new order|close|done|جديد|إغلاق|تم", 3000);
    await wait(1000);
    await page.keyboard.press("Escape");
    await wait(800);
    await s("20_pos_after_checkout");

    // Top bar: Orders button
    await clickByText(page, "^orders$", 3000);
    await wait(2000);
    await s("21_pos_orders_panel");
    await page.keyboard.press("Escape");
    await wait(600);

    // Top bar: Invoices button
    await clickByText(page, "^invoices$", 3000);
    await wait(2000);
    await s("22_pos_invoices_panel");
    await page.keyboard.press("Escape");
    await wait(600);

    // Customer search bar
    await clickByText(page, "select customer|walk-in customer|phone number", 3000);
    await wait(1200);
    await s("23_pos_customer_search");
    await page.keyboard.press("Escape");
    await wait(600);

    // Barcode scan button
    await page.evaluate(() => {
      // barcode icon button (usually a small icon button)
      const all = Array.from(document.querySelectorAll("[role='button']"));
      for (const el of all) {
        const t = (el.textContent || "").trim();
        if (t === "" || t.length < 5) { // icon-only button
          const r = el.getBoundingClientRect();
          if (r.width > 30 && r.width < 80 && r.height > 30) {
            el.click(); return;
          }
        }
      }
    });
    await wait(1200);
    await s("24_pos_barcode_modal");
    await page.keyboard.press("Escape");
    await wait(600);

    // ══════════════════════════════════════════════════════════════════════════
    // 6. PRODUCTS TAB
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n── 6. PRODUCTS");
    await clickTab(page, "Products");
    await s("25_products_list");

    await page.evaluate(() => window.scrollBy(0, 400));
    await wait(700);
    await s("26_products_scrolled");
    await page.evaluate(() => window.scrollBy(0, -400));

    // Search
    const searchInput = await page.$("input");
    if (searchInput) {
      await searchInput.click();
      await page.keyboard.type("pizza", { delay: 60 });
      await wait(1500);
      await s("27_products_search");
      await page.keyboard.down("Control");
      await page.keyboard.press("a");
      await page.keyboard.up("Control");
      await page.keyboard.press("Backspace");
      await wait(700);
    }

    // Open a product card
    await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll("[role='button'], div"));
      const cards = all.filter(el => {
        if (!el.offsetParent) return false;
        const r = el.getBoundingClientRect();
        return r.width > 120 && r.height > 70 && /CHF|USD|EUR|\d+\.\d\d/.test(el.textContent || "");
      });
      if (cards[1]) cards[1].click();
    });
    await wait(2500);
    await s("28_product_edit");

    await page.evaluate(() => window.scrollBy(0, 300));
    await wait(600);
    await s("29_product_edit_scroll");
    await page.keyboard.press("Escape");
    await wait(800);

    // Add new product
    await clickByText(page, "add product|new product|\\+.*product|إضافة", 3000);
    await wait(2000);
    await s("30_product_new_form");
    await page.keyboard.press("Escape");
    await wait(600);

    // ══════════════════════════════════════════════════════════════════════════
    // 7. CUSTOMERS TAB
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n── 7. CUSTOMERS");
    await clickTab(page, "Customers");
    await s("31_customers_list");

    await page.evaluate(() => window.scrollBy(0, 400));
    await wait(700);
    await s("32_customers_scroll");
    await page.evaluate(() => window.scrollBy(0, -400));

    // Open customer
    await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll("[role='button'], div"));
      const rows = all.filter(el => {
        if (!el.offsetParent) return false;
        const r = el.getBoundingClientRect();
        return r.height > 55 && r.height < 160 && r.width > 220;
      });
      if (rows[1]) rows[1].click();
    });
    await wait(2000);
    await s("33_customer_detail");
    await page.keyboard.press("Escape");
    await wait(600);

    // Add customer
    await clickByText(page, "add customer|new customer|إضافة|\\+", 3000);
    await wait(2000);
    await s("34_customer_add_form");
    await page.keyboard.press("Escape");
    await wait(600);

    // ══════════════════════════════════════════════════════════════════════════
    // 8. REPORTS TAB
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n── 8. REPORTS");
    await clickTab(page, "Reports");
    await s("35_reports_overview");

    await page.evaluate(() => window.scrollBy(0, 350));
    await wait(700);
    await s("36_reports_charts");
    await page.evaluate(() => window.scrollBy(0, 350));
    await wait(500);
    await s("37_reports_bottom");
    await page.evaluate(() => window.scrollBy(0, -700));

    // Period filters
    for (const [label, regex] of [
      ["today", "^today$|اليوم"],
      ["week",  "^week$|^weekly$|أسبوع"],
      ["month", "^month$|^monthly$|شهر"],
    ]) {
      const ok = await clickByText(page, regex, 3000);
      if (ok) { await wait(1800); await s(`38_reports_${label}`); }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 9. ONLINE ORDERS TAB
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n── 9. ONLINE ORDERS");
    await clickTab(page, "Online Orders");
    await s("39_online_orders");

    await page.evaluate(() => window.scrollBy(0, 400));
    await wait(700);
    await s("40_online_orders_scroll");
    await page.evaluate(() => window.scrollBy(0, -400));

    // Open an order
    await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll("[role='button'], div"));
      const rows = all.filter(el => {
        if (!el.offsetParent) return false;
        const r = el.getBoundingClientRect();
        return r.height > 65 && r.height < 300 && r.width > 220;
      });
      if (rows[1]) rows[1].click();
    });
    await wait(2000);
    await s("41_online_order_detail");

    await clickByText(page, "accept|approve|قبول|تأكيد", 3000);
    await wait(1500);
    await s("42_online_order_accepted");
    await page.keyboard.press("Escape");
    await wait(800);

    // ══════════════════════════════════════════════════════════════════════════
    // 10. MORE / SETTINGS
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n── 10. SETTINGS");
    await clickTab(page, "More");
    await s("43_more_menu");

    await clickByText(page, "^settings$|^الإعدادات$|^اعدادات$", 5000);
    await wait(2500);
    await s("44_settings");

    await page.evaluate(() => window.scrollBy(0, 400));
    await wait(600);
    await s("45_settings_scroll");
    await page.evaluate(() => window.scrollBy(0, -400));

    // Employees
    await clickByText(page, "employee|staff|موظفين|موظف", 3000);
    await wait(2000);
    await s("46_employees_list");

    await clickByText(page, "add|\\+|إضافة", 3000);
    await wait(1500);
    await s("47_employee_add");
    await page.keyboard.press("Escape");
    await wait(600);
    await page.goBack({ waitUntil: "networkidle2" }).catch(() => {});
    await wait(1500);

    // Back to settings
    await clickTab(page, "More");
    await clickByText(page, "^settings$|الإعدادات|اعدادات", 3000);
    await wait(2000);

    // Printers
    await clickByText(page, "printer|طابعة|print", 3000);
    await wait(1500);
    await s("48_printers");
    await page.keyboard.press("Escape");
    await wait(600);

    // Subscription
    await clickByText(page, "subscription|plan|اشتراك|ترقية", 3000);
    await wait(1500);
    await s("49_subscription");
    await page.keyboard.press("Escape");
    await wait(600);

    // Language — switch to Arabic
    await clickByText(page, "language|لغة", 3000);
    await wait(1000);
    await s("50_language_settings");
    await clickByText(page, "arabic|العربية|عربي|sa", 3000);
    await wait(2500);
    await s("51_arabic_rtl");

    // Screenshots in Arabic mode
    await clickTab(page, "نقطة البيع|POS|المتجر");
    await wait(1500);
    await s("52_arabic_pos");

    await clickTab(page, "منتجات|Products");
    await wait(1500);
    await s("53_arabic_products");

    await clickTab(page, "تقارير|Reports");
    await wait(1500);
    await s("54_arabic_reports");

    await clickTab(page, "المزيد|More");
    await wait(800);
    await s("55_arabic_more");

    // Restore English
    await clickByText(page, "^settings$|الإعدادات|اعدادات", 3000);
    await wait(1500);
    await clickByText(page, "language|لغة", 3000);
    await wait(800);
    await clickByText(page, "english|الإنجليزية|gb|en", 3000);
    await wait(2000);

    // ══════════════════════════════════════════════════════════════════════════
    // 11. CASHIER LOGIN
    // ══════════════════════════════════════════════════════════════════════════
    console.log("\n── 11. CASHIER");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle2" });
    await wait(3000);
    await s("56_login_for_cashier");

    await clickByText(page, "cashier lemon|cashier", 8000);
    await wait(1500);
    await s("57_cashier_pin");

    await enterPin(page, CASHIER_PIN);
    await handleShiftModal(page);
    await s("58_cashier_pos");

    // Add items as cashier
    for (let i = 0; i < 2; i++) {
      await page.evaluate((idx) => {
        const all = Array.from(document.querySelectorAll("[role='button'], div"));
        const cards = all.filter(el => {
          if (!el.offsetParent) return false;
          const r = el.getBoundingClientRect();
          return r.width > 80 && r.height > 70 && /CHF|USD|EUR|\d+\.\d\d/.test(el.textContent || "");
        });
        if (cards[idx + 2]) cards[idx + 2].click();
      }, i);
      await wait(600);
    }
    await s("59_cashier_cart");

    await clickByText(page, "^checkout$|الدفع", 5000);
    await wait(2500);
    await s("60_cashier_checkout");
    await page.keyboard.press("Escape");
    await wait(600);

    console.log(`\n  ✅  ${vp.name.toUpperCase()} COMPLETE`);

  } catch (err) {
    console.error(`\n  ❌  Error (${vp.name}): ${err.message}`);
    try { await s("ZZ_error"); } catch (_) {}
  }

  await page.close().catch(() => {});
}

// ── Entry point ───────────────────────────────────────────────────────────────
(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      "--no-sandbox",
      "--disable-web-security",
      "--disable-features=TranslateUI",
      "--lang=en-US",
    ],
    defaultViewport: null,
  });

  const VIEWPORTS = [
    // Phone – portrait
    { name: "phone",  w: 430,  h: 932,  dpr: 3 },
    // Tablet – landscape (iPad Pro 11")
    { name: "tablet", w: 1194, h: 834,  dpr: 2 },
  ];

  for (const vp of VIEWPORTS) {
    await runViewport(browser, vp);
  }

  await browser.close().catch(() => {});

  for (const vp of VIEWPORTS) {
    const dir = path.join(__dirname, `../assets/images/screenshots/${vp.name}`);
    const count = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith(".png")).length : 0;
    console.log(`  ${vp.name}: ${count} screenshots → ${dir}`);
  }
  console.log("\n🎉  All done!\n");
})().catch(err => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
