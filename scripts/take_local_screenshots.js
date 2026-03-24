/**
 * Barmagly POS — Local Screenshot Script  (v3)
 *
 * الإصلاحات:
 *  ✓ ينتظر تحميل الصفحة كاملاً (network idle + صور + fonts)
 *  ✓ يجمّد animations قبل كل screenshot
 *  ✓ يخفي جميع الإشعارات والـ overlays (PWA + Toast + Banners)
 *  ✓ يتحقق من مقاس كل صورة بعد حفظها ويطبع الأبعاد الفعلية
 *  ✓ الاتصال وهمي: GET → حقيقي / POST+PUT+DELETE → mock
 *
 * أحجام الإخراج (9:16):
 *   Phone      → 1080 × 1920
 *   Tablet 7"  → 1080 × 1920
 *   Tablet 10" → 1440 × 2560
 *
 * تشغيل:  node scripts/take_local_screenshots.js
 */

"use strict";
const puppeteer  = require("puppeteer");
const path       = require("path");
const fs         = require("fs");
const { spawn }  = require("child_process");
const http       = require("http");

// ─────────────────────────────────────────────────────────────────────────────
// الإعدادات
// ─────────────────────────────────────────────────────────────────────────────
const APP_URL    = "http://localhost:8081";   // Proxy (للمتصفح)
const EXPO_URL   = "http://localhost:8080";   // Expo Metro bundler
const SERVER_URL = "http://localhost:5001";   // Express API (PORT=5001 in .env)
const EMAIL      = "admin@pizzalemon.ch";
const LIC_KEY    = "BARMAGLY-8FBC-16DA-8BD9-E3B6";
const ADMIN_PIN  = "1234";
const CASHIER_PIN= "0000";
const PROJECT_DIR= path.join(__dirname, "..");
const OUT_BASE   = path.join(PROJECT_DIR, "assets", "images", "screenshots");

// CSS pixels × DPR = pixel output (9:16 exactly)
// Phone: 540×960 CSS (أطول من 360×640 → لا قطع) × dpr=2 → 1080×1920 ✓
// Tablet7:  600×1067 CSS × dpr≈1.8 → 1080×1920 ✓  (zoom=0.85 يعوّض)
// Tablet10: 720×1280 CSS × dpr=2   → 1440×2560 ✓
const VIEWPORTS = [
  { name: "phone",    w: 540,  h: 960,  dpr: 2, zoom: 0.82, outW: 1080, outH: 1920,
    ua: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36" },
  { name: "tablet7",  w: 540,  h: 960,  dpr: 2, zoom: 0.88, outW: 1080, outH: 1920,
    ua: "Mozilla/5.0 (Linux; Android 13; Nexus 7 Build/JOP40D) AppleWebKit/537.36 Chrome/124 Safari/537.36" },
  { name: "tablet10", w: 720,  h: 1280, dpr: 2, zoom: 0.90, outW: 1440, outH: 2560,
    ua: "Mozilla/5.0 (Linux; Android 13; SM-T870) AppleWebKit/537.36 Chrome/124 Safari/537.36" },
];

// موظفون وهميون للعرض عندما يكون الـ DB فارغاً
const MOCK_EMPLOYEES = [
  { id: 1, name: "Admin Lemon",   role: "admin",   pin: "1234", branchId: null, isActive: true,
    permissions: ["manage","reports","products","employees","settings","deleteCustomers"] },
  { id: 2, name: "Cashier Lemon", role: "cashier", pin: "0000", branchId: null, isActive: true,
    permissions: [] },
];

// ─────────────────────────────────────────────────────────────────────────────
// أدوات عامة
// ─────────────────────────────────────────────────────────────────────────────
const wait = ms => new Promise(r => setTimeout(r, ms));

/** قراءة مقاس PNG من الـ header مباشرة (بدون مكتبة خارجية) */
function getPNGSize(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
  } catch(_) {}
  return null;
}

function checkPort(url) {
  return new Promise(resolve => {
    const req = http.get(url, () => resolve(true));
    req.on("error", () => resolve(false));
    req.setTimeout(1500, () => { req.destroy(); resolve(false); });
  });
}

async function waitForPort(url, label, maxTries = 45) {
  for (let i = 0; i < maxTries; i++) {
    if (await checkPort(url)) { console.log(`\n  ✓ ${label} جاهز`); return; }
    process.stdout.write(i % 5 === 0 ? `\r  ⏳ انتظار ${label}…` : ".");
    await wait(2000);
  }
  throw new Error(`${label} لم يستجب بعد ${maxTries * 2} ثانية`);
}

function spawnDetached(cmd, args, cwd) {
  const p = spawn(cmd, args, { cwd, shell: true, detached: true, stdio: "pipe" });
  p.on("error", e => console.error(`  ⚠️  spawn error: ${e.message}`));
  return p;
}

// ─────────────────────────────────────────────────────────────────────────────
// تشغيل الخوادم
// ─────────────────────────────────────────────────────────────────────────────
let serverProc = null, expoProc = null;

async function startServers() {
  console.log("\n🚀 التحقق من الخوادم…");
  console.log("   Proxy:8081 → Expo Metro:8080 + API:5001  (PORT=5001 in .env)");

  const serverReady = await checkPort(SERVER_URL);
  const expoReady   = await checkPort(EXPO_URL);

  if (!serverReady) {
    console.log("  ▶ تشغيل server:dev (API:5001 + Proxy:8081)…");
    serverProc = spawnDetached("npm", ["run", "server:dev"], PROJECT_DIR);
  } else { console.log("  ✓ Backend (5001) يعمل"); }

  if (!expoReady) {
    console.log("  ▶ تشغيل Expo Metro على :8080…");
    expoProc = spawnDetached("npx", ["expo", "start", "--web", "--port", "8080"], PROJECT_DIR);
  } else { console.log("  ✓ Expo Metro (8080) يعمل"); }

  if (!serverReady) await waitForPort(SERVER_URL, "API:5001");
  if (!expoReady)   await waitForPort(EXPO_URL,   "Expo:8080");

  console.log("  ⏳ انتظار تحميل التطبيق عبر الـ proxy…");
  await waitForAppContent();
  console.log("  ✓ التطبيق جاهز للتصوير\n");
}

