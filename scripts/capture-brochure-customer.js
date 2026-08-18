/**
 * Third capture pass: the customer ordering app.
 *
 *   node scripts/capture-brochure-customer.js
 *
 * The Android "Kassenta Order" app is a native shell over these pages, so
 * capturing them here is capturing the app. Two routes were reachable in the
 * first pass; the rest of the journey — a store menu, an item sheet, the cart,
 * checkout — only exists after a tap.
 */
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const BASE = "https://kassenta.com";
const ROOT = path.resolve(__dirname, "..");
const SHOTS = path.join(ROOT, "docs", "brochure", "shots");

// Portrait phone-ish tablet: the ordering app is portrait-locked, and a 16:10
// landscape frame would show it letterboxed in the brochure.
const DEVICE = { width: 900, height: 1200, deviceScaleFactor: 2 };

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const INVENTORY = {};

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
    await new Promise((r) => setTimeout(r, 500));
  });
  await page.screenshot({ path: path.join(SHOTS, `${key}.png`) });
  INVENTORY[key] = await inventory(page);
}

async function goto(page, route, settleMs = 4500) {
  try {
    await page.goto(BASE + route, { waitUntil: "networkidle2", timeout: 90000 });
  } catch { /* polling screens never idle */ }
  await wait(settleMs);
}

(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport(DEVICE);

  const done = [], missed = [];
  const log = (k, ok) => { (ok ? done : missed).push(k); console.log(`  ${ok ? "ok  " : "MISS"} ${k}`); };

  console.log("customer app");

  // Marketplace, portrait
  await goto(page, "/restaurants");
  await shoot(page, "cust-browse"); log("cust-browse", true);

  // Collection instead of delivery
  if (await tap(page, "Collection", 2500)) { await shoot(page, "cust-collection"); log("cust-collection", true); }
  else log("cust-collection", false);

  // A cuisine filter
  await goto(page, "/restaurants");
  if (await tap(page, "Pizza", 2500)) { await shoot(page, "cust-filter"); log("cust-filter", true); }
  else log("cust-filter", false);

  // A store page opens on a four-slide welcome carousel, not the menu. That
  // carousel is worth its own shot, but the menu is only behind Skip.
  await goto(page, "/order/sushi-zen-zurich");
  await shoot(page, "cust-onboarding"); log("cust-onboarding", true);

  // Skip leads to a terms gate, not the menu: tick the box, then Continue.
  const skipped = await tap(page, "Skip", 3000);
  await shoot(page, "cust-terms"); log("cust-terms", skipped);

  await tap(page, "I have read and agree to the Terms & Conditions and Privacy Policy", 1200);
  const entered = await tap(page, "Continue", 3500);
  await shoot(page, "cust-menu"); log("cust-menu", entered);

  // Item sheet. Naming a real dish beats walking the DOM for "first pointer
  // element" — that finds the Delivery/Pickup tabs, which are pointers too.
  let opened = null;
  for (const dish of ["Lachs Poke Bowl", "Chicken Katsu", "Sashimi Mix (12 Stk)"]) {
    if (await tap(page, dish, 2800)) { opened = dish; break; }
  }
  if (opened) { await shoot(page, "cust-item"); log(`cust-item (${opened})`, true); }
  else log("cust-item", false);

  // The button reads "Add to cart — CHF 26": the price is part of the label,
  // so an exact match never fires.
  const tapStartsWith = async (prefix, settleMs = 2500) => {
    const at = await page.evaluate(async (p) => {
      const own = (el) =>
        [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
      const hits = [...document.querySelectorAll("*")].filter((el) => {
        const t = own(el);
        if (!t.toLowerCase().startsWith(p.toLowerCase())) return false;
        const r = el.getBoundingClientRect();
        return r.width > 4 && r.height > 4;
      });
      if (!hits.length) return null;
      const el = hits[hits.length - 1];
      el.scrollIntoView({ block: "center" });
      await new Promise((r) => setTimeout(r, 600));
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, prefix);
    if (!at) return false;
    await page.mouse.click(at.x, at.y);
    await wait(settleMs);
    return true;
  };

  let addedToCart = false;
  for (const label of ["Add to cart", "In den Warenkorb"]) {
    if (await tapStartsWith(label)) { addedToCart = true; break; }
  }
  if (addedToCart && (await tap(page, "Cart", 2800))) { await shoot(page, "cust-cart"); log("cust-cart", true); }
  else log("cust-cart", false);

  // Sign-in / account screen
  await goto(page, "/customer/");
  await shoot(page, "cust-signin"); log("cust-signin", true);

  console.log(`\ncaptured ${done.length}, missed ${missed.length}`);
  if (missed.length) console.log("missed:", missed.join(", "));
  fs.writeFileSync(path.join(path.dirname(SHOTS), path.basename(__filename, ".js") + "-inventory.json"),
    JSON.stringify(INVENTORY, null, 2));
  await browser.close();
})();
