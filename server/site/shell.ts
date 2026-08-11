import { createHash } from "crypto";
import { SITE_CSS } from "./design";

export type Lang = "en" | "de" | "ar";

/** Text in all three languages. `en` is the literal HTML content (what crawlers index). */
export interface T3 {
  en: string;
  de: string;
  ar: string;
}

export const DEFAULT_LANG: Lang = "en";

/**
 * Public URL for a site route. Pages are emitted as `<slug>/index.html`, so the
 * trailing slash lets Apache serve the file with no redirect hop; Express
 * normalises both forms, so either one works.
 */
export function href(routePath: string): string {
  return routePath === "/" ? "/" : `${routePath}/`;
}

/**
 * The stylesheet and script are served as separate, content-hashed assets with
 * an immutable cache header. Inlining them would add ~18 KB to every page of a
 * seven-page site; as external files they are fetched once and reused across
 * the whole visit, and the hash makes cache-busting automatic on deploy.
 */
const hash8 = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 8);

export interface SiteAsset {
  url: string;
  body: string;
  contentType: string;
}

let assetCache: { css: SiteAsset; js: SiteAsset } | null = null;

/** Built once on first render; SITE_JS is declared below, so this must stay lazy. */
export function siteAssets(): { css: SiteAsset; js: SiteAsset } {
  if (!assetCache) {
    assetCache = {
      css: { url: `/assets/site.${hash8(SITE_CSS)}.css`, body: SITE_CSS, contentType: "text/css; charset=utf-8" },
      js: { url: `/assets/site.${hash8(SITE_JS)}.js`, body: SITE_JS, contentType: "application/javascript; charset=utf-8" },
    };
  }
  return assetCache;
}

/** Resolves a request path to a site asset, or null when it is not one of ours. */
export function findSiteAsset(pathname: string): SiteAsset | null {
  const { css, js } = siteAssets();
  if (pathname === css.url) return css;
  if (pathname === js.url) return js;
  return null;
}

/** Renders a translatable text node: English inline, other locales as data-attributes. */
export function t(v: T3, tag = "span", attrs = ""): string {
  return `<${tag} data-en="${esc(v.en)}" data-de="${esc(v.de)}" data-ar="${esc(v.ar)}"${attrs ? " " + attrs : ""}>${esc(v.en)}</${tag}>`;
}

