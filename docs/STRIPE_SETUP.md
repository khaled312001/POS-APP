# Kassenta × Stripe — setup and operations

Everything needed to take the payment gateway from "configured" to "taking money",
and what to check when it misbehaves.

---

## 1. What was wrong before

`server/stripeClient.ts` read its keys **only** from the Replit connector API.
Production runs on Hostinger under Passenger, where `REPL_IDENTITY` and
`WEB_REPL_RENEWAL` are never set, so every payment path threw before it made a
single HTTP request:

```
$ curl https://kassenta.com/api/stripe/publishable-key
HTTP 500  {"error":"X-Replit-Token not found for repl/depl"}
```

On top of that:

- No `STRIPE_*` variable existed anywhere on the server.
- `initStripe()` returned early under `usingMySql`, and built its webhook URL
  from `REPLIT_DOMAINS` — unset here, giving `https://undefined/...`.
- The webhook handler delegated to `stripe-replit-sync`, which writes to
  **Postgres**. Production is **MariaDB**, so it was a no-op: nothing could ever
  be marked paid by Stripe.
- Public order endpoints inserted `totalAmount` straight from the request body,
  so a tampered request could book a CHF 60 basket as CHF 0.01 — and that total
  is exactly what a PaymentIntent would have charged.

---

## 2. The three keys

| Variable | Where it lives | May a browser see it? |
|---|---|---|
| `STRIPE_SECRET_KEY` | server env only | **Never** |
| `STRIPE_PUBLISHABLE_KEY` | server env, served via `/api/payments/config` | Yes — that is its purpose |
| `STRIPE_WEBHOOK_SECRET` | server env only | **Never** |

Get the first two from <https://dashboard.stripe.com/apikeys>.
The third is produced by the setup script below.

> **Start in test mode.** Use `sk_test_` / `pk_test_` first, run the checks in
> §5, and only then swap in the live pair. A live key on a broken flow charges
> real customers.

`getBrowserSafeStripeKey()` refuses to emit anything that does not begin with
`pk_`, so a secret key pasted into the publishable slot is caught rather than
shipped to every visitor.

---

## 3. Setup

### 3.1 Configure the Stripe account

```bash
STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-setup.js
```

Safe to re-run. It:

1. verifies the key and prints the account country and default currency;
2. lists which payment methods are actually enabled, and warns if **TWINT** is off;
3. creates the webhook endpoint at `https://kassenta.com/api/stripe/webhook`
   subscribed to exactly the events `server/stripeWebhook.ts` handles, and prints
   the `whsec_` **once**;
4. registers `kassenta.com` as a payment-method domain so Apple Pay and Google Pay
   can appear.

### 3.2 Put the keys on the server

```bash
ssh -p 65002 u492425110@147.93.54.132
nano ~/kassenta-app/.env      # add the three STRIPE_* lines
touch ~/domains/kassenta.com/kassenta-nodejs/tmp/restart.txt
```

### 3.3 Deploy the code

```bash
npm run server:build
KASSENTA_SSH_PASSWORD=... python deploy_kassenta.py all
```

---

## 4. Enable the methods that matter here

In **Dashboard → Settings → Payment methods**:

| Method | Notes |
|---|---|
| **Card** | Visa / Mastercard / Amex. 3-D Secure handled by the PaymentElement. |
| **TWINT** | The one that matters in Switzerland. **CHF only, Swiss accounts only, redirect-based, no manual capture, cannot be saved for recurring billing.** |
| **Apple Pay** | Needs the domain registration from §3.1 and `Permissions-Policy: payment=(self …)` — both now in place. |
| **Google Pay** | Same. Does **not** work inside a plain Android WebView, so the customer APK gets card + TWINT, not Google Pay. |
| **Link** | Zero extra code. Only ever appears in the PaymentElement. |
| Klarna / PayPal | Optional. Sensible for an annual plan, marginal for a CHF 30 order. |

Nothing above requires a code change: every intent is created with
`automatic_payment_methods: { enabled: true }`, so the Dashboard decides.

**Not available:** Stripe does not support **PostFinance** in any form. That needs
a second acquirer (Datatrans / Saferpay / Wallee) or stays a manual bank transfer.
**SEPA Direct Debit is EUR-only** and cannot be offered on CHF pricing.

