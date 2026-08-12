/**
 * Kassenta marketing site — design tokens and component CSS.
 *
 * Light is the default palette; `[data-theme="dark"]` re-binds the same tokens,
 * so no component rule ever hard-codes a colour. Every value that changes
 * between themes lives in this one block.
 */
export const SITE_CSS = String.raw`
:root {
  color-scheme: light;

  --navy: #040E32;
  --teal: #00C1B0;
  --teal-deep: #0C8F85;

  --bg: #FFFFFF;
  --bg-alt: #F5F8FC;
  --bg-inset: #EEF3F9;
  --surface: #FFFFFF;
  --surface-2: #F8FAFD;
  --border: #E1E8F0;
  --border-strong: #CBD6E3;

  --text: #0B1220;
  --text-2: #46566C;
  --text-3: #6B7B90;

  --accent: #0C8F85;
  --accent-ink: #FFFFFF;
  --accent-soft: #E6F6F4;
  --accent-line: #B7E3DE;

  --gold: #B7791F;
  --danger: #C2321F;
  --ok: #047857;

  --shadow-sm: 0 1px 2px rgba(11, 18, 32, .06), 0 1px 3px rgba(11, 18, 32, .04);
  --shadow-md: 0 4px 12px rgba(11, 18, 32, .07), 0 2px 4px rgba(11, 18, 32, .04);
  --shadow-lg: 0 18px 48px rgba(11, 18, 32, .10), 0 4px 12px rgba(11, 18, 32, .05);

  --radius: 14px;
  --radius-sm: 9px;
  --radius-lg: 22px;
  --maxw: 1180px;
  --nav-h: 68px;

  --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --font-ar: 'Noto Kufi Arabic', 'Inter', sans-serif;
  --ease: cubic-bezier(.4, 0, .2, 1);
}

[data-theme="dark"] {
  color-scheme: dark;

  --bg: #040E32;
  --bg-alt: #071444;
  --bg-inset: #0A1A4D;
  --surface: #0D1A44;
  --surface-2: #12224F;
  --border: #22305C;
  --border-strong: #2E3E6E;

  --text: #FFFFFF;
  --text-2: #B9C3D8;
  --text-3: #8A94AD;

  --accent: #00C1B0;
  --accent-ink: #04121F;
  --accent-soft: rgba(0, 193, 176, .10);
  --accent-line: rgba(0, 193, 176, .28);

  --gold: #F0B429;
  --danger: #F87171;
  --ok: #34D399;

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, .40);
  --shadow-md: 0 6px 18px rgba(0, 0, 0, .45);
  --shadow-lg: 0 22px 60px rgba(0, 0, 0, .55);
}

*, *::before, *::after { box-sizing: border-box; }
* { margin: 0; padding: 0; }

html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; scroll-padding-top: calc(var(--nav-h) + 16px); }
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
}

body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--text);
  line-height: 1.65;
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
  transition: background-color .25s var(--ease), color .25s var(--ease);
}
html[dir="rtl"] body { font-family: var(--font-ar); }

img, svg, video { max-width: 100%; height: auto; display: block; }
a { color: inherit; text-decoration: none; }
button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; border-radius: 4px; }

/* ── Layout ─────────────────────────────────────────────────────────────── */
.wrap { width: 100%; max-width: var(--maxw); margin-inline: auto; padding-inline: 24px; }
.section { padding: 88px 0; }
.section--tight { padding: 60px 0; }
.section--alt { background: var(--bg-alt); }
.section--inset { background: var(--bg-inset); }
@media (max-width: 720px) {
  .section { padding: 56px 0; }
  .wrap { padding-inline: 18px; }
}

.grid { display: grid; gap: 24px; }
.grid-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.grid-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
@media (max-width: 980px) { .grid-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); } .grid-3 { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 700px) { .grid-2, .grid-3, .grid-4 { grid-template-columns: minmax(0, 1fr); } }

.split { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 56px; align-items: center; }
.split--wide-left { grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr); }
@media (max-width: 900px) { .split, .split--wide-left { grid-template-columns: minmax(0, 1fr); gap: 32px; } }

/* ── Type ───────────────────────────────────────────────────────────────── */
h1, h2, h3, h4 { line-height: 1.18; letter-spacing: -.02em; font-weight: 800; }
h1 { font-size: clamp(2.1rem, 1.3rem + 3.2vw, 3.8rem); letter-spacing: -.03em; }
h2 { font-size: clamp(1.6rem, 1.1rem + 2vw, 2.6rem); }
h3 { font-size: clamp(1.12rem, 1rem + .5vw, 1.35rem); }
h4 { font-size: 1rem; }
p { color: var(--text-2); }
.lead { font-size: clamp(1.02rem, .96rem + .35vw, 1.2rem); color: var(--text-2); max-width: 62ch; }
.eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: .74rem; font-weight: 800; letter-spacing: .13em; text-transform: uppercase;
  color: var(--accent); margin-bottom: 14px;
}
.eyebrow::before { content: ""; width: 22px; height: 2px; background: var(--accent); border-radius: 2px; }
.section-head { max-width: 720px; margin-bottom: 44px; }
.section-head--center { margin-inline: auto; text-align: center; }
.section-head--center .eyebrow { justify-content: center; }
.section-head p { margin-top: 14px; }
.muted { color: var(--text-3); }
.nowrap { white-space: nowrap; }

/* ── Buttons ────────────────────────────────────────────────────────────── */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 9px;
  padding: 13px 24px; border-radius: 11px; font-weight: 700; font-size: .94rem;
  border: 1px solid transparent; transition: transform .18s var(--ease), box-shadow .18s var(--ease), background-color .18s var(--ease), border-color .18s var(--ease);
  white-space: nowrap;
}
.btn svg { width: 17px; height: 17px; flex: none; }
.btn:hover { transform: translateY(-1px); }
.btn:active { transform: translateY(0); }
.btn-primary { background: var(--accent); color: var(--accent-ink); box-shadow: var(--shadow-md); }
.btn-primary:hover { box-shadow: var(--shadow-lg); }
.btn-ghost { background: var(--surface); color: var(--text); border-color: var(--border-strong); }
.btn-ghost:hover { border-color: var(--accent); color: var(--accent); }
.btn-quiet { padding-inline: 4px; color: var(--accent); }
.btn-quiet:hover { text-decoration: underline; text-underline-offset: 4px; }
.btn-row { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }
@media (max-width: 480px) { .btn { width: 100%; } .btn-row { flex-direction: column; } }

/* ── Cards ──────────────────────────────────────────────────────────────── */
.card {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 26px; box-shadow: var(--shadow-sm);
  transition: transform .22s var(--ease), box-shadow .22s var(--ease), border-color .22s var(--ease);
}
.card--hover:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); border-color: var(--accent-line); }
.card h3 { margin-bottom: 8px; }
.card p { font-size: .93rem; }
.card-icon {
  width: 42px; height: 42px; border-radius: 11px; display: grid; place-items: center;
  background: var(--accent-soft); color: var(--accent); margin-bottom: 16px; border: 1px solid var(--accent-line);
}
.card-icon svg { width: 21px; height: 21px; }

.badge {
  display: inline-flex; align-items: center; gap: 6px; padding: 4px 11px; border-radius: 100px;
  font-size: .72rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
  background: var(--accent-soft); color: var(--accent); border: 1px solid var(--accent-line);
}
.badge--neutral { background: var(--bg-inset); color: var(--text-2); border-color: var(--border); }

.tick-list { list-style: none; display: grid; gap: 11px; }
.tick-list li { display: flex; gap: 11px; align-items: flex-start; font-size: .94rem; color: var(--text-2); }
.tick-list svg { width: 19px; height: 19px; flex: none; color: var(--accent); margin-top: 2px; }

/* ── Image slots ────────────────────────────────────────────────────────── */
.shot {
  position: relative; border-radius: var(--radius-lg); overflow: hidden;
  border: 1px solid var(--border); background: var(--surface-2); box-shadow: var(--shadow-lg);
  aspect-ratio: var(--ar, 16 / 10);
}
.shot img { width: 100%; height: 100%; object-fit: cover; }
.shot--contain img { object-fit: contain; padding: 6%; }
/* Cut-out artwork: no frame, so the transparent background picks up the section. */
.shot--bare { border: 0; background: transparent; box-shadow: none; border-radius: 0; }
.shot--bare img { object-fit: contain; }
.shot-ph {
  display: none; position: absolute; inset: 0; flex-direction: column; gap: 6px;
  align-items: center; justify-content: center; text-align: center; padding: 20px;
  background:
    repeating-linear-gradient(45deg, transparent, transparent 12px, var(--bg-inset) 12px, var(--bg-inset) 24px),
    var(--surface-2);
  color: var(--text-3);
}
.shot.is-empty img { visibility: hidden; }
.shot.is-empty .shot-ph { display: flex; }
.shot-ph b { font-size: .84rem; font-weight: 800; color: var(--text-2); letter-spacing: .02em; }
.shot-ph small { font-size: .72rem; font-variant-numeric: tabular-nums; }
.shot-caption { margin-top: 10px; font-size: .78rem; color: var(--text-3); text-align: center; }

/* ── Navigation ─────────────────────────────────────────────────────────── */
.nav {
  position: sticky; top: 0; z-index: 900; height: var(--nav-h);
  background: color-mix(in srgb, var(--bg) 88%, transparent);
  backdrop-filter: saturate(180%) blur(14px);
  -webkit-backdrop-filter: saturate(180%) blur(14px);
  border-bottom: 1px solid transparent; transition: border-color .2s var(--ease), box-shadow .2s var(--ease);
}
.nav.scrolled { border-bottom-color: var(--border); box-shadow: var(--shadow-sm); }
.nav-inner { height: 100%; display: flex; align-items: center; gap: 18px; }
.brand { display: flex; align-items: center; gap: 10px; flex: none; }
.brand img { height: 30px; width: auto; }
.brand-name { font-weight: 800; font-size: 1.06rem; letter-spacing: -.02em; }
.nav-links { display: flex; align-items: center; gap: 4px; margin-inline-start: 14px; flex: 1 1 auto; }
.nav-links a {
  padding: 8px 13px; border-radius: 9px; font-size: .91rem; font-weight: 600; color: var(--text-2);
  transition: background-color .16s var(--ease), color .16s var(--ease);
}
.nav-links a:hover { background: var(--bg-inset); color: var(--text); }
.nav-links a[aria-current="page"] { color: var(--accent); background: var(--accent-soft); }
.nav-actions { display: flex; align-items: center; gap: 8px; flex: none; }

.icon-btn {
  width: 38px; height: 38px; border-radius: 10px; display: grid; place-items: center;
  border: 1px solid var(--border); background: var(--surface); color: var(--text-2);
  transition: border-color .16s var(--ease), color .16s var(--ease), background-color .16s var(--ease);
}
.icon-btn:hover { border-color: var(--accent); color: var(--accent); }
.icon-btn svg { width: 18px; height: 18px; }
.theme-btn .i-moon { display: none; }
[data-theme="dark"] .theme-btn .i-sun { display: none; }
[data-theme="dark"] .theme-btn .i-moon { display: block; }

.lang { position: relative; }
.lang-btn { display: flex; align-items: center; gap: 7px; height: 38px; padding: 0 12px; border-radius: 10px; border: 1px solid var(--border); background: var(--surface); font-size: .84rem; font-weight: 700; color: var(--text-2); }
.lang-btn:hover { border-color: var(--accent); color: var(--accent); }
.lang-menu {
  position: absolute; inset-inline-end: 0; top: calc(100% + 8px); min-width: 156px; padding: 6px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 12px; box-shadow: var(--shadow-lg);
  opacity: 0; visibility: hidden; transform: translateY(-6px); transition: all .18s var(--ease); z-index: 950;
}
.lang.open .lang-menu { opacity: 1; visibility: visible; transform: translateY(0); }
.lang-menu button { display: flex; width: 100%; align-items: center; gap: 10px; padding: 9px 11px; border-radius: 8px; font-size: .88rem; font-weight: 600; color: var(--text-2); text-align: start; }
.lang-menu button:hover { background: var(--bg-inset); color: var(--text); }
.lang-menu button.active { color: var(--accent); background: var(--accent-soft); }
.lang-menu .flag { width: 20px; height: 14px; border-radius: 2px; flex: none; overflow: hidden; box-shadow: 0 0 0 1px rgba(0,0,0,.08); }

.nav-toggle { display: none; }
.cta-mobile { display: none; }
@media (max-width: 1040px) {
  .nav-toggle { display: grid; }
  .nav-links {
    position: fixed; inset: var(--nav-h) 0 auto 0; flex-direction: column; align-items: stretch; gap: 2px;
    background: var(--bg); border-bottom: 1px solid var(--border); padding: 14px 18px 20px;
    box-shadow: var(--shadow-lg); display: none; margin: 0; max-height: calc(100dvh - var(--nav-h)); overflow-y: auto;
  }
  .nav-links.open { display: flex; }
  .nav-links a { padding: 12px 14px; font-size: .98rem; }
  .nav .cta-desktop { display: none; }
  .nav-links .cta-mobile { display: inline-flex; }
}

/* ── Hero ───────────────────────────────────────────────────────────────── */
.hero { position: relative; padding: 84px 0 72px; overflow: hidden; }
.hero::before {
  content: ""; position: absolute; inset: -40% -20% auto -20%; height: 620px; pointer-events: none; z-index: 0;
  background:
    radial-gradient(ellipse 46% 44% at 26% 42%, color-mix(in srgb, var(--accent) 16%, transparent) 0%, transparent 66%),
    radial-gradient(ellipse 40% 40% at 78% 30%, color-mix(in srgb, var(--navy) 10%, transparent) 0%, transparent 62%);
}
[data-theme="dark"] .hero::before { background: radial-gradient(ellipse 46% 44% at 26% 42%, rgba(0,193,176,.14) 0%, transparent 66%), radial-gradient(ellipse 40% 40% at 78% 30%, rgba(99,102,241,.12) 0%, transparent 62%); }
.hero .wrap { position: relative; z-index: 1; }
.hero h1 { margin-bottom: 20px; }
.hero .lead { margin-bottom: 4px; }
.hero-meta { display: flex; flex-wrap: wrap; gap: 22px; margin-top: 30px; padding-top: 24px; border-top: 1px solid var(--border); }
.hero-meta div { min-width: 92px; }
.hero-meta b { display: block; font-size: 1.5rem; font-weight: 800; letter-spacing: -.02em; }
.hero-meta span { font-size: .78rem; color: var(--text-3); }

/* ── Page header (inner pages) ──────────────────────────────────────────── */
.page-head { padding: 62px 0 44px; border-bottom: 1px solid var(--border); background: var(--bg-alt); }
.page-head h1 { font-size: clamp(1.9rem, 1.3rem + 2.4vw, 3rem); margin-bottom: 14px; }
.crumbs { display: flex; gap: 8px; align-items: center; font-size: .8rem; color: var(--text-3); margin-bottom: 16px; }
.crumbs a:hover { color: var(--accent); }

/* ── Stats / logos ──────────────────────────────────────────────────────── */
.stat-strip { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 1px; background: var(--border); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
.stat-strip div { background: var(--surface); padding: 24px 20px; text-align: center; }
.stat-strip b { display: block; font-size: 1.85rem; font-weight: 800; letter-spacing: -.03em; color: var(--text); }
.stat-strip span { font-size: .8rem; color: var(--text-3); }
@media (max-width: 700px) { .stat-strip { grid-template-columns: repeat(2, minmax(0,1fr)); } }

/* ── Pricing ────────────────────────────────────────────────────────────── */
.price-card { display: flex; flex-direction: column; position: relative; }
.price-card.featured { border-color: var(--accent); box-shadow: var(--shadow-lg); }
.price-card .price { font-size: 2.5rem; font-weight: 800; letter-spacing: -.03em; margin: 12px 0 2px; }
.price-card .price small { font-size: .88rem; font-weight: 600; color: var(--text-3); letter-spacing: 0; }
.price-card .tick-list { margin: 20px 0 26px; }
.price-card .btn { margin-top: auto; width: 100%; }
.price-tag { position: absolute; inset-inline-end: 18px; top: -11px; }
.billing-toggle { display: inline-flex; padding: 4px; gap: 4px; border: 1px solid var(--border); background: var(--surface); border-radius: 100px; margin: 0 auto 36px; }
.billing-toggle button { padding: 8px 20px; border-radius: 100px; font-size: .86rem; font-weight: 700; color: var(--text-3); }
.billing-toggle button.active { background: var(--accent); color: var(--accent-ink); }

/* ── FAQ ────────────────────────────────────────────────────────────────── */
.faq { border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; background: var(--surface); }
.faq details { border-bottom: 1px solid var(--border); }
.faq details:last-child { border-bottom: 0; }
.faq summary { display: flex; justify-content: space-between; gap: 16px; align-items: center; padding: 19px 22px; font-weight: 700; font-size: .97rem; cursor: pointer; list-style: none; }
.faq summary::-webkit-details-marker { display: none; }
.faq summary::after { content: ""; width: 10px; height: 10px; flex: none; border-right: 2px solid var(--text-3); border-bottom: 2px solid var(--text-3); transform: rotate(45deg) translateY(-3px); transition: transform .2s var(--ease); }
.faq details[open] summary::after { transform: rotate(225deg) translateY(-3px); }
.faq details[open] summary { color: var(--accent); }
.faq .answer { padding: 0 22px 20px; font-size: .93rem; color: var(--text-2); }

/* ── Steps / timeline ───────────────────────────────────────────────────── */
.steps { counter-reset: step; display: grid; gap: 18px; }
.step { display: grid; grid-template-columns: 44px minmax(0,1fr); gap: 18px; align-items: start; }
.step::before {
  counter-increment: step; content: counter(step, decimal-leading-zero);
  width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center;
  background: var(--accent-soft); border: 1px solid var(--accent-line); color: var(--accent);
  font-weight: 800; font-size: .86rem; font-variant-numeric: tabular-nums;
}
.step h3 { margin-bottom: 5px; }
.step p { font-size: .93rem; }

/* ── Compliance table ───────────────────────────────────────────────────── */
.table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); -webkit-overflow-scrolling: touch; }
table { width: 100%; border-collapse: collapse; min-width: 620px; font-size: .9rem; }
th, td { padding: 14px 18px; text-align: start; border-bottom: 1px solid var(--border); }
th { background: var(--bg-inset); font-weight: 700; font-size: .78rem; letter-spacing: .06em; text-transform: uppercase; color: var(--text-2); }
tbody tr:last-child td { border-bottom: 0; }
td { color: var(--text-2); }
td strong { color: var(--text); font-weight: 700; }

/* ── CTA band ───────────────────────────────────────────────────────────── */
.cta-band { background: var(--navy); color: #fff; border-radius: var(--radius-lg); padding: 54px 44px; text-align: center; position: relative; overflow: hidden; }
.cta-band::after { content: ""; position: absolute; inset: auto -10% -60% -10%; height: 260px; background: radial-gradient(ellipse 50% 100% at 50% 100%, rgba(0,193,176,.30) 0%, transparent 70%); pointer-events: none; }
.cta-band h2, .cta-band p { color: #fff; position: relative; z-index: 1; }
.cta-band p { color: rgba(255,255,255,.76); margin: 14px auto 0; max-width: 56ch; }
.cta-band .btn-row { justify-content: center; position: relative; z-index: 1; }
.cta-band .btn-primary { background: var(--teal); color: #04121F; }
.cta-band .btn-ghost { background: transparent; color: #fff; border-color: rgba(255,255,255,.34); }
.cta-band .btn-ghost:hover { border-color: var(--teal); color: var(--teal); }
@media (max-width: 640px) { .cta-band { padding: 40px 22px; } }

/* ── Forms ──────────────────────────────────────────────────────────────── */
.field { display: grid; gap: 7px; }
.field label { font-size: .82rem; font-weight: 700; color: var(--text-2); }
.field input, .field select, .field textarea {
  width: 100%; padding: 12px 14px; border-radius: 10px; border: 1px solid var(--border-strong);
  background: var(--surface); color: var(--text); font: inherit; font-size: .93rem;
  transition: border-color .16s var(--ease), box-shadow .16s var(--ease);
}
.field textarea { min-height: 132px; resize: vertical; }
.field input:focus, .field select:focus, .field textarea:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.form-note { font-size: .8rem; color: var(--text-3); }
.form-status { padding: 12px 15px; border-radius: 10px; font-size: .88rem; font-weight: 600; display: none; }
.form-status.ok { display: block; background: var(--accent-soft); color: var(--ok); border: 1px solid var(--accent-line); }
.form-status.err { display: block; background: color-mix(in srgb, var(--danger) 10%, transparent); color: var(--danger); border: 1px solid color-mix(in srgb, var(--danger) 30%, transparent); }

/* ── Footer ─────────────────────────────────────────────────────────────── */
.footer { border-top: 1px solid var(--border); background: var(--bg-alt); padding: 56px 0 30px; margin-top: 0; }
.footer-grid { display: grid; grid-template-columns: 1.6fr repeat(3, 1fr); gap: 40px; }
@media (max-width: 860px) { .footer-grid { grid-template-columns: repeat(2, minmax(0,1fr)); gap: 30px; } }
@media (max-width: 480px) { .footer-grid { grid-template-columns: minmax(0,1fr); } }
.footer p { font-size: .88rem; max-width: 34ch; margin-top: 14px; }
.footer-col h4 { font-size: .76rem; letter-spacing: .1em; text-transform: uppercase; color: var(--text-3); margin-bottom: 14px; }
.footer-col a, .footer-col span { display: block; font-size: .89rem; color: var(--text-2); padding: 5px 0; }
.footer-col a:hover { color: var(--accent); }
.footer-bottom { display: flex; flex-wrap: wrap; gap: 14px; justify-content: space-between; align-items: center; margin-top: 44px; padding-top: 22px; border-top: 1px solid var(--border); font-size: .82rem; color: var(--text-3); }
.footer-legal { display: flex; flex-wrap: wrap; gap: 18px; }
.footer-maker {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px;
  margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border);
  font-size: .8rem; color: var(--text-3);
}
.footer-maker a { color: var(--accent); font-weight: 700; }
.footer-maker a:hover { text-decoration: underline; text-underline-offset: 3px; }
.footer-maker .uid {
  display: inline-flex; align-items: center; gap: 7px; margin-inline-start: auto;
  padding: 4px 11px; border-radius: 100px;
  background: var(--bg-inset); border: 1px solid var(--border);
  font-variant-numeric: tabular-nums;
}
.footer-maker .uid b { color: var(--text-2); font-weight: 700; letter-spacing: .01em; }
@media (max-width: 620px) { .footer-maker .uid { margin-inline-start: 0; } }

/* ── Reveal ─────────────────────────────────────────────────────────────── */
.reveal { opacity: 0; transform: translateY(16px); transition: opacity .55s var(--ease), transform .55s var(--ease); }
.reveal.visible { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) { .reveal { opacity: 1; transform: none; } }


/* ── Floating WhatsApp launcher ─────────────────────────────────────────────
   Self-contained: no third-party widget script, so it costs one button in the
   DOM instead of a ~200 KB embed that also phones home on every page view. */
.wa {
  position: fixed;
  inset-block-end: max(22px, env(safe-area-inset-bottom));
  inset-inline-end: max(22px, env(safe-area-inset-right));
  z-index: 880;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
  pointer-events: none;
}
html[dir="rtl"] .wa { align-items: flex-start; }

.wa-btn {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 0;
  height: 56px;
  padding: 0;
  width: 56px;
  border-radius: 100px;
  background: #25D366;
  color: #fff;
  border: 1px solid rgba(0, 0, 0, .06);
  box-shadow: 0 6px 20px rgba(37, 211, 102, .34), 0 2px 6px rgba(11, 18, 32, .16);
  overflow: hidden;
  white-space: nowrap;
  transition: width .3s var(--ease), gap .3s var(--ease), box-shadow .2s var(--ease), transform .2s var(--ease);
}
.wa-btn svg { width: 27px; height: 27px; flex: none; margin-inline: 14px; }
.wa-btn span {
  font-size: .92rem;
  font-weight: 700;
  letter-spacing: -.01em;
  opacity: 0;
  max-width: 0;
  transition: opacity .22s var(--ease), max-width .3s var(--ease);
}
.wa-btn:hover,
.wa-btn:focus-visible {
  width: auto;
  gap: 0;
  box-shadow: 0 10px 28px rgba(37, 211, 102, .42), 0 3px 8px rgba(11, 18, 32, .2);
  transform: translateY(-2px);
}
.wa-btn:hover span,
.wa-btn:focus-visible span { opacity: 1; max-width: 220px; padding-inline-end: 20px; }
.wa-btn:active { transform: translateY(0); }

/* A single, slow pulse the first time — enough to be noticed, not a strobe. */
.wa-btn::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: 0 0 0 0 rgba(37, 211, 102, .55);
  animation: wa-pulse 2.6s var(--ease) 1.5s 3;
  pointer-events: none;
}
@keyframes wa-pulse {
  0% { box-shadow: 0 0 0 0 rgba(37, 211, 102, .5); }
  70% { box-shadow: 0 0 0 16px rgba(37, 211, 102, 0); }
  100% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0); }
}
.wa-btn { position: relative; }

.wa-card {
  pointer-events: auto;
  position: relative;
  width: min(304px, calc(100vw - 44px));
  padding: 16px 18px 16px 16px;
  border-radius: 16px 16px 6px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  opacity: 0;
  transform: translateY(10px) scale(.97);
  transform-origin: bottom right;
  visibility: hidden;
  transition: opacity .26s var(--ease), transform .26s var(--ease), visibility .26s;
}
html[dir="rtl"] .wa-card { border-radius: 16px 16px 16px 6px; transform-origin: bottom left; }
.wa.open .wa-card { opacity: 1; transform: none; visibility: visible; }
.wa-card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.wa-avatar {
  width: 34px; height: 34px; border-radius: 50%; flex: none;
  display: grid; place-items: center; background: #25D366; color: #fff;
}
.wa-avatar svg { width: 19px; height: 19px; }
.wa-card b { display: block; font-size: .9rem; font-weight: 800; color: var(--text); line-height: 1.3; }
.wa-status { display: flex; align-items: center; gap: 5px; font-size: .74rem; color: var(--text-3); }
.wa-dot { width: 7px; height: 7px; border-radius: 50%; background: #25D366; flex: none; }
.wa-card p { font-size: .87rem; line-height: 1.55; margin: 0 0 14px; }
.wa-card .btn { width: 100%; padding: 10px 16px; font-size: .88rem; background: #25D366; color: #fff; box-shadow: none; }
.wa-card .btn:hover { background: #1eb85a; box-shadow: 0 6px 16px rgba(37, 211, 102, .3); }
.wa-close {
  position: absolute; top: 8px; inset-inline-end: 8px;
  width: 26px; height: 26px; border-radius: 8px; display: grid; place-items: center;
  color: var(--text-3);
}
.wa-close:hover { background: var(--bg-inset); color: var(--text); }
.wa-close svg { width: 14px; height: 14px; }

/* Keep the launcher out of the way of the collapsed navigation and the footer CTA. */
@media (max-width: 1040px) {
  .wa { inset-block-end: max(16px, env(safe-area-inset-bottom)); inset-inline-end: max(16px, env(safe-area-inset-right)); }
  .wa-btn { width: 52px; height: 52px; }
  .wa-btn svg { width: 25px; height: 25px; margin-inline: 13px; }
  .wa-btn:hover span, .wa-btn:focus-visible span { max-width: 0; opacity: 0; padding-inline-end: 0; }
  .wa-btn:hover, .wa-btn:focus-visible { width: 52px; }
}
/* Stand down while the collapsed navigation is open — the sheet covers the
   viewport and the launcher would sit on top of the menu items. */
body:has(.nav-links.open) .wa { opacity: 0; pointer-events: none; }

@media (prefers-reduced-motion: reduce) {
  .wa-btn::after { animation: none; }
  .wa-btn, .wa-card { transition: none; }
}

.skip-link { position: absolute; inset-inline-start: -9999px; top: 8px; z-index: 999; padding: 10px 16px; background: var(--accent); color: var(--accent-ink); border-radius: 8px; font-weight: 700; }
.skip-link:focus { inset-inline-start: 12px; }
`;
