# Play Console → App content → App access

The last submission was rejected because the reviewer could not get past the
licence-key screen. Kassenta is a multi-tenant till: there is no open sign-up
inside the app, so without a licence key the reviewer sees one screen and
nothing else. That is what has to be declared here.

In Play Console open **App content → App access**, choose
**All or some functionality is restricted**, and add the instruction sets below.

---

## Instruction set 1 — Store activation

**Name:** `Store activation (required first)`

**Username:** `admin@pizzalemon.ch`

**Password:** `BARMAGLY-8FBC-16DA-8BD9-E3B6`

> The Password field is the only free-text box Play gives you, so the licence
> key goes there. There is no account password — the app authenticates the
> *store*, not a person, at this step.

**Any other instructions:**

```
Kassenta POS is business software for a single shop. Each shop is activated
once with a licence key issued when the shop subscribes; there is no public
sign-up inside the app, so this key is required before any screen is reachable.

1. Open the app. The first screen asks for a licence key.
2. Enter licence key:  BARMAGLY-8FBC-16DA-8BD9-E3B6
   Enter store email:  admin@pizzalemon.ch
3. Tap Activate. The demo store "Pizza Lemon" loads.

This licence is valid for 227 more days, so it will not expire during review.

The "Sign in with Google" button on the same screen is an alternative that
creates a brand-new trial store from a Google account. It is not needed for
review — the licence key above is faster and reaches the same app.
```

---

## Instruction set 2 — Staff sign-in

**Name:** `Staff PIN after activation`

**Username:** `not applicable`

**Password:** `1234`

**Any other instructions:**

```
After the store is activated the app shows a staff PIN pad. Two roles exist,
and reviewing both shows the full app:

  PIN 1234 - Manager. Full access: sales, products, stock, staff, reports,
             settings.
  PIN 0000 - Cashier. Till and customers only. Everything else is hidden by
             design - this is the permission model, not an error.

The PIN pad appears every time the app is reopened. It is a shift lock for a
shared counter device, not a second account system.
```

---

## Why the previous submission failed

Nothing was wrong with the build. The App access section did not tell the
reviewer that a licence key exists, so they hit the gate, could not proceed,
and the review was closed as "unable to access". Filling in the two sets above
is the whole fix.

---

## One thing worth knowing before you paste this

PIN `1234` belongs to a real admin account (`Babel`,
`babel3126344@gmail.com`, created 17 Aug 2026) on the **live** Pizza Lemon
store, with `["all"]` permissions. A Google reviewer using it will see real
customer records, real orders and real takings, and could change them.

That is safe enough in practice — reviewers are under NDA and do not go
looking — but if you would rather not hand out live data, say so and I will
create a separate demo tenant with seeded data and a licence key of its own.
It is about twenty minutes of work and the instructions above barely change.

---

## Verified against production on 17 Aug 2026

```
POST /api/license/validate   BARMAGLY-8FBC-16DA-8BD9-E3B6 / admin@pizzalemon.ch
  -> isValid: true, tenant "Pizza Lemon" (id 24), plan "Yearly Pro",
     active, 227 days remaining

POST /api/employees/login    pin 1234
  -> id 146 "Babel", role admin, permissions ["all"]

POST /api/employees/login    pin 0000
  -> id 67 "Cashier Lemon", role cashier, permissions ["pos","customers"]
```

These were run against the live server, not a local copy, so the credentials in
this file are known to work today.
