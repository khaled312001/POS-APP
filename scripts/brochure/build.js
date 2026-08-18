/**
 * Renders the Kassenta brochure to HTML and PDF, in English and German.
 *
 *   node scripts/brochure/build.js
 *
 * Output lands in docs/brochure/:
 *   kassenta-brochure-en.html / .pdf
 *   kassenta-brochure-de.html / .pdf
 *
 * Every screenshot is embedded as a data URI. A PDF that references files on
 * disk looks perfect on this machine and arrives broken everywhere else.
 */
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const { LINKS, meta, intro, sections, screens } = require("./content");
const ar = require("./content.ar");

// Arabic lives in its own file because it is right-to-left, but the renderer
// should not care. Graft it on under the `ar` key the same way `en` and `de`
// already sit on each object, and fail loudly on a gap rather than silently
// printing an English page inside an Arabic document.
meta.ar = ar.meta;
intro.ar = ar.intro;
for (const sec of sections) {
  if (!ar.sections[sec.id]) throw new Error(`content.ar.js: no section "${sec.id}"`);
  sec.ar = ar.sections[sec.id];
}
for (const scr of screens) {
  if (!ar.screens[scr.shot]) throw new Error(`content.ar.js: no screen "${scr.shot}"`);
  scr.ar = ar.screens[scr.shot];
}

const ROOT = path.resolve(__dirname, "..", "..");
const OUT = path.join(ROOT, "docs", "brochure");
const SHOTS = path.join(OUT, "shots");
const LOGO = path.join(ROOT, "play-store-release", "play-store-icon-512x512.png");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function dataUri(file) {
  if (!fs.existsSync(file)) return null;
  const ext = path.extname(file).slice(1).toLowerCase();
  const mime = ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`;
  return `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
}

const CSS = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --navy: #040E32;
  --navy-2: #0A1A4A;
  --teal: #00C1B0;
  --teal-dim: #2FD3C6;
  --ink: #10131C;
  --muted: #5A6478;
  --line: #E3E7EF;
  --paper: #FFFFFF;
  --wash: #F4F6FA;
}

html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body {
  font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  color: var(--ink);
  background: var(--paper);
  font-size: 10.5pt;
  line-height: 1.55;
}

.page {
  width: 210mm; height: 297mm;
  padding: 18mm 17mm 15mm;
  position: relative;
  page-break-after: always;
  overflow: hidden;
  background: var(--paper);
}
.page:last-child { page-break-after: auto; }