async function waitForAppContent(maxMs = 90000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    try {
      const body = await new Promise((res, rej) => {
        const req = http.get(APP_URL, r => {
          let d = ""; r.on("data", c => d += c); r.on("end", () => res(d));
        });
        req.on("error", rej);
        req.setTimeout(3000, () => { req.destroy(); rej(new Error("timeout")); });
      });
      if (!body.includes("Backend not ready") && body.length > 200) return;
    } catch(_) {}
    await wait(3000);
  }
  throw new Error("التطبيق لم يُحمَّل — شغّل Expo Metro على :8080");
}

// ─────────────────────────────────────────────────────────────────────────────
// اعتراض الطلبات (mock writes)
// ─────────────────────────────────────────────────────────────────────────────
const PASSTHROUGH_PATHS = [
  "/api/auth/google",
];

const MOCK_LICENSE_RESPONSE = {
  isValid: true,
  tenant: { id: 1, name: "Pizza Lemon", logo: null, storeType: "restaurant", setupCompleted: true },
  subscription: { active: true, plan: "pro", daysRemaining: 365, requiresUpgrade: false },
};

function mockResponse(url, body) {
  const base = { success: true, message: "mock – no production data modified" };
  // ── license validation — always valid ──────────────────────────────────────
  if (url.includes("/api/license/validate")) return MOCK_LICENSE_RESPONSE;
  // ── employee PIN login — match by pin ──────────────────────────────────────
  if (url.includes("/api/employees/login")) {
    let pin = null;
    try { pin = JSON.parse(body || "{}").pin; } catch(_) {}
    const emp = MOCK_EMPLOYEES.find(e => e.pin === pin) || MOCK_EMPLOYEES[0];
    // Return just the employee object (what the app expects from res.json())
    const { pin: _p, ...empData } = emp;
    return empData;
  }
  if (url.includes("/api/orders"))    return { ...base, id: 99999, orderNumber: "MOCK-0001", status: "pending", total: 0 };
  if (url.includes("/api/products"))  return { ...base, id: 99999 };
  if (url.includes("/api/employees")) return { ...base, id: 99999 };
  if (url.includes("/api/customers")) return { ...base, id: 99999 };
  if (url.includes("/api/invoices"))  return { ...base, id: 99999 };
  if (url.includes("/api/inventory")) return base;
  if (url.includes("/api/tenant"))    return base;
  return base;
}

// ── إعادة توجيه GET من port 5000 → 5001 (api-config.ts يُعيد 5000 للـ localhost) ──
async function proxyGet(req) {
  const url5001 = req.url().replace("localhost:5000", "localhost:5001");
  const hdrs = req.headers();
  return new Promise(resolve => {
    const parsed = new URL(url5001);
    const options = {
      hostname: parsed.hostname,
      port: parseInt(parsed.port || "80"),
      path: parsed.pathname + parsed.search,
      method: "GET",
      headers: {
        ...hdrs,
        host: `localhost:5001`,
      },
    };
    const r = http.request(options, res => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        const ct = res.headers["content-type"] || "application/json";
        resolve({ status: res.statusCode || 200, contentType: ct,
          headers: { "Access-Control-Allow-Origin": "*" }, body: data });
      });
    });
    r.on("error", () => resolve(null));
    r.setTimeout(8000, () => { r.destroy(); resolve(null); });
    r.end();
  });
}

