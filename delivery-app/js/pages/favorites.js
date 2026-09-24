/**
 * favorites.js — the customer's saved products, matched against today's menu
 * (so prices and options are current). Heart a product in its options sheet.
 */
window.pages = window.pages || {};

pages.favorites = {
  async render(params, container, alive) {
    const top = ui.topBar(L("Favourites", "المفضلة"), { back: "account" });
    if (!auth.isLoggedIn()) {
      container.innerHTML = top + ui.empty("heart", L("Save your favourites", "احفظ أصنافك المفضلة"),
        L("Sign in, then tap the heart on any item.", "سجّل الدخول ثم اضغط على القلب في أي صنف."),
        `<button class="btn btn-primary" data-signin>${esc(L("Sign in", "تسجيل الدخول"))}</button>`);
      container.querySelector("[data-signin]").onclick = () => auth.requireLogin("favorites");
      return;
    }
    container.innerHTML = top + ui.spinner();
    ui._favs = null;
    const [rows, menu] = await Promise.all([api.favorites.list(), shop.menu()]);
    if (!alive()) return;
    const favs = Array.isArray(rows) ? rows : [];
    ui._favs = {};
    favs.forEach(r => { ui._favs[r.productId] = r.id; });
    const draw = () => {
      const items = favs.filter(r => ui._favs[r.productId] && menu.byId[r.productId]).map(r => menu.byId[r.productId]);
      const gone = favs.filter(r => ui._favs[r.productId] && !menu.byId[r.productId]);
      container.innerHTML = top + (items.length || gone.length ? `<div class="page">
        <div class="p-list">${items.map(p => `<div class="fav-row">${ui.productRow(p)}
          <button class="icon-btn fav-btn is-on" data-unfav="${p.id}" aria-pressed="true" aria-label="${esc(L("Remove from favourites", "إزالة من المفضلة"))}">${icon("heart", "icon-md")}</button></div>`).join("")}</div>
        ${gone.length ? `<p class="small muted">${esc(L("No longer on the menu: ", "لم يعد في القائمة: "))}${esc(gone.map(r => (kx.lang() === "ar" && r.productNameAr) || r.productName).join("، "))}</p>` : ""}
      </div>` : ui.empty("heart", L("No favourites yet", "لا توجد مفضلة بعد"), L("Tap the heart on any item to save it here.", "اضغط على القلب في أي صنف لحفظه هنا."),
        `<button class="btn btn-primary" data-nav="menu">${esc(L("Browse the menu", "تصفّح القائمة"))}</button>`));
      refreshIcons();
      container.querySelectorAll("[data-unfav]").forEach(b => b.onclick = (e) => {
        e.stopPropagation();
        const pid = Number(b.dataset.unfav);
        b.disabled = true;
        api.favorites.remove(ui._favs[pid]).then(() => { delete ui._favs[pid]; draw(); })
          .catch(err => { showToast(err.message, "error"); b.disabled = false; });
      });
    };
    draw();
  },
};
