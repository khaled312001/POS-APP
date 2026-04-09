/**
 * tracking.js — Live order tracking with Leaflet map, status pipeline, ETA countdown
 */
window.pages = window.pages || {};

pages.tracking = {
  _map: null,
  _driverMarker: null,
  _customerMarker: null,
  _eventSource: null,
  _countdownTimer: null,
  _order: null,

  async render(params, container) {
    const cfg = window.DELIVERY_CONFIG || {};
    const rtl = isRtl();
    const token = params?.token || new URLSearchParams(location.search).get("token") || "";

    container.innerHTML = pages.tracking._skeleton(rtl);

    try {
      const order = await api.orders.track(token);
      pages.tracking._order = order;

      container.innerHTML = pages.tracking._buildLayout(order, cfg, rtl);

      pages.tracking._initMap(order);
      pages.tracking._startSSE(order.id || token, cfg, rtl);

      if (order.status !== "delivered" && order.status !== "cancelled") {
        pages.tracking._startCountdown(order);
      }

    } catch (err) {
      container.innerHTML = `
        <div class="empty-state" style="min-height:60vh">
          <div class="empty-state__icon">📦</div>
          <div class="empty-state__title">${rtl ? "لم يُعثر على الطلب" : "Order not found"}</div>
          <div class="empty-state__text">${err.message}</div>
          <button class="btn btn-primary mt-md" onclick="router.navigate('home')">${rtl ? "الرئيسية" : "Home"}</button>
        </div>`;
    }
  },

  _skeleton(rtl) {
    return `<div style="padding:var(--space-xl) var(--space-md);text-align:center">
      <div class="loading-spinner" style="margin:0 auto"></div>
      <div style="margin-top:var(--space-md);color:var(--delivery-text-muted)">${rtl ? "جار تحميل الطلب..." : "Loading order…"}</div>
    </div>`;
  },

  _buildLayout(order, cfg, rtl) {
    const statusLabels = {
      pending:   rtl ? "في الانتظار" : "Pending",
      accepted:  rtl ? "تم القبول"  : "Accepted",
      preparing: rtl ? "جار التحضير": "Preparing",
      ready:     rtl ? "جاهز"       : "Ready",
      on_way:    rtl ? "في الطريق"  : "On the way",
      delivered: rtl ? "تم التوصيل" : "Delivered",
      cancelled: rtl ? "ملغي"       : "Cancelled",
    };

    const steps = ["pending", "accepted", "preparing", "ready", "on_way", "delivered"];
    const stepLabels = {
      pending:   rtl ? "استلام" : "Received",
      accepted:  rtl ? "قبول"   : "Accepted",
      preparing: rtl ? "تحضير"  : "Preparing",
      ready:     rtl ? "جاهز"   : "Ready",
      on_way:    rtl ? "في الطريق": "On way",
      delivered: rtl ? "تم"     : "Delivered",
    };

    const currentIdx = steps.indexOf(order.status);
    const isFinal = order.status === "delivered" || order.status === "cancelled";

    return `
<div class="tracking-page">
  <!-- Confirmation / status header -->
  <div class="tracking-confirmation">
    ${order.status === "delivered"
      ? `<div class="confirmation-icon">✅</div>`
      : order.status === "cancelled"
      ? `<div class="confirmation-icon" style="background:rgba(239,68,68,0.12)">❌</div>`
      : `<div class="confirmation-icon">🎉</div>`}
    <h2>${order.status === "delivered" ? (rtl ? "تم التوصيل!" : "Order delivered!") : order.status === "cancelled" ? (rtl ? "تم الإلغاء" : "Order cancelled") : (rtl ? "تم استلام طلبك!" : "Order confirmed!")}</h2>
    <p style="margin-top:var(--space-sm);color:var(--delivery-text-secondary)">
      ${rtl ? "رقم الطلب" : "Order"} #${order.orderNumber || order.id}
    </p>
    <div class="badge badge-${order.status === "delivered" ? "delivered" : order.status === "cancelled" ? "cancelled" : "preparing"}" style="margin-top:var(--space-sm)">
      ${statusLabels[order.status] || order.status}
    </div>
  </div>

  <!-- ETA -->
  ${!isFinal ? `
  <div class="tracking-info-card">
    <div class="eta-display">
      <div class="eta-display__label">${rtl ? "الوقت المتبقي للتوصيل" : "Estimated delivery time"}</div>
      <div class="eta-display__time" id="eta-countdown">—</div>
      <div class="eta-display__sub">${rtl ? "دقيقة تقريباً" : "minutes approx."}</div>
    </div>
  </div>` : ""}

  <!-- Status pipeline -->
  <div class="tracking-info-card">
    <h3 style="font-weight:700;margin-bottom:var(--space-md)">${rtl ? "حالة الطلب" : "Order status"}</h3>
    <div class="status-pipeline" id="status-pipeline">
      ${steps.filter(s => s !== "cancelled").map((s, i) => {
        const isDone   = currentIdx > i;
        const isActive = currentIdx === i;
        return `<div class="pipeline-step ${isDone ? "done" : isActive ? "active" : ""}" id="step-${s}">
          <div class="pipeline-step__dot">${isDone ? "✓" : i + 1}</div>
          <div class="pipeline-step__label">${stepLabels[s]}</div>
        </div>`;
      }).join("")}
    </div>
  </div>

  <!-- Map -->
  ${!isFinal ? `
  <div class="tracking-info-card" style="padding:0;overflow:hidden">
    <div id="tracking-map" style="height:300px"></div>
  </div>` : ""}

  <!-- Driver info (when on_way) -->
  ${order.driver ? `
  <div class="tracking-info-card">
    <h3 style="font-weight:700;margin-bottom:var(--space-sm)">${rtl ? "معلومات السائق" : "Your driver"}</h3>
    <div class="driver-info">
      <div class="driver-avatar">🏍️</div>
      <div>
        <div class="driver-info__name">${order.driver.name || "Driver"}</div>
        <div class="driver-info__rating">⭐ ${order.driver.rating || "5.0"}</div>
      </div>
      ${order.driver.phone ? `
      <a href="tel:${order.driver.phone}" class="driver-call-btn" aria-label="Call driver">📞</a>` : ""}
    </div>
  </div>` : ""}

  <!-- Order details -->
  <div class="tracking-info-card">
    <h3 style="font-weight:700;margin-bottom:var(--space-md)">${rtl ? "تفاصيل الطلب" : "Order details"}</h3>
    ${(order.items || []).map(item => `
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--delivery-border)">
        <span>${item.qty || 1}× ${item.name}</span>
        <strong>${formatCurrency(item.price * (item.qty || 1), cfg.currency)}</strong>
      </div>`).join("")}
    <div class="summary-row" style="margin-top:var(--space-sm)">
      <span class="label">${rtl ? "المجموع" : "Total"}</span>
      <strong>${formatCurrency(order.total || order.subtotal || 0, cfg.currency)}</strong>
    </div>
  </div>

  <!-- Actions -->
  <div style="padding:var(--space-md);display:flex;flex-direction:column;gap:var(--space-sm)">
    ${order.status === "delivered" ? `
    <button class="btn btn-primary btn-full" onclick="pages.tracking._openRating()">
      ${rtl ? "⭐ قيّم طلبك" : "⭐ Rate your order"}
    </button>
    <button class="btn btn-ghost btn-full" onclick="api.orders.reorder(${order.id}).then(r => { cart.clear(); showToast('Reordering…','success'); router.navigate('cart'); })">
      ${rtl ? "🔄 اطلب مجدداً" : "🔄 Reorder"}
    </button>` : ""}
    <button class="btn btn-ghost btn-full" onclick="router.navigate('home')">
      ${rtl ? "← الرئيسية" : "← Back to home"}
    </button>
  </div>

  <!-- Rating sheet -->
  <div class="sheet-backdrop" id="rating-backdrop" onclick="pages.tracking._closeRating()"></div>
  <div class="bottom-sheet" id="rating-sheet">
    <div class="sheet-handle"></div>
    <div class="sheet-header">
      <span class="sheet-title">${rtl ? "كيف كانت تجربتك؟" : "How was your experience?"}</span>
    </div>
    <div class="sheet-body">
      <p style="text-align:center;margin-bottom:var(--space-lg)">${order.restaurant || cfg.storeName || "Restaurant"}</p>
      <div class="stars" style="justify-content:center" id="rating-stars">
        ${[1,2,3,4,5].map(n =>
          `<span class="star" data-val="${n}" onclick="pages.tracking._setRating(${n})">★</span>`
        ).join("")}
      </div>
      <div class="form-group" style="margin-top:var(--space-lg)">
        <textarea id="rating-comment" class="form-input form-textarea" placeholder="${rtl ? "أخبرنا عن تجربتك..." : "Tell us about your experience…"}"></textarea>
      </div>
      <button class="btn btn-primary btn-full" style="margin-top:var(--space-md)" onclick="pages.tracking._submitRating(${order.id})">
        ${rtl ? "إرسال التقييم" : "Submit rating"}
      </button>
    </div>
  </div>

</div>`;
  },

  _initMap(order) {
    const mapEl = document.getElementById("tracking-map");
    if (!mapEl || !window.L) return;
    try {
      const lat = order.customerLat || 30.0444;
      const lng = order.customerLng || 31.2357;
      pages.tracking._map = L.map(mapEl).setView([lat, lng], 15);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(pages.tracking._map);

      // Customer marker
      const customerIcon = L.divIcon({ html: `<div style="background:var(--delivery-primary);width:32px;height:32px;border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.3)">🏠</div>`, className: "", iconSize: [32, 32], iconAnchor: [16, 32] });
      pages.tracking._customerMarker = L.marker([lat, lng], { icon: customerIcon }).addTo(pages.tracking._map);

      // Driver marker (if available)
      if (order.driverLat && order.driverLng) {
        pages.tracking._addDriverMarker(order.driverLat, order.driverLng);
      }
    } catch(e) {}
  },

  _addDriverMarker(lat, lng) {
    const map = pages.tracking._map;
    if (!map || !window.L) return;
    const icon = L.divIcon({ html: `<div style="background:#FF5722;width:36px;height:36px;border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.3)">🏍️</div>`, className: "", iconSize: [36, 36], iconAnchor: [18, 18] });
    if (pages.tracking._driverMarker) {
      pages.tracking._driverMarker.setLatLng([lat, lng]);
    } else {
      pages.tracking._driverMarker = L.marker([lat, lng], { icon }).addTo(map);
    }
  },

  _startSSE(orderId, cfg, rtl) {
    if (pages.tracking._eventSource) {
      pages.tracking._eventSource.close();
    }
    try {
      const es = api.orders.statusStream(orderId, (data) => {
        // Update pipeline
        if (data.status) {
          pages.tracking._updatePipeline(data.status);
          const badge = document.querySelector(".badge[class*=badge-]");
          if (badge) {
            badge.textContent = data.status;
          }
          if (data.status === "delivered") {
            pages.tracking._stopCountdown();
          }
        }
        // Update driver location
        if (data.driverLat && data.driverLng) {
          pages.tracking._addDriverMarker(data.driverLat, data.driverLng);
          if (pages.tracking._map && pages.tracking._driverMarker) {
            pages.tracking._map.panTo([data.driverLat, data.driverLng]);
          }
        }
        if (data.eta) {
          const el = document.getElementById("eta-countdown");
          if (el) el.textContent = data.eta;
        }
      });
      pages.tracking._eventSource = es;
    } catch(e) {}
  },

  _updatePipeline(status) {
    const steps = ["pending", "accepted", "preparing", "ready", "on_way", "delivered"];
    const idx = steps.indexOf(status);
    steps.forEach((s, i) => {
      const el = document.getElementById(`step-${s}`);
      if (!el) return;
      el.classList.toggle("done", i < idx);
      el.classList.toggle("active", i === idx);
    });
  },

  _startCountdown(order) {
    const cfg = window.DELIVERY_CONFIG || {};
    const maxMin = cfg.maxDeliveryTime || 45;
    const orderTime = order.createdAt ? new Date(order.createdAt) : new Date();
    const eta = new Date(orderTime.getTime() + maxMin * 60 * 1000);
    pages.tracking._stopCountdown();
    pages.tracking._countdownTimer = setInterval(() => {
      const now = new Date();
      const diff = Math.max(0, Math.round((eta - now) / 60000));
      const el = document.getElementById("eta-countdown");
      if (el) el.textContent = diff;
      if (diff === 0) pages.tracking._stopCountdown();
    }, 15000);
    // Set initial
    const el = document.getElementById("eta-countdown");
    if (el) el.textContent = maxMin;
  },

  _stopCountdown() {
    if (pages.tracking._countdownTimer) {
      clearInterval(pages.tracking._countdownTimer);
      pages.tracking._countdownTimer = null;
    }
  },

  _ratingValue: 0,

  _openRating() {
    document.getElementById("rating-backdrop")?.classList.add("open");
    document.getElementById("rating-sheet")?.classList.add("open");
    document.body.style.overflow = "hidden";
  },

  _closeRating() {
    document.getElementById("rating-backdrop")?.classList.remove("open");
    document.getElementById("rating-sheet")?.classList.remove("open");
    document.body.style.overflow = "";
  },

  _setRating(val) {
    pages.tracking._ratingValue = val;
    document.querySelectorAll("#rating-stars .star").forEach((s, i) => {
      s.classList.toggle("active", i < val);
    });
  },

  async _submitRating(orderId) {
    const rating = pages.tracking._ratingValue;
    const comment = document.getElementById("rating-comment")?.value || "";
    if (rating === 0) { showToast(isRtl() ? "اختر تقييماً" : "Select a rating", "warning"); return; }
    try {
      await api.orders.rate(orderId, { rating, comment });
      showToast(isRtl() ? "شكراً لتقييمك 🙏" : "Thank you for your rating 🙏", "success");
      pages.tracking._closeRating();
    } catch(err) {
      showToast(err.message || "Error", "error");
    }
  },
};