async function setupInterception(page) {
  await page.setRequestInterception(true);
  page.on("request", async req => {
    const method = req.method();
    const url    = req.url();

    // ── mock قائمة الموظفين (GET) — يُعيد بيانات عرض وهمية دائماً ──────────
    if (method === "GET" && /\/api\/employees(\?|$)/.test(url)) {
      req.respond({
        status: 200,
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(MOCK_EMPLOYEES),
      });
      return;
    }

    // ── إعادة توجيه كل GET/HEAD/OPTIONS من port 5000 → 5001 ─────────────────
    // (api-config.ts يُعيد localhost:5000 للـ localhost لكن الخادم على 5001)
    if (["GET","HEAD","OPTIONS"].includes(method) && url.includes("localhost:5000")) {
      const resp = await proxyGet(req);
      if (resp) { req.respond(resp); return; }
      // إذا فشل الـ proxy، تابع بشكل طبيعي
      req.continue().catch(() => {});
      return;
    }

    if (["GET","OPTIONS","HEAD"].includes(method)) { req.continue(); return; }
    if (PASSTHROUGH_PATHS.some(p => url.includes(p))) { req.continue(); return; }

    // قراءة جسم الطلب للـ mock
    const body = req.postData() || "{}";
    req.respond({
      status: 200,
      contentType: "application/json",
      headers: {
        "Access-Control-Allow-Origin":  "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,PATCH,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization,x-license-key",
      },
      body: JSON.stringify(mockResponse(url, body)),
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// إخفاء الإشعارات والـ banners (شامل)
// ─────────────────────────────────────────────────────────────────────────────
async function hideAllOverlays(page) {
  await page.evaluate(() => {
    // ── PWA banners ───────────────────────────────────────────────────────────
    ["pwa-dialog-overlay","pwa-ios-banner","pwa-install-banner"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.cssText = "display:none!important";
    });
    try { localStorage.setItem("pwa_dismissed_v2","1"); } catch(_) {}

    // ── Toast / Alert / Notification overlays ────────────────────────────────
    // إخفاء أي عنصر يبدو كإشعار (صغير، في أعلى أو أسفل الشاشة)
    const vh = window.innerHeight;
    document.querySelectorAll(
      "[role='alert'],[role='status'],[aria-live],[class*='toast'],[class*='Toast']," +
      "[class*='notification'],[class*='Notification'],[class*='snack'],[class*='Snack']," +
      "[class*='banner'],[class*='Banner'],[class*='popup'],[class*='Popup']," +
      "[data-testid*='toast'],[data-testid*='notification']"
    ).forEach(el => {
      if (!el.offsetParent) return;
      const r = el.getBoundingClientRect();
      // فقط إذا كان overlay صغير (< 120px height) في الأعلى أو الأسفل
      if (r.height > 0 && r.height < 150 && (r.top < 120 || r.bottom > vh - 120)) {
        el.style.cssText = "display:none!important;visibility:hidden!important";
      }
    });

    // ── إزالة شريط عنوان المتصفح / أي header وهمي ────────────────────────
    // تأكد أن أي عنصر مرتبط بـ "install app" مخفي
    document.querySelectorAll("[class*='install'],[id*='install'],[class*='prompt']").forEach(el => {
      el.style.cssText = "display:none!important";
    });
  }).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────
// تجميد animations قبل الصورة
// ─────────────────────────────────────────────────────────────────────────────
async function freezeAnimations(page) {
  await page.evaluate(() => {
    // إيقاف كل CSS animation & transition
    const s = document.createElement("style");
    s.id = "__freeze_anim__";
    s.textContent = `
      *, *::before, *::after {
        animation-play-state: paused !important;
        animation-duration:   0.001ms !important;
        animation-delay:      0.001ms !important;
        transition-duration:  0.001ms !important;
        transition-delay:     0.001ms !important;
      }
    `;
    if (!document.getElementById("__freeze_anim__")) {
      document.head.appendChild(s);
    }
  }).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────
// انتظار اكتمال تحميل الصفحة
// ─────────────────────────────────────────────────────────────────────────────
async function waitForPageSettle(page) {
  // 1. انتظر network idle (لا طلبات لمدة 1 ثانية)
  try {
    await page.waitForNetworkIdle({ idleTime: 1000, timeout: 10000 });
  } catch(_) { /* مقبول */ }

  // 2. انتظر تحميل الصور
  await page.evaluate(() => {
    const imgs = Array.from(document.images).filter(i => !i.complete && i.src);
    return Promise.all(imgs.map(i => new Promise(r => {
      i.onload = i.onerror = r;
      setTimeout(r, 3000); // حد أقصى 3s لكل صورة
    })));
  }).catch(() => {});

  // 3. انتظر توقف loading indicators
  await page.evaluate(() => new Promise(resolve => {
    // إذا لا يوجد loading spinners → انتهى
    const check = () => {
      const spinners = document.querySelectorAll(
        "[aria-label*='loading'],[class*='spinner'],[class*='Spinner'],[class*='loader'],[class*='Loader']"
      );
      const visible = Array.from(spinners).filter(el => el.offsetParent);
      if (visible.length === 0) { resolve(); return; }
      setTimeout(check, 300);
    };
    check();
    setTimeout(resolve, 5000); // حد أقصى 5s
  })).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────
// الانتظار حتى يظهر نص
// ─────────────────────────────────────────────────────────────────────────────
async function waitForText(page, text, maxMs = 12000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    try {
      const has = await page.evaluate(
        p => new RegExp(p, "i").test(document.body.innerText || ""),
        text
      );
      if (has) return true;
    } catch(_) {}
    await wait(300);
  }
  return false;
}

async function waitForUrl(page, pattern, maxMs = 25000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    if (page.url().includes(pattern)) return true;
    await wait(300);
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// التقاط صورة محققة (verified + size-checked)
// ─────────────────────────────────────────────────────────────────────────────
async function verifiedShot(page, vp, outDir, label, mustContain, opts = {}) {
  const maxWait = opts.maxWait || 12000;

  // 1. تأكد أن المحتوى المطلوب موجود
  const found = await waitForText(page, mustContain, maxWait);
  if (!found) {
    console.log(`  ⏭  تخطي ${label} — "${mustContain}" غير مرئي`);
    return false;
  }

  // 2. انتظر اكتمال تحميل الصفحة
  await waitForPageSettle(page);

  // 3. أخفِ كل الإشعارات والـ overlays
  await hideAllOverlays(page);

  // 4. جمّد الـ animations
  await freezeAnimations(page);

  // 5. انتظار قصير للاستقرار البصري
  await wait(opts.extraWait || 600);

  // 6. التقط الصورة
  const file = path.join(outDir, `${label}.png`);
  try {
    await page.screenshot({ path: file, fullPage: false });
  } catch(e) {
    console.log(`  ❌ screenshot فشل: ${e.message.slice(0, 80)}`);
    return false;
  }

  // 7. تحقق من المقاس
  const size = getPNGSize(file);
  if (size) {
    const ok = size.width === vp.outW && size.height === vp.outH;
    if (ok) {
      console.log(`  📸 ${label}.png  ✓ ${size.width}×${size.height}`);
    } else {
      console.log(`  📸 ${label}.png  ⚠️  مقاس: ${size.width}×${size.height} (مطلوب: ${vp.outW}×${vp.outH})`);
      // إذا كان المقاس خاطئاً، أعد ضبط الـ viewport وحاول مرة أخرى
      await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: vp.dpr });
      await wait(500);
      await page.screenshot({ path: file, fullPage: false });
      const size2 = getPNGSize(file);
      if (size2) console.log(`       → بعد الإعادة: ${size2.width}×${size2.height}`);
    }
  } else {
    console.log(`  📸 ${label}.png  (تعذّر قراءة المقاس)`);
  }

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// PWA suppression قبل أي تحميل
// ─────────────────────────────────────────────────────────────────────────────
async function setupPage(browser, vp) {
  const page = await browser.newPage();

  // أوقف PWA prompt قبل تشغيل أي script
  await page.evaluateOnNewDocument(() => {
    window.addEventListener("beforeinstallprompt", e => e.preventDefault(), true);
    // إخفاء PWA overlays بمجرد تهيئة الـ DOM
    const observer = new MutationObserver(() => {
      ["pwa-dialog-overlay","pwa-ios-banner"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.cssText = "display:none!important";
      });
      try { localStorage.setItem("pwa_dismissed_v2","1"); } catch(_) {}
    });
    document.addEventListener("DOMContentLoaded", () => {
      observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    });
    try { localStorage.setItem("pwa_dismissed_v2","1"); } catch(_) {}
  });

  await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: vp.dpr });
  await page.setUserAgent(vp.ua);
  await setupInterception(page);

  // أخفِ أي خطأ console غير ضروري
  page.on("console", msg => {
    if (msg.type() === "error" && !msg.text().includes("favicon")) {
      // اطبع فقط أخطاء مهمة
    }
  });

  return page;
}

// ─────────────────────────────────────────────────────────────────────────────
// Zoom out — يُصغّر المحتوى حتى تظهر الشاشة كاملة بدون قطع
// ─────────────────────────────────────────────────────────────────────────────
async function applyZoom(page, zoom) {
  if (!zoom || zoom >= 1) return;
  await page.evaluate(z => {
    // CSS zoom (Chrome-native, أسرع من transform)
    document.body.style.zoom = z;
    // backup: أيضاً على html
    document.documentElement.style.zoom = z;
  }, zoom).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────
// التنقل للصفحة مع انتظار كامل
// ─────────────────────────────────────────────────────────────────────────────
async function go(page, url, zoom) {
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 40000 });
  } catch(_) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 40000 }).catch(() => {});
  }
  await hideAllOverlays(page);
  if (zoom) await applyZoom(page, zoom);
  await wait(1500);
}

