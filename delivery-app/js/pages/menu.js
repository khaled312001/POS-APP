/**
 * menu.js — the full menu: sticky category chips, one section per category,
 * in-page filter. Items open the options sheet (ui.openProduct), which reads
 * the product's real variants and modifier groups — nothing is invented here.
 */
window.pages = window.pages || {};

pages.menu = {
  async render(params, container, alive) {
    container.innerHTML = ui.topBar(L("Menu", "القائمة")) + `<div class="menu-skel">${
      '<div class="p-row"><div class="p-row__body"><div class="sk sk--line"></div><div class="sk sk--line" style="width:70%"></div><div class="sk sk--line" style="width:30%"></div></div><div class="p-row__media skeleton"></div></div>'.repeat(6)}</div>`;
    const menu = await shop.menu();
    if (!alive()) return;

    const cats = menu.categories
      .map(c => ({ c, items: menu.products.filter(p => p.categoryId === c.id) }))
      .filter(x => x.items.length);
    const inCats = new Set(cats.flatMap(x => x.items.map(p => p.id)));
    const others = menu.products.filter(p => !inCats.has(p.id));
    if (others.length) cats.push({ c: { id: 0, name: "More", nameAr: "المزيد" }, items: others });

    if (!cats.length) {
      container.innerHTML = ui.topBar(L("Menu", "القائمة")) +
        ui.empty("package-open", L("No items yet", "لا توجد أصناف بعد"), L("The store hasn't published its menu yet.", "لم ينشر المتجر قائمته بعد."));
      return;
    }

    container.innerHTML = `
      ${ui.topBar(L("Menu", "القائمة"), { right: `<button class="icon-btn" data-nav="search" aria-label="${esc(L("Search", "بحث"))}">${icon("search", "icon-md")}</button>` })}
      <nav class="chips chips--sticky" aria-label="${esc(L("Categories", "الأقسام"))}">
        ${cats.map((x, i) => `<button class="chip ${i === 0 ? "is-on" : ""}" data-chip="${x.c.id}">${esc(shop.categoryName(x.c))}</button>`).join("")}
      </nav>
      <div class="menu">
        ${cats.map(x => `
          <section class="menu-sec" id="cat-${x.c.id}" data-sec="${x.c.id}">
            <h2 class="menu-sec__title">${esc(shop.categoryName(x.c))} <span class="muted">${x.items.length}</span></h2>
            <div class="p-list">${x.items.map(ui.productRow).join("")}</div>
          </section>`).join("")}
      </div>`;

    const chipsBar = container.querySelector(".chips");
    const chips = [...container.querySelectorAll("[data-chip]")];
    const setActive = (id) => {
      chips.forEach(ch => {
        const on = ch.dataset.chip === String(id);
        ch.classList.toggle("is-on", on);
        if (on) {
          // Keep the active chip visible without moving the page.
          const bar = chipsBar.getBoundingClientRect(), r = ch.getBoundingClientRect();
          if (r.left < bar.left) chipsBar.scrollBy({ left: r.left - bar.left - 16, behavior: "smooth" });
          else if (r.right > bar.right) chipsBar.scrollBy({ left: r.right - bar.right + 16, behavior: "smooth" });
        }
      });
    };

    // Height of everything stuck above the sections (header / top bar + chips).
    const offset = () => (parseFloat(getComputedStyle(chipsBar).top) || 0) + chipsBar.offsetHeight + 8;
    let lock = 0;
    chips.forEach(ch => {
      ch.onclick = () => {
        const sec = document.getElementById("cat-" + ch.dataset.chip);
        if (!sec) return;
        setActive(ch.dataset.chip);
        lock = Date.now() + 700;
        window.scrollTo({ top: sec.getBoundingClientRect().top + window.scrollY - offset(), behavior: "smooth" });
      };
    });

    // Scroll spy
    const onScroll = () => {
      if (Date.now() < lock) return;
      const y = offset() + 4;
      let current = cats[0].c.id;
      container.querySelectorAll("[data-sec]").forEach(sec => { if (sec.getBoundingClientRect().top <= y) current = sec.dataset.sec; });
      setActive(current);
    };
    const spy = () => requestAnimationFrame(onScroll);
    window.addEventListener("scroll", spy, { passive: true });
    router.onLeave(() => window.removeEventListener("scroll", spy));

    // Refresh the "2×" pills when the cart changes.
    const off = cart.onChange(() => {
      container.querySelectorAll(".p-row[data-product]").forEach(row => {
        const p = menu.byId[row.dataset.product];
        if (p) row.outerHTML = ui.productRow(p);
      });
      refreshIcons();
    });
    router.onLeave(off);

    // Coming from a category tile on the home page.
    const target = window._filterCatId;
    window._filterCatId = null;
    if (target != null && document.getElementById("cat-" + target)) {
      requestAnimationFrame(() => {
        const ch = chips.find(c => c.dataset.chip === String(target));
        if (ch) ch.click();
      });
    }
  },
};
