/**
 * Captures Play Store screenshots from the live apps.
 *
 *   node scripts/capture-store-screenshots.js
 *
 * Logs into the POS with a demo licence so the shots show real data rather than
 * empty states, and renders at exact Play-accepted sizes (9:16 phone, 16:9
 * tablet) so nothing needs resizing afterwards.
 *
 * The app rate-limits licence validation, so this cannot be run back to back.
 */
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const BASE = "https://kassenta.com";
const LICENSE = "BARMAGLY-8FBC-16DA-8BD9-E3B6";
const EMAIL = "admin@pizzalemon.ch";
// The customer screenshots use a different store from the POS licence on
// purpose: Pizza Lemon is configured in Arabic by its owner, and the Play
// listing wants Latin script. This one is set up in German.
const STORE_SLUG = "sushi-zen-zurich";

const ROOT = path.resolve(__dirname, "..");
const POS_OUT = path.join(ROOT, "play-store-release", "screenshots");
const CUST_OUT = path.join(ROOT, "customer-app", "play-store", "screenshots");

// Play accepts 320-3840 px per side with a 16:9 or 9:16 aspect. These render at
// the final pixel size directly, so no downstream resampling.
const DEVICES = {
  phone: { width: 432, height: 768, deviceScaleFactor: 2.5 },   // 1080 x 1920
  tablet7: { width: 1280, height: 720, deviceScaleFactor: 1.5 }, // 1920 x 1080
  tablet10: { width: 1280, height: 720, deviceScaleFactor: 2 },  // 2560 x 1440
};

// /app/ bounces to the intro screen until "hasSeenIntro" is set, so that flag
// is seeded alongside the licence below and the POS tab is reached by tapping
// rather than by URL — a client-side navigation keeps the licence context warm.
const POS_SCREENS = [
  ["02_products", "/app/products"],
  ["03_online_orders", "/app/online-orders"],
  ["04_reports", "/app/reports"],
  ["05_customers", "/app/customers"],
  ["06_table_qr", "/app/table-qr"],
  ["07_settings", "/app/settings"],
];

const CUSTOMER_SCREENS = [
  ["01_restaurants", "/restaurants"],
  ["02_menu", `/order/${STORE_SLUG}`],
  ["03_storefront", "/customer/"],
];

async function shoot(page, url, file, waitMs = 3500) {
  await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
  await new Promise((r) => setTimeout(r, waitMs));
  await page.evaluate(async () => {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("visible"));
    document.querySelectorAll("img[loading=lazy]").forEach((i) => (i.loading = "eager"));
    await new Promise((r) => setTimeout(r, 400));
  });
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file });
  return file;
}

