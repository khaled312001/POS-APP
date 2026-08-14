/**
 * Captures Play Store screenshots for the Kassenta Order customer app.
 *
 *   node scripts/capture-customer-screenshots.js
 *
 * The Android app is a WebView over https://kassenta.com/customer/ — a hash-routed
 * SPA — so the shots come from its own routes (#/home, #/menu/<slug>, …) rather
 * than the server-rendered /restaurants and /order/<slug> pages, which the app
 * never displays.
 *
 * Two things this has to work around:
 *
 *   1. Every route except intro/login/register is behind an auth gate. A guest
 *      session from /api/delivery/auth/guest is seeded into localStorage as
 *      `bc_auth`, which is exactly what the app writes after "Continue as guest".
 *
 *   2. `#app` is capped at max-width 720px, so a 2560px-wide viewport renders a
 *      narrow column between two black bars. The tablet viewports are therefore
 *      720 CSS px wide and scaled up, which fills the frame at a valid Play size.
 */
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const BASE = "https://kassenta.com";
const APP = `${BASE}/customer/`;
// Sushi Zen is configured in German with a full photographed menu; Pizza Lemon,
// the licence owner's store, is set to Arabic and would render RTL.
const SLUG = "sushi-zen-zurich";
const TENANT_ID = 101;

const OUT = path.join(__dirname, "..", "customer-app", "play-store", "screenshots");

// Play: phone 320–3840 per side, 7-inch 320–3840, 10-inch 1080–7680, 16:9 or 9:16.
const DEVICES = {
  phone:    { width: 432, height: 768,  deviceScaleFactor: 2.5 }, // 1080 x 1920
  tablet7:  { width: 720, height: 1280, deviceScaleFactor: 1.5 }, // 1080 x 1920
  tablet10: { width: 720, height: 1280, deviceScaleFactor: 2 },   // 1440 x 2560
};

const SCREENS = [
  ["01_home", "#/home"],
  ["02_restaurants", "#/restaurants"],
  ["03_menu", `#/menu/${SLUG}`],
  ["04_cart", `#/menu/${SLUG}`, { openCart: true }],
  ["05_broadcast", "#/broadcast"],
  ["06_orders", "#/orders"],
  ["07_account", "#/account"],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function guestSession() {
  const res = await fetch(`${BASE}/api/delivery/auth/guest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Guest", tenantId: TENANT_ID }),
  });
  const d = await res.json();
  if (!d?.token) throw new Error("guest auth failed: " + JSON.stringify(d).slice(0, 200));
  return { token: d.token, customer: d.customer, isGuest: true };
}

/** Three real items off the live menu, so the cart shot shows a real total. */
async function cartItems() {
  const menu = await fetch(`${BASE}/api/delivery/store/${SLUG}/menu`).then((r) => r.json());
  const items = (menu.categories || []).flatMap((c) => c.items || []).filter((i) => i.image);
  return items.slice(0, 3).map((i, n) => ({
    productId: i.id,
    tenantId: TENANT_ID,
    tenantName: "Sushi Zen",
    name: i.name,
    quantity: n === 0 ? 2 : 1,
    estimatedPrice: Number(i.price),
    imageUrl: i.image,
  }));
}

(async () => {
  const auth = await guestSession();
  const cart = await cartItems();
  console.log(`guest #${auth.customer.id} | cart seeded with ${cart.length} items\n`);

  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();

  await page.evaluateOnNewDocument((a, c, tid) => {
    localStorage.setItem("bc_auth", JSON.stringify(a));
    localStorage.setItem("bc_cart", JSON.stringify(c));
    localStorage.setItem("bc_cart_mode", "tenant:" + tid);
    localStorage.setItem("bc_lang", "en");
  }, auth, cart, TENANT_ID);

  for (const [device, view] of Object.entries(DEVICES)) {
    await page.setViewport(view);
    const px = `${view.width * view.deviceScaleFactor}x${view.height * view.deviceScaleFactor}`;

    for (const [name, route, opts = {}] of SCREENS) {
      await page.goto(APP + route, { waitUntil: "networkidle2", timeout: 90000 });
      // goto only changes the hash when the path is unchanged, so the DOM
      // survives between screens — which left the cart drawer standing open
      // over every shot after 04_cart. Reload to get a clean render each time.
      await page.reload({ waitUntil: "networkidle2", timeout: 90000 });
      await sleep(3800); // menu images arrive after the route renders

      if (opts.openCart) {
        // The cart is a drawer behind a floating button; clicking it also runs
        // the render that fills the body, which setting the class alone skips.
        const clicked = await page.evaluate(() => {
          const fab = document.getElementById("cart-fab");
          if (!fab || fab.classList.contains("hidden")) return false;
          fab.click();
          return true;
        });
        if (!clicked) console.log(`  !! cart FAB hidden — skipping ${name}`);
        await sleep(1200);
      }

      // How much of the frame actually has content, so a near-empty state does
      // not get shipped as a store screenshot without anyone noticing.
      const fill = await page.evaluate(() => {
        const el = document.querySelector(".page.active") || document.body;
        return Math.round((el.getBoundingClientRect().height / window.innerHeight) * 100);
      });

      const file = path.join(OUT, device, `${name}.png`);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      await page.screenshot({ path: file });
      console.log(`  ${device.padEnd(9)} ${name.padEnd(16)} ${px.padEnd(10)} content ${fill}%`);
    }
  }

  await browser.close();
  console.log("\ndone");
})();
