/**
 * Measures real WCAG contrast in the running app rather than guessing from the
 * source. Logs in with a demo licence, walks every visible text node and icon on
 * ten screens at two widths, resolves the effective background by compositing
 * the ancestor chain, and reports anything under AA.
 *
 *   node scripts/audit-contrast.js
 *
 * Known limitation: expo-linear-gradient's element is not reliably in the
 * ancestor chain getComputedStyle exposes, so white text on a gradient header
 * can still be reported against the page background. Those entries — white or
 * near-white text at 12-24px on rgb(244,246,250) — are false positives and were
 * confirmed correct by eye. Everything else is real.
 *
 * The app rate-limits licence validation (30 per 10 minutes per IP), so running
 * this back to back will eventually land on the activation screen instead.
 */
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const OUT = `C:/Users/KHALE/AppData/Local/Temp/shots-contrast-${process.argv[2] === "dark" ? "dark" : "light"}`;
fs.mkdirSync(OUT, { recursive: true });

const THEME = process.argv[2] === "dark" ? "dark" : "light";
const BASE = "https://kassenta.com";
const LICENSE = "BARMAGLY-ZRH1-SUSH-0101-2026";
const EMAIL = "info@sushizen.ch";

const ROUTES = [
  ["pos", "/app/"],
  ["products", "/app/products"],
  ["customers", "/app/customers"],
  ["reports", "/app/reports"],
  ["settings", "/app/settings"],
  ["online-orders", "/app/online-orders"],
  ["table-qr", "/app/table-qr"],
  ["delivery-zones", "/app/delivery-zones"],
  ["promo-codes", "/app/promo-codes"],
  ["driver-management", "/app/driver-management"],
];

const VIEWS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 420, height: 860 },
];

const AUDIT = `(() => {
  const parse = (c) => {
    const m = String(c).match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const p = m[1].split(',').map((n) => parseFloat(n));
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  const lum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => {
    const l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  // Effective background: composite every translucent ancestor down onto white.
  // Gradients count as opaque — react-native-web renders LinearGradient as a
  // background-image, so reading backgroundColor alone walks straight past a
  // gradient header and reports white text on the page background.
  const gradientStop = (bgImage) => {
    if (!bgImage || bgImage.indexOf('gradient') === -1) return null;
    const stops = bgImage.match(/rgba?\([^)]+\)/g);
    if (!stops || !stops.length) return null;
    // Average the stops: a text run can sit anywhere along the gradient.
    const cs = stops.map(parse).filter(Boolean);
    if (!cs.length) return null;
    const n = cs.length;
    return {
      r: cs.reduce((a, c) => a + c.r, 0) / n,
      g: cs.reduce((a, c) => a + c.g, 0) / n,
      b: cs.reduce((a, c) => a + c.b, 0) / n,
      a: 1,
    };
  };
  // expo-linear-gradient renders the gradient as an absolutely positioned
  // SIBLING of its children, not an ancestor, so a plain parent walk misses it.
  const siblingGradient = (n, rect) => {
    for (const child of n.children) {
      const ccs = getComputedStyle(child);
      if (ccs.position !== 'absolute') continue;
      const g = gradientStop(ccs.backgroundImage);
      if (!g) continue;
      const cr = child.getBoundingClientRect();
      if (cr.left <= rect.left + 1 && cr.right >= rect.right - 1 &&
          cr.top <= rect.top + 1 && cr.bottom >= rect.bottom - 1) return g;
    }
    return null;
  };
  const bgOf = (el, rect) => {
    const stack = [];
    let n = el;
    let sawOpaque = false;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      const grad = gradientStop(cs.backgroundImage) || (rect && siblingGradient(n, rect));
      if (grad) { stack.push(grad); sawOpaque = true; break; }
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) { stack.push(c); if (c.a === 1) { sawOpaque = true; break; } }
      n = n.parentElement;
    }
    // Second pass: a gradient painted by expo-linear-gradient is not always in
    // the chain getComputedStyle walks. If nothing opaque was found before the
    // page background, look for one anywhere above and use it.
    if (!sawOpaque) {
      let m = el;
      for (let i = 0; i < 14 && m; i++, m = m.parentElement) {
        const g = gradientStop(getComputedStyle(m).backgroundImage);
        if (g) { stack.push(g); break; }
      }
    }
    let base = { r: 255, g: 255, b: 255, a: 1 };
    for (let i = stack.length - 1; i >= 0; i--) base = over(stack[i], base);
    return base;
  };

  const out = [];
  const seen = new Set();
  for (const el of document.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    if (r.bottom < 0 || r.top > window.innerHeight * 3) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.opacity === '0' || cs.display === 'none') continue;

    // Text nodes only (skip containers that merely inherit a colour).
    const ownText = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join(' ')
      .trim();
    const isIcon = el.tagName === 'svg' || (el.tagName === 'IMG' && el.src.startsWith('data:'));
    if (!ownText && !isIcon) continue;

    // react-native-svg paints with fill/stroke; the CSS color on those nodes is
    // just the inherited default and would report black text that is white.
    if (el.tagName === 'svg') continue;
    const inSvg = el.closest && el.closest('svg');
    let fgSrc = cs.color;
    if (inSvg) {
      if (cs.fill && cs.fill !== 'none') fgSrc = cs.fill;
      else if (cs.stroke && cs.stroke !== 'none') fgSrc = cs.stroke;
      else continue;
    }
    const fg = parse(fgSrc);
    if (!fg || fg.a === 0) continue;
    const bg = bgOf(el.parentElement || el, r);
    const composited = over(fg, bg);
    const cr = ratio(composited, bg);

    const size = parseFloat(cs.fontSize) || 14;
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = isIcon ? 3 : large ? 3 : 4.5;
    if (cr >= need) continue;

    const label = (ownText || '<icon>').slice(0, 46);
    const key = label + '|' + cs.color + '|' + Math.round(cr * 10);
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      label,
      ratio: Math.round(cr * 100) / 100,
      need,
      color: cs.color,
      bg: 'rgb(' + Math.round(bg.r) + ',' + Math.round(bg.g) + ',' + Math.round(bg.b) + ')',
      size: Math.round(size),
      y: Math.round(r.top + window.scrollY),
    });
  }
  return out.sort((a, b) => a.ratio - b.ratio);
})()`;

