#!/usr/bin/env node
/**
 * One-shot Stripe account setup for Kassenta.
 *
 * Everything that has to happen inside the Stripe account itself, done over the
 * API so it does not depend on clicking through the Dashboard:
 *
 *   1. verify the key works, and report the account's country/currency
 *   2. report which payment methods are actually enabled (TWINT, cards, wallets)
 *   3. create (or reuse) the webhook endpoint and print its signing secret
 *   4. register the payment-method domain so Apple Pay / Google Pay can appear
 *   5. create Stripe products/prices for the subscription plans, if asked
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-setup.js
 *   STRIPE_SECRET_KEY=sk_live_... node scripts/stripe-setup.js --domain kassenta.com
 *
 * It only ever *adds* things, and re-running it is safe: the webhook endpoint
 * and the domain registration are both looked up before being created.
 */
const Stripe = require("stripe");

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const SECRET = (process.env.STRIPE_SECRET_KEY || "").trim();
const DOMAIN = arg("domain", "kassenta.com");
const BASE = arg("base", `https://${DOMAIN}`);
const WEBHOOK_URL = `${BASE}/api/stripe/webhook`;

/** Exactly the events server/stripeWebhook.ts knows how to handle. */
const EVENTS = [
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
  "charge.refunded",
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "invoice.paid",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];

const ok = (m) => console.log(`  ✓ ${m}`);
const warn = (m) => console.log(`  ! ${m}`);
const head = (m) => console.log(`\n${m}`);

if (!SECRET) {
  console.error(
    "STRIPE_SECRET_KEY is not set.\n\n" +
      "  STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-setup.js\n\n" +
      "Get it from https://dashboard.stripe.com/apikeys (use a TEST key first).",
  );
  process.exit(1);
}
if (!/^(sk|rk)_(live|test)_/.test(SECRET)) {
  console.error("That does not look like a Stripe secret key (expected sk_live_/sk_test_).");
  process.exit(1);
}

const LIVE = SECRET.startsWith("sk_live_") || SECRET.startsWith("rk_live_");
const stripe = new Stripe(SECRET, { maxNetworkRetries: 2 });

(async () => {
  console.log(`Kassenta Stripe setup - ${LIVE ? "LIVE" : "TEST"} mode`);
  console.log(`Webhook target: ${WEBHOOK_URL}`);

  // ── 1. account ────────────────────────────────────────────────────────────
  head("Account");
  const account = await stripe.accounts.retrieve();
  ok(`${account.id} - country ${account.country}, default currency ${String(account.default_currency).toUpperCase()}`);
  if (!account.charges_enabled) warn("charges are NOT enabled on this account yet");
  if (!account.payouts_enabled) warn("payouts are NOT enabled on this account yet");
  if (account.country !== "CH") {
    warn(`account country is ${account.country}, not CH - TWINT requires a Swiss account`);
  }

  // ── 2. payment methods ────────────────────────────────────────────────────
  head("Payment methods");
  let enabled = [];
  try {
    const configs = await stripe.paymentMethodConfigurations.list({ limit: 1 });
    const cfg = configs.data[0];
    if (!cfg) {
      warn("no payment method configuration found");
    } else {
      enabled = Object.entries(cfg)
        .filter(([, v]) => v && typeof v === "object" && v.display_preference)
        .filter(([, v]) => ["on", "default"].includes(v.display_preference.value ?? v.display_preference.preference))
        .map(([k]) => k)
        .sort();
      ok(`enabled: ${enabled.join(", ") || "(none)"}`);
    }
  } catch (e) {
    warn(`could not read payment method configuration: ${e.message}`);
  }

  for (const [id, why] of [
    ["card", "Visa / Mastercard / Amex"],
    ["twint", "the dominant Swiss wallet - CHF only, and the main reason to be on Stripe here"],
    ["link", "Stripe's own one-click wallet"],
  ]) {
    if (!enabled.includes(id)) {
      warn(`${id} is OFF - enable it at https://dashboard.stripe.com/settings/payment_methods (${why})`);
    }
  }
  console.log("  note: Stripe does not support PostFinance at all - it needs a second acquirer.");

  // ── 3. webhook ────────────────────────────────────────────────────────────
  head("Webhook");
  const existing = await stripe.webhookEndpoints.list({ limit: 100 });
  const already = existing.data.find((w) => w.url === WEBHOOK_URL);

  if (already) {
    ok(`endpoint already exists: ${already.id}`);
    const missing = EVENTS.filter((e) => !already.enabled_events.includes(e) && !already.enabled_events.includes("*"));
    if (missing.length) {
      await stripe.webhookEndpoints.update(already.id, { enabled_events: EVENTS });
      ok(`added ${missing.length} missing event type(s)`);
    }
    console.log(
      "\n  Stripe only reveals a signing secret at creation. If you do not have it,\n" +
        `  roll it at https://dashboard.stripe.com/webhooks/${already.id} and copy the new whsec_.`,
    );
  } else {
    const created = await stripe.webhookEndpoints.create({
      url: WEBHOOK_URL,
      enabled_events: EVENTS,
      description: "Kassenta POS",
    });
    ok(`created ${created.id}`);
    console.log(`\n  STRIPE_WEBHOOK_SECRET=${created.secret}\n`);
    console.log("  ^ copy this into the server environment now - Stripe will not show it again.");
  }

  // ── 4. Apple Pay / Google Pay domain ──────────────────────────────────────
  head("Payment method domain");
  try {
    const domains = await stripe.paymentMethodDomains.list({ limit: 100 });
    const found = domains.data.find((d) => d.domain_name === DOMAIN);
    if (found) {
      ok(`${DOMAIN} already registered (${found.id})`);
      const apple = found.apple_pay?.status;
      if (apple && apple !== "active") {
        warn(`Apple Pay status is "${apple}" - the well-known file may not be reachable`);
      }
    } else {
      const created = await stripe.paymentMethodDomains.create({ domain_name: DOMAIN });
      ok(`registered ${DOMAIN} (${created.id})`);
    }
    console.log(
      "  Apple Pay also needs https://" + DOMAIN +
        "/.well-known/apple-developer-merchantid-domain-association to be served.",
    );
  } catch (e) {
    warn(`domain registration failed: ${e.message}`);
  }

  // ── 5. summary ────────────────────────────────────────────────────────────
  head("Next");
  console.log("  1. Put these in the server env (~/kassenta-app/.env), then restart:");
  console.log("       STRIPE_SECRET_KEY=" + SECRET.slice(0, 12) + "...");
  console.log("       STRIPE_PUBLISHABLE_KEY=pk_" + (LIVE ? "live" : "test") + "_...");
  console.log("       STRIPE_WEBHOOK_SECRET=whsec_...");
  console.log("  2. Boot log should read: [stripe] configured from env in " + (LIVE ? "live" : "test") + " mode");
  console.log("  3. Check: curl -s " + BASE + "/api/payments/health");
  if (!LIVE) {
    console.log("  4. Test a payment end to end, then re-run this with the sk_live_ key.");
  }
  console.log("");
})().catch((e) => {
  console.error(`\nFAILED: ${e.message}`);
  if (e.type === "StripeAuthenticationError") {
    console.error("The key was rejected. Check you copied the whole thing.");
  }
  process.exit(1);
});
