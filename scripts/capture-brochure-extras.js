/**
 * Fifth pass. Three jobs:
 *
 *   1. Re-shoot the screens that were empty before the demo data was seeded.
 *   2. Open the header controls on the till and the edit dialogs, which no
 *      route walk reaches.
 *   3. Shoot the till in dark mode for the cover.
 *
 *   node scripts/capture-brochure-extras.js
 *
 * pos-login is re-shot with a licence present. Without one the screen renders
 * "No employees found", which reads as a broken app rather than a sign-in
 * screen that has not been given a shop yet.
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
const PHONE = { width: 900, height: 1200, deviceScaleFactor: 2 };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function tap(page, text, settleMs = 2800, prefix = false) {
  const at = await page.evaluate(async (t, isPrefix) => {
    const own = (el) =>
      [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
    const hits = [...document.querySelectorAll("*")].filter((el) => {
      const v = own(el);
      const match = isPrefix ? v.toLowerCase().startsWith(t.toLowerCase()) : v === t;
      if (!match) return false;
      const r = el.getBoundingClientRect();
      return r.width > 4 && r.height > 4;
    });
    if (!hits.length) return null;
    const el = hits[hits.length - 1];
    el.scrollIntoView({ block: "center" });
    await new Promise((r) => setTimeout(r, 650));
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return null;
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, text, prefix);
  if (!at) return false;
  await page.mouse.click(at.x, at.y);
  await wait(settleMs);
  return true;
}

async function shoot(page, key) {
  await page.evaluate(async () => {
    document.querySelectorAll("img[loading=lazy]").forEach((i) => (i.loading = "eager"));
    await new Promise((r) => setTimeout(r, 450));
  });
  await page.screenshot({ path: path.join(SHOTS, `${key}.png`) });
}

async function goto(page, route, settleMs = 4500) {
  try { await page.goto(BASE + route, { waitUntil: "networkidle2", timeout: 90000 }); } catch {}
  await wait(settleMs);
  // Reloading does not reset scroll; the list scrolls inside a div.
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    for (const el of document.querySelectorAll("*")) {
      if (el.scrollHeight > el.clientHeight + 20) el.scrollTop = 0;
    }
  });
  await wait(600);
}

function seed(page, theme) {
  return page.evaluateOnNewDocument((l, e, t, emp, tok, th) => {
    localStorage.setItem("barmagly_license_key", l);
    localStorage.setItem("barmagly_store_email", e);
    localStorage.setItem("barmagly_tenant_id", String(t));
    localStorage.setItem("barmagly_employee", JSON.stringify(emp));
    if (tok) localStorage.setItem("kassenta_employee_token", tok);
    localStorage.setItem("kassenta_theme", th);
    localStorage.setItem("kassenta_lang", "en");
    localStorage.setItem("app_language", "en");
    localStorage.setItem("hasSeenIntro", "true");
  }, LICENSE, EMAIL, AUTH.tenantId, AUTH.employee, AUTH.token, theme);
}

let AUTH;

(async () => {
  AUTH = JSON.parse(fs.readFileSync(path.join(OUT, ".brochure-auth.json"), "utf8"));
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const done = [], missed = [];
  const log = (k, ok) => { (ok ? done : missed).push(k); console.log(`  ${ok ? "ok  " : "MISS"} ${k}`); };

  // ── 1. screens that were empty, now seeded ──────────────────────────────
  const page = await browser.newPage();
  await page.setViewport(TABLET);
  await seed(page, "light");

  console.log("re-shooting seeded screens");
  for (const [route, key] of [
    ["/app/delivery-zones", "pos-delivery-zones"],
    ["/app/promo-codes", "pos-promo-codes"],
    ["/app/driver-management", "pos-drivers"],
  ]) {
    await goto(page, route);
    await shoot(page, key); log(key, true);
  }

  for (const [label, key] of [["Purchase Orders", "set-purchase-orders"],
                              ["Returns & Refunds", "set-returns"],
                              ["Product Batches", "set-batches"]]) {
    await goto(page, "/app/settings");
    const ok = await tap(page, label, 3500);
    if (ok) await shoot(page, key);
    log(key, ok);
  }

  await goto(page, "/app/reports");
  if (await tap(page, "Delivery", 3200)) { await shoot(page, "rep-delivery"); log("rep-delivery", true); }
  else log("rep-delivery", false);

  // ── 2. the till header, one control at a time ───────────────────────────
  console.log("\ntill header controls");
  for (const [label, key] of [["Calls", "pos-hdr-calls"],
                              ["Invoices", "pos-hdr-invoices"],
                              ["Zero Out Shift", "pos-hdr-shift"]]) {
    await goto(page, "/app/");
    const ok = await tap(page, label, 3200);
    if (ok) await shoot(page, key);
    log(key, ok);
    await page.keyboard.press("Escape").catch(() => {});
  }

  // Customer picker and the notes sheet, both on the ticket side.
  await goto(page, "/app/");
  if (await tap(page, "Select Customer", 3000, true)) { await shoot(page, "pos-customer-picker"); log("pos-customer-picker", true); }
  else log("pos-customer-picker", false);
  await page.keyboard.press("Escape").catch(() => {});

  await goto(page, "/app/");
  if (await tap(page, "NOTES", 2600)) { await shoot(page, "pos-notes"); log("pos-notes", true); }
  else log("pos-notes", false);
  await page.keyboard.press("Escape").catch(() => {});

  // ── 3. edit dialogs ─────────────────────────────────────────────────────
  console.log("\nedit dialogs");
  await goto(page, "/app/products");
  if (await tap(page, "Acasa", 3000)) { await shoot(page, "pos-product-edit"); log("pos-product-edit", true); }
  else log("pos-product-edit", false);
  await page.keyboard.press("Escape").catch(() => {});

  await goto(page, "/app/settings");
  if (await tap(page, "Employees", 3200) && await tap(page, "Samantha", 2600)) {
    await shoot(page, "pos-employee-edit"); log("pos-employee-edit", true);
  } else log("pos-employee-edit", false);

  await goto(page, "/app/promo-codes");
  if (await tap(page, "+ Create Code", 2800)) { await shoot(page, "form-promo"); log("form-promo", true); }
  else log("form-promo", false);

  await goto(page, "/app/delivery-zones");
  if (await tap(page, "+ Create Zone", 2800)) { await shoot(page, "form-zone"); log("form-zone", true); }
  else log("form-zone", false);

  await page.close();

  // ── 4. dark mode: the till, for the cover ───────────────────────────────
  console.log("\ndark mode");
  const dark = await browser.newPage();
  await dark.setViewport(TABLET);
  await seed(dark, "dark");
  await goto(dark, "/app/");
  // A ticket in the cart makes a far better cover than an empty till.
  for (const n of ["Calzone", "Calzone Kebab", "Calzone Verdura"]) await tap(dark, n, 1300);
  await shoot(dark, "pos-sell-dark"); log("pos-sell-dark", true);

  await goto(dark, "/app/reports");
  await shoot(dark, "pos-reports-dark"); log("pos-reports-dark", true);
  await dark.close();

  // ── 5. sign-in with a licence present, so staff actually appear ─────────
  console.log("\nsign-in with a shop attached");
  const lic = await browser.newPage();
  await lic.setViewport(TABLET);
  await lic.evaluateOnNewDocument((l, e, t) => {
    localStorage.setItem("barmagly_license_key", l);
    localStorage.setItem("barmagly_store_email", e);
    localStorage.setItem("barmagly_tenant_id", String(t));
    localStorage.setItem("kassenta_theme", "light");
    localStorage.setItem("app_language", "en");
    localStorage.setItem("hasSeenIntro", "true");
  }, LICENSE, EMAIL, AUTH.tenantId);
  await goto(lic, "/app/login");
  await shoot(lic, "pos-login"); log("pos-login", true);
  await lic.close();

  // ── 6. a customer filter that actually returns something ────────────────
  console.log("\ncustomer app filter");
  const cust = await browser.newPage();
  await cust.setViewport(PHONE);
  await goto(cust, "/restaurants");
  let filtered = false;
  for (const cuisine of ["Italian", "Asian", "Burgers", "Kebab", "Indian"]) {
    await goto(cust, "/restaurants", 4000);
    if (!(await tap(cust, cuisine, 2600))) continue;
    const empty = await cust.evaluate(() => document.body.innerText.includes("No restaurants found"));
    if (empty) { console.log(`  ${cuisine}: no results, trying another`); continue; }
    await shoot(cust, "cust-filter");
    log(`cust-filter (${cuisine})`, true);
    filtered = true;
    break;
  }
  if (!filtered) log("cust-filter", false);
  await cust.close();

  console.log(`\ncaptured ${done.length}, missed ${missed.length}`);
  if (missed.length) console.log("missed:", missed.join(", "));
  await browser.close();
})();