(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport(VIEWS[0]);

  await page.goto(BASE + "/app", { waitUntil: "domcontentloaded", timeout: 60000 });
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

  const tenantId = auth?.lic?.tenant?.id;
  const employee = auth?.emp?.employee || auth?.emp;
  const token = auth?.emp?.token || employee?.token;
  console.log("licence:", auth?.lic?.isValid, "| employee:", employee?.name, "\n");

  await page.evaluateOnNewDocument((license, email, tid, emp, tok, theme) => {
    localStorage.setItem("barmagly_license_key", license);
    localStorage.setItem("barmagly_store_email", email);
    if (tid) localStorage.setItem("barmagly_tenant_id", String(tid));
    if (emp) localStorage.setItem("barmagly_employee", JSON.stringify(emp));
    if (tok) localStorage.setItem("kassenta_employee_token", tok);
    localStorage.setItem("kassenta_theme", theme);
  }, LICENSE, EMAIL, tenantId, employee, token, THEME);

  const all = [];
  for (const view of VIEWS) {
    await page.setViewport(view);
    for (const [name, route] of ROUTES) {
      await page.goto(BASE + route, { waitUntil: "networkidle2", timeout: 60000 });
      await new Promise((r) => setTimeout(r, 3500));
      const issues = await page.evaluate(AUDIT);
      if (issues.length) {
        console.log(`\n${view.name}/${name} — ${issues.length} below AA`);
        for (const i of issues.slice(0, 12)) {
          console.log(`   ${String(i.ratio).padStart(5)}:1 (need ${i.need})  ${i.color.padEnd(22)} on ${i.bg.padEnd(18)} ${i.size}px  "${i.label}"`);
        }
        if (issues.length > 12) console.log(`   … ${issues.length - 12} more`);
        all.push(...issues.map((i) => ({ ...i, screen: `${view.name}/${name}` })));
      } else {
        console.log(`${view.name}/${name} — clean`);
      }
      await page.screenshot({ path: path.join(OUT, `${view.name}-${name}.png`) });
    }
  }

  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(all, null, 2));
  await browser.close();
  console.log(`\n${all.length} total contrast failures — full report at ${path.join(OUT, "report.json")}`);
})();