(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });

  // ── POS ──────────────────────────────────────────────────────────────────
  const page = await browser.newPage();
  await page.setViewport(DEVICES.tablet10);
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded", timeout: 60000 });

  const auth = await page.evaluate(async (base, license, email) => {
      // No `email` in the body on purpose: the server only counts an activation
      // when one is present, and a licence has a hard activation cap. Tooling
      // that runs repeatedly would otherwise lock the demo store out.
    const lic = await fetch(`${base}/api/license/validate`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseKey: license }),
    }).then((r) => r.json());
    const emp = await fetch(`${base}/api/employees/login`, {
      method: "POST", headers: { "Content-Type": "application/json", "x-license-key": license },
      body: JSON.stringify({ pin: "1234" }),
    }).then((r) => r.json()).catch(() => null);
    return { lic, emp };
  }, BASE, LICENSE, EMAIL);

  if (!auth?.lic?.isValid) {
    console.error("licence validation failed — probably rate limited. Wait 10 minutes and retry.");
    console.error(JSON.stringify(auth?.lic));
    await browser.close();
    process.exit(1);
  }
  const employee = auth.emp?.employee || auth.emp;
  console.log("logged in as", employee?.name, "| tenant", auth.lic.tenant?.id, "\n");

  await page.evaluateOnNewDocument((license, email, tid, emp, tok) => {
    localStorage.setItem("barmagly_license_key", license);
    localStorage.setItem("barmagly_store_email", email);
    localStorage.setItem("barmagly_tenant_id", String(tid));
    localStorage.setItem("barmagly_employee", JSON.stringify(emp));
    if (tok) localStorage.setItem("kassenta_employee_token", tok);
    // Light is the app's default, so the store listing should show it.
    localStorage.setItem("kassenta_theme", "light");
    localStorage.setItem("kassenta_lang", "en");
    localStorage.setItem("app_language", "en");
    localStorage.setItem("hasSeenIntro", "true");
  }, LICENSE, EMAIL, auth.lic.tenant?.id, employee, auth.emp?.token || employee?.token);

  for (const [device, view] of Object.entries(DEVICES)) {
    await page.setViewport(view);
    const px = `${view.width * view.deviceScaleFactor}x${view.height * view.deviceScaleFactor}`;

    for (const [name, route] of POS_SCREENS) {
      const file = path.join(POS_OUT, device, `${name}.png`);
      await shoot(page, BASE + route, file);
      console.log(`  POS ${device.padEnd(9)} ${name.padEnd(18)} ${px}`);
    }

    // The selling screen, reached by tapping the POS tab from a warm page.
    await page.goto(`${BASE}/app/products`, { waitUntil: "networkidle2", timeout: 90000 });
    await new Promise((r) => setTimeout(r, 3500));
    const tapped = await page.evaluate(() => {
      const el = [...document.querySelectorAll("*")].reverse().find((n) => {
        const own = [...n.childNodes].filter((x) => x.nodeType === 3).map((x) => x.textContent.trim()).join("");
        return own === "POS";
      });
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    if (tapped) await page.mouse.click(tapped.x, tapped.y);
    await new Promise((r) => setTimeout(r, 5000));

    // An empty cart makes a poor store listing — tap a few products so the shot
    // shows a real ticket with a running total. Clicking the product name works;
    // clicking the price does not (it is not inside the pressable).
    // Picked from the live catalogue; anything missing is skipped silently.
    const NAMES = ["Margherita", "Pizza Margherita", "Salami", "Pizza Salami", "Coca Cola", "Tiramisu"];
    for (const name of NAMES) {
      const at = await page.evaluate((n) => {
        const el = [...document.querySelectorAll("*")].reverse().find((x) => {
          const own = [...x.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent.trim()).join("");
          return own === n;
        });
        if (!el) return null;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.bottom > window.innerHeight) return null;
        return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      }, name);
      if (!at) continue;
      await page.mouse.click(at.x, at.y);
      await new Promise((r) => setTimeout(r, 1100));
      // Simple items drop straight into the cart; ones with sizes or modifiers
      // open a sheet, which Escape dismisses without adding.
      await page.keyboard.press("Escape").catch(() => {});
      await new Promise((r) => setTimeout(r, 400));
    }
    const cartCount = await page.evaluate(() => {
      const el = [...document.querySelectorAll("*")].find((x) => /^Cart \(\d+\)$/.test(
        [...x.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent.trim()).join("")
      ));
      return el ? el.textContent.trim() : "n/a";
    });
    await new Promise((r) => setTimeout(r, 1000));

    const posFile = path.join(POS_OUT, device, "01_pos.png");
    fs.mkdirSync(path.dirname(posFile), { recursive: true });
    await page.screenshot({ path: posFile });
    console.log(`  POS ${device.padEnd(9)} ${"01_pos".padEnd(18)} ${px}  ${tapped ? "(tab tap)" : "!! tab not found"}  ${cartCount}`);
  }
  await page.close();

  // ── Customer storefront ─────────────────────────────────────────────────
  // The storefront opens with a four-slide welcome carousel that covers the
  // menu, so it gets skipped before every shot.
  // Two gates in sequence: a four-slide welcome carousel, then a terms screen
  // with a checkbox. Both are first-run only, but a fresh headless context sees
  // them every time.
  const clickText = async (pg, re) => {
    const at = await pg.evaluate((src, flags) => {
      const rx = new RegExp(src, flags);
      const el = [...document.querySelectorAll("button, a, div, span, label")].find(
        (n) => rx.test((n.textContent || "").trim()) && n.getBoundingClientRect().width > 0
      );
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, re.source, re.flags);
    if (!at) return false;
    await pg.mouse.click(at.x, at.y);
    await new Promise((r) => setTimeout(r, 1400));
    return true;
  };

  const skipOnboarding = async (pg) => {
    for (let i = 0; i < 3; i++) {
      if (!(await clickText(pg, /^(Skip|Überspringen|تخطي)$/i))) break;
    }
    // Terms gate: tick the box, then continue.
    const ticked = await pg.evaluate(() => {
      const box = [...document.querySelectorAll("input[type=checkbox]")].find((b) => !b.checked);
      if (box) { box.click(); return true; }
      return false;
    });
    if (!ticked) await clickText(pg, /I have read and agree|Ich habe die|قرأت وأوافق/i);
    await new Promise((r) => setTimeout(r, 600));
    await clickText(pg, /^(Continue|Weiter|متابعة)$/i);
    await new Promise((r) => setTimeout(r, 2200));
  };

  const cust = await browser.newPage();
  await cust.evaluateOnNewDocument((slug) => {
    for (const s of [slug, "kassenta", "barmagly"]) {
      localStorage.setItem("barmagly_onboarding_" + s, "1");
      localStorage.setItem("barmagly_terms_" + s, "1");
    }
    // The storefront falls back to the store's own configured language; this
    // key is the visitor override the language switcher writes.
    localStorage.setItem("store_lang", "en");
    localStorage.setItem("bc_lang", "en");
    localStorage.setItem("kassenta_lang", "en");
  }, STORE_SLUG);

  for (const [device, view] of Object.entries(DEVICES)) {
    await cust.setViewport(view);
    for (const [name, route] of CUSTOMER_SCREENS) {
      const file = path.join(CUST_OUT, device, `${name}.png`);
      await cust.goto(BASE + route, { waitUntil: "networkidle2", timeout: 90000 });
      await new Promise((r) => setTimeout(r, 3000));
      await skipOnboarding(cust);
      await shoot(cust, BASE + route, file, 4000);
      const px = `${view.width * view.deviceScaleFactor}x${view.height * view.deviceScaleFactor}`;
      console.log(`  CUST ${device.padEnd(9)} ${name.padEnd(18)} ${px}`);
    }
  }
  await cust.close();

  await browser.close();
  console.log("\ndone");
})();