/* ── cover ─────────────────────────────────────────────────────────────── */
.cover {
  background: linear-gradient(160deg, var(--navy) 0%, #0B1F52 55%, #06284F 100%);
  color: #fff; padding: 0; display: flex; flex-direction: column;
}
.cover-top { padding: 20mm 17mm 0; }
.cover-logo { width: 26mm; height: 26mm; border-radius: 6mm; display: block; }
.cover h1 {
  font-size: 46pt; font-weight: 800; letter-spacing: -1.2px;
  margin-top: 7mm; line-height: 1.02;
}
.cover .tag { color: var(--teal); font-weight: 700; letter-spacing: 2.4px;
  font-size: 8.5pt; text-transform: uppercase; margin-top: 5mm; }
.cover .sub { font-size: 14pt; color: #C9D4E8; margin-top: 4mm; max-width: 135mm; line-height: 1.4; }
.cover-shot { margin: auto 0; padding: 0 15mm 16mm; width: 100%; }
.cover-shot img {
  width: 100%; display: block; margin: 0 auto;
  border-radius: 3mm;
  border: 1px solid rgba(255,255,255,.18);
  box-shadow: 0 5mm 18mm rgba(0,0,0,.5);
}
.cover-foot {
  position: absolute; bottom: 0; left: 0; right: 0; z-index: 2;
  /* Solid, not translucent: backdrop-filter silently drops out in headless
     print and takes the whole bar with it. */
  background: #030A22;
  border-top: 1px solid rgba(0,193,176,.35);
  padding: 5mm 17mm; display: flex; gap: 7mm; flex-wrap: wrap;
  font-size: 8.5pt; color: #B7C6DE;
}
.cover-foot b { color: var(--teal); font-weight: 700; }

/* ── generic page furniture ────────────────────────────────────────────── */
.head { display: flex; align-items: baseline; gap: 4mm; border-bottom: 2px solid var(--navy);
  padding-bottom: 3mm; margin-bottom: 7mm; }
.head .n { color: var(--teal); font-weight: 800; font-size: 9pt; letter-spacing: 1.5px; }
.head h2 { font-size: 17pt; font-weight: 800; letter-spacing: -.4px; }
.head .s { color: var(--muted); font-size: 9.5pt; margin-left: auto; }

.foot {
  position: absolute; left: 17mm; right: 17mm; bottom: 9mm;
  display: flex; justify-content: space-between; align-items: center;
  font-size: 7.5pt; color: var(--muted);
  border-top: 1px solid var(--line); padding-top: 2.5mm;
}
.foot .brand { font-weight: 700; color: var(--navy); letter-spacing: .4px; }

/* ── section divider ───────────────────────────────────────────────────── */
.divider {
  background: linear-gradient(150deg, var(--navy) 0%, #0B2154 100%);
  color: #fff; display: flex; flex-direction: column; justify-content: center;
}
.divider .big { font-size: 100pt; font-weight: 800; color: rgba(0,193,176,.22); line-height: .8; }
.divider h2 { font-size: 30pt; font-weight: 800; margin-top: 6mm; letter-spacing: -.8px; }
.divider p { color: #A9BAD6; font-size: 12pt; margin-top: 3mm; }
.divider .rule { width: 30mm; height: 3px; background: var(--teal); margin-top: 8mm; }

/* ── intro ─────────────────────────────────────────────────────────────── */
.lead { font-size: 12.5pt; line-height: 1.5; color: var(--ink); margin-bottom: 5mm; }
.body p { color: #333B4D; margin-bottom: 3.5mm; }
h3.mini { font-size: 8.5pt; letter-spacing: 1.8px; text-transform: uppercase;
  color: var(--teal); font-weight: 800; margin: 8mm 0 4mm; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
.card { border: 1px solid var(--line); border-radius: 2.5mm; padding: 4mm; background: var(--wash); }
.card b { display: block; font-size: 10.5pt; color: var(--navy); margin-bottom: 1mm; }
.card span { font-size: 9pt; color: var(--muted); line-height: 1.4; }
.plat { display: flex; gap: 4mm; margin-top: 3mm; }
.plat .card { flex: 1; background: #fff; border-color: var(--navy); }
.plat .card .url { font-size: 7.5pt; color: var(--teal); word-break: break-all; margin-top: 2mm; display: block; }

/* ── contents ──────────────────────────────────────────────────────────── */
.toc { column-count: 2; column-gap: 10mm; }
.toc .sec { break-inside: avoid; margin-bottom: 5mm; }
.toc .sec b { display: block; color: var(--navy); font-size: 10pt; border-bottom: 1px solid var(--line);
  padding-bottom: 1.5mm; margin-bottom: 1.5mm; }
.toc .sec b i { color: var(--teal); font-style: normal; margin-right: 2mm; }
.toc .row { display: flex; justify-content: space-between; font-size: 8.5pt; color: var(--muted); }

/* ── screen page ───────────────────────────────────────────────────────── */
.shot-wrap { border: 1px solid var(--line); border-radius: 2.5mm; overflow: hidden;
  background: var(--wash); box-shadow: 0 2mm 6mm rgba(4,14,50,.10); }
.shot-wrap img { width: 100%; display: block; }
.shot-land { margin-bottom: 6mm; }
.split { display: flex; gap: 7mm; align-items: flex-start; }
.split .shot-wrap { width: 62mm; flex: none; }
.split .txt { flex: 1; }

.desc { color: #333B4D; margin-bottom: 4mm; font-size: 10pt; }
ul.feat { list-style: none; }
ul.feat.feat-2 { column-count: 2; column-gap: 9mm; }
ul.feat.feat-2 li { break-inside: avoid; }
ul.feat li { position: relative; padding-left: 5mm; margin-bottom: 1.8mm; font-size: 9.5pt; color: #2A3245; }
ul.feat li::before { content: ""; position: absolute; left: 0; top: 1.7mm;
  width: 2mm; height: 2mm; border-radius: 50%; background: var(--teal); }

/* ── right to left ─────────────────────────────────────────────────────── */
body.rtl {
  direction: rtl;
  font-family: "Segoe UI", "Dubai", "Tahoma", "Arial Unicode MS", Arial, sans-serif;
  line-height: 1.85;
}
body.rtl .head .s { margin-left: 0; margin-right: auto; }
body.rtl ul.feat li { padding-left: 0; padding-right: 5mm; }
body.rtl ul.feat li::before { left: auto; right: 0; }
body.rtl .cover h1 { letter-spacing: 0; }
body.rtl .divider h2 { letter-spacing: 0; }
body.rtl .head h2 { letter-spacing: 0; }
body.rtl .split { flex-direction: row-reverse; }
/* Latin text inside an RTL paragraph reverses unless it is explicitly isolated. */
body.rtl .plat .card .url,
body.rtl .links .card .v,
body.rtl .cover-foot span,
body.rtl .foot span { direction: ltr; unicode-bidi: isolate; }
body.rtl .cover-foot,
body.rtl .foot { direction: rtl; }
body.rtl .links .card .k { text-align: right; }

/* ── links page ────────────────────────────────────────────────────────── */
.links .card { display: flex; align-items: center; gap: 4mm; margin-bottom: 4mm; background: #fff; }
.links .card .k { width: 34mm; flex: none; font-weight: 800; color: var(--navy); font-size: 10pt; }
.links .card .v { font-size: 9pt; color: var(--teal); word-break: break-all; }
.links .card .d { font-size: 8.5pt; color: var(--muted); }
`;

function page(inner, cls = "") {
  return `<section class="page ${cls}">${inner}</section>`;
}

function footer(t, label, n) {
  return `<div class="foot"><span class="brand">KASSENTA</span><span>${esc(label)}</span><span>${t.pageWord} ${n}</span></div>`;
}

function build(lang) {
  const t = meta[lang];
  const i = intro[lang];
  const logo = dataUri(LOGO);
  const cover = dataUri(path.join(SHOTS, "pos-sell-dark.png"));

  const used = screens.filter((s) => fs.existsSync(path.join(SHOTS, `${s.shot}.png`)));
  const skipped = screens.filter((s) => !fs.existsSync(path.join(SHOTS, `${s.shot}.png`)));

  // Pages are laid out as a list first and rendered second. Numbering them
  // while emitting HTML is what put "Page 4" on the third page and made every
  // contents entry point one page past its screen.
  const defs = [{ type: "cover" }, { type: "toc" }, { type: "intro" }];
  const bySectionPre = {};
  for (const s of used) (bySectionPre[s.section] ||= []).push(s);
  for (const sec of sections) {
    const list = bySectionPre[sec.id] || [];
    if (!list.length) continue;
    defs.push({ type: "divider", sec });
    for (const s of list) defs.push({ type: "screen", sec, screen: s });
  }
  defs.push({ type: "links" });

  // 1-based page number for each screen, so the contents can point at it.
  const pageOf = new Map();
  defs.forEach((d, idx) => { if (d.type === "screen") pageOf.set(d.screen.shot, idx + 1); });

  const out = [];

  // cover
  out.push(page(`
    <div class="cover-top">
      ${logo ? `<img class="cover-logo" src="${logo}" alt="">` : ""}
      <div class="tag">${esc(t.coverNote)}</div>
      <h1>${esc(t.title)}</h1>
      <div class="sub">${esc(t.subtitle)}</div>
    </div>
    <div class="cover-shot">${cover ? `<img src="${cover}" alt="">` : ""}</div>
    <div class="cover-foot">
      <span><b>Web</b> kassenta.com</span>
      <span><b>Desktop</b> kassenta.com/app</span>
      <span><b>Android</b> Kassenta POS &middot; Kassenta Order</span>
      <span><b>Mail</b> ${esc(LINKS.mail)}</span>
    </div>`, "cover"));

  // contents
  out.push(page(`
    <div class="head"><span class="n">—</span><h2>${esc(t.tocTitle)}</h2></div>
    <div class="toc">
      ${sections.map((sec) => {
        const list = bySectionPre[sec.id] || [];
        if (!list.length) return "";
        return `
        <div class="sec">
          <b><i>${sec[lang].n}</i>${esc(sec[lang].title)}</b>
          ${list.map((s) => `<div class="row"><span>${esc(s[lang].title)}</span><span>${pageOf.get(s.shot)}</span></div>`).join("")}
        </div>`;
      }).join("")}
    </div>
    ${footer(t, t.tocTitle, 2)}`));

  // intro
  out.push(page(`
    <div class="head"><span class="n">00</span><h2>${esc(i.heading)}</h2></div>
    <p class="lead">${esc(i.lead)}</p>
    <div class="body">${i.body.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
    <h3 class="mini">${esc(i.industriesTitle)}</h3>
    <div class="grid2">
      ${i.industries.map(([k, v]) => `<div class="card"><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join("")}
    </div>
    <h3 class="mini">${esc(i.platformTitle)}</h3>
    <div class="plat">
      ${i.platforms.map(([k, v, u]) => `<div class="card"><b>${esc(k)}</b><span>${esc(v)}</span><span class="url">${esc(u)}</span></div>`).join("")}
    </div>
    ${footer(t, i.heading, 3)}`));

  // sections, in the order fixed above
  for (let idx = 3; idx < defs.length - 1; idx++) {
    const d = defs[idx];
    const no = idx + 1;
    if (d.type === "divider") {
      out.push(page(`
        <div class="big">${d.sec[lang].n}</div>
        <h2>${esc(d.sec[lang].title)}</h2>
        <p>${esc(d.sec[lang].sub)}</p>
        <div class="rule"></div>`, "divider"));
      continue;
    }
    const s = d.screen;
    const img = dataUri(path.join(SHOTS, `${s.shot}.png`));
    const c = s[lang];
    // Long feature lists read better in two columns than as one thin ribbon
    // down a page that is mostly white space.
    const cols = !s.portrait && c.features.length > 4 ? " feat-2" : "";
    const feats = `<ul class="feat${cols}">${c.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>`;
    const inner = s.portrait
      ? `<div class="split">
           <div class="shot-wrap"><img src="${img}" alt=""></div>
           <div class="txt"><p class="desc">${esc(c.desc)}</p>${feats}</div>
         </div>`
      : `<div class="shot-wrap shot-land"><img src="${img}" alt=""></div>
         <p class="desc">${esc(c.desc)}</p>${feats}`;
    out.push(page(`
      <div class="head"><span class="n">${d.sec[lang].n}</span><h2>${esc(c.title)}</h2><span class="s">${esc(c.sub)}</span></div>
      ${inner}
      ${footer(t, d.sec[lang].title, no)}`));
  }

  const n = defs.length;
  // links
  out.push(page(`
    <div class="head"><span class="n">—</span><h2>${esc(t.linksTitle)}</h2></div>
    <div class="links">
      <div class="card"><span class="k">Website</span><span><span class="v">${LINKS.site}</span></span></div>
      <div class="card"><span class="k">Desktop &amp; laptop</span><span><span class="v">${LINKS.desktop}</span><br><span class="d">${lang === "de" ? "Dasselbe System im Browser — nichts zu installieren." : "The same system in a browser — nothing to install."}</span></span></div>
      <div class="card"><span class="k">Kassenta POS</span><span><span class="v">${LINKS.pos}</span><br><span class="d">${lang === "de" ? "Android — Kasse, Lager, Personal, Berichte." : "Android — till, stock, staff, reports."}</span></span></div>
      <div class="card"><span class="k">Kassenta Order</span><span><span class="v">${LINKS.order}</span><br><span class="d">${lang === "de" ? "Android — Ihre Kundschaft bestellt und verfolgt." : "Android — your customers order and track."}</span></span></div>
      <div class="card"><span class="k">${lang === "de" ? "Kontakt" : "Contact"}</span><span><span class="v">${LINKS.mail}</span></span></div>
    </div>
    ${footer(t, t.linksTitle, n)}`));

  const rtl = t.dir === "rtl";
  const html = `<!doctype html><html lang="${t.lang}" dir="${rtl ? 'rtl' : 'ltr'}"><head><meta charset="utf-8">
<title>${esc(t.title)} — ${esc(t.subtitle)}</title><style>${CSS}</style></head>
<body class="${rtl ? 'rtl' : ''}">${out.join("\n")}</body></html>`;

  return { html, pages: n, used: used.length, skipped };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });

  for (const lang of ["en", "de", "ar"]) {
    const { html, pages, used, skipped } = build(lang);
    const htmlPath = path.join(OUT, `kassenta-brochure-${lang}.html`);
    const pdfPath = path.join(OUT, `kassenta-brochure-${lang}.pdf`);
    fs.writeFileSync(htmlPath, html);

    const p = await browser.newPage();
    await p.setContent(html, { waitUntil: "load", timeout: 120000 });
    await p.pdf({ path: pdfPath, format: "A4", printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    await p.close();

    const mb = (fs.statSync(pdfPath).size / 1048576).toFixed(1);
    console.log(`${lang}: ${pages} pages, ${used} screens, ${mb} MB -> ${path.basename(pdfPath)}`);
    if (skipped.length) console.log(`    missing shots: ${skipped.map((s) => s.shot).join(", ")}`);
  }
  await browser.close();
})();