/** Same as `t()` but emits only the attributes, for use on an existing element. */
export function tAttrs(v: T3): string {
  return `data-en="${esc(v.en)}" data-de="${esc(v.de)}" data-ar="${esc(v.ar)}"`;
}

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Icons (inline SVG, currentColor) ────────────────────────────────────────
// Stroke-based 24px grid, matching the app's Ionicons weight. No emoji anywhere
// on the site: emoji render differently per platform and read as informal.
const I = (d: string, extra = "") =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${d}</svg>`;

export const icons = {
  check: I(`<polyline points="20 6 9 17 4 12"/>`),
  arrowRight: I(`<line x1="4" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/>`),
  sun: I(`<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>`, ` class="i-sun"`),
  moon: I(`<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>`, ` class="i-moon"`),
  menu: I(`<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>`),
  globe: I(`<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18z"/>`),
  register: I(`<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M7 8V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3M7 13h4M7 16h2"/>`),
  chart: I(`<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>`),
  truck: I(`<path d="M2 7h11v9H2zM13 10h4l4 3.2V16h-8z"/><circle cx="6.5" cy="18.5" r="1.6"/><circle cx="17" cy="18.5" r="1.6"/>`),
  phone: I(`<path d="M5 3h3l2 5-2.2 1.3a12 12 0 0 0 5.9 5.9L15 13l5 2v3a2 2 0 0 1-2.2 2A17 17 0 0 1 3 5.2 2 2 0 0 1 5 3z"/>`),
  shield: I(`<path d="M12 3l7 3v6c0 4.6-3 8-7 9-4-1-7-4.4-7-9V6z"/><polyline points="9 12 11.2 14.2 15.5 9.9"/>`),
  cloud: I(`<path d="M7 18h9.5a3.5 3.5 0 0 0 .4-7A5.5 5.5 0 0 0 6.3 9.6 4.2 4.2 0 0 0 7 18z"/>`),
  users: I(`<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.3a3.2 3.2 0 0 1 0 6.4M17.5 20a5.6 5.6 0 0 0-2-4.3"/>`),
  box: I(`<path d="M12 3l8 4.2v9.6L12 21l-8-4.2V7.2z"/><path d="M4 7.2l8 4.2 8-4.2M12 11.4V21"/>`),
  tag: I(`<path d="M3 12.5V4a1 1 0 0 1 1-1h8.5L21 11.5 12.5 20z"/><circle cx="7.5" cy="7.5" r="1.3"/>`),
  clock: I(`<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>`),
  layers: I(`<path d="M12 3l9 4.5-9 4.5-9-4.5z"/><path d="M3 12.5l9 4.5 9-4.5M3 17l9 4.5 9-4.5"/>`),
  printer: I(`<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="7" rx="2"/><rect x="7" y="14" width="10" height="7" rx="1"/>`),
  wifiOff: I(`<path d="M2 8.8A16 16 0 0 1 8 5.4M22 8.8a16 16 0 0 0-5.4-3.2M5.5 12.6A11 11 0 0 1 9 10.6M18.5 12.6a11 11 0 0 0-2.6-1.6M8.8 16.3a6 6 0 0 1 6.4 0"/><circle cx="12" cy="20" r="1"/><line x1="3" y1="3" x2="21" y2="21"/>`),
  lock: I(`<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>`),
  scale: I(`<path d="M12 3v18M7 21h10M6 7l-3 6h6zM18 7l-3 6h6zM4 7h16"/>`),
  pill: I(`<rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-45 12 12)"/><line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/>`),
  cart: I(`<circle cx="9.5" cy="19" r="1.5"/><circle cx="17.5" cy="19" r="1.5"/><path d="M2 3h2.2l2.6 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.5L20 7H6"/>`),
  coffee: I(`<path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M17 9.5h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M7 2.5v2M11 2.5v2"/>`),
  mail: I(`<rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3.5 6.5 12 12.8 20.5 6.5"/>`),
  pin: I(`<path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>`),
  building: I(`<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>`),
  puzzle: I(`<path d="M10 4h4v2.2a1.8 1.8 0 1 0 3.6 0V4H20v4h-2.2a1.8 1.8 0 1 0 0 3.6H20V20h-4v-2.2a1.8 1.8 0 1 0-3.6 0V20H4v-4h2.2a1.8 1.8 0 1 0 0-3.6H4V8h6z"/>`),
  refresh: I(`<path d="M20 11A8 8 0 0 0 6.3 6.3L4 8.5"/><polyline points="4 4 4 8.5 8.5 8.5"/><path d="M4 13a8 8 0 0 0 13.7 4.7L20 15.5"/><polyline points="20 20 20 15.5 15.5 15.5"/>`),
  qr: I(`<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20h1"/>`),
  bell: I(`<path d="M18 15V10a6 6 0 0 0-12 0v5l-1.6 2.4h15.2z"/><path d="M10 20a2 2 0 0 0 4 0"/>`),
  key: I(`<circle cx="8" cy="14" r="4"/><path d="M11 11.5L20 3M17 5.5l2 2M15.5 7l1.5 1.5"/>`),
};

// ── Site map ────────────────────────────────────────────────────────────────
export interface NavEntry {
  path: string;
  label: T3;
}

export const NAV: NavEntry[] = [
  { path: "/features", label: { en: "Features", de: "Funktionen", ar: "المميزات" } },
  { path: "/solutions", label: { en: "Industries", de: "Branchen", ar: "المجالات" } },
  { path: "/pricing", label: { en: "Pricing", de: "Preise", ar: "الأسعار" } },
  { path: "/compliance", label: { en: "Compliance", de: "Compliance", ar: "الامتثال" } },
  { path: "/about", label: { en: "About", de: "Über uns", ar: "من نحن" } },
  { path: "/contact", label: { en: "Contact", de: "Kontakt", ar: "تواصل معنا" } },
];

const FLAGS: Record<Lang, string> = {
  en: `<svg class="flag" viewBox="0 0 60 30"><clipPath id="fen"><path d="M0 0h60v30H0z"/></clipPath><g clip-path="url(#fen)"><path d="M0 0h60v30H0z" fill="#012169"/><path d="M0 0l60 30m0-30L0 30" stroke="#fff" stroke-width="6"/><path d="M0 0l60 30m0-30L0 30" stroke="#C8102E" stroke-width="4"/><path d="M30 0v30M0 15h60" stroke="#fff" stroke-width="10"/><path d="M30 0v30M0 15h60" stroke="#C8102E" stroke-width="6"/></g></svg>`,
  de: `<svg class="flag" viewBox="0 0 5 3"><path fill="#000" d="M0 0h5v1H0z"/><path fill="#D00" d="M0 1h5v1H0z"/><path fill="#FFCE00" d="M0 2h5v1H0z"/></svg>`,
  ar: `<svg class="flag" viewBox="0 0 6 4"><path fill="#007A3D" d="M0 0h6v4H0z"/><path fill="#fff" d="M2 1.4h2.4v.5H2zM2 2.1h2.4v.5H2z"/></svg>`,
};

