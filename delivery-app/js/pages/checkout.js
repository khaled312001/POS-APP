/**
 * checkout.js — Multi-step checkout: Address → Payment → Confirm
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
  _stripe: null,
  _cardElement: null,
  _submitting: false,

  async render(params, container) {
    const cfg = window.DELIVERY_CONFIG || {};
    const rtl = isRtl();
    const state = cart.getState();

    if (state.items.length === 0) {
      router.navigate("cart");
      return;
    }

    const customer = auth.getCustomer();
    pages.checkout._step = 1;

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

    container.innerHTML = pages.checkout._buildLayout(cfg, rtl, state);

    pages.checkout._initMap();
    pages.checkout._renderOrderSummary(cfg, rtl, state);

    // Load Stripe
    if (cfg.stripePublishableKey) {
      loadStripe().then(Stripe => {
        pages.checkout._stripe = Stripe(cfg.stripePublishableKey);
        const elements = pages.checkout._stripe.elements();
        const card = elements.create("card", {
          style: {
            base: { fontSize: "16px", color: getComputedStyle(document.documentElement).getPropertyValue("--delivery-text").trim() || "#1A1A2E" }
          }
        });
        const cardEl = document.getElementById("stripe-card-element");
        if (cardEl) {
          card.mount(cardEl);
          pages.checkout._cardElement = card;
          card.on("focus", () => cardEl.style.borderColor = "var(--delivery-primary)");
          card.on("blur", () => cardEl.style.borderColor = "var(--delivery-border)");
        }
      }).catch(() => {});
    }
  },

  _buildLayout(cfg, rtl, state) {
    const deliveryFee = parseFloat(pages.menu?._storeConfig?.deliveryFee) || 0;
    const discount = parseFloat(state.discountAmount || 0);
    const subtotal = state.subtotal;
    const total = Math.max(0, subtotal - discount) + deliveryFee;

    return `
<div class="checkout-page">
  <div class="top-bar">
    <button class="top-bar__icon" onclick="history.back()">${rtl ? "›" : "‹"}</button>
    <span class="top-bar__title">${rtl ? "إتمام الطلب" : "Checkout"}</span>
  </div>

  <!-- Step indicator -->
  <div class="checkout-step-indicator-bar">
    <div class="step-indicator">
      <div class="step active" id="step-ind-1">
        <div class="step__dot">1</div>
        <div class="step__label">${rtl ? "العنوان" : "Address"}</div>
      </div>
      <div class="step" id="step-ind-2">
        <div class="step__dot">2</div>
        <div class="step__label">${rtl ? "الدفع" : "Payment"}</div>
      </div>
      <div class="step" id="step-ind-3">
        <div class="step__dot">3</div>
        <div class="step__label">${rtl ? "تأكيد" : "Review"}</div>
      </div>
    </div>
  </div>

  <div class="checkout-layout">
    <div id="checkout-steps">
      <!-- Step 1: Address -->
      <div id="step-1" class="checkout-step">
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
      <div id="step-2" class="checkout-step hidden">
        <div class="checkout-step__header">
          <div class="checkout-step__num">2</div>
          <div>
            <div class="checkout-step__title">${rtl ? "طريقة الدفع" : "Payment method"}</div>
          </div>
        </div>
        <div class="checkout-step__body">
          <div class="checkout-field-stack">
            <div class="payment-option selected" data-method="cod" onclick="pages.checkout._selectPayment('cod', this)">
              <div class="payment-option__radio"></div>
              <div class="payment-option__icon"><i data-lucide="banknote" class="icon-lg"></i></div>
              <div>
                <div class="payment-option__label">${rtl ? "الدفع عند الاستلام" : "Cash on delivery"}</div>
                <div class="payment-option__desc">${rtl ? "ادفع نقداً عند استلام طلبك" : "Pay when your order arrives"}</div>
              </div>
            </div>

            <div class="payment-option" data-method="card" onclick="pages.checkout._selectPayment('card', this)">
              <div class="payment-option__radio"></div>
              <div class="payment-option__icon"><i data-lucide="credit-card" class="icon-lg"></i></div>
              <div>
                <div class="payment-option__label">${rtl ? "بطاقة ائتمانية / مدى" : "Credit / Debit card"}</div>
                <div class="payment-option__desc">Visa · Mastercard · Meeza</div>
              </div>
            </div>

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

          <!-- Stripe card element -->
          <div id="stripe-card-wrapper" class="hidden checkout-stripe-wrapper">
            <div class="form-label checkout-label-mb">${rtl ? "بيانات البطاقة" : "Card details"}</div>
            <div id="stripe-card-element"></div>
          </div>

          <div class="checkout-step-nav">
            <button class="btn btn-ghost flex-1" onclick="pages.checkout._prevStep(1)">
              ${rtl ? "← السابق" : "← Back"}
            </button>
            <button class="btn btn-primary flex-1" onclick="pages.checkout._nextStep(3)">
              ${rtl ? "مراجعة الطلب" : "Review order"} →
            </button>
          </div>
        </div>
      </div>

      <!-- Step 3: Review & Place -->
      <div id="step-3" class="checkout-step hidden">
        <div class="checkout-step__header">
          <div class="checkout-step__num">3</div>
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
        }, () => {});
      }
    } catch(e) {}
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
    const cardWrapper = document.getElementById("stripe-card-wrapper");
    if (cardWrapper) cardWrapper.classList.toggle("hidden", method !== "card");
  },

  _nextStep(step) {
    if (step === 2) {
      // Validate address
      const street = document.getElementById("addr-street")?.value.trim();
      if (!street) { showToast(isRtl() ? "أدخل عنواناً" : "Please enter your address", "warning"); return; }
      const phone = document.getElementById("addr-phone")?.value.trim();
      if (!phone) { showToast(isRtl() ? "أدخل رقم الهاتف" : "Please enter phone number", "warning"); return; }

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

      // Load wallet balance
      const customer = auth.getCustomer();
      if (customer) {
        api.wallet.get(customer.id).then(w => {
          const lbl = document.getElementById("wallet-balance-label");
          if (lbl) lbl.textContent = formatCurrency(w.balance, (window.DELIVERY_CONFIG||{}).currency);
        }).catch(() => {});
      }
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
    const cfg = window.DELIVERY_CONFIG || {};
    const rtl = isRtl();
    const state = cart.getState();
    const deliveryFee = parseFloat(pages.menu?._storeConfig?.deliveryFee) || 0;
    const discount = parseFloat(state.discountAmount || 0);
    const total = Math.max(0, state.subtotal - discount) + deliveryFee;
    const addr = pages.checkout._address;
    const paymentLabels = { cod: rtl ? "الدفع عند الاستلام" : "Cash on delivery", card: rtl ? "بطاقة ائتمانية" : "Credit card", wallet: rtl ? "المحفظة" : "Wallet" };
    const reviewEl = document.getElementById("review-content");
    if (!reviewEl) return;
    reviewEl.innerHTML = `
      <h4 class="checkout-review-heading">${rtl ? "العناصر" : "Items"}</h4>
      ${state.items.map(item => `
        <div class="checkout-review-item">
          <span>${item.qty}× ${item.name}</span>
          <strong>${formatCurrency(item.price * item.qty, cfg.currency)}</strong>
        </div>`).join("")}
      <div class="checkout-review-section">
        <h4 class="checkout-review-heading">${rtl ? "التوصيل إلى" : "Delivering to"}</h4>
        <div class="checkout-review-address-text">${addr?.address || "—"}${addr?.floor ? ", " + addr.floor : ""}</div>
        ${pages.checkout._scheduledAt ? `<div class="badge badge-info mt-sm"><i data-lucide="calendar" class="icon-xs"></i> ${new Date(pages.checkout._scheduledAt).toLocaleString()}</div>` : ""}
      </div>
      <div class="checkout-review-section">
        <h4 class="checkout-review-heading">${rtl ? "طريقة الدفع" : "Payment"}</h4>
        <div>${paymentLabels[pages.checkout._paymentMethod] || "—"}</div>
      </div>
      <div class="divider"></div>
      <div class="summary-row"><span class="label">${rtl ? "المجموع" : "Subtotal"}</span><strong>${formatCurrency(state.subtotal, cfg.currency)}</strong></div>
      ${deliveryFee > 0 ? `<div class="summary-row"><span class="label">${rtl ? "التوصيل" : "Delivery"}</span><strong>${formatCurrency(deliveryFee, cfg.currency)}</strong></div>` : ""}
      ${discount > 0 ? `<div class="summary-row discount"><span class="label">${rtl ? "خصم" : "Discount"}</span><strong>−${formatCurrency(discount, cfg.currency)}</strong></div>` : ""}
      <div class="summary-row total"><span>${rtl ? "الإجمالي" : "Total"}</span><strong>${formatCurrency(total, cfg.currency)}</strong></div>
    `;
  },

  _renderOrderSummary(cfg, rtl, state) {
    const summaryEl = document.getElementById("order-summary-aside");
    if (!summaryEl) return;
    const deliveryFee = parseFloat(pages.menu?._storeConfig?.deliveryFee) || 0;
    const discount = parseFloat(state.discountAmount || 0);
    const total = Math.max(0, state.subtotal - discount) + deliveryFee;
    summaryEl.innerHTML = `
      ${state.items.map(item => `
        <div class="checkout-summary-item">
          <span class="checkout-summary-item-name">${item.qty}× ${item.name}</span>
          <span class="checkout-summary-item-price">${formatCurrency(item.price * item.qty, cfg.currency)}</span>
        </div>`).join("")}
      <div class="checkout-summary-totals">
        <div class="summary-row"><span class="label">${rtl ? "المجموع" : "Subtotal"}</span><strong>${formatCurrency(state.subtotal, cfg.currency)}</strong></div>
        ${deliveryFee > 0 ? `<div class="summary-row"><span class="label">${rtl ? "التوصيل" : "Delivery"}</span><strong>${formatCurrency(deliveryFee, cfg.currency)}</strong></div>` : `<div class="summary-row"><span class="label">${rtl ? "التوصيل" : "Delivery"}</span><strong class="checkout-free-delivery">${rtl ? "مجاني" : "Free"}</strong></div>`}
        ${discount > 0 ? `<div class="summary-row discount"><span class="label">${rtl ? "خصم" : "Discount"}</span><strong>−${formatCurrency(discount, cfg.currency)}</strong></div>` : ""}
        <div class="summary-row total"><span>${rtl ? "الإجمالي" : "Total"}</span><strong>${formatCurrency(total, cfg.currency)}</strong></div>
      </div>
    `;
  },

  async _placeOrder() {
    if (pages.checkout._submitting) return;
    const cfg = window.DELIVERY_CONFIG || {};
    const rtl = isRtl();
    const state = cart.getState();
    const btn = document.getElementById("place-order-btn");
    const addr = pages.checkout._address;

    if (!addr?.address) { showToast(rtl ? "أدخل عنواناً" : "Please enter address", "warning"); pages.checkout._prevStep(1); return; }

    pages.checkout._submitting = true;
    if (btn) btn.classList.add("loading");

    try {
      let paymentIntentId = null;

      // Stripe card payment
      if (pages.checkout._paymentMethod === "card" && pages.checkout._stripe && pages.checkout._cardElement) {
        const deliveryFee = parseFloat(pages.menu?._storeConfig?.deliveryFee) || 0;
        const discount = parseFloat(state.discountAmount || 0);
        const total = Math.max(0, state.subtotal - discount) + deliveryFee;
        const amountCents = Math.round(total * 100);
        // Create payment intent on backend
        const piResp = await apiFetch("/api/stripe/create-payment-intent", {
          method: "POST",
          body: JSON.stringify({ amount: amountCents, currency: cfg.currency || "egp", tenantId: cfg.tenantId }),
        }).catch(() => null);

        if (piResp?.clientSecret) {
          const { error, paymentIntent } = await pages.checkout._stripe.confirmCardPayment(piResp.clientSecret, {
            payment_method: { card: pages.checkout._cardElement }
          });
          if (error) throw new Error(error.message);
          paymentIntentId = paymentIntent.id;
        }
      }

      const customer = auth.getCustomer();
      const deliveryFee2 = parseFloat(pages.menu?._storeConfig?.deliveryFee) || 0;
      const discount2 = parseFloat(state.discountAmount || 0);

      const total2 = Math.max(0, state.subtotal - discount2) + deliveryFee2;
      const orderPayload = {
        tenantId: cfg.tenantId,
        slug: cfg.slug,
        customerId: customer?.id || null,
        customerName: customer?.name || addr.name || "Guest",
        customerPhone: addr.phone || customer?.phone || "",
        customerEmail: customer?.email || null,
        orderType: state.orderType || "delivery",
        items: state.items.map(i => ({
          productId: i.productId,
          productName: i.name,
          unitPrice: i.price,
          quantity: i.qty,
          modifiers: i.modifiers || [],
        })),
        customerAddress: addr.address || addr.street || "",
        floor: addr.floor || "",
        buildingName: addr.buildingName || "",
        addressNotes: addr.notes || "",
        customerLat: addr.lat || null,
        customerLng: addr.lng || null,
        subtotal: state.subtotal,
        deliveryFee: deliveryFee2,
        totalAmount: total2,
        discountAmount: discount2,
        promoCodeId: state.promoCodeId || null,
        paymentMethod: pages.checkout._paymentMethod,
        paymentIntentId,
        scheduledAt: pages.checkout._scheduledAt,
        notes: state.notes || "",
        sourceChannel: "web",
        walletAmountUsed: 0,
        language: document.documentElement.lang || "en",
      };

      const result = await api.orders.create(orderPayload);
      cart.clear();

      // Navigate to tracking
      const trackToken = result.trackingToken || result.orderId || result.id;
      router.navigate("tracking", { token: trackToken });

    } catch (err) {
      showToast(err.message || (rtl ? "فشل في إتمام الطلب" : "Failed to place order"), "error");
    } finally {
      pages.checkout._submitting = false;
      if (btn) btn.classList.remove("loading");
    }
  },
};
