/**
 * checkout.js — Multi-step checkout: Address → Payment → Review → Pay
 *
 * Order-first by design. The order is created before a single franc moves, so
 * the customer can never be charged for something we failed to record, and the
 * PaymentIntent is priced by the server from that stored order — this page
 * never sends an amount.
 *
 * Two rules the old version broke and this one keeps:
 *
 *   1. **Nothing here marks anything paid.** Only the signed Stripe webhook
 *      does. Every path that involves money ends in waitForSettlement(), which
 *      polls our own /api/payments/status until the webhook has landed.
 *
 *   2. **Fail closed.** If the customer chose to pay online and payment does
 *      not go through, the order stays unpaid and they are told so plainly.
 *      The old flow silently placed an unpaid order whenever Stripe failed to
 *      load, while the customer believed they had paid.
 *
 * Payment itself goes through the shared window.KassentaPay helper, which
 * mounts a Stripe PaymentElement — the only element that offers TWINT, the
 * method that actually matters in Switzerland, plus Link and the wallets.
 */
window.pages = window.pages || {};

pages.checkout = {
  _step: 1,
  _address: null,
  _savedAddresses: [],
  _paymentMethod: "cod",
  _scheduledAt: null,
  _map: null,
  _marker: null,
  _payConfig: null,
  _payReady: false,
  _walletBalance: 0,
  _order: null,
  _submitting: false,
  _paying: false,

  async render(params, container) {
    const cfg = window.DELIVERY_CONFIG || {};
    const rtl = isRtl();

    // A TWINT / PayPal / 3-D Secure redirect lands back on this URL. Handle it
    // before any cart or login guard: the cart was emptied when the order was
    // created, so the guards below would bounce the customer away from their
    // own payment result.
    if (await pages.checkout._resumeRedirect(container)) return;

    const state = cart.getState();

    // Require login for delivery/pickup, but allow guest for dine-in
    const isDineInCheck = state.orderType === "dine_in";
    if (!isDineInCheck && !auth.isLoggedIn()) {
      showToast(rtl ? "يجب تسجيل الدخول أولاً لإتمام الطلب" : "Please login first to place an order", "warning");
      router.navigate("login");
      return;
    }

    if (state.items.length === 0) {
      router.navigate("cart");
      return;
    }

    const customer = auth.getCustomer();
    const isDineIn = state.orderType === "dine_in";
    pages.checkout._step = isDineIn ? 2 : 1; // Skip address for dine-in
    pages.checkout._order = null;
    pages.checkout._paymentMethod = "cod";
    pages.checkout._walletBalance = 0;

    // Load saved addresses if logged in
    if (customer) {
      try {
        pages.checkout._savedAddresses = await api.addresses.list().catch(() => []);
        if (pages.checkout._savedAddresses.length > 0) {
          const def = pages.checkout._savedAddresses.find(a => a.isDefault) || pages.checkout._savedAddresses[0];
          pages.checkout._address = def;
        }
      } catch (_) {}
    }

    // What the gateway will actually accept decides what we may offer. Fetched
    // at render time so a rotated key needs no deploy; a failure leaves
    // _payReady false and the checkout degrades to cash rather than showing a
    // button that cannot work.
    await pages.checkout._initPayments(cfg);

    container.innerHTML = pages.checkout._buildLayout(cfg, rtl, state);

    pages.checkout._initMap();
    pages.checkout._renderOrderSummary(cfg, rtl, state);
    pages.checkout._initFieldValidation();
    pages.checkout._loadWalletBalance();
  },

  // ── Payment plumbing ──────────────────────────────────────────────────────

  async _initPayments(cfg) {
    pages.checkout._payConfig = null;
    pages.checkout._payReady = false;
    if (!window.KassentaPay) return;
    // basePath stays empty on purpose: this app's API calls already carry the
    // /api prefix in both the direct and the CDN-proxied deployment.
    pages.checkout._payConfig = await KassentaPay.init({ basePath: "", tenantId: cfg.tenantId }).catch(() => null);
    pages.checkout._payReady = KassentaPay.isAvailable();
  },

  /** The gateway's currency wins; the store config is only a fallback. */
  _currency() {
    const cfg = window.DELIVERY_CONFIG || {};
    return (pages.checkout._payConfig && pages.checkout._payConfig.currency) || cfg.currency || "CHF";
  },

  /** Name the methods the account really offers, so the label cannot lie. */
  _onlineMethodsLabel() {
    const m = (window.KassentaPay && KassentaPay.methods()) || [];
    const names = {
      card: "Card", twint: "TWINT", apple_pay: "Apple Pay", google_pay: "Google Pay",
      link: "Link", paypal: "PayPal", klarna: "Klarna", revolut_pay: "Revolut Pay",
    };
    const nice = Object.keys(names).filter(k => m.indexOf(k) >= 0).map(k => names[k]);
    if (!nice.length) nice.push("Card");
    return nice.slice(0, 4).join(" · ");
  },

  _isDark() {
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr) return attr === "dark";
    return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  },

  _brandColor() {
    const c = getComputedStyle(document.documentElement).getPropertyValue("--delivery-primary").trim();
    return c || "#0A6E65";
  },

  /**
   * Resume a redirect payment. `redirect_status=succeeded` in the URL means
   * only that the browser came back — the money is confirmed by the webhook,
   * so we poll our own record before saying anything to the customer.
   */
  async _resumeRedirect(container) {
    if (!window.KassentaPay) return false;
    const ret = KassentaPay.pendingReturn();
    if (!ret || !ret.paymentIntentId) return false;
    const rtl = isRtl();
    KassentaPay.clearReturn();

    container.innerHTML = `
<div class="checkout-page">
  <div class="pay-confirming">
    <div class="loading-spinner"></div>
    <div class="pay-confirming__title">${rtl ? "جارٍ تأكيد الدفع..." : "Confirming your payment…"}</div>
    <div class="pay-confirming__text">${rtl
      ? "لا تغلق هذه الصفحة. ننتظر تأكيد البنك."
      : "Please keep this page open while we wait for your bank to confirm."}</div>
  </div>
</div>`;

    const res = await KassentaPay.waitForSettlement(ret.paymentIntentId, { timeoutMs: 40000 });
    pages.checkout._finishPayment(res, ret.trackingToken);
    return true;
  },

  /** One honest ending for every payment outcome. */
  _finishPayment(res, trackingToken) {
    const rtl = isRtl();
    if (res.settled) {
      showToast(rtl ? "تم استلام الدفع — شكراً لك!" : "Payment received — thank you!", "success", 5000);
    } else if (res.status === "pending" || res.status === "processing" || res.status === "unknown") {
      // A slow bank is a legitimate outcome, not a failure. The webhook will
      // still settle it; the order is already recorded either way.
      showToast(rtl
        ? "الدفع قيد المعالجة. طلبك مسجّل وسنحدّث حالته فور تأكيد البنك."
        : "Payment is still processing. Your order is placed — we'll update it as soon as the bank confirms.", "warning", 8000);
    } else {
      showToast(rtl
        ? "لم يكتمل الدفع. طلبك مسجّل كغير مدفوع — يمكنك الدفع عند الاستلام أو المحاولة مرة أخرى."
        : "Payment was not completed. Your order is placed as unpaid — pay on delivery, or try again from the tracking page.", "error", 9000);
    }
    const token = trackingToken || (res.order && res.order.trackingToken);
    if (token) router.navigate("tracking", { token });
    else router.navigate("home");
  },

  // ── Totals ────────────────────────────────────────────────────────────────

  /**
   * One place for the arithmetic the three views used to duplicate.
   * Advisory only — the server re-prices every order from its own product
   * rows, and Stripe is charged from that stored total, never from here.
   */
  _totals(state) {
    const isDineIn = state.orderType === "dine_in";
    const deliveryFee = isDineIn ? 0 : (parseFloat(pages.menu?._storeConfig?.deliveryFee) || 0);
    const discount = parseFloat(state.discountAmount || 0) || 0;
    const subtotal = parseFloat(state.subtotal) || 0;
    const gross = Math.max(0, subtotal - discount) + deliveryFee;
    const balance = Math.max(0, parseFloat(pages.checkout._walletBalance) || 0);
    const wallet = pages.checkout._paymentMethod === "wallet" ? Math.min(balance, gross) : 0;
    return { isDineIn, subtotal, discount, deliveryFee, gross, wallet, total: Math.max(0, gross - wallet) };
  },

  _buildLayout(cfg, rtl, state) {
    const isDineIn = state.orderType === "dine_in";
    const payReady = pages.checkout._payReady;

    return `
<div class="checkout-page">
  <div class="top-bar">
    <button class="top-bar__icon" onclick="history.back()">${rtl ? "›" : "‹"}</button>
    <span class="top-bar__title">${rtl ? "إتمام الطلب" : "Checkout"}</span>
  </div>

  ${isDineIn ? `
  <!-- Dine-in banner -->
  <div class="dine-in-checkout-banner">
    <div class="dine-in-checkout-banner__icon">🍽</div>
    <div>
      <div class="dine-in-checkout-banner__title">${rtl ? "طلب من الطاولة" : "Dine-in Order"}</div>
      <div class="dine-in-checkout-banner__table">${state.tableName || "Table"}</div>
    </div>
  </div>
  ` : ""}

  <!-- Step indicator -->
  <div class="checkout-step-indicator-bar">
    <div class="step-indicator">
      ${isDineIn ? "" : `
      <div class="step active" id="step-ind-1">
        <div class="step__dot">1</div>
        <div class="step__label">${rtl ? "العنوان" : "Address"}</div>
      </div>`}
      <div class="step ${isDineIn ? "active" : ""}" id="step-ind-2">
        <div class="step__dot">${isDineIn ? "1" : "2"}</div>
        <div class="step__label">${rtl ? "الدفع" : "Payment"}</div>
      </div>
      <div class="step" id="step-ind-3">
        <div class="step__dot">${isDineIn ? "2" : "3"}</div>
        <div class="step__label">${rtl ? "تأكيد" : "Review"}</div>
      </div>
    </div>
  </div>

  <div class="checkout-layout">
    <div id="checkout-steps">
      <!-- Step 1: Address (hidden for dine-in) -->
      <div id="step-1" class="checkout-step" ${isDineIn ? 'style="display:none"' : ""}>
        <div class="checkout-step__header">
          <div class="checkout-step__num">1</div>
          <div>
            <div class="checkout-step__title">${rtl ? "عنوان التوصيل" : "Delivery address"}</div>
            <div class="checkout-step__subtitle">${rtl ? "أين نوصل الطلب؟" : "Where should we deliver?"}</div>
          </div>
        </div>
        <div class="checkout-step__body">
          <div id="checkout-map"></div>

          ${pages.checkout._savedAddresses.length > 0 ? `
          <div class="checkout-saved-addresses-wrap">
            <div class="form-label checkout-label-mb">${rtl ? "العناوين المحفوظة" : "Saved addresses"}</div>
            <div class="checkout-field-stack" id="saved-addresses">
              ${pages.checkout._savedAddresses.map(addr => `
                <div class="address-card ${addr.id === pages.checkout._address?.id ? "selected" : ""}"
                  onclick="pages.checkout._selectAddress(${addr.id})" data-addr-id="${addr.id}">
                  <div class="address-card__icon">${addr.label === "home" ? '<i data-lucide="home" class="icon-md"></i>' : addr.label === "work" ? '<i data-lucide="building-2" class="icon-md"></i>' : '<i data-lucide="map-pin" class="icon-md"></i>'}</div>
                  <div>
                    <div class="address-card__label">${addr.label || "Address"}</div>
                    <div class="address-card__text">${addr.address}</div>
                  </div>
                </div>`).join("")}
            </div>
          </div>
          <div class="auth-divider">${rtl ? "أو أدخل عنواناً جديداً" : "or enter new address"}</div>
          ` : ""}

          <div class="checkout-field-stack">
            <div class="form-group">
              <label class="form-label" for="addr-street">${rtl ? "الشارع / العقار" : "Street address"}</label>
              <input id="addr-street" class="form-input" placeholder="${rtl ? "مثال: 12 شارع النيل" : "e.g. 12 Main Street"}" value="${pages.checkout._address?.address || ""}" />
            </div>
            <div class="checkout-two-col">
              <div class="form-group">
                <label class="form-label" for="addr-apt">${rtl ? "الشقة/الطابق" : "Apartment/Floor"}</label>
                <input id="addr-apt" class="form-input" placeholder="${rtl ? "شقة 3" : "Apt 3"}" value="${pages.checkout._address?.floor || ""}" />
              </div>
              <div class="form-group">
                <label class="form-label" for="addr-notes">${rtl ? "تعليمات إضافية" : "Delivery notes"}</label>
                <input id="addr-notes" class="form-input" placeholder="${rtl ? "مثال: رن الجرس" : "Ring the bell"}" value="${pages.checkout._address?.notes || ""}" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="addr-phone">${rtl ? "رقم الهاتف" : "Phone number"}</label>
              <input id="addr-phone" class="form-input" type="tel" placeholder="${cfg.phonePlaceholder || cfg.supportPhone || ""}" value="${auth.getCustomer()?.phone || ""}" />
            </div>
          </div>

          <!-- Scheduled delivery -->
          <div class="divider"></div>
          <div class="toggle-row">
            <div>
              <div class="toggle-row__label">${rtl ? "جدولة الطلب" : "Schedule delivery"}</div>
              <div class="toggle-row__sub">${rtl ? "اختر وقتاً لاحقاً" : "Choose a later time"}</div>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" id="schedule-toggle" onchange="pages.checkout._toggleSchedule(this.checked)">
              <span class="toggle-switch__track"></span>
            </label>
          </div>
          <div id="schedule-picker" class="hidden checkout-schedule-picker">
            <div class="checkout-two-col">
              <div class="form-group">
                <label class="form-label">${rtl ? "التاريخ" : "Date"}</label>
                <input type="date" id="schedule-date" class="form-input" min="${new Date().toISOString().split("T")[0]}" />
              </div>
              <div class="form-group">
                <label class="form-label">${rtl ? "الوقت" : "Time"}</label>
                <input type="time" id="schedule-time" class="form-input" min="09:00" max="23:00" />
              </div>
            </div>
          </div>

          <button class="btn btn-primary btn-full checkout-btn-next" onclick="pages.checkout._nextStep(2)">
            ${rtl ? "التالي: طريقة الدفع" : "Next: Payment method"} →
          </button>
        </div>
      </div>

      <!-- Step 2: Payment -->
      <div id="step-2" class="checkout-step ${isDineIn ? "" : "hidden"}">
        <div class="checkout-step__header">
          <div class="checkout-step__num">${isDineIn ? "1" : "2"}</div>
          <div>
            <div class="checkout-step__title">${isDineIn ? (rtl ? "بيانات الطلب والدفع" : "Order Info & Payment") : (rtl ? "طريقة الدفع" : "Payment method")}</div>
            <div class="checkout-step__subtitle">${rtl ? "لن يتم خصم أي مبلغ قبل تأكيدك" : "Nothing is charged until you confirm"}</div>
          </div>
        </div>
        <div class="checkout-step__body">
          ${isDineIn ? `
          <div class="checkout-field-stack" style="margin-bottom:16px">
            <div class="form-group">
              <label class="form-label" for="dinein-name">${rtl ? "الاسم (اختياري)" : "Your name (optional)"}</label>
              <input id="dinein-name" class="form-input" placeholder="${rtl ? "اسمك" : "Your name"}" value="${auth.getCustomer()?.name || ""}" />
            </div>
            <div class="form-group">
              <label class="form-label" for="dinein-phone">${rtl ? "رقم الهاتف" : "Phone number"}</label>
              <input id="dinein-phone" class="form-input" type="tel" placeholder="${cfg.phonePlaceholder || cfg.supportPhone || ""}" value="${auth.getCustomer()?.phone || ""}" />
            </div>
          </div>
          ` : ""}
          <div class="checkout-field-stack">
            <div class="payment-option selected" data-method="cod" onclick="pages.checkout._selectPayment('cod', this)">
              <div class="payment-option__radio"></div>
              <div class="payment-option__icon"><i data-lucide="banknote" class="icon-lg"></i></div>
              <div>
                <div class="payment-option__label">${isDineIn ? (rtl ? "الدفع عند الكاشير" : "Pay at the counter") : (rtl ? "الدفع عند الاستلام" : "Cash on delivery")}</div>
                <div class="payment-option__desc">${isDineIn ? (rtl ? "ادفع للموظف بعد الطلب" : "Settle with staff after ordering") : (rtl ? "ادفع نقداً عند استلام طلبك" : "Pay when your order arrives")}</div>
              </div>
            </div>

            ${payReady ? `
            <!-- Offered only when Stripe is reachable and configured, so this
                 option can never lead to a charge that silently does nothing. -->
            <div class="payment-option" data-method="card" onclick="pages.checkout._selectPayment('card', this)">
              <div class="payment-option__radio"></div>
              <div class="payment-option__icon"><i data-lucide="credit-card" class="icon-lg"></i></div>
              <div>
                <div class="payment-option__label">${rtl ? "الدفع الآن" : "Pay now"}</div>
                <div class="payment-option__desc">${pages.checkout._onlineMethodsLabel()}</div>
              </div>
            </div>` : ""}

            ${auth.getCustomer() ? `
            <div class="payment-option" data-method="wallet" onclick="pages.checkout._selectPayment('wallet', this)">
              <div class="payment-option__radio"></div>
              <div class="payment-option__icon"><i data-lucide="wallet" class="icon-lg"></i></div>
              <div>
                <div class="payment-option__label">${rtl ? "المحفظة" : "Wallet"}</div>
                <div class="payment-option__desc" id="wallet-balance-label">${rtl ? "يتم تحميل الرصيد..." : "Loading balance…"}</div>
              </div>
            </div>` : ""}
          </div>

          ${payReady ? "" : `
          <div class="checkout-pay-note">${rtl
            ? "الدفع الإلكتروني غير متاح حالياً. يمكنك إتمام الطلب والدفع عند الاستلام."
            : "Online payment is unavailable right now. You can still place your order and pay on delivery."}</div>`}

          <div id="pay-method-note" class="checkout-pay-note hidden"></div>

          <div class="checkout-step-nav">
            ${isDineIn ? `
            <button class="btn btn-ghost flex-1" onclick="history.back()">
              ${rtl ? "← رجوع للقائمة" : "← Back to menu"}
            </button>
            ` : `
            <button class="btn btn-ghost flex-1" onclick="pages.checkout._prevStep(1)">
              ${rtl ? "← السابق" : "← Back"}
            </button>
            `}
            <button class="btn btn-primary flex-1" onclick="pages.checkout._nextStep(3)">
              ${rtl ? "مراجعة الطلب" : "Review order"} →
            </button>
          </div>
        </div>
      </div>

      <!-- Step 3: Review & Place -->
      <div id="step-3" class="checkout-step hidden">
        <div class="checkout-step__header">
          <div class="checkout-step__num">${isDineIn ? "2" : "3"}</div>
          <div>
            <div class="checkout-step__title">${rtl ? "مراجعة وتأكيد الطلب" : "Review & place order"}</div>
          </div>
        </div>
        <div class="checkout-step__body">
          <div id="review-content"></div>
          <div class="checkout-step-nav">
            <button class="btn btn-ghost flex-1" onclick="pages.checkout._prevStep(2)">
              ${rtl ? "← السابق" : "← Back"}
            </button>
            <button class="btn btn-primary flex-1 btn-lg" id="place-order-btn" onclick="pages.checkout._placeOrder()">
              ${rtl ? "تأكيد الطلب" : "Place order"} <i data-lucide="check-circle" class="icon-sm"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Step 4: Pay. Only reached once the order exists server-side, so the
           amount below comes from the server, never from this page. There is
           no way back to step 3 from here: the order is already placed. -->
      <div id="step-4" class="checkout-step hidden">
        <div class="checkout-step__header">
          <div class="checkout-step__num"><i data-lucide="lock" class="icon-sm"></i></div>
          <div>
            <div class="checkout-step__title">${rtl ? "الدفع الآمن" : "Secure payment"}</div>
            <div class="checkout-step__subtitle">${rtl ? "خطوة أخيرة لتأكيد طلبك" : "One last step to confirm your order"}</div>
          </div>
        </div>
        <div class="checkout-step__body">
          <div class="pay-panel">
            <div class="pay-order-badge">
              <div class="pay-order-badge__icon"><i data-lucide="receipt" class="icon-sm"></i></div>
              <div>
                <strong>${rtl ? "تم تسجيل طلبك" : "Your order is placed"} <span id="pay-order-number"></span></strong>
                ${rtl ? "أكمل الدفع لتأكيده، أو ادفع لاحقاً عند الاستلام." : "Complete payment to confirm it — or pay later on delivery."}
              </div>
            </div>

            <div class="pay-amount-row">
              <span>${rtl ? "المبلغ المستحق" : "Amount due"}</span>
              <strong id="pay-amount">—</strong>
            </div>

            <div id="pay-element" class="pay-element"></div>
            <div id="pay-error" class="pay-error hidden"></div>

            <div class="pay-actions">
              <button class="btn btn-primary btn-full btn-lg" id="pay-submit" disabled
                onclick="pages.checkout._confirmPayment()">${rtl ? "جارٍ التحميل..." : "Loading…"}</button>
              <button class="btn btn-ghost btn-full" onclick="pages.checkout._payLater()">
                ${rtl ? "سأدفع عند الاستلام" : "I'll pay on delivery instead"}
              </button>
            </div>

            <div class="pay-note">
              <i data-lucide="shield-check" class="icon-xs"></i>
              <span>${rtl
                ? "تتم معالجة الدفع بواسطة Stripe. لا نرى بيانات بطاقتك، ولا يُعتبر الطلب مدفوعاً إلا بعد تأكيد البنك."
                : "Payments are handled by Stripe — we never see your card details. Your order is only marked paid once your bank confirms it."}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Aside: order summary -->
    <div class="cart-aside desktop-only">
      <div class="card">
        <div class="checkout-summary-header">${rtl ? "ملخص طلبك" : "Order summary"}</div>
        <div class="card-body" id="order-summary-aside"></div>
      </div>
    </div>
  </div>
</div>`;
  },

  _initMap() {
    const mapEl = document.getElementById("checkout-map");
    if (!mapEl || !window.L) return;
    try {
      const cfg = window.DELIVERY_CONFIG || {};
      const defaultLat = cfg.defaultLat || 30, defaultLng = cfg.defaultLng || 31;
      const defaultZoom = (cfg.defaultLat && cfg.defaultLng) ? 14 : 5;
      pages.checkout._map = L.map(mapEl, { zoomControl: true }).setView([defaultLat, defaultLng], defaultZoom);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(pages.checkout._map);
      // Only place marker if we have a meaningful default position
      const markerLat = cfg.defaultLat || defaultLat;
      const markerLng = cfg.defaultLng || defaultLng;
      pages.checkout._marker = L.marker([markerLat, markerLng], { draggable: true }).addTo(pages.checkout._map);
      pages.checkout._marker.on("dragend", () => {
        const pos = pages.checkout._marker.getLatLng();
        if (!pages.checkout._address) pages.checkout._address = {};
        pages.checkout._address.lat = pos.lat;
        pages.checkout._address.lng = pos.lng;
        pages.checkout._reverseGeocode(pos.lat, pos.lng);
      });
      // Also update on map click
      pages.checkout._map.on("click", (e) => {
        const lat = e.latlng.lat, lng = e.latlng.lng;
        pages.checkout._marker.setLatLng([lat, lng]);
        if (!pages.checkout._address) pages.checkout._address = {};
        pages.checkout._address.lat = lat;
        pages.checkout._address.lng = lng;
        pages.checkout._reverseGeocode(lat, lng);
      });
      // Try geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
          const lat = pos.coords.latitude, lng = pos.coords.longitude;
          pages.checkout._map.setView([lat, lng], 16);
          pages.checkout._marker.setLatLng([lat, lng]);
          if (!pages.checkout._address) pages.checkout._address = {};
          pages.checkout._address.lat = lat;
          pages.checkout._address.lng = lng;
          pages.checkout._reverseGeocode(lat, lng);
        }, () => {});
      }
    } catch(e) {}
  },

  /** Reverse geocode lat/lng using Nominatim and fill address fields */
  _reverseGeocode(lat, lng) {
    const lang = document.documentElement.lang || "en";
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=${lang}&addressdetails=1`)
      .then(r => r.json())
      .then(data => {
        if (!data || data.error) return;
        const addr = data.address || {};
        // Build street address from components
        const road = addr.road || addr.pedestrian || addr.footway || "";
        const houseNumber = addr.house_number || "";
        const neighbourhood = addr.neighbourhood || addr.suburb || addr.district || "";
        const city = addr.city || addr.town || addr.village || "";
        // Compose a readable street address
        let street = "";
        if (houseNumber && road) street = houseNumber + " " + road;
        else if (road) street = road;
        if (neighbourhood) street += (street ? "، " : "") + neighbourhood;
        if (city) street += (street ? "، " : "") + city;

        const streetEl = document.getElementById("addr-street");
        if (streetEl && street) {
          streetEl.value = street;
          streetEl.classList.remove("form-input--error");
          const errEl = streetEl.parentElement.querySelector(".form-error");
          if (errEl) errEl.remove();
        }
        // Update internal address state
        if (!pages.checkout._address) pages.checkout._address = {};
        if (street) pages.checkout._address.address = street;
      })
      .catch(() => {});
  },

  _selectAddress(addrId) {
    const addr = pages.checkout._savedAddresses.find(a => a.id === addrId);
    if (!addr) return;
    pages.checkout._address = addr;
    document.querySelectorAll("[data-addr-id]").forEach(el => {
      el.classList.toggle("selected", Number(el.dataset.addrId) === addrId);
    });
    const streetEl = document.getElementById("addr-street");
    if (streetEl) streetEl.value = addr.address || "";
    if (addr.lat && addr.lng && pages.checkout._map && pages.checkout._marker) {
      pages.checkout._map.setView([addr.lat, addr.lng], 16);
      pages.checkout._marker.setLatLng([addr.lat, addr.lng]);
    }
  },

  _toggleSchedule(enabled) {
    const picker = document.getElementById("schedule-picker");
    if (picker) picker.classList.toggle("hidden", !enabled);
    if (!enabled) pages.checkout._scheduledAt = null;
  },

  _selectPayment(method, el) {
    pages.checkout._paymentMethod = method;
    document.querySelectorAll(".payment-option").forEach(o => {
      o.classList.toggle("selected", o.dataset.method === method);
    });
    pages.checkout._updatePayNote();
  },

  /** Say exactly what the chosen method will do. No claim the code cannot keep. */
  _updatePayNote() {
    const noteEl = document.getElementById("pay-method-note");
    if (!noteEl) return;
    const rtl = isRtl();
    const cur = pages.checkout._currency();
    const t = pages.checkout._totals(cart.getState());
    const fc = (n) => `<strong>${formatCurrency(n, cur)}</strong>`;
    let html = "";

    if (pages.checkout._paymentMethod === "card") {
      html = rtl
        ? `سنسجّل طلبك أولاً، ثم تدفع ${fc(t.total)} بأمان عبر Stripe. لا يُخصم أي مبلغ قبل تأكيدك.`
        : `We create your order first, then you pay ${fc(t.total)} securely through Stripe. Nothing is charged until you confirm.`;
    } else if (pages.checkout._paymentMethod === "wallet") {
      if (t.wallet <= 0) {
        html = rtl
          ? "رصيد محفظتك فارغ — سيُدفع كامل المبلغ عند الاستلام."
          : "Your wallet is empty — the full amount will be due on delivery.";
      } else if (t.wallet < t.gross) {
        html = rtl
          ? `سيُخصم ${fc(t.wallet)} من محفظتك، والباقي ${fc(t.gross - t.wallet)} يُدفع عند الاستلام.`
          : `${fc(t.wallet)} comes off your wallet; the remaining ${fc(t.gross - t.wallet)} is due on delivery.`;
      } else {
        html = rtl ? "رصيد محفظتك يغطي الطلب بالكامل." : "Your wallet covers the whole order.";
      }
    }

    noteEl.innerHTML = html;
    noteEl.classList.toggle("hidden", !html);
  },

  /** Wallet balance drives both the label and the amount we actually deduct. */
  _loadWalletBalance() {
    const customer = auth.getCustomer();
    if (!customer) return;
    api.wallet.get(customer.id).then(w => {
      pages.checkout._walletBalance = parseFloat(w.balance) || 0;
      const lbl = document.getElementById("wallet-balance-label");
      if (lbl) lbl.textContent = formatCurrency(pages.checkout._walletBalance, pages.checkout._currency());
      pages.checkout._updatePayNote();
    }).catch(() => {
      const lbl = document.getElementById("wallet-balance-label");
      if (lbl) lbl.textContent = isRtl() ? "تعذّر تحميل الرصيد" : "Balance unavailable";
    });
  },

  _validateField(id, msg) {
    const el = document.getElementById(id);
    if (!el) return false;
    const val = el.value.trim();
    if (!val) {
      el.classList.add("form-input--error");
      let errEl = el.parentElement.querySelector(".form-error");
      if (!errEl) {
        errEl = document.createElement("div");
        errEl.className = "form-error";
        el.parentElement.appendChild(errEl);
      }
      errEl.textContent = msg;
      return false;
    }
    el.classList.remove("form-input--error");
    const errEl = el.parentElement.querySelector(".form-error");
    if (errEl) errEl.remove();
    return true;
  },

  _initFieldValidation() {
    const rtl = isRtl();
    const fields = [
      { id: "addr-street", msg: rtl ? "أدخل عنواناً" : "Address is required" },
      { id: "addr-phone", msg: rtl ? "أدخل رقم الهاتف" : "Phone is required" },
    ];
    fields.forEach(f => {
      const el = document.getElementById(f.id);
      if (el) {
        el.addEventListener("blur", () => pages.checkout._validateField(f.id, f.msg));
        el.addEventListener("input", () => {
          if (el.value.trim()) {
            el.classList.remove("form-input--error");
            const errEl = el.parentElement.querySelector(".form-error");
            if (errEl) errEl.remove();
          }
        });
      }
    });
  },

  _nextStep(step) {
    if (step === 2) {
      const rtl = isRtl();
      // Validate address with inline errors
      const streetOk = pages.checkout._validateField("addr-street", rtl ? "أدخل عنواناً" : "Address is required");
      const phoneOk = pages.checkout._validateField("addr-phone", rtl ? "أدخل رقم الهاتف" : "Phone is required");
      if (!streetOk || !phoneOk) return;

      const street = document.getElementById("addr-street")?.value.trim();
      const phone = document.getElementById("addr-phone")?.value.trim();

      pages.checkout._address = {
        ...pages.checkout._address,
        address: street,
        floor: document.getElementById("addr-apt")?.value.trim() || "",
        notes: document.getElementById("addr-notes")?.value.trim() || "",
        phone,
      };

      // Scheduled
      const schedToggle = document.getElementById("schedule-toggle");
      if (schedToggle?.checked) {
        const d = document.getElementById("schedule-date")?.value;
        const t = document.getElementById("schedule-time")?.value;
        if (d && t) pages.checkout._scheduledAt = new Date(d + "T" + t).toISOString();
      }

      pages.checkout._updatePayNote();
    }

    if (step === 3) {
      pages.checkout._buildReview();
    }

    // Update step UI
    document.getElementById(`step-${pages.checkout._step}`)?.classList.add("hidden");
    pages.checkout._step = step;
    document.getElementById(`step-${step}`)?.classList.remove("hidden");
    pages.checkout._updateStepIndicator(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (window.lucide) window.lucide.createIcons();
  },

  _prevStep(step) {
    document.getElementById(`step-${pages.checkout._step}`)?.classList.add("hidden");
    pages.checkout._step = step;
    document.getElementById(`step-${step}`)?.classList.remove("hidden");
    pages.checkout._updateStepIndicator(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  },

  _updateStepIndicator(activeStep) {
    for (let i = 1; i <= 3; i++) {
      const ind = document.getElementById(`step-ind-${i}`);
      if (!ind) continue;
      ind.classList.toggle("active", i === activeStep);
      ind.classList.toggle("done", i < activeStep);
    }
  },

  _buildReview() {
    const rtl = isRtl();
    const cur = pages.checkout._currency();
    const state = cart.getState();
    const t = pages.checkout._totals(state);
    const addr = pages.checkout._address;
    const payOnline = pages.checkout._paymentMethod === "card";
    const paymentLabels = {
      cod: t.isDineIn ? (rtl ? "الدفع عند الكاشير" : "Pay at the counter") : (rtl ? "الدفع عند الاستلام" : "Cash on delivery"),
      card: (rtl ? "الدفع الآن — " : "Pay now — ") + pages.checkout._onlineMethodsLabel(),
      wallet: rtl ? "المحفظة" : "Wallet",
    };
    const reviewEl = document.getElementById("review-content");
    if (!reviewEl) return;
    reviewEl.innerHTML = `
      <h4 class="checkout-review-heading">${rtl ? "العناصر" : "Items"}</h4>
      ${state.items.map(item => `
        <div class="checkout-review-item">
          <span>${item.qty}× ${item.name}</span>
          <strong>${formatCurrency(item.price * item.qty, cur)}</strong>
        </div>`).join("")}
      ${t.isDineIn ? "" : `
      <div class="checkout-review-section">
        <h4 class="checkout-review-heading">${rtl ? "التوصيل إلى" : "Delivering to"}</h4>
        <div class="checkout-review-address-text">${addr?.address || "—"}${addr?.floor ? ", " + addr.floor : ""}</div>
        ${pages.checkout._scheduledAt ? `<div class="badge badge-info mt-sm"><i data-lucide="calendar" class="icon-xs"></i> ${new Date(pages.checkout._scheduledAt).toLocaleString()}</div>` : ""}
      </div>`}
      <div class="checkout-review-section">
        <h4 class="checkout-review-heading">${rtl ? "طريقة الدفع" : "Payment"}</h4>
        <div>${paymentLabels[pages.checkout._paymentMethod] || "—"}</div>
      </div>
      <div class="divider"></div>
      <div class="summary-row"><span class="label">${rtl ? "المجموع" : "Subtotal"}</span><strong>${formatCurrency(t.subtotal, cur)}</strong></div>
      ${t.deliveryFee > 0 ? `<div class="summary-row"><span class="label">${rtl ? "التوصيل" : "Delivery"}</span><strong>${formatCurrency(t.deliveryFee, cur)}</strong></div>` : ""}
      ${t.discount > 0 ? `<div class="summary-row discount"><span class="label">${rtl ? "خصم" : "Discount"}</span><strong>−${formatCurrency(t.discount, cur)}</strong></div>` : ""}
      ${t.wallet > 0 ? `<div class="summary-row discount"><span class="label">${rtl ? "من المحفظة" : "From wallet"}</span><strong>−${formatCurrency(t.wallet, cur)}</strong></div>` : ""}
      <div class="summary-row total"><span>${rtl ? "الإجمالي" : "Total"}</span><strong>${formatCurrency(t.total, cur)}</strong></div>
      ${payOnline ? `
      <div class="checkout-pay-note">${rtl
        ? "بعد التأكيد سنسجّل طلبك ثم ننقلك لشاشة الدفع الآمن."
        : "After you confirm, we record your order and take you to the secure payment step."}</div>` : ""}
    `;

    // Say what the button actually does next.
    const btn = document.getElementById("place-order-btn");
    if (btn) {
      btn.innerHTML = payOnline
        ? `${rtl ? "المتابعة إلى الدفع" : "Continue to payment"} <i data-lucide="arrow-right" class="icon-sm"></i>`
        : `${rtl ? "تأكيد الطلب" : "Place order"} <i data-lucide="check-circle" class="icon-sm"></i>`;
    }
  },

  _renderOrderSummary(cfg, rtl, state) {
    const summaryEl = document.getElementById("order-summary-aside");
    if (!summaryEl) return;
    const cur = pages.checkout._currency();
    const t = pages.checkout._totals(state);
    summaryEl.innerHTML = `
      ${state.items.map(item => `
        <div class="checkout-summary-item">
          <span class="checkout-summary-item-name">${item.qty}× ${item.name}</span>
          <span class="checkout-summary-item-price">${formatCurrency(item.price * item.qty, cur)}</span>
        </div>`).join("")}
      <div class="checkout-summary-totals">
        <div class="summary-row"><span class="label">${rtl ? "المجموع" : "Subtotal"}</span><strong>${formatCurrency(t.subtotal, cur)}</strong></div>
        ${t.isDineIn ? "" : (t.deliveryFee > 0
          ? `<div class="summary-row"><span class="label">${rtl ? "التوصيل" : "Delivery"}</span><strong>${formatCurrency(t.deliveryFee, cur)}</strong></div>`
          : `<div class="summary-row"><span class="label">${rtl ? "التوصيل" : "Delivery"}</span><strong class="checkout-free-delivery">${rtl ? "مجاني" : "Free"}</strong></div>`)}
        ${t.discount > 0 ? `<div class="summary-row discount"><span class="label">${rtl ? "خصم" : "Discount"}</span><strong>−${formatCurrency(t.discount, cur)}</strong></div>` : ""}
        <div class="summary-row total"><span>${rtl ? "الإجمالي" : "Total"}</span><strong>${formatCurrency(t.gross, cur)}</strong></div>
      </div>
    `;
  },

  // ── Placing the order ─────────────────────────────────────────────────────

  /**
   * Create the order, then — and only then — charge for it.
   *
   * The reverse of the old flow, which confirmed a browser-computed total with
   * Stripe before the order existed. Nothing below sends an amount to the
   * payment API: /api/payments/order/:id/intent prices the intent from the
   * stored order, and the server re-prices that order from its own product
   * rows regardless of what this payload claims.
   */
  async _placeOrder() {
    if (pages.checkout._submitting) return;
    // The order already exists — never create a second one for the same cart.
    // Re-open the payment step instead.
    if (pages.checkout._order) { await pages.checkout._openPayStep(); return; }
    const cfg = window.DELIVERY_CONFIG || {};
    const rtl = isRtl();
    const state = cart.getState();
    const btn = document.getElementById("place-order-btn");
    const addr = pages.checkout._address || {};
    const t = pages.checkout._totals(state);
    const isDineIn = t.isDineIn;
    const payOnline = pages.checkout._paymentMethod === "card";

    if (!isDineIn && !addr?.address) { showToast(rtl ? "أدخل عنواناً" : "Please enter address", "warning"); pages.checkout._prevStep(1); return; }

    // Fail closed. The old checkout guarded the card branch on Stripe having
    // loaded, so a failed load quietly placed an unpaid order while the
    // customer believed they had paid.
    if (payOnline && !pages.checkout._payReady) {
      showToast(rtl
        ? "الدفع الإلكتروني غير متاح حالياً — اختر طريقة دفع أخرى."
        : "Online payment is unavailable right now — please choose another method.", "error", 7000);
      pages.checkout._prevStep(2);
      return;
    }

    pages.checkout._submitting = true;
    if (btn) { btn.disabled = true; btn.classList.add("loading"); }
    // Show loading overlay
    const overlay = document.createElement("div");
    overlay.className = "checkout-loading-overlay";
    overlay.innerHTML = `<div class="loading-spinner"></div><p>${rtl ? "جاري تسجيل طلبك..." : "Placing your order…"}</p>`;
    document.querySelector(".checkout-page")?.appendChild(overlay);

    try {
      const customer = auth.getCustomer();

      // For dine-in, read name/phone from dine-in fields
      const dineInName = isDineIn ? (document.getElementById("dinein-name")?.value || "") : "";
      const dineInPhone = isDineIn ? (document.getElementById("dinein-phone")?.value || "") : "";

      const orderPayload = {
        tenantId: cfg.tenantId,
        slug: cfg.slug,
        customerId: customer?.id || null,
        customerName: isDineIn ? (dineInName || customer?.name || "Dine-in Guest") : (customer?.name || addr.name || "Guest"),
        customerPhone: isDineIn ? (dineInPhone || customer?.phone || "0000000000") : (addr.phone || customer?.phone || ""),
        customerEmail: customer?.email || null,
        orderType: state.orderType || "delivery",
        items: state.items.map(i => ({
          productId: i.productId,
          productName: i.name,
          unitPrice: parseFloat(i.price) || 0,
          quantity: i.qty,
          total: ((parseFloat(i.price) || 0) + (parseFloat(i.modifierPrice) || 0)) * i.qty,
          modifiers: i.modifiers || [],
        })),
        customerAddress: isDineIn ? "" : (addr.address || addr.street || ""),
        floor: isDineIn ? "" : (addr.floor || ""),
        buildingName: isDineIn ? "" : (addr.buildingName || ""),
        addressNotes: isDineIn ? "" : (addr.notes || ""),
        customerLat: isDineIn ? null : (addr.lat || null),
        customerLng: isDineIn ? null : (addr.lng || null),
        subtotal: t.subtotal,
        deliveryFee: t.deliveryFee,
        totalAmount: t.total,
        discountAmount: t.discount,
        promoCodeId: state.promoCodeId || null,
        paymentMethod: pages.checkout._paymentMethod,
        scheduledAt: pages.checkout._scheduledAt,
        notes: state.notes || "",
        sourceChannel: isDineIn ? "dine_in_qr" : "web",
        // Actually deduct what the customer chose to spend, capped at their
        // balance; the server verifies it against the wallet before charging.
        walletAmountUsed: t.wallet,
        language: document.documentElement.lang || "en",
        tableQrToken: state.tableQrToken || null,
        tableNumber: state.tableName || null,
      };

      const result = await api.orders.create(orderPayload);
      pages.checkout._order = {
        orderId: result.orderId || result.id,
        orderNumber: result.orderNumber || "",
        trackingToken: result.trackingToken || "",
      };
      cart.clear();

      const ov = document.querySelector(".checkout-loading-overlay");
      if (ov) ov.remove();

      // Online payment: hand over to the PaymentElement. A zero balance due
      // (wallet covered it) has nothing to charge, so skip straight to tracking.
      if (payOnline && t.total > 0) {
        await pages.checkout._openPayStep();
        return;
      }

      const token = pages.checkout._order.trackingToken || pages.checkout._order.orderId;
      router.navigate("tracking", { token });

    } catch (err) {
      // Only a failure to *create* the order may read as "order failed". Once
      // it exists, a later error belongs to the payment step, and saying the
      // order failed would be a lie the customer acts on.
      if (pages.checkout._order) {
        pages.checkout._payError(err.message || (rtl ? "تعذّر بدء عملية الدفع" : "Could not start payment"));
      } else {
        showToast(err.message || (rtl ? "فشل في إتمام الطلب" : "Failed to place order"), "error");
      }
    } finally {
      pages.checkout._submitting = false;
      if (btn) { btn.disabled = false; btn.classList.remove("loading"); }
      const ov = document.querySelector(".checkout-loading-overlay");
      if (ov) ov.remove();
    }
  },

  // ── Paying for it ─────────────────────────────────────────────────────────

  /**
   * Reveal the payment step and mount the PaymentElement into it.
   * The step is un-hidden *before* mounting on purpose: Stripe cannot measure
   * itself inside a display:none subtree, which is exactly how the old card
   * box rendered as an empty rectangle.
   */
  async _openPayStep() {
    const rtl = isRtl();
    const order = pages.checkout._order || {};

    document.getElementById(`step-${pages.checkout._step}`)?.classList.add("hidden");
    pages.checkout._step = 4;
    document.getElementById("step-4")?.classList.remove("hidden");
    pages.checkout._updateStepIndicator(4);
    const numEl = document.getElementById("pay-order-number");
    if (numEl) numEl.textContent = order.orderNumber ? `#${order.orderNumber}` : "";
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (window.lucide) window.lucide.createIcons();

    const payBtn = document.getElementById("pay-submit");
    const amountEl = document.getElementById("pay-amount");
    const elEl = document.getElementById("pay-element");

    try {
      const intent = await KassentaPay.createOrderIntent(order.orderId, order.trackingToken);
      // Minor units, priced server-side from the stored order.
      if (amountEl) {
        amountEl.textContent = formatCurrency((intent.amount || 0) / 100,
          (intent.currency || pages.checkout._currency()).toUpperCase());
      }
      await KassentaPay.mount(elEl, intent.clientSecret, {
        dark: pages.checkout._isDark(),
        primaryColor: pages.checkout._brandColor(),
        locale: document.documentElement.lang || "auto",
      });
      if (payBtn) {
        payBtn.disabled = false;
        payBtn.textContent = rtl ? "ادفع الآن" : "Pay now";
      }
    } catch (err) {
      pages.checkout._payError(err.message || (rtl ? "تعذّر بدء عملية الدفع" : "Could not start payment"));
      if (payBtn) payBtn.textContent = rtl ? "غير متاح" : "Unavailable";
    }
  },

  async _confirmPayment() {
    if (pages.checkout._paying) return;
    const rtl = isRtl();
    const order = pages.checkout._order || {};
    const btn = document.getElementById("pay-submit");
    pages.checkout._paying = true;
    pages.checkout._payError("");
    if (btn) { btn.disabled = true; btn.textContent = rtl ? "جارٍ المعالجة..." : "Processing…"; }

    try {
      // TWINT, PayPal, Klarna and any 3-D Secure card leave the page here and
      // return to this URL; render() picks the result up on the way back.
      const back = KassentaPay.returnUrl({
        order_id: order.orderId,
        tracking_token: order.trackingToken,
      });
      const intent = await KassentaPay.confirm(back);
      if (!intent) return; // redirected away; resumed on return

      if (btn) btn.textContent = rtl ? "جارٍ التأكيد..." : "Confirming…";
      // Stripe saying "succeeded" is not our record saying "paid" — only the
      // signed webhook writes that, so wait for it.
      const res = await KassentaPay.waitForSettlement(intent.id, { timeoutMs: 40000 });
      pages.checkout._finishPayment(res, order.trackingToken);
    } catch (err) {
      pages.checkout._payError(err.message || (rtl ? "فشل الدفع" : "Payment failed"));
      if (btn) { btn.disabled = false; btn.textContent = rtl ? "حاول مرة أخرى" : "Try again"; }
    } finally {
      pages.checkout._paying = false;
    }
  },

  /** Leaving without paying is allowed — as long as we say so plainly. */
  _payLater() {
    const rtl = isRtl();
    const order = pages.checkout._order || {};
    showToast(rtl
      ? "طلبك مسجّل كغير مدفوع. يمكنك الدفع عند الاستلام أو من صفحة التتبع."
      : "Your order is placed as unpaid. Pay on delivery, or pay later from the tracking page.", "warning", 8000);
    const token = order.trackingToken || order.orderId;
    if (token) router.navigate("tracking", { token });
    else router.navigate("home");
  },

  _payError(msg) {
    const el = document.getElementById("pay-error");
    if (!el) return;
    el.textContent = msg || "";
    el.classList.toggle("hidden", !msg);
  },
};
