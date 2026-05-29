# Data Safety Form Answers — Barmagly POS

---

## 1. Data Collection and Security

| Question | Answer |
|---|---|
| **Does your app collect or share any user data?** | **YES** |
| **Is all user data encrypted in transit?** | **YES** — All data is transmitted over HTTPS using TLS 1.2 or higher between the app and `pos.barmagly.tech`. |
| **Do you provide a way for users to request that their data be deleted?** | **YES** — Users (merchants and end customers) can request deletion by emailing `privacy@barmagly.tech`. Requests are processed within 30 days. A self-serve deletion URL is also published at `https://barmagly.tech/data-deletion`. |

---

## 2. Data Types Collected

Legend:
- **Collected** = data is transmitted off the device to Barmagly servers (`pos.barmagly.tech`) or a processor.
- **Shared** = data is transferred to a third party (separate company).
- **Required** = the app cannot function without it. **Optional** = user/merchant can skip it.

---

### Personal info

| Data Type | Collected | Shared | Required / Optional | Purpose |
|---|---|---|---|---|
| **Name** | YES | NO | Required (for admin accounts); Optional (for customer CRM entries created by the merchant) | App functionality, Account management |
| **Email address** | YES | NO | Required (admin/owner sign-in); Optional (customer records) | Account management, Developer communications (license/receipts) |
| **User IDs** | YES | NO | Required | Account management (employee PIN, internal user ID for role-based access) |
| **Address** | YES | NO | Optional (only when merchant enters a delivery customer) | App functionality (delivery routing, delivery zones) |
| **Phone number** | YES | NO | Optional (customer CRM, delivery, WhatsApp notifications) | App functionality, Developer communications (WhatsApp/SMS order updates) |
| **Race and ethnicity** | NO | — | — | — |
| **Political or religious beliefs** | NO | — | — | — |
| **Sexual orientation** | NO | — | — | — |
| **Other personal info** | NO | — | — | — |

---

### Financial info