// ── Image slots ─────────────────────────────────────────────────────────────
export interface ImageSlot {
  /** File name under /brand/site/ (without extension) and the placeholder label. */
  id: string;
  alt: T3;
  /** CSS aspect-ratio value, e.g. "16 / 10". */
  ratio: string;
  /** Rendered pixel target, shown in the placeholder and used in the prompt sheet. */
  size: string;
  contain?: boolean;
  caption?: T3;
}

/**
 * Every image slot on the site. `docs/KASSENTA_IMAGE_PROMPTS.md` documents the
 * generation prompt for each id; dropping `<id>.webp` into public/brand/site/
 * makes it appear with no code change.
 */
export function shot(slot: ImageSlot): string {
  const src = `/brand/site/${slot.id}.webp`;
  // Starts in the placeholder state and clears it on load, so a lazy image far
  // down the page still shows a framed slot instead of blank space.
  return `<figure class="shot is-empty${slot.contain ? " shot--contain" : ""}" style="--ar:${slot.ratio}">
  <img src="${src}" alt="${esc(slot.alt.en)}" ${tAttrs(slot.alt).replace(/data-(en|de|ar)=/g, "data-alt-$1=")} loading="lazy" decoding="async"
       onload="this.closest('.shot').classList.remove('is-empty')" onerror="this.closest('.shot').classList.add('is-empty')">
  <figcaption class="shot-ph" dir="ltr"><b>${esc(slot.id)}</b><small>${esc(slot.size)}</small></figcaption>
</figure>${slot.caption ? `<p class="shot-caption" ${tAttrs(slot.caption)}>${esc(slot.caption.en)}</p>` : ""}`;
}

// ── Page shell ──────────────────────────────────────────────────────────────
export interface PageMeta {
  path: string;
  title: T3;
  description: T3;
  /** Optional JSON-LD blocks appended to <head>. */
  jsonLd?: object[];
}

export function renderPage(meta: PageMeta, body: string, baseUrl: string): string {
  const canonical = `${baseUrl}${meta.path === "/" ? "/" : href(meta.path)}`;
  const { css, js } = siteAssets();
  const navHtml = NAV.map(
    (n) =>
      `<a href="${href(n.path)}"${n.path === meta.path ? ' aria-current="page"' : ""} ${tAttrs(n.label)}>${esc(n.label.en)}</a>`
  ).join("\n        ");

  const langButtons = (["en", "de", "ar"] as Lang[])
    .map(
      (l) =>
        `<button type="button" role="menuitemradio" data-lang="${l}" onclick="Kassenta.setLang('${l}')">${FLAGS[l]}<span>${
          { en: "English", de: "Deutsch", ar: "العربية" }[l]
        }</span></button>`
    )
    .join("");

  const jsonLd = (meta.jsonLd ?? []).map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join("\n  ");

  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(meta.title.en)}</title>
  <meta name="description" content="${esc(meta.description.en)}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="theme-color" content="#FFFFFF" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#040E32" media="(prefers-color-scheme: dark)">
  <link rel="canonical" href="${canonical}">
  <link rel="alternate" hreflang="en" href="${canonical}?lang=en">
  <link rel="alternate" hreflang="de" href="${canonical}?lang=de">
  <link rel="alternate" hreflang="ar" href="${canonical}?lang=ar">
  <link rel="alternate" hreflang="x-default" href="${canonical}">
  <link rel="icon" href="/brand/favicon.ico" sizes="any">
  <link rel="icon" type="image/png" sizes="32x32" href="/brand/favicon-32.png">
  <link rel="apple-touch-icon" href="/brand/favicon-180.png">
  <link rel="manifest" href="/site.webmanifest">

  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Kassenta POS">
  <meta property="og:locale" content="en_US">
  <meta property="og:locale:alternate" content="de_CH">
  <meta property="og:locale:alternate" content="ar_EG">
  <meta property="og:title" content="${esc(meta.title.en)}">
  <meta property="og:description" content="${esc(meta.description.en)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${baseUrl}/brand/og-image.png">
  <meta name="twitter:card" content="summary_large_image">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Kufi+Arabic:wght@400;600;700&display=swap" media="print" onload="this.media='all'">
  <noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"></noscript>

  <link rel="preload" as="style" href="${css.url}">
  <link rel="stylesheet" href="${css.url}">
  <script>
    // Paint the stored theme/language before first render to avoid a flash.
    (function () {
      try {
        var th = localStorage.getItem('kassenta_theme');
        if (th !== 'dark' && th !== 'light') th = 'light';
        document.documentElement.setAttribute('data-theme', th);
        var lg = localStorage.getItem('kassenta_lang');
        if (lg === 'de' || lg === 'ar') {
          document.documentElement.lang = lg;
          document.documentElement.dir = lg === 'ar' ? 'rtl' : 'ltr';
        }
      } catch (e) { document.documentElement.setAttribute('data-theme', 'light'); }
    })();
  </script>
  ${jsonLd}