---

## 5. Verifying, in order

```bash
# 1. the server picked the keys up
#    boot log should read: [stripe] configured from env in test mode

# 2. account reachable
curl -s https://kassenta.com/api/payments/health

# 3. publishable key is served, and is a pk_
curl -s https://kassenta.com/api/payments/config | head -c 400

# 4. schema applied — second boot should log "schema already up to date"
#    DESCRIBE online_orders  → paid_at, stripe_charge_id, amount_refunded
#    SHOW CREATE TABLE stripe_webhook_events
```

Then the flows:

5. **Webhook replay** — `stripe trigger payment_intent.succeeded` twice. The first
   inserts a row with `status='processed'`; the second returns
   `duplicate, ignored` and changes nothing.
6. **Tampering** — place an order with a forged `totalAmount` in the body. The
   stored total must be the server's own price, and the log should carry a
   `[pricing] … using the server total` line.
7. **TWINT from a phone browser** on `/customer/` — redirects out, returns, and
   the order flips to `paid` **from the webhook**, not from the return URL.
8. **TWINT inside the customer APK** — the step that catches WebView allowlist
   bugs. The TWINT app must open and come back.
9. **Refund** from the super admin → `charge.refunded` arrives →
   `stripe_refund_id` and `amount_refunded` populate.
10. **No key leaks:**
    ```bash
    grep -rn "sk_live\|sk_test\|STRIPE_SECRET" dist/ delivery-app/ app/ customer-app/ server/templates/ server/site/
    ```
    must return nothing. Worth wiring into CI.

---

## 6. How the money path is kept honest

Two rules, enforced in code rather than by convention:

**Only a signed webhook may mark something paid.** `server/stripeWebhook.ts` is
the sole writer of `payment_status = 'paid'`. A client saying it paid is a claim;
a signed Stripe event is proof. Clients poll `/api/payments/status/:id`, which
reports *our* database, not Stripe's optimistic redirect status.

**The amount always comes from the database.** `server/paymentService.ts` loads
the order or sale and charges its stored total; no endpoint accepts an amount for
one. `server/orderPricing.ts` recomputes that stored total from the tenant's own
`products` rows, so the body's `subtotal` / `deliveryFee` / `totalAmount` are
advisory only — a mismatch is logged and discarded.

Idempotency has two layers: `stripe_webhook_events.id` is Stripe's own event id
and a primary key, so a redelivery is rejected on insert; and wallet credits
additionally check for an existing transaction against the same PaymentIntent.

---

## 7. Open decisions

**Stripe Connect — not enabled.** Today the platform collects everything and
settles with restaurants out of band. If each restaurant's takings should land in
*its own* Stripe account, every `paymentIntents.create` needs `on_behalf_of` /
`transfer_data` / `application_fee_amount`, and tenants need onboarding.
`tenants.stripe_account_id` already exists so this is a switch, not a migration —
but it is a real decision with tax and liability consequences.

**Pricing.** Three different price ladders existed in the codebase (site vs
endpoint vs email). `subscription_plans` is the intended single source, and now
carries `stripe_price_id` / `stripe_product_id`.

---

## 8. Troubleshooting

| Symptom | Cause |
|---|---|
| `503 Stripe is not configured` | `STRIPE_SECRET_KEY` missing or malformed. The boot log says which. |
| Publishable key comes back `null` | `STRIPE_PUBLISHABLE_KEY` unset, or it does not start with `pk_` and was refused. |
| Webhook 400s | `STRIPE_WEBHOOK_SECRET` wrong, or something parsed the body first. The raw-body route must stay registered **before** `express.json()`. |
| `No such payment_intent` in the browser | Live secret paired with a test publishable key. The boot log warns about the mismatch. |
| TWINT missing from the element | Not enabled in the Dashboard, or the currency is not CHF, or the page still uses the legacy Card Element. |
| Apple Pay missing | Domain not registered, or `Permissions-Policy` blocks `payment`, or not Safari. |
| Order paid in Stripe but pending here | The webhook did not arrive or failed. Check `stripe_webhook_events` for `status='failed'` and its `error`. |
