/**
 * reviews.js — what customers said about the store (ratings left from the
 * tracking page after an order). Paged; nothing is shown that isn't real.
 */
window.pages = window.pages || {};

pages.reviews = {
  stars(n, cls) {
    const r = Math.round(Number(n) || 0);
    let s = "";
    for (let i = 1; i <= 5; i++) s += `<span class="star ${i <= r ? "is-on" : ""}">★</span>`;
    return `<span class="stars ${cls || ""}" aria-label="${r}/5">${s}</span>`;
  },

  async render(params, container, alive) {
    const top = ui.topBar(L("Reviews", "التقييمات"));
    container.innerHTML = top + ui.spinner();
    let page = 1;
    const first = await api.reviews.getForStore(kx.cfg.slug, 1, 10);
    if (!alive()) return;
    const sum = (first && first.summary) || {};
    const total = Number(sum.totalReviews) || 0;
    if (!total) {
      container.innerHTML = top + ui.empty("star", L("No reviews yet", "لا توجد تقييمات بعد"),
        L("After your order arrives you can rate it from the tracking page.", "بعد وصول طلبك يمكنك تقييمه من صفحة التتبع."),
        `<button class="btn btn-primary" data-nav="menu">${esc(L("Order now", "اطلب الآن"))}</button>`);
      return;
    }
    const dist = sum.distribution || {};
    const card = (r) => `<article class="card review">
      <header><strong>${esc(r.customerName && !/^[+\d\s]+$/.test(r.customerName) ? r.customerName : L("Customer", "زبون"))}</strong>
        <small class="muted">${esc(kx.fmtDate(r.createdAt))}</small></header>
      ${pages.reviews.stars(r.rating)}
      ${r.comment ? `<p>${esc(r.comment)}</p>` : ""}
    </article>`;
    container.innerHTML = `
${top}
<div class="page page--reviews">
  <section class="card rating-sum">
    <div class="rating-sum__big"><strong>${(Number(sum.avgRating) || 0).toFixed(1)}</strong>${pages.reviews.stars(sum.avgRating)}
      <span class="muted small">${total} ${esc(L("reviews", "تقييم"))}</span></div>
    <div class="rating-sum__bars">${[5, 4, 3, 2, 1].map(s => {
      const n = Number(dist[s]) || 0;
      return `<div class="bar-row"><span>${s}★</span><div class="progress"><div class="progress__bar" style="width:${Math.round(n / total * 100)}%"></div></div><span class="muted">${n}</span></div>`;
    }).join("")}</div>
  </section>
  <div id="rv-list">${(first.reviews || []).map(card).join("")}</div>
  ${first.hasMore ? `<button class="btn btn-soft btn-block" id="rv-more">${esc(L("Show more", "عرض المزيد"))}</button>` : ""}
</div>`;
    const more = container.querySelector("#rv-more");
    if (more) more.onclick = async () => {
      more.disabled = true; more.classList.add("is-loading");
      try {
        const r = await api.reviews.getForStore(kx.cfg.slug, ++page, 10);
        container.querySelector("#rv-list").insertAdjacentHTML("beforeend", (r.reviews || []).map(card).join(""));
        if (!r.hasMore) more.remove();
      } catch (e) { page--; showToast(e.message, "error"); }
      more.disabled = false; more.classList.remove("is-loading");
    };
  },
};