</head>
<body>
  <a class="skip-link" href="#main" ${tAttrs({ en: "Skip to content", de: "Zum Inhalt springen", ar: "تخطَّ إلى المحتوى" })}>Skip to content</a>

  <header class="nav" id="nav">
    <div class="wrap nav-inner">
      <a class="brand" href="/" aria-label="Kassenta POS — home">
        <img src="/brand/logo-mark.png" alt="" width="30" height="30">
        <span class="brand-name">Kassenta</span>
      </a>
      <nav class="nav-links" id="navLinks" aria-label="Main">
        ${navHtml}
        <a class="btn btn-primary cta-mobile" href="/contact/" style="margin-top:10px" ${tAttrs({ en: "Book a demo", de: "Demo buchen", ar: "احجز عرضًا" })}>Book a demo</a>
      </nav>
      <div class="nav-actions">
        <button class="icon-btn theme-btn" type="button" onclick="Kassenta.toggleTheme()" aria-label="Toggle colour theme">${icons.sun}${icons.moon}</button>
        <div class="lang" id="langWrap">
          <button class="lang-btn" type="button" onclick="Kassenta.toggleLangMenu(event)" aria-haspopup="true" aria-expanded="false">
            ${icons.globe}<span id="langLabel">EN</span>
          </button>
          <div class="lang-menu" role="menu">${langButtons}</div>
        </div>
        <a class="btn btn-primary cta-desktop" href="/contact/" ${tAttrs({ en: "Book a demo", de: "Demo buchen", ar: "احجز عرضًا" })}>Book a demo</a>
        <button class="icon-btn nav-toggle" type="button" onclick="Kassenta.toggleNav()" aria-label="Toggle navigation" aria-expanded="false">${icons.menu}</button>
      </div>
    </div>
  </header>

  <main id="main">
${body}
  </main>

  ${renderFooter()}

  <script src="${js.url}" defer></script>
