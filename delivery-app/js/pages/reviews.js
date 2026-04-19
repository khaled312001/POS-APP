/**
 * reviews.js — Restaurant reviews page
 * Star distribution, review cards, sorting
 */
window.pages = window.pages || {};

pages.reviews = {
  _reviews: [],
  _page: 1,
  _hasMore: true,
  _sort: "newest",

  _t: {
    en: {
      title: "Reviews",
      noReviews: "No reviews yet",
      noReviewsDesc: "Be the first to share your experience!",
      writeReview: "Write a Review",
      sortNewest: "Newest",
      sortHighest: "Highest",
      sortLowest: "Lowest",
      loadMore: "Load More",
      reviews: "reviews",
      back: "Back",
      ratingLabels: ["Terrible", "Poor", "Average", "Good", "Excellent"],
    },
    ar: {
      title: "التقييمات",
      noReviews: "لا توجد تقييمات بعد",
      noReviewsDesc: "كن أول من يشارك تجربته!",
      writeReview: "اكتب تقييم",
      sortNewest: "الأحدث",
      sortHighest: "الأعلى",
      sortLowest: "الأقل",
      loadMore: "تحميل المزيد",
      reviews: "تقييمات",
      back: "رجوع",
      ratingLabels: ["سيء جداً", "سيء", "متوسط", "جيد", "ممتاز"],
    },
    de: {
      title: "Bewertungen",
      noReviews: "Noch keine Bewertungen",
      noReviewsDesc: "Teilen Sie als Erster Ihre Erfahrung!",
      writeReview: "Bewertung schreiben",
      sortNewest: "Neueste",
      sortHighest: "Höchste",
      sortLowest: "Niedrigste",
      loadMore: "Mehr laden",
      reviews: "Bewertungen",
      back: "Zurück",
      ratingLabels: ["Schlecht", "Mangelhaft", "Durchschnittlich", "Gut", "Ausgezeichnet"],
    },
  },

  async render(params, container) {
    const cfg = window.DELIVERY_CONFIG || {};
    const slug = params.slug || cfg.slug || "";
    const lang = cfg.language || "en";
    const t = pages.reviews._t[lang] || pages.reviews._t.en;

    pages.reviews._page = 1;
    pages.reviews._reviews = [];
    pages.reviews._hasMore = true;
    pages.reviews._sort = "newest";

    container.innerHTML = `
<div class="reviews-page">
  <header class="reviews-page__header">
    <button class="btn-icon" onclick="history.back()" aria-label="${t.back}">
      <i data-lucide="arrow-left" class="icon-md"></i>
    </button>
    <h2 class="reviews-page__title">${t.title}</h2>
  </header>

  <div class="reviews-page__body" id="reviews-body">
    <div class="reviews-page__loading">
      <div class="skeleton" style="height:120px;margin-bottom:16px;border-radius:var(--radius-md)"></div>
      <div class="skeleton" style="height:80px;margin-bottom:8px;border-radius:var(--radius-md)"></div>
      <div class="skeleton" style="height:80px;border-radius:var(--radius-md)"></div>
    </div>
  </div>
</div>`;

    if (window.lucide) window.lucide.createIcons();

    try {
      var data = await api.reviews.getForStore(slug, 1, 10);
      var reviews = Array.isArray(data) ? data : (data.reviews || []);
      var summary = data.summary || pages.reviews._calcSummary(reviews);
      pages.reviews._reviews = reviews;
      pages.reviews._hasMore = reviews.length >= 10;

      pages.reviews._renderBody(summary, reviews, t, slug);
    } catch (err) {
      document.getElementById("reviews-body").innerHTML = `
        <div class="empty-state" style="margin-top:var(--space-xl)">
          <div class="empty-state__icon"><i data-lucide="star" class="icon-2xl"></i></div>
          <h3 class="empty-state__title">${t.noReviews}</h3>
          <p class="empty-state__text">${t.noReviewsDesc}</p>
        </div>`;
      if (window.lucide) window.lucide.createIcons();
    }
  },

  _renderBody: function (summary, reviews, t, slug) {
    var body = document.getElementById("reviews-body");
    if (!body) return;

    var avgRating = summary.avgRating || 0;
    var totalReviews = summary.totalReviews || reviews.length;
    var distribution = summary.distribution || pages.reviews._getDistribution(reviews);

    body.innerHTML = `
      <!-- Summary Card -->
      <div class="reviews-summary">
        <div class="reviews-summary__score">
          <span class="reviews-summary__number">${avgRating.toFixed(1)}</span>
          <div class="reviews-summary__stars">${pages.reviews._renderStars(avgRating)}</div>
          <span class="reviews-summary__count">${totalReviews} ${t.reviews}</span>
        </div>
        <div class="reviews-summary__bars">
          ${[5,4,3,2,1].map(function (star) {
            var count = distribution[star] || 0;
            var pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
            return `<div class="reviews-bar">
              <span class="reviews-bar__label">${star}</span>
              <div class="reviews-bar__track"><div class="reviews-bar__fill" style="width:${pct}%"></div></div>
              <span class="reviews-bar__count">${count}</span>
            </div>`;
          }).join("")}
        </div>
      </div>

      <!-- Sort -->
      <div class="reviews-sort">
        <button class="filter-chip ${pages.reviews._sort === 'newest' ? 'active' : ''}" onclick="pages.reviews._setSort('newest', '${slug}')">${t.sortNewest}</button>
        <button class="filter-chip ${pages.reviews._sort === 'highest' ? 'active' : ''}" onclick="pages.reviews._setSort('highest', '${slug}')">${t.sortHighest}</button>
        <button class="filter-chip ${pages.reviews._sort === 'lowest' ? 'active' : ''}" onclick="pages.reviews._setSort('lowest', '${slug}')">${t.sortLowest}</button>
      </div>

      <!-- Review List -->
      <div class="reviews-list" id="reviews-list">
        ${pages.reviews._renderCards(reviews, t)}
      </div>

      ${pages.reviews._hasMore ? `<button class="btn btn-ghost btn-full mt-md" id="load-more-reviews" onclick="pages.reviews._loadMore('${slug}')">${t.loadMore}</button>` : ""}
    `;

    if (window.lucide) window.lucide.createIcons();
  },

  _renderCards: function (reviews, t) {
    if (!reviews || reviews.length === 0) {
      return `<div class="empty-state">
        <div class="empty-state__icon"><i data-lucide="message-circle" class="icon-xl"></i></div>
        <h3 class="empty-state__title">${t.noReviews}</h3>
      </div>`;
    }

    return reviews.map(function (review) {
      var name = review.customerName || review.name || "Customer";
      var date = review.createdAt ? new Date(review.createdAt).toLocaleDateString() : "";
      var rating = review.rating || 0;
      var comment = review.comment || review.review || "";
      var initial = name.charAt(0).toUpperCase();

      return `<div class="review-card">
        <div class="review-card__header">
          <div class="review-card__avatar">${initial}</div>
          <div class="review-card__meta">
            <span class="review-card__name">${name}</span>
            <span class="review-card__date">${date}</span>
          </div>
          <div class="review-card__rating">${pages.reviews._renderStars(rating)}</div>
        </div>
        ${comment ? `<p class="review-card__comment">${comment}</p>` : ""}
        ${review.orderItems ? `<div class="review-card__items">${review.orderItems}</div>` : ""}
      </div>`;
    }).join("");
  },

  _renderStars: function (rating) {
    var html = "";
    for (var i = 1; i <= 5; i++) {
      if (i <= Math.floor(rating)) {
        html += '<i data-lucide="star" class="icon-xs star-filled"></i>';
      } else if (i - 0.5 <= rating) {
        html += '<i data-lucide="star-half" class="icon-xs star-filled"></i>';
      } else {
        html += '<i data-lucide="star" class="icon-xs star-empty"></i>';
      }
    }
    return html;
  },

  _calcSummary: function (reviews) {
    if (!reviews || reviews.length === 0) return { avgRating: 0, totalReviews: 0, distribution: {} };
    var total = reviews.length;
    var sum = reviews.reduce(function (s, r) { return s + (r.rating || 0); }, 0);
    return { avgRating: sum / total, totalReviews: total, distribution: pages.reviews._getDistribution(reviews) };
  },

  _getDistribution: function (reviews) {
    var dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    (reviews || []).forEach(function (r) {
      var star = Math.round(r.rating || 0);
      if (star >= 1 && star <= 5) dist[star]++;
    });
    return dist;
  },

  _setSort: function (sort, slug) {
    pages.reviews._sort = sort;
    var sorted = [].concat(pages.reviews._reviews);
    if (sort === "highest") sorted.sort(function (a, b) { return (b.rating || 0) - (a.rating || 0); });
    else if (sort === "lowest") sorted.sort(function (a, b) { return (a.rating || 0) - (b.rating || 0); });
    else sorted.sort(function (a, b) { return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); });

    var lang = (window.DELIVERY_CONFIG || {}).language || "en";
    var t = pages.reviews._t[lang] || pages.reviews._t.en;

    // Update sort buttons
    document.querySelectorAll(".reviews-sort .filter-chip").forEach(function (c) { c.classList.remove("active"); });
    document.querySelector('.reviews-sort .filter-chip[onclick*="' + sort + '"]').classList.add("active");

    // Re-render cards
    document.getElementById("reviews-list").innerHTML = pages.reviews._renderCards(sorted, t);
    if (window.lucide) window.lucide.createIcons();
  },

  _loadMore: async function (slug) {
    pages.reviews._page++;
    var btn = document.getElementById("load-more-reviews");
    if (btn) { btn.disabled = true; btn.textContent = "..."; }

    try {
      var data = await api.reviews.getForStore(slug, pages.reviews._page, 10);
      var newReviews = Array.isArray(data) ? data : (data.reviews || []);
      pages.reviews._reviews = pages.reviews._reviews.concat(newReviews);
      pages.reviews._hasMore = newReviews.length >= 10;

      var lang = (window.DELIVERY_CONFIG || {}).language || "en";
      var t = pages.reviews._t[lang] || pages.reviews._t.en;

      document.getElementById("reviews-list").innerHTML = pages.reviews._renderCards(pages.reviews._reviews, t);
      if (!pages.reviews._hasMore && btn) btn.remove();
      else if (btn) { btn.disabled = false; btn.textContent = t.loadMore; }

      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      if (btn) { btn.disabled = false; }
    }
  },
};
