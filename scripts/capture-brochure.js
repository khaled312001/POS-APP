/**
 * Captures every screen of the POS and the customer ordering app at tablet
 * resolution, and dumps an inventory of what is actually on each screen.
 *
 *   node scripts/capture-brochure.js            # capture everything
 *   node scripts/capture-brochure.js --list     # inventory only, no images
 *
 * The inventory matters as much as the images: the brochure has to describe
 * every button and option, and reading them off the running app is the only way
 * to be sure none is invented or missed.
 *
 * Licence validation is rate limited, so the auth result is cached in
 * .brochure-auth.json and reused. Delete that file to force a fresh login.
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

// 16:10 landscape tablet at 2x. 2560x1600 survives being placed full-bleed on
// an A4 page at 300dpi without visible softening.
const TABLET = { width: 1280, height: 800, deviceScaleFactor: 2 };

const POS_SCREENS = [
  ["pos-sell", "/app/", "Selling screen"],
  ["pos-online-orders", "/app/online-orders", "Online orders"],
  ["pos-table-qr", "/app/table-qr", "Table QR codes"],
  ["pos-products", "/app/products", "Products and stock"],
  ["pos-customers", "/app/customers", "Customers"],
  ["pos-reports", "/app/reports", "Reports"],
  ["pos-settings", "/app/settings", "Settings"],
  ["pos-delivery-zones", "/app/delivery-zones", "Delivery zones"],
  ["pos-driver-management", "/app/driver-management", "Drivers"],
  ["pos-promo-codes", "/app/promo-codes", "Promo codes"],
];

// Reached before a licence exists, so they are captured in a clean context.
const POS_ENTRY_SCREENS = [
  ["pos-intro", "/app/intro", "Introduction"],
  ["pos-license-gate", "/app/license-gate", "Licence activation"],
  ["pos-login", "/app/login", "Staff PIN"],
  ["pos-onboarding", "/app/onboarding", "Store setup"],
];

const CUSTOMER_SCREENS = [
  ["cust-storefront", "/customer/", "Storefront"],
  ["cust-restaurants", "/restaurants", "Browse stores"],
];

const SITE_SCREENS = [["site-home", "/", "kassenta.com home"]];

/** Reads every control the user can actually see and press on the current screen. */
async function inventory(page) {
  return page.evaluate(() => {
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 8 && r.height > 8 && s.visibility !== "hidden" && s.opacity !== "0";
    };
    // Own text only — otherwise every ancestor reports the whole screen.
    const ownText = (el) =>
      [...el.childNodes]
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent.trim())
        .join(" ")
        .trim();

    const controls = new Set();
    const headings = new Set();
    const labels = new Set();

    for (const el of document.querySelectorAll("*")) {
      if (!visible(el)) continue;
      const t = ownText(el);
      if (!t || t.length > 60) continue;

      const role = el.getAttribute("role");
      const tag = el.tagName.toLowerCase();
      const tabbable = el.tabIndex >= 0;
      const clickable =
        role === "button" || role === "tab" || role === "link" ||
        tag === "button" || tag === "a" ||
        getComputedStyle(el).cursor === "pointer";

      if (clickable || tabbable) controls.add(t);
      else if (/^h[1-6]$/.test(tag)) headings.add(t);
      else labels.add(t);
    }

    const inputs = [...document.querySelectorAll("input, textarea, select")]
      .filter(visible)
      .map((i) => i.placeholder || i.getAttribute("aria-label") || i.name || i.type)
      .filter(Boolean);

    return {
      title: document.title,
      controls: [...controls],
      headings: [...headings],
      labels: [...labels].slice(0, 120),
      inputs: [...new Set(inputs)],
    };
  });
}

async function settle(page, ms = 4000) {
  await new Promise((r) => setTimeout(r, ms));
  await page.evaluate(async () => {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("visible"));
    document.querySelectorAll("img[loading=lazy]").forEach((i) => (i.loading = "eager"));
    await new Promise((r) => setTimeout(r, 500));
  });
}

async function capture(page, url, key, label, listOnly) {
  process.stdout.write(`  ${key.padEnd(24)}`);
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
  } catch {
    // networkidle2 can time out on screens that poll; the page is usually fine.
  }
  await settle(page);
  const inv = await inventory(page);
  if (!listOnly) {
    const file = path.join(SHOTS, `${key}.png`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await page.screenshot({ path: file });
  }
  console.log(`${String(inv.controls.length).padStart(3)} controls  "${inv.title}"`);
  return { key, label, url, ...inv };
}

(async () => {
  const listOnly = process.argv.includes("--list");
  fs.mkdirSync(SHOTS, { recursive: true });

  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const results = [];

  // ── auth ────────────────────────────────────────────────────────────────
  let auth = null;
  if (fs.existsSync(AUTH_CACHE)) {
    auth = JSON.parse(fs.readFileSync(AUTH_CACHE, "utf8"));
    console.log("reusing cached auth for tenant", auth.tenantId);
  } else {
    const p = await browser.newPage();
    await p.goto(`${BASE}/app`, { waitUntil: "domcontentloaded", timeout: 60000 });
    const r = await p.evaluate(async (base, license) => {
      // No email in the body: the server counts an activation only when one is
      // present, and the licence has a hard activation cap.
      const lic = await fetch(`${base}/api/license/validate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey: license }),
      }).then((x) => x.json());
      const emp = await fetch(`${base}/api/employees/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-license-key": license },
        body: JSON.stringify({ pin: "1234" }),
      }).then((x) => x.json()).catch(() => null);
      return { lic, emp };
    }, BASE, LICENSE);

    if (!r?.lic?.isValid) {
      console.error("licence validation failed (probably rate limited). Wait ~10 min.");
      console.error(JSON.stringify(r?.lic));
      await browser.close();
      process.exit(1);
    }
    const employee = r.emp?.employee || r.emp;
    auth = {
      tenantId: r.lic.tenant?.id,
      tenantName: r.lic.tenant?.name,
      employee,
      token: r.emp?.token || employee?.token,
    };
    fs.writeFileSync(AUTH_CACHE, JSON.stringify(auth, null, 2));
    console.log("logged in as", employee?.name, "| tenant", auth.tenantId);
    await p.close();
  }

  // ── website + entry screens: no licence in storage ───────────────────────
  const clean = await browser.newPage();
  await clean.setViewport(TABLET);
  console.log("\nwebsite");
  for (const [key, route, label] of SITE_SCREENS) {
    results.push(await capture(clean, BASE + route, key, label, listOnly));
  }
  console.log("\nPOS entry screens (no licence)");
  for (const [key, route, label] of POS_ENTRY_SCREENS) {
    results.push(await capture(clean, BASE + route, key, label, listOnly));
  }
  await clean.close();

  // ── POS, logged in ───────────────────────────────────────────────────────
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

  console.log("\nPOS (signed in)");
  for (const [key, route, label] of POS_SCREENS) {
    results.push(await capture(page, BASE + route, key, label, listOnly));
  }

  console.log("\ncustomer ordering");
  for (const [key, route, label] of CUSTOMER_SCREENS) {
    results.push(await capture(page, BASE + route, key, label, listOnly));
  }

  fs.writeFileSync(path.join(OUT, "inventory.json"), JSON.stringify(results, null, 2));
  console.log(`\ninventory -> docs/brochure/inventory.json  (${results.length} screens)`);
  if (!listOnly) console.log(`shots     -> docs/brochure/shots/`);
  await browser.close();
})();
