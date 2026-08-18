/**
 * Fourth pass: the settings areas missed by the second pass, and the real
 * contents of each settings modal.
 *
 *   node scripts/capture-brochure-settings.js
 *
 * Two problems this fixes. The Settings list is longer than one screen, so
 * Warehouses, Product Batches and Vehicles were never opened. And each area
 * opens as a modal *over* the list, so a whole-page inventory reports the list
 * behind it rather than the dialog — which makes every area look identical.
 * Here the dump is scoped to the topmost dialog.
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

const TABLET = { width: 1280, height: 800, deviceScaleFactor: 2 };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const AREAS = [
  ["Employees", "set-employees"], ["Branches", "set-branches"],
  ["Store Settings", "set-store"], ["Payment Gateways", "set-payments"],
  ["Bulk Import", "set-import"], ["QR Tables", "set-qr-tables"],
  ["Suppliers", "set-suppliers"], ["Expenses", "set-expenses"],
  ["Attendance", "set-attendance"], ["Shift Monitor", "set-shifts"],
  ["Purchase Orders", "set-purchase-orders"], ["Activity Log", "set-activity"],
  ["Returns & Refunds", "set-returns"], ["Cash Drawer", "set-cash-drawer"],
  ["Warehouses", "set-warehouses"], ["Product Batches", "set-batches"],
  ["Vehicles", "set-vehicles"],
];

async function tap(page, text, settleMs = 3000) {
  const at = await page.evaluate(async (t) => {
    const own = (el) =>
      [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
    const hits = [...document.querySelectorAll("*")].filter((el) => {
      if (own(el) !== t) return false;
      const r = el.getBoundingClientRect();
      return r.width > 4 && r.height > 4;
    });
    if (!hits.length) return null;
    const el = hits[hits.length - 1];
    el.scrollIntoView({ block: "center" });
    await new Promise((r) => setTimeout(r, 700));
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return null;
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, text);
  if (!at) return false;
  await page.mouse.click(at.x, at.y);
  await wait(settleMs);
  return true;
}

/**
 * Reads only the dialog on top, not the page behind it. Without the scoping
 * every area reports the same Settings menu and the dump is worthless.
 */
async function dialogContents(page) {
  return page.evaluate(() => {
    const own = (el) =>
      [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();

    // The dialog is the smallest element that is centred, raised and covers a
    // decent slab of the viewport.
    let best = null;
    for (const el of document.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      if (r.width < 300 || r.height < 200) continue;
      if (r.width > window.innerWidth * 0.95) continue;
      if (parseFloat(s.zIndex || 0) < 1 && s.position !== "fixed" && s.position !== "absolute") continue;
      if (!best || r.width * r.height < best.area) best = { el, area: r.width * r.height };
    }
    const root = best ? best.el : document.body;

    const controls = new Set(), labels = new Set();
    for (const el of root.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) continue;
      const t = own(el);
      if (!t || t.length > 60) continue;
      const clickable = ["button", "a"].includes(el.tagName.toLowerCase()) ||
        getComputedStyle(el).cursor === "pointer";
      (clickable ? controls : labels).add(t);
    }
    const inputs = [...root.querySelectorAll("input, textarea, select")]
      .map((i) => i.placeholder || i.getAttribute("aria-label") || i.name || i.type).filter(Boolean);
    return { controls: [...controls], labels: [...labels], inputs: [...new Set(inputs)] };
  });
}

(async () => {
  const auth = JSON.parse(fs.readFileSync(path.join(OUT, ".brochure-auth.json"), "utf8"));
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport(TABLET);
  await page.evaluateOnNewDocument((l, e, t, emp, tok) => {
    localStorage.setItem("barmagly_license_key", l);
    localStorage.setItem("barmagly_store_email", e);
    localStorage.setItem("barmagly_tenant_id", String(t));
    localStorage.setItem("barmagly_employee", JSON.stringify(emp));
    if (tok) localStorage.setItem("kassenta_employee_token", tok);
    localStorage.setItem("kassenta_theme", "light");
    localStorage.setItem("app_language", "en");
    localStorage.setItem("hasSeenIntro", "true");
  }, LICENSE, EMAIL, auth.tenantId, auth.employee, auth.token);

  const dump = {};

  // The full settings list needs two shots: it is taller than the viewport.
  await page.goto(BASE + "/app/settings", { waitUntil: "networkidle2", timeout: 90000 }).catch(() => {});
  await wait(4500);
  await page.screenshot({ path: path.join(SHOTS, "pos-settings.png") });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await wait(1500);
  await page.screenshot({ path: path.join(SHOTS, "pos-settings-2.png") });
  console.log("  ok   pos-settings + pos-settings-2");

  // Every row in the list, in reading order.
  dump["_menu"] = await page.evaluate(() => {
    const own = (el) =>
      [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
    const rows = [];
    for (const el of document.querySelectorAll("*")) {
      const t = own(el);
      if (t && t.length < 40 && getComputedStyle(el).cursor === "pointer") rows.push(t);
    }
    return [...new Set(rows)];
  });

  for (const [label, key] of AREAS) {
    await page.goto(BASE + "/app/settings", { waitUntil: "networkidle2", timeout: 90000 }).catch(() => {});
    await wait(3800);
    // Reloading does not reset the scroll position — the app restores it, and
    // the list scrolls inside a div rather than the window. Left alone, only
    // the rows that happen to be in view can be tapped and everything above
    // reports as missing.
    await page.evaluate(() => {
      window.scrollTo(0, 0);
      for (const el of document.querySelectorAll("*")) {
        if (el.scrollHeight > el.clientHeight + 20) el.scrollTop = 0;
      }
    });
    await wait(900);
    const ok = await tap(page, label, 3500);
    if (!ok) { console.log(`  MISS ${key}`); continue; }
    await page.screenshot({ path: path.join(SHOTS, `${key}.png`) });
    dump[key] = await dialogContents(page);
    console.log(`  ok   ${key.padEnd(22)} ${dump[key].controls.length} controls, ${dump[key].inputs.length} inputs`);
  }

  fs.writeFileSync(path.join(OUT, "settings-dump.json"), JSON.stringify(dump, null, 2));
  console.log("\nsettings-dump.json written");
  await browser.close();
})();
