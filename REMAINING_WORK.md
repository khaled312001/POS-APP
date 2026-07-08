# Barmagly — Remaining Work (deferred, needs careful migration)

The items below are **real issues from the audit** that were intentionally NOT
auto-applied in the first remediation pass because they change stored-data
semantics or API contracts and need a migration + coordinated deploy + test
pass. They are ordered by priority. Everything already fixed is in
`SYSTEM_AUDIT_PLAN.md` (Batches 1–5, deployed).

## P0 — Security (do next, needs a migration/test pass)

1. **Cross-tenant IDOR on every `:id` route** (`server/routes.ts`)
   PUT/DELETE `/api/{branches,employees,products,customers,sales,online-orders,vehicles,…}/:id`
   don't verify the row belongs to `req.tenantId`. Any valid license key can
   read/modify/delete other tenants' rows by iterating IDs.
   *Fix:* add an ownership assertion helper (`assertOwned(row, req.tenantId)`)
   to every `:id` handler; derive tenantId only from the middleware.

2. **Tenant-wide report/closing leakage** — `getSalesByDateRange`, analytics,
   daily/monthly closings aggregate ALL tenants (no tenant filter). One store's
   Tagesabschluss books another's revenue.
   *Fix:* thread `tenantId`/`branchId` into every storage aggregate query.

3. **Hash employee PINs** — PINs are compared in plaintext and matched across
   tenants (`storage.getEmployeeByPin`). *Fix:* scope by tenant, bcrypt the PIN.
   **Needs a migration** to hash existing PINs (one-time, on next login or a
   backfill script). The API no longer returns PINs (already shipped).

4. **Order price recomputation** — `/api/delivery/orders`,
   `/api/online-orders/public`, broadcast accept client-supplied prices/totals
   → CHF 0.01 orders possible. *Fix:* re-price every line from `products.price`
   server-side; create the Stripe PaymentIntent from the server total; only mark
   `paid` from the webhook.

5. **Rate limiting** — none on login / OTP / license-validate. *Fix:* add
   `express-rate-limit` (5 OTP/hour/phone, 5 verify/OTP, backoff on PIN & super-
   admin login).

6. **Account takeover on `/api/delivery/auth/register`** — attaches
   credentials to an existing customer by phone with no OTP. *Fix:* require a
   verified OTP before binding, or only create-new.

7. **Super-admin seeded password** — same committed bcrypt hash on every deploy.
   *Fix:* seed from env at first boot, force change on first login.

## P1 — Correctness

8. **online-orders edit drops tax/fees** (`app/(tabs)/online-orders.tsx`) — edit
   recomputes `total = subtotal + deliveryFee`, silently dropping tax/service/
   discount → corrupts financial records. Gate edit/delete behind admin/manager
   and recompute with the full formula (or send items only, recompute server-side).

9. **Zero-out writes hardcoded 0 totals** (`app/(tabs)/index.tsx:1285`) — shift
   close overwrites real totals with `"0"`. Send computed totals.

10. **Manual adjustment / End-of-Day ungated for cashiers** — role-gate to
    manager+, count adjustment against the discount cap.

11. **Customer status not pushed to tracking page** — two separate SSE maps;
    `_broadcastDeliveryStatus` defined but never called. Unify on one map.

12. **Wallet debited before order insert with no transaction** — wrap in a DB
    transaction or compensate on failure. Loyalty points never deducted.

## P2 — Reliability / UX

13. **Stripe layer is Replit-only** (`server/stripeClient.ts`) — needs an env
    credential path (`STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY`/
    `STRIPE_WEBHOOK_SECRET`) or card payments 500 in production.

14. **QR via external api.qrserver.com** (`app/(tabs)/table-qr.tsx`) — leaks the
    secret table token to a third party; use the bundled `qrcode` lib locally.
    Also unify the two divergent order-URL builders.

15. **RoleGuard** — add the cashier lock-screen (already in reports.tsx) to
    settings / table-qr / delivery-zones / promo-codes / driver-management
    (web deep-link bypass).

16. **Print/receipt XSS** — HTML-escape all interpolated customer/store/product
    names in every print-template builder (`utils/printing.ts`,
    `app/(tabs)/index.tsx`, `settings.tsx`, `table-qr.tsx`).

17. **i18n duplicate keys** — de-dupe `loyaltyPoints`/`todayRevenue` in en/ar/de
    and enable `tsc --noEmit` in CI.

18. **Consolidate 3 caller-id WebSockets** into one shared socket (double
    banners/beeps today).

19. **Super-admin dashboard XSS** (`super-admin-dashboard.html`) — escape
    dynamic values before `innerHTML`; replace inline `onclick(user data)` with
    data-attributes + addEventListener; add a CSP.

## P3 — Dead code to remove (verified unused)

- `delivery-app/landing.html` + `delivery-app/css/landing.css` (superseded by /customer)
- `server/index.ts` legacy `if(false)` delivery-landing block
- `_broadcastDeliveryStatus` (wire or delete)
- Root one-off scripts: `check_*.py`, `ssh_*.py`, `investigate*.py`, `fix_*.py`,
  `diagnose_*.py`, `debug_fix.py`, duplicate seed scripts
- Duplicate `/store/:slug` route in routes.ts (shadowed by index.ts middleware)

---

### Recommended sequence
P0 #1–#2 first (they touch the most handlers), then #3 (with the PIN migration),
then #4–#7. Do each with a test against a second tenant before deploying. P1/P2
can ship incrementally.
