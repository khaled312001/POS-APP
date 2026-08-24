/**
 * Kassenta shared browser payment helper.
 *
 * One implementation for every customer-facing surface: the unified customer
 * SPA (/customer/, which is also what the Android app wraps), the per-store
 * checkout (/order/:slug) and the storefront template.
 *
 * Two rules it exists to enforce:
 *
 *   1. **PaymentElement, never CardElement.** TWINT - the payment method that
 *      actually matters in Switzerland - and Link, Apple Pay and Google Pay are
 *      only offered by the PaymentElement. Which methods appear is then decided
 *      by the Stripe Dashboard, so enabling TWINT or PayPal there needs no
 *      deploy here.
 *
 *   2. **Never treat a redirect return as proof of payment.** TWINT, Klarna and
 *      3-D Secure all bounce the customer to another site and back, and the
 *      return URL is trivially forgeable. After the return we poll our own
 *      /api/payments/status, which only reports paid once the signed Stripe
 *      webhook has said so.
 *
 * Written as ES5-flavoured plain script on purpose: it is loaded by <script>
 * into three pages that have no bundler between them.
 */
(function () {
  "use strict";

  var STRIPE_JS = "https://js.stripe.com/v3/";
  var RETURN_FLAG = "kassenta_pay_return";

  var KassentaPay = {
    config: null,
    _stripe: null,
    _elements: null,
    _basePath: "",
  };

  function api(path, options) {
    var opts = options || {};
    return fetch(KassentaPay._basePath + path, {
      method: opts.method || "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    }).then(function (r) {
      return r.json().then(function (data) {
        if (!r.ok) {
          var err = new Error((data && data.error) || "Payment request failed");
          err.status = r.status;
          err.code = data && data.code;
          throw err;
        }
        return data;
      });
    });
  }

  /** Load Stripe.js once, on demand. */
  function loadStripeJs() {
    if (window.Stripe) return Promise.resolve(window.Stripe);
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[src="' + STRIPE_JS + '"]');
      if (existing) {
        existing.addEventListener("load", function () { resolve(window.Stripe); });
        existing.addEventListener("error", reject);
        return;
      }
      var s = document.createElement("script");
      s.src = STRIPE_JS;
      s.async = true;
      s.onload = function () { resolve(window.Stripe); };
      s.onerror = function () { reject(new Error("Could not load Stripe.js")); };
      document.head.appendChild(s);
    });
  }

  /**
   * Fetch gateway config. Deliberately fetched at runtime rather than baked
   * into the page or the APK bundle, so a key can be rotated without a release.
   */
  KassentaPay.init = function (opts) {
    var o = opts || {};
    KassentaPay._basePath = o.basePath || "";
    var qs = o.tenantId ? "?tenantId=" + encodeURIComponent(o.tenantId) : "";
    return api("/api/payments/config" + qs)
      .then(function (cfg) {
        KassentaPay.config = cfg;
        return cfg;
      })
      .catch(function (e) {
        // A checkout that cannot reach config must still offer cash.
        console.warn("[pay] config unavailable:", e.message);
        KassentaPay.config = null;
        return null;
      });
  };

  /** True when online payment can actually be offered right now. */
  KassentaPay.isAvailable = function () {
    var c = KassentaPay.config;
    return !!(c && c.stripe && c.stripe.status === "connected" && c.stripe.publishableKey);
  };

  /** Which methods the account offers, for labelling the button honestly. */
  KassentaPay.methods = function () {
    var c = KassentaPay.config;
    return (c && c.stripe && c.stripe.availableMethods) || [];
  };

  /**
   * Ask the server for this order's PaymentIntent.
   * The amount is never sent - the server reads it from the stored order.
   */
  KassentaPay.createOrderIntent = function (orderId, trackingToken) {
    return api("/api/payments/order/" + encodeURIComponent(orderId) + "/intent", {
      method: "POST",
      body: { trackingToken: trackingToken || "" },
    });
  };

  /**
   * Mount a PaymentElement into `container`.
   * Returns a promise resolving once the element is ready to be confirmed.
   */
  KassentaPay.mount = function (container, clientSecret, opts) {
    var o = opts || {};
    if (!KassentaPay.isAvailable()) {
      return Promise.reject(new Error("Online payment is not configured"));
    }
    return loadStripeJs().then(function (Stripe) {
      KassentaPay._stripe = Stripe(KassentaPay.config.stripe.publishableKey);

      var appearance = {
        theme: o.dark ? "night" : "stripe",
        variables: {
          colorPrimary: o.primaryColor || "#FF5722",
          borderRadius: "12px",
          fontFamily: o.fontFamily || "system-ui, -apple-system, Segoe UI, sans-serif",
        },
      };

      KassentaPay._elements = KassentaPay._stripe.elements({
        clientSecret: clientSecret,
        appearance: appearance,
        locale: o.locale || "auto",
      });

      var el = KassentaPay._elements.create("payment", {
        layout: "tabs",
        // Address is collected by our own form; asking twice is friction.
        fields: { billingDetails: { address: "never", name: "never", email: "never", phone: "never" } },
      });

      // The element cannot measure itself inside a display:none subtree, which
      // is how the legacy checkout silently rendered an empty box.
      if (container && container.offsetParent === null) {
        console.warn("[pay] payment container is hidden; Stripe cannot lay out inside it");
      }
      el.mount(container);

      return new Promise(function (resolve) {
        el.on("ready", function () { resolve(el); });
        // Never hang the checkout on a missing "ready".
        setTimeout(function () { resolve(el); }, 4000);
      });
    });
  };

  /**
   * Confirm the payment.
   *
   * `returnUrl` is mandatory for every redirect method (TWINT, Klarna, PayPal,
   * and any card that triggers 3-D Secure). Card payments that need no redirect
   * resolve here directly; everything else leaves the page and comes back.
   */
  KassentaPay.confirm = function (returnUrl, billing) {
    if (!KassentaPay._stripe || !KassentaPay._elements) {
      return Promise.reject(new Error("Payment form is not ready"));
    }
    var confirmParams = { return_url: returnUrl };
    if (billing) {
      confirmParams.payment_method_data = { billing_details: billing };
    }
    return KassentaPay._stripe
      .confirmPayment({
        elements: KassentaPay._elements,
        confirmParams: confirmParams,
        // Only redirect when the chosen method requires it.
        redirect: "if_required",
      })
      .then(function (result) {
        if (result.error) throw new Error(result.error.message || "Payment failed");
        return result.paymentIntent || null;
      });
  };

  /** Build a return URL that brings the customer back to this page. */
  KassentaPay.returnUrl = function (extraParams) {
    var url = new URL(window.location.href);
    url.searchParams.set(RETURN_FLAG, "1");
    Object.keys(extraParams || {}).forEach(function (k) {
      if (extraParams[k] != null) url.searchParams.set(k, String(extraParams[k]));
    });
    return url.toString();
  };

  /**
   * If the current page load is a return from a redirect payment, describe it.
   * Returns null on a normal page load.
   */
  KassentaPay.pendingReturn = function () {
    var params = new URLSearchParams(window.location.search);
    if (!params.get(RETURN_FLAG)) return null;
    return {
      paymentIntentId: params.get("payment_intent"),
      clientSecret: params.get("payment_intent_client_secret"),
      redirectStatus: params.get("redirect_status"),
      orderId: params.get("order_id"),
      trackingToken: params.get("tracking_token"),
    };
  };

  /** Remove the payment query params so a refresh does not re-trigger. */
  KassentaPay.clearReturn = function () {
    var url = new URL(window.location.href);
    [RETURN_FLAG, "payment_intent", "payment_intent_client_secret", "redirect_status",
     "order_id", "tracking_token"].forEach(function (k) { url.searchParams.delete(k); });
    window.history.replaceState({}, "", url.toString());
  };

  /**
   * Wait for our own database to report the order paid.
   *
   * This is the webhook-authoritative check. `redirect_status=succeeded` in the
   * URL means only that the customer's browser came back; the money is
   * confirmed when the signed event has been processed. Polls with a gentle
   * backoff and gives up rather than blocking the customer forever - a pending
   * order is a legitimate outcome for a slow bank.
   */
  KassentaPay.waitForSettlement = function (paymentIntentId, opts) {
    var o = opts || {};
    var deadline = Date.now() + (o.timeoutMs || 30000);
    var delay = 1000;

    function attempt() {
      return api("/api/payments/status/" + encodeURIComponent(paymentIntentId))
        .then(function (res) {
          var settled = res.order && res.order.paymentStatus === "paid";
          if (settled) return { settled: true, status: "paid", order: res.order };

          var dead = res.status === "canceled" ||
                     (res.order && res.order.paymentStatus === "failed");
          if (dead) return { settled: false, status: res.status, order: res.order };

          if (Date.now() >= deadline) {
            return { settled: false, status: "pending", order: res.order || null };
          }
          return new Promise(function (r) { setTimeout(r, delay); }).then(function () {
            delay = Math.min(delay * 1.5, 4000);
            return attempt();
          });
        })
        .catch(function () {
          if (Date.now() >= deadline) return { settled: false, status: "unknown", order: null };
          return new Promise(function (r) { setTimeout(r, delay); }).then(attempt);
        });
    }
    return attempt();
  };

  /**
   * The whole flow for an already-created order, for callers that just want it
   * to work: mount, confirm, and resolve once settled (or redirect away).
   */
  KassentaPay.payOrder = function (opts) {
    var o = opts || {};
    return KassentaPay.createOrderIntent(o.orderId, o.trackingToken)
      .then(function (intent) {
        return KassentaPay.mount(o.container, intent.clientSecret, o).then(function () {
          return intent;
        });
      })
      .then(function (intent) {
        if (o.onReady) o.onReady(intent);
        return intent;
      });
  };

  window.KassentaPay = KassentaPay;
})();
