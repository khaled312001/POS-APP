/**
 * search.js — instant search over the store's own menu (already loaded, so it
 * works on slow connections and matches Arabic and English names).
 */
window.pages = window.pages || {};

pages.search = {
  /** Loose match: case, Arabic letter variants and diacritics don't matter. */
  _norm(s) {
    return String(s || "").toLowerCase()
      .replace(/[ً-ْـ]/g, "")
      .replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
      .trim();
  },

  async render(params, container, alive) {
    const q0 = (params && params.q) || "";
    container.innerHTML = `
<header class="page-top page-top--search">
  <button class="icon-btn" data-back="home" aria-label="${esc(L("Back", "رجوع"))}">${icon(isRtl() ? "chevron-right" : "chevron-left", "icon-lg")}</button>
  <label class="search-box">${icon("search", "icon-sm")}
    <input type="search" id="q" enterkeyhint="search" autocomplete="off" placeholder="${esc(L("Search the menu", "ابحث في القائمة"))}" value="${esc(q0)}" aria-label="${esc(L("Search", "بحث"))}">
    <button type="button" class="icon-btn icon-btn--sm" data-clear hidden aria-label="${esc(L("Clear", "مسح"))}">${icon("x", "icon-sm")}</button>
  </label>
</header>
<div class="page" id="results">${ui.spinner()}</div>`;
    refreshIcons();
    const input = container.querySelector("#q");
    const out = container.querySelector("#results");
    const clr = container.querySelector("[data-clear]");
    const menu = await shop.menu();
    if (!alive()) return;
    const N = pages.search._norm;
    const catName = {};
    menu.categories.forEach(c => { catName[c.id] = N(c.name) + " " + N(c.nameAr); });
    const index = menu.products.map(p => ({ p, text: [N(p.name), N(p.nameAr), N(p.description), catName[p.categoryId] || ""].join(" ") }));

    const run = () => {
      const q = N(input.value);
      clr.hidden = !input.value;
      if (!q) {
        const cats = menu.categories.filter(c => menu.products.some(p => p.categoryId === c.id));
        out.innerHTML = cats.length ? `<h2 class="section__title">${esc(L("Browse categories", "تصفّح الأقسام"))}</h2>
          <div class="chip-cloud">${cats.map(c => `<button class="chip" data-cat="${c.id}">${esc(shop.categoryName(c))}</button>`).join("")}</div>` : "";
        out.querySelectorAll("[data-cat]").forEach(b => b.onclick = () => { window._filterCatId = Number(b.dataset.cat); router.navigate("menu"); });
        return;
      }
      const words = q.split(/\s+/).filter(Boolean);
      const hits = index.filter(x => words.every(w => x.text.indexOf(w) >= 0))
        .sort((a, b) => (N(shop.productName(a.p)).indexOf(q) === 0 ? -1 : 0) - (N(shop.productName(b.p)).indexOf(q) === 0 ? -1 : 0))
        .slice(0, 60);
      out.innerHTML = hits.length
        ? `<p class="small muted">${hits.length} ${esc(L("results", "نتيجة"))}</p><div class="p-list">${hits.map(x => ui.productRow(x.p)).join("")}</div>`
        : ui.empty("search-x", L("No results", "لا توجد نتائج"), L("Try another word or browse the menu.", "جرّب كلمة أخرى أو تصفّح القائمة."),
            `<button class="btn btn-soft" data-nav="menu">${esc(L("Browse the menu", "تصفّح القائمة"))}</button>`);
      refreshIcons();
    };
    input.addEventListener("input", kx.debounce(run, 120));
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") input.blur(); });
    clr.onclick = () => { input.value = ""; run(); input.focus(); };
    run();
    input.focus({ preventScroll: true });
    const off = cart.onChange(() => { if (input.value) run(); });
    router.onLeave(off);
  },
};