// ─────────────────────────────────────────────────────────────────────────────
// النقر على عنصر بالنص
// ─────────────────────────────────────────────────────────────────────────────
async function clickText(page, regex, maxWait = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxWait) {
    const done = await page.evaluate(pattern => {
      const re  = new RegExp(pattern, "i");
      const all = Array.from(document.querySelectorAll("button,[role='button'],a,div,span"));
      for (const el of all) {
        if (!el.offsetParent) continue;
        const t = (el.textContent || "").trim();
        if (!re.test(t)) continue;
        if (el.children.length > 8) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 14 || r.height < 10) continue;
        el.scrollIntoView({ block: "nearest" });
        const r2 = el.getBoundingClientRect();
        const cx = r2.left + r2.width  / 2;
        const cy = r2.top  + r2.height / 2;
        const mkP = tp => new PointerEvent(tp, { bubbles:true, cancelable:true, composed:true, clientX:cx, clientY:cy, button:0, buttons:1, isPrimary:true });
        const mkM = tp => new MouseEvent (tp, { bubbles:true, cancelable:true, clientX:cx, clientY:cy, button:0, buttons:1 });
        el.dispatchEvent(mkP("pointerover"));
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

// ─────────────────────────────────────────────────────────────────────────────
// النقر على رقم PIN
// ─────────────────────────────────────────────────────────────────────────────
async function clickPin(page, digit) {
  const d = String(digit);
  const done = await page.evaluate(d => {
    for (const el of Array.from(document.querySelectorAll("*"))) {
      if (!el.offsetParent) continue;
      if ((el.textContent || "").replace(/\s/g,"") !== d) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 20 || r.height < 20 || r.width > 300) continue;
      el.scrollIntoView({ block: "nearest" });
      const r2 = el.getBoundingClientRect();
      const cx = r2.left + r2.width/2, cy = r2.top + r2.height/2;
      const mkP = tp => new PointerEvent(tp, { bubbles:true, cancelable:true, composed:true, clientX:cx, clientY:cy, button:0, buttons:1, isPrimary:true });
      const mkM = tp => new MouseEvent (tp, { bubbles:true, cancelable:true, clientX:cx, clientY:cy, button:0, buttons:1 });
      el.dispatchEvent(mkP("pointerover"));
      el.dispatchEvent(mkP("pointerdown")); el.dispatchEvent(mkM("mousedown"));
      el.dispatchEvent(mkP("pointerup"));   el.dispatchEvent(mkM("mouseup"));
      el.dispatchEvent(mkM("click"));
      return `ok:${d}`;
    }
    return null;
  }, d);
  if (done) { await wait(400); return true; }

  // Fallback: page.mouse
  const coords = await page.evaluate(d => {
    for (const el of Array.from(document.querySelectorAll("*"))) {
      if (!el.offsetParent) continue;
      if ((el.textContent || "").replace(/\s/g,"") !== d) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 20 || r.height < 20 || r.width > 300) continue;
      el.scrollIntoView({ block: "nearest" });
      const r2 = el.getBoundingClientRect();
      return { x: r2.left + r2.width/2, y: r2.top + r2.height/2 };
    }
    return null;
  }, d);
  if (coords) {
    await page.mouse.move(coords.x, coords.y); await wait(50);
    await page.mouse.down(); await wait(80); await page.mouse.up();
    await wait(400);
    return true;
  }
  console.log(`    ❌ PIN "${d}" not found`);
  return false;
}

async function enterPin(page, pin) {
  for (const d of pin.split("")) await clickPin(page, d);
  await wait(3000);
}

// ─────────────────────────────────────────────────────────────────────────────
// نافذة الوردية
// ─────────────────────────────────────────────────────────────────────────────
async function handleShiftModal(page, vp, outDir) {
  const visible = await waitForText(page, "shift|وردية", 4000);
  if (!visible) return;
  console.log("  ⏱  نافذة الوردية");
  await verifiedShot(page, vp, outDir, "10_shift_modal", "shift|وردية", { maxWait: 3000 });
  await clickText(page, "start shift|skip|continue|ok|ابدأ|تأكيد", 4000);
  await wait(1500);
  await clickText(page, "confirm|ok|done|start|متابعة", 2000);
  await wait(2500);
}

// ─────────────────────────────────────────────────────────────────────────────
// النقر على tab
// ─────────────────────────────────────────────────────────────────────────────
async function clickTab(page, label, verifyText, zoom) {
  await clickText(page, `^${label}$`, 6000);
  if (verifyText) await waitForText(page, verifyText, 6000);
  await hideAllOverlays(page);
  if (zoom) await applyZoom(page, zoom);
  await wait(1500);
}

// ─────────────────────────────────────────────────────────────────────────────
// الدالة الرئيسية لكل حجم viewport
// ─────────────────────────────────────────────────────────────────────────────
async function runViewport(browser, vp) {
  const outDir = path.join(OUT_BASE, vp.name);
  fs.mkdirSync(outDir, { recursive: true });
  fs.readdirSync(outDir).filter(f => f.endsWith(".png"))
    .forEach(f => fs.unlinkSync(path.join(outDir, f)));

  console.log(`\n${"═".repeat(68)}`);
  console.log(`  ${vp.name.toUpperCase()}  —  CSS ${vp.w}×${vp.h} × DPR ${vp.dpr}  →  ${vp.outW}×${vp.outH} px`);
  console.log(`${"═".repeat(68)}`);

  const page = await setupPage(browser, vp);

  // اختصار
  const Z    = vp.zoom;                          // قيمة الـ zoom لهذا الحجم
  const nav  = (url) => go(page, url, Z);        // تنقل + zoom تلقائي
  const s    = (label, must, opts) => verifiedShot(page, vp, outDir, label, must, opts);
  const rezoom = () => applyZoom(page, Z);       // إعادة تطبيق zoom بعد أي إعادة رسم

  try {

    // ──────────────────────────────────────────────────────────────────────────
    // 01 — شاشة Intro
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n── INTRO");
    await nav(APP_URL);
    await page.evaluate(() => { localStorage.clear(); });
    await nav(APP_URL);
    await s("01_intro_welcome",  "Barmagly|Get Started|Welcome|مرحبا");
    await s("02_intro_language", "English|Arabic|German|Language|language");
    await clickText(page, "get started|ابدأ الآن|Loslegen", 6000);
    await wait(2000);

    // ──────────────────────────────────────────────────────────────────────────
    // 02 — شاشة License Gate
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n── LICENSE GATE");
    const afterIntro = page.url();
    if (!afterIntro.includes("login") && !afterIntro.includes("(tabs)")) {
      if (!afterIntro.includes("license")) await nav(`${APP_URL}/license-gate`);

      await s("03_license_gate_empty", "Activate|Store Email|License|ترخيص");

      // ملء البريد الإلكتروني
      await page.evaluate(() => {
        const i = document.querySelectorAll("input")[0];
        if (i) { i.focus(); i.click(); }
      });
      await page.keyboard.down("Control"); await page.keyboard.press("a"); await page.keyboard.up("Control");
      await page.keyboard.type(EMAIL, { delay: 40 });
      await wait(300);

      // ملء مفتاح الترخيص
      await page.evaluate(() => {
        const i = document.querySelectorAll("input")[1];
        if (i) { i.focus(); i.click(); }
      });
      await page.keyboard.down("Control"); await page.keyboard.press("a"); await page.keyboard.up("Control");
      await page.keyboard.type(LIC_KEY, { delay: 40 });
      await wait(300);
      await s("04_license_filled", "BARMAGLY|admin@pizzalemon|pizzalemon");

      await clickText(page, "activate store|activate|تفعيل|Activate", 6000);
      await wait(1500);
      await s("05_license_activating", "activat|verif|جار|loading|Loading", { maxWait: 4000 });

      const redirected = await waitForUrl(page, "login", 30000);
      if (!redirected) console.log("  ⚠️  لم يُحوَّل للـ login — حقن المصادقة");
      await wait(2000);
      await s("06_license_done", "Pizza Lemon|Admin|Cashier|profile|PIN");
    } else {
      console.log("  ✓ مرخّص بالفعل");
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 03 — شاشة Login
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n── LOGIN");
    if (!page.url().includes("login")) await nav(`${APP_URL}/login`);
    else await rezoom();

    let empLoaded = await waitForText(page, "Admin|Cashier|profile|موظف", 14000);
    if (!empLoaded) {
      console.log("  ❌ موظفون غير محمّلين — حقن license ثم إعادة التحميل");
      await page.evaluate((k, e) => {
        localStorage.setItem("barmagly_license_key", k);
        localStorage.setItem("barmagly_store_email", e);
        localStorage.setItem("hasSeenIntro", "true");
      }, LIC_KEY, EMAIL);
      await nav(`${APP_URL}/login`);
      empLoaded = await waitForText(page, "Admin|Cashier|PIN|profile", 10000);
    }
    await s("07_login_employee_select", "Admin|Cashier|profile|Select your profile|PIN");

    // ──────────────────────────────────────────────────────────────────────────
    // 04 — PIN pad الأدمن
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n── ADMIN PIN");
    await clickText(page, "admin lemon|admin", 8000);
    const pinVisible = await waitForText(page, "Enter PIN|PIN|pin", 7000);
    if (!pinVisible) {
      console.log("  ❌ PIN pad غير مرئي — حقن الجلسة مباشرة");
    } else {
      await wait(800);
      await s("08_admin_pin_pad", "Enter PIN|Admin");
      await enterPin(page, ADMIN_PIN);
      await s("09_pin_entering", "Enter PIN|Admin|shift|وردية", { maxWait: 5000 });
      await handleShiftModal(page, vp, outDir);
    }

    const loggedIn = await waitForText(page, "POS|Products|Customers|Reports|Online Orders|More", 12000);
    if (!loggedIn) {
      console.log("  ❌ PIN لم ينجح — حقن الجلسة مباشرة");
      await page.evaluate((k, e, emp) => {
        localStorage.setItem("barmagly_license_key", k);
        localStorage.setItem("barmagly_store_email", e);
        localStorage.setItem("hasSeenIntro", "true");
        localStorage.setItem("barmagly_employee", JSON.stringify(emp));
      }, LIC_KEY, EMAIL, MOCK_EMPLOYEES[0]);
      // navigate to root — license mock returns success immediately → routes to /(tabs)
      await nav(APP_URL);
      const reached = await waitForText(page, "POS|Products|Customers", 15000);
      if (!reached) {
        console.log("  ⚠️  لا يزال لم يصل للـ tabs — محاولة التنقل المباشر");
        // Direct navigation to tabs as final fallback
        await page.goto(`${APP_URL}/(tabs)`, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
        await waitForText(page, "POS|Products|Customers", 10000);
      }
    }
    await rezoom();
    await s("11_logged_in_pos", "POS|Products|Cart|Checkout|CHF|EUR");
    console.log(`  ✅ تسجيل الدخول — ${page.url()}`);

    // ──────────────────────────────────────────────────────────────────────────
    // 05 — POS الرئيسية
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n── POS");
    await waitForText(page, "CHF|USD|EUR|SAR", 12000);
    await s("12_pos_main", "Cart|CHF|USD|EUR");

    for (const cat of ["Pizza","Calzone","Pide","Fingerfood","Drinks","Desserts"]) {
      if (await clickText(page, `^${cat}$`, 2000)) {
        await waitForText(page, "CHF|USD|EUR", 3000); await wait(500);
        await s(`13_pos_cat_${cat.toLowerCase()}`, `${cat}|CHF`);
      }
    }
    await clickText(page, "^All$|^الكل$", 3000); await wait(600);
    await s("14_pos_all_products", "CHF|USD|EUR|Cart");

    // إضافة منتجات للعربة
    for (let i = 0; i < 3; i++) {
      const c = await page.evaluate(idx => {
        const els = Array.from(document.querySelectorAll("*")).filter(el => {
          if (!el.offsetParent) return false;
          const r = el.getBoundingClientRect();
          return r.width > 60 && r.width < 500 && r.height > 50 && r.height < 400
              && /CHF|USD|EUR|SAR/.test(el.textContent || "");
        });
        const t = els[idx + 2];
        if (!t) return null;
        t.scrollIntoView({ block: "nearest" });
        const r = t.getBoundingClientRect();
        return { x: r.left + r.width/2, y: r.top + r.height/2 };
      }, i);
      if (c) { await page.mouse.click(c.x, c.y); await wait(600); }
    }
    await waitForText(page, "Subtotal|Total|subtotal|المجموع", 5000);
    await s("15_pos_cart_filled", "Subtotal|Total|CHF");
    await clickText(page, "^\\+$", 2000); await wait(400);
    await s("16_pos_qty_increased", "Subtotal|Total|CHF");

    // Checkout
    await clickText(page, "^checkout$|^الدفع$|^Checkout$", 5000);
    await waitForText(page, "cash|payment|Cash|Payment|نقد", 8000);
    await s("17_pos_checkout", "cash|payment|Cash|Payment");
    await clickText(page, "^cash$|^Cash$|نقد", 4000); await wait(600);
    await s("18_pos_cash_selected", "cash|Cash|CHF");

    // تأكيد (mock)
    await clickText(page, "confirm|complete|print|إتمام|Confirm", 4000);
    await waitForText(page, "receipt|Receipt|new order|New Order|فاتورة|success|Success", 8000);
    await s("19_pos_receipt", "receipt|Receipt|new order|CHF|success");
    await clickText(page, "new order|New Order|close|done|جديد", 4000);
    await wait(700); await page.keyboard.press("Escape"); await wait(500);
    await s("20_pos_ready_next", "Cart|CHF|Products");

    if (await clickText(page, "^orders$|^Orders$", 2500)) {
      await waitForText(page, "order|Order|طلب", 4000);
      await s("21_pos_orders_panel", "order|Order|طلب");
      await page.keyboard.press("Escape"); await wait(500);
    }
    if (await clickText(page, "^invoices$|^Invoices$|فواتير", 2500)) {
      await wait(1500); await s("22_pos_invoices", "invoice|Invoice|فاتورة");
      await page.keyboard.press("Escape"); await wait(500);
    }
    if (await clickText(page, "zero out|Zero Out|تصفير", 2500)) {
      await wait(1200); await s("23_pos_zero_shift", "zero|Zero|shift");
      await page.keyboard.press("Escape"); await wait(500);
    }
    if (await clickText(page, "select customer|phone number|Select Customer|عميل", 2500)) {
      await wait(1000); await s("24_pos_customer_search", "customer|Customer|phone");
      await page.keyboard.press("Escape"); await wait(500);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 06 — Products
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n── PRODUCTS");
    await clickTab(page, "Products", "product|Product|CHF", Z);
    await s("25_products_list", "product|Product|CHF|USD");
    await page.evaluate(() => window.scrollBy(0, 400)); await wait(600);
    await s("26_products_scroll", "product|Product|CHF");
    await page.evaluate(() => window.scrollBy(0, -400));

    const si = await page.$("input");
    if (si) {
      await si.click(); await page.keyboard.type("pizza", { delay: 50 });
      await waitForText(page, "pizza|Pizza", 4000);
      await s("27_products_search_pizza", "pizza|Pizza");
      await si.click({ clickCount: 3 }); await page.keyboard.press("Backspace");
      await waitForText(page, "CHF|USD|EUR", 3000);
    }
    const pc = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll("*")).filter(el => {
        if (!el.offsetParent) return false;
        const r = el.getBoundingClientRect();
        return r.width > 100 && r.height > 60 && /CHF|USD|EUR/.test(el.textContent || "");
      });
      if (!els[1]) return null;
      els[1].scrollIntoView({ block: "nearest" });
      const r = els[1].getBoundingClientRect();
      return { x: r.left + r.width/2, y: r.top + r.height/2 };
    });
    if (pc) {
      await page.mouse.click(pc.x, pc.y);
      await waitForText(page, "save|Save|edit|Edit|Price|Name", 5000);
      await s("28_product_edit_modal", "save|Save|Price|Name");
      await page.evaluate(() => window.scrollBy(0, 300)); await wait(500);
      await s("29_product_edit_scroll", "save|Save|category|Category");
      await page.keyboard.press("Escape"); await wait(700);
    }
    if (await clickText(page, "add product|new product|إضافة منتج|Add", 2500)) {
      await waitForText(page, "name|Name|price|Price", 5000);
      await s("30_product_new_form", "name|Name|price|Price");
      await page.keyboard.press("Escape"); await wait(500);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 07 — Customers
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n── CUSTOMERS");
    await clickTab(page, "Customers", "customer|Customer|عميل", Z);
    await s("31_customers_list", "customer|Customer|عميل");
    await page.evaluate(() => window.scrollBy(0, 400)); await wait(600);
    await s("32_customers_scroll", "customer|Customer");
    await page.evaluate(() => window.scrollBy(0, -400));

    const cc = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll("*")).filter(el => {
        if (!el.offsetParent) return false;
        const r = el.getBoundingClientRect();
        return r.height > 50 && r.height < 160 && r.width > 200;
      });
      if (!els[1]) return null;
      const r = els[1].getBoundingClientRect();
      return { x: r.left + r.width/2, y: r.top + r.height/2 };
    });
    if (cc) {
      await page.mouse.click(cc.x, cc.y);
      await waitForText(page, "order|Order|phone|Phone|Name|name", 4000);
      await s("33_customer_profile", "order|Order|phone|Phone");
      await page.keyboard.press("Escape"); await wait(500);
    }
    if (await clickText(page, "add customer|new customer|إضافة|^\\+$", 2500)) {
      await waitForText(page, "name|Name|phone|Phone", 4000);
      await s("34_customer_add_form", "name|Name|phone|Phone");
      await page.keyboard.press("Escape"); await wait(500);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 08 — Reports
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n── REPORTS");
    await clickTab(page, "Reports", "total|Total|revenue|Revenue|sales", Z);
    await s("35_reports_overview", "total|Total|revenue|Revenue");
    await page.evaluate(() => window.scrollBy(0, 350)); await wait(600);
    await s("36_reports_charts", "total|Total|CHF");
    await page.evaluate(() => window.scrollBy(0, 350)); await wait(400);
    await s("37_reports_bottom", "total|Total|order|Order");
    await page.evaluate(() => window.scrollBy(0, -700));

    for (const [lbl, rx] of [["today","^today$|اليوم"],["week","^week$|^weekly$|أسبوع"],["month","^month$|^monthly$|شهر"]]) {
      if (await clickText(page, rx, 3000)) {
        await waitForText(page, "total|Total|CHF", 3000); await wait(800);
        await s(`38_reports_${lbl}`, "total|Total|CHF");
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 09 — Online Orders
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n── ONLINE ORDERS");
    await clickTab(page, "Online Orders", "order|Order|طلب", Z);
    await s("39_online_orders_list", "order|Order|طلب");
    await page.evaluate(() => window.scrollBy(0, 400)); await wait(600);
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
      return { x: r.left + r.width/2, y: r.top + r.height/2 };
    });
    if (oc) {
      await page.mouse.click(oc.x, oc.y);
      await waitForText(page, "order|Order|item|Item|total|Total", 5000);
      await s("41_online_order_detail", "order|Order|total|Total");
      await clickText(page, "accept|approve|قبول|Accept", 3000); await wait(1200);
      await s("42_online_order_accepted", "accept|confirm|order|Order");
      await page.keyboard.press("Escape"); await wait(700);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 10 — Settings / More
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n── SETTINGS");
    await clickTab(page, "More", "settings|Settings|employees|language", Z);
    await s("43_more_menu", "settings|Settings|employees|Employees");
    await clickText(page, "^settings$|^Settings$|^الإعدادات$", 5000);
    await waitForText(page, "employee|language|printer|Language|Employee", 6000);
    await s("44_settings_main", "language|Language|employee|Employee");
    await page.evaluate(() => window.scrollBy(0, 400)); await wait(500);
    await s("45_settings_scroll", "language|Language|employee|Employee");
    await page.evaluate(() => window.scrollBy(0, -400));

    if (await clickText(page, "^employees$|^Employees$|^موظفين$", 3000)) {
      await waitForText(page, "admin|Admin|cashier|Cashier", 6000);
      await s("46_employees_list", "admin|Admin|cashier|Cashier");
      if (await clickText(page, "^add$|^Add$|^\\+$|إضافة", 3000)) {
        await waitForText(page, "name|Name|pin|PIN|role|Role", 4000);
        await s("47_employee_add_form", "name|Name|pin|PIN");
        await page.keyboard.press("Escape"); await wait(500);
      }
      await page.goBack({ waitUntil: "networkidle2" }).catch(() => {});
      await rezoom(); await wait(2000);
    }

    await clickTab(page, "More", "settings|Settings", Z);
    await clickText(page, "^settings$|^Settings$|الإعدادات", 4000); await wait(1800);

    if (await clickText(page, "^printers$|^Printers$|^printer$|طابعة", 3000)) {
      await waitForText(page, "printer|Printer|طابعة", 4000);
      await s("48_printers", "printer|Printer|طابعة");
      await page.keyboard.press("Escape"); await wait(500);
    }
    if (await clickText(page, "subscription|Subscription|plan|Plan|اشتراك", 2500)) {
      await waitForText(page, "plan|Plan|trial|subscribe", 4000);
      await s("49_subscription", "plan|Plan|trial|subscribe");
      await page.keyboard.press("Escape"); await wait(500);
    }

    // اللغة → العربية
    if (await clickText(page, "^language$|^Language$|^لغة$", 3000)) {
      await waitForText(page, "English|Arabic|German", 4000);
      await s("50_language_menu", "English|Arabic|German");
      await clickText(page, "arabic|Arabic|العربية|SA", 3000);
      await waitForText(page, "منتجات|طلبات|تقارير|المزيد|POS", 6000);
      await hideAllOverlays(page); await wait(800);
      await s("51_arabic_rtl_settings", "منتجات|طلبات|المزيد|POS");
      await clickTab(page, "POS|نقطة البيع", "CHF|USD|EUR|منتج|Product", Z);
      await s("52_arabic_pos", "CHF|USD|EUR|Cart|سلة");
      await clickTab(page, "منتجات|Products", "CHF|USD|EUR|منتج", Z);
      await s("53_arabic_products", "CHF|USD|EUR|منتج|Product");
      await clickTab(page, "تقارير|Reports", "total|Total|مبيعات|sales", Z);
      await s("54_arabic_reports", "total|Total|مبيعات");
      await clickTab(page, "المزيد|More", "settings|الإعدادات|employees", Z);
      await s("55_arabic_more_menu", "الإعدادات|settings|employees");
      // استعادة الإنجليزية
      await clickText(page, "الإعدادات|settings|Settings", 3000); await wait(1200);
      await clickText(page, "language|لغة|Language", 3000); await wait(600);
      await clickText(page, "english|English|الإنجليزية|GB", 3000);
      await waitForText(page, "Products|Customers|Reports|More", 5000);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 11 — Cashier login
    // ──────────────────────────────────────────────────────────────────────────
    console.log("\n── CASHIER");
    await nav(`${APP_URL}/login`);
    await waitForText(page, "Cashier|cashier|كاشير", 12000);
    await s("56_login_cashier_screen", "Cashier|cashier|كاشير");
    await clickText(page, "cashier lemon|cashier", 8000);
    await waitForText(page, "Enter PIN|PIN|pin", 6000);
    await wait(800);
    await s("57_cashier_pin_pad", "Enter PIN|Cashier");
    await enterPin(page, CASHIER_PIN);
    await handleShiftModal(page, vp, outDir);
    await waitForText(page, "POS|Products|CHF|Cart", 10000);
    await s("58_cashier_pos_screen", "POS|Products|CHF|Cart");

    for (let i = 0; i < 2; i++) {
      const c = await page.evaluate(idx => {
        const els = Array.from(document.querySelectorAll("*")).filter(el => {
          if (!el.offsetParent) return false;
          const r = el.getBoundingClientRect();
          return r.width > 60 && r.height > 50 && /CHF|USD|EUR/.test(el.textContent || "");
        });
        const t = els[idx + 2];
        if (!t) return null;
        t.scrollIntoView({ block: "nearest" });
        const r = t.getBoundingClientRect();
        return { x: r.left + r.width/2, y: r.top + r.height/2 };
      }, i);
      if (c) { await page.mouse.click(c.x, c.y); await wait(600); }
    }
    await waitForText(page, "Subtotal|Total|CHF", 4000);
    await s("59_cashier_cart", "Subtotal|Total|CHF");
    await clickText(page, "^checkout$|الدفع", 5000);
    await waitForText(page, "cash|Cash|payment|Payment|نقد", 6000);
    await s("60_cashier_checkout", "cash|Cash|payment|Payment");
    await page.keyboard.press("Escape"); await wait(500);

    console.log(`\n  ✅ ${vp.name.toUpperCase()} — اكتمل`);

  } catch(err) {
    console.error(`\n  ❌ (${vp.name}): ${err.message}`);
    // صورة خطأ طارئة
    try {
      const errFile = path.join(outDir, "ZZ_error.png");
      await page.screenshot({ path: errFile, fullPage: false });
      const sz = getPNGSize(errFile);
      console.log(`  📸 ZZ_error.png  ${sz ? sz.width+"×"+sz.height : "(unknown size)"}`);
    } catch(_) {}
  }

  await page.close().catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────
// الدالة الرئيسية
// ─────────────────────────────────────────────────────────────────────────────
(async () => {
  console.log("╔══════════════════════════════════════════════════════════════════╗");
  console.log("║         Barmagly POS — Local Screenshot Capture  (v3)          ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝");

  try { await startServers(); }
  catch(e) {
    console.error("\n❌ فشل تشغيل الخوادم:", e.message);
    console.log("   شغّل الخوادم يدوياً ثم أعِد تشغيل السكربت.");
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: false,
    args: [
      "--no-sandbox",
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process",
      "--disable-notifications",
      "--lang=en-US,en",
    ],
    defaultViewport: null,
  });

  for (const vp of VIEWPORTS) {
    await runViewport(browser, vp);
  }

  await browser.close().catch(() => {});

  // ── ملخص ──────────────────────────────────────────────────────────────────
  console.log("\n════════════════════════════════════════════════════════════════════");
  console.log("  📁 النتائج:");
  let totalOk = 0, totalBad = 0;
  for (const vp of VIEWPORTS) {
    const dir  = path.join(OUT_BASE, vp.name);
    const imgs = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith(".png")) : [];
    let ok = 0, bad = 0;
    for (const f of imgs) {
      const sz = getPNGSize(path.join(dir, f));
      if (sz && sz.width === vp.outW && sz.height === vp.outH) ok++;
      else bad++;
    }
    totalOk += ok; totalBad += bad;
    console.log(`  • ${vp.name.padEnd(10)} → ${imgs.length} صورة  ✓${ok} ✗${bad}  (${vp.outW}×${vp.outH})  ${dir}`);
  }
  console.log(`\n  الإجمالي: ${totalOk + totalBad} صورة  —  صحيح: ${totalOk}  —  خاطئ المقاس: ${totalBad}`);
  console.log("\n🎉 انتهى!\n");
})();