</body>
</html>`;
}

function renderFooter(): string {
  const col = (title: T3, links: { href: string; label: T3; external?: boolean }[]) => `
        <div class="footer-col">
          <h4 ${tAttrs(title)}>${esc(title.en)}</h4>
          ${links
            .map(
              (l) =>
                `<a href="${l.href}"${l.external ? ' target="_blank" rel="noopener"' : ""} ${tAttrs(l.label)}>${esc(l.label.en)}</a>`
            )
            .join("\n          ")}
        </div>`;

  return `<footer class="footer">
    <div class="wrap">
      <div class="footer-grid">
        <div>
          <a class="brand" href="/"><img src="/brand/logo-mark.png" alt="" width="30" height="30"><span class="brand-name">Kassenta</span></a>
          <p ${tAttrs({
            en: "Point of sale, online ordering and delivery in one system. Built for Swiss and European hospitality and retail.",
            de: "Kasse, Online-Bestellung und Lieferung in einem System. Entwickelt für Gastronomie und Handel in der Schweiz und Europa.",
            ar: "نقطة بيع وطلب أونلاين وتوصيل في نظام واحد. مصمَّم لقطاع الضيافة والتجزئة في سويسرا وأوروبا.",
          })}>Point of sale, online ordering and delivery in one system. Built for Swiss and European hospitality and retail.</p>
        </div>
        ${col({ en: "Product", de: "Produkt", ar: "المنتج" }, [
          { href: "/features/", label: { en: "Features", de: "Funktionen", ar: "المميزات" } },
          { href: "/solutions/", label: { en: "Industries", de: "Branchen", ar: "المجالات" } },
          { href: "/pricing/", label: { en: "Pricing", de: "Preise", ar: "الأسعار" } },
          { href: "/compliance/", label: { en: "Compliance", de: "Compliance", ar: "الامتثال" } },
        ])}
        ${col({ en: "Company", de: "Unternehmen", ar: "الشركة" }, [
          { href: "/about/", label: { en: "About", de: "Über uns", ar: "من نحن" } },
          { href: "/contact/", label: { en: "Contact", de: "Kontakt", ar: "تواصل معنا" } },
          { href: "mailto:info@kassenta.com", label: { en: "info@kassenta.com", de: "info@kassenta.com", ar: "info@kassenta.com" } },
        ])}
        ${col({ en: "Access", de: "Zugang", ar: "الدخول" }, [
          { href: "/app", label: { en: "Open the POS", de: "Kasse öffnen", ar: "افتح نقطة البيع" } },
          { href: "/restaurants", label: { en: "Order online", de: "Online bestellen", ar: "اطلب أونلاين" } },
          { href: "/super_admin/login", label: { en: "Admin login", de: "Admin-Login", ar: "دخول المشرف" } },
        ])}
      </div>
      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} Kassenta POS. <span ${tAttrs({
          en: "All rights reserved.",
          de: "Alle Rechte vorbehalten.",
          ar: "جميع الحقوق محفوظة.",
        })}>All rights reserved.</span></span>
        <div class="footer-legal">
          <a href="/privacy" ${tAttrs({ en: "Privacy", de: "Datenschutz", ar: "الخصوصية" })}>Privacy</a>
          <a href="/terms/" ${tAttrs({ en: "Terms", de: "AGB", ar: "الشروط" })}>Terms</a>
          <a href="/imprint/" ${tAttrs({ en: "Imprint", de: "Impressum", ar: "بيانات الناشر" })}>Imprint</a>
          <a href="/delete-account" ${tAttrs({ en: "Delete account", de: "Konto löschen", ar: "حذف الحساب" })}>Delete account</a>
        </div>
      </div>
    </div>
  </footer>`;
}

const SITE_JS = String.raw`
window.Kassenta = (function () {
  var LANGS = { en: 'EN', de: 'DE', ar: 'AR' };
  var DIR = { en: 'ltr', de: 'ltr', ar: 'rtl' };
  var lang = 'en';

  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  function applyLang(l) {
    if (!LANGS[l]) l = 'en';
    lang = l;
    var root = document.documentElement;
    root.lang = l;
    root.dir = DIR[l];
    document.querySelectorAll('[data-' + l + ']').forEach(function (el) {
      var v = el.getAttribute('data-' + l);
      if (v !== null) el.textContent = v;
    });
    document.querySelectorAll('[data-alt-' + l + ']').forEach(function (el) {
      var v = el.getAttribute('data-alt-' + l);
      if (v !== null) el.setAttribute('alt', v);
    });
    var label = document.getElementById('langLabel');
    if (label) label.textContent = LANGS[l];
    document.querySelectorAll('.lang-menu button').forEach(function (b) {
      var on = b.dataset.lang === l;
      b.classList.toggle('active', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
  }

  function setLang(l) { store('kassenta_lang', l); applyLang(l); closeLangMenu(); }

  function applyTheme(mode) {
    document.documentElement.setAttribute('data-theme', mode);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', mode === 'dark' ? '#040E32' : '#FFFFFF');
  }
  function toggleTheme() {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    store('kassenta_theme', next);
    applyTheme(next);
  }

  function toggleNav() {
    var el = document.getElementById('navLinks');
    var btn = document.querySelector('.nav-toggle');
    var open = el.classList.toggle('open');
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function toggleLangMenu(e) {
    if (e) e.stopPropagation();
    var w = document.getElementById('langWrap');
    var open = w.classList.toggle('open');
    w.querySelector('.lang-btn').setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function closeLangMenu() {
    var w = document.getElementById('langWrap');
    if (!w) return;
    w.classList.remove('open');
    w.querySelector('.lang-btn').setAttribute('aria-expanded', 'false');
  }

  document.addEventListener('click', function (e) { if (!e.target.closest('.lang')) closeLangMenu(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLangMenu(); });

  var nav = document.getElementById('nav');
  var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 24); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('visible'); io.unobserve(en.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('visible'); });
  }

  // ?lang=de wins over the stored preference so hreflang links land on the
  // right language for a first-time visitor arriving from search.
  var urlLang = new URLSearchParams(location.search).get('lang');
  if (urlLang && LANGS[urlLang]) { store('kassenta_lang', urlLang); applyLang(urlLang); }
  else applyLang(read('kassenta_lang') || 'en');
  applyTheme(read('kassenta_theme') === 'dark' ? 'dark' : 'light');

  return { setLang: setLang, toggleTheme: toggleTheme, toggleNav: toggleNav, toggleLangMenu: toggleLangMenu };
})();
`;