| Data Type | Collected | Shared | Required / Optional | Purpose |
|---|---|---|---|---|
| **User payment info** | YES | YES — shared with **Stripe** (only if the merchant enables Stripe payments) and **TWINT** (Swiss mobile payment processor) for transaction processing. Full card numbers are **never** stored by Barmagly; tokenized references only. | Optional (depends on merchant's chosen payment method; cash-only stores collect none) | App functionality (process card / TWINT payments), Fraud prevention |
| **Purchase history** | YES | NO | Required | App functionality (order/receipt history, returns, customer CRM), Account management (merchant reports) |
| **Credit score** | NO | — | — | — |
| **Other financial info** | NO | — | — | — |

---

### Health and fitness

| Data Type | Collected | Shared | Required / Optional | Purpose |
|---|---|---|---|---|
| **Health info** | NO | — | — | — |
| **Fitness info** | NO | — | — | — |

> Note: although pharmacies use the app for inventory, no end-customer health data, prescriptions, or medical records are collected by the application.

---

### Messages

| Data Type | Collected | Shared | Required / Optional | Purpose |
|---|---|---|---|---|
| **Emails** | NO | — | — | — |
| **SMS or MMS** | NO | — | — | — |
| **Other in-app messages** | NO | — | — | — |

---

### Photos and videos

| Data Type | Collected | Shared | Required / Optional | Purpose |
|---|---|---|---|---|
| **Photos** | YES | NO — stored in Barmagly-controlled Google Cloud Storage buckets (processor, not a separate data recipient) | Optional | App functionality (product/menu images uploaded by the merchant) |
| **Videos** | NO | — | — | — |

---

### Audio files

| Data Type | Collected | Shared | Required / Optional | Purpose |
|---|---|---|---|---|
| **Voice or sound recordings** | NO | — | — | — |
| **Music files** | NO | — | — | — |
| **Other audio files** | NO | — | — | — |

---

### Files and docs

| Data Type | Collected | Shared | Required / Optional | Purpose |
|---|---|---|---|---|
| **Files and docs** | NO | — | — | — |

---

### Calendar

| Data Type | Collected | Shared | Required / Optional | Purpose |
|---|---|---|---|---|
| **Calendar events** | NO | — | — | — |

---

### Contacts

| Data Type | Collected | Shared | Required / Optional | Purpose |
|---|---|---|---|---|
| **Contacts** | NO | — | — | — |

> Note: customer phone numbers/names entered by the merchant are recorded under **Personal info → Phone number / Name**, not from the device contacts list. The app does not read the Android contacts database.

---

### App activity

| Data Type | Collected | Shared | Required / Optional | Purpose |
|---|---|---|---|---|
| **App interactions** | YES | NO | Required | App functionality (order flow, cart actions), Account management (activity logs / audit trail for merchant reports) |
| **In-app search history** | YES | NO | Required | App functionality (product/customer search within POS) |
| **Installed apps** | NO | — | — | — |
| **Other user-generated content** | NO | — | — | — |
| **Other actions** | NO | — | — | — |

---

### Web browsing

| Data Type | Collected | Shared | Required / Optional | Purpose |
|---|---|---|---|---|
| **Web browsing history** | NO | — | — | — |

---

### App info and performance

| Data Type | Collected | Shared | Required / Optional | Purpose |
|---|---|---|---|---|
| **Crash logs** | YES | NO | Required | App functionality (stability), Developer communications (bug fixes) |
| **Diagnostics** | YES | NO | Required | App functionality (performance monitoring) |
| **Other app performance data** | NO | — | — | — |

---

### Device or other IDs

| Data Type | Collected | Shared | Required / Optional | Purpose |
|---|---|---|---|---|
| **Device or other IDs** | NO | — | — | — |

> Note: the app uses a server-issued license/session token (BARMAGLY-XXXX-XXXX-XXXX-XXXX). It does **not** read the Android Advertising ID, IMEI, MAC address, or hardware serial.

---

### Location

| Data Type | Collected | Shared | Required / Optional | Purpose |
|---|---|---|---|---|
| **Approximate location** | YES | NO | Optional | App functionality (delivery zone matching for merchant-side delivery dispatch) |
| **Precise location** | YES | NO | Optional | App functionality (driver delivery routing; only collected from drivers who grant runtime permission) |

> Location is collected only when the merchant enables the delivery module and only from devices used by delivery drivers or by the dispatcher; standard POS/cashier flows never request location.

---

## 3. Security Practices

| Question | Answer |
|---|---|
| **Is all data encrypted in transit?** | **YES** — TLS 1.2+ (HTTPS) for all app-to-server and server-to-processor traffic. |
| **Do you provide a way for users to request that their data be deleted?** | **YES** — Email `privacy@barmagly.tech`; processed within 30 days. Self-serve page at `https://barmagly.tech/data-deletion`. |
| **Have you committed to following the Play Families Policy?** | **NO** — The app targets business users aged 18+ only and is not designed for children. |
| **Has your app been independently validated against a global security standard (MASA)?** | **NO** — No independent third-party security review (e.g., App Defense Alliance MASA) has been completed at this time. |

---

## Summary of Third-Party Data Recipients

| Recipient | Data Shared | Trigger |
|---|---|---|
| **Stripe, Inc.** | Tokenized payment info, purchase amount | Only if merchant enables Stripe card payments |
| **TWINT AG** | Tokenized payment info, purchase amount | Only if merchant enables TWINT (Swiss mobile payment) |
| **Google Cloud Storage** (processor for Barmagly) | Merchant-uploaded product images | Always, for image hosting |

No advertising networks, no analytics SDKs, no data brokers.

---

## Data Retention & Deletion

- **Active accounts:** data retained for the life of the merchant's license.
- **Cancelled/inactive accounts:** purged 90 days after license expiry unless deletion is requested sooner.
- **Deletion request channel:** `privacy@barmagly.tech` — confirmed within 7 days, completed within 30 days.
- **Backups:** encrypted backups are rotated out within 60 days of primary deletion.

---

**Contact for Data Safety questions:** `privacy@barmagly.tech`
**Privacy Policy URL:** `https://barmagly.tech/privacy`
**Data Deletion URL:** `https://barmagly.tech/data-deletion`