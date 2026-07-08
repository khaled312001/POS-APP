# Data Safety — Barmagly Customer

## Step 2: Data collection and security

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (HTTPS/TLS to pos.barmagly.tech + WSS for live tracking) |
| Do you provide a way for users to request that their data is deleted? | **Yes** |
| Account creation methods | **OAuth (Google Sign-In)** — guest checkout also supported |
| Delete account URL | `https://pos.barmagly.tech/delete-account` |
| Does your app support partial account deletion? | **Yes** — same URL handles selective deletion (addresses, order history, profile photo) while keeping the account, or full deletion |
| Government app? | **No** |
| Exclusively for children? | **No** (13+ consumer audience) |

---

## Step 3: Data types — mark these as "Selected"

### Personal info
- **Name** — collected
- **Email address** — collected
- **User IDs** — collected (Google account ID, internal customer ID)
- **Address** — collected (delivery addresses)
- **Phone number** — collected

> Do NOT select: race/ethnicity, political/religious beliefs, sexual orientation, other personal info.

### Financial info
- *(None selected)* — payments processed by external gateway (Stripe/TWINT/local processor) in their own SDK/web flow. The app does not handle card data itself.

> Do NOT select: purchase history (orders are operational records, not financial transaction history in Google's sense — see note below).
> **Edge case**: if reviewer interprets order list as "purchase history," select **Purchase history — collected, not shared, required, App functionality**.

### Location
- **Approximate location** — collected
- **Precise location** — collected (optional, used only for "deliver to my current location")

### Photos and videos
- **Photos** — collected (optional profile picture only)

> Do NOT select: videos.

### Audio files
- *(None selected)*

### Files and docs
- *(None selected)*

### Calendar
- *(None selected)*

### Contacts
- *(None selected)*

### App activity
- **App interactions** — collected (orders placed, items viewed, chat with restaurant)
- **In-app search history** — collected (menu searches)
- **Other user-generated content** — collected (chat messages with restaurant, delivery instructions, order notes)

> Do NOT select: installed apps, other actions.

### Web browsing
- *(None selected)*

### App info and performance
- **Crash logs** — collected
- **Diagnostics** — collected
- **Other app performance data** — collected

### Device or other IDs
- **Device or other IDs** — collected (FCM push token, install ID)

### Health and fitness
- *(None selected)*

### Messages
- *(None selected — restaurant chat is "other user-generated content," not SMS/email of the user)*

---

## Step 4: Per-data-type answers

Legend used below:
- **Collected** = sent off device
- **Shared** = transferred to a third party
- **Ephemeral** = processed in memory only, not stored (answer this question only if Collected = No)
- **Required / Optional** = user choice
- **Purposes** = pick all that apply from Google's fixed list

---

### Personal info → Name
- Collected: **Yes**
- Shared: **No**
- Processed ephemerally: N/A
- Required or optional: **Required** (needed for order fulfillment)
- Purposes: **App functionality**, **Account management**

### Personal info → Email address
- Collected: **Yes**
- Shared: **No**
- Required or optional: **Required**
- Purposes: **App functionality**, **Account management**, **Communications** (order confirmations, receipts)

### Personal info → User IDs
- Collected: **Yes**
- Shared: **No**
- Required or optional: **Required**
- Purposes: **App functionality**, **Account management**, **Fraud prevention, security, and compliance**

### Personal info → Address
- Collected: **Yes**
- Shared: **Yes** — shared with the **restaurant** that the customer is ordering from, and with the **assigned delivery driver** for that order (operational handoff, not marketing).
- Required or optional: **Optional** (only required for delivery orders; not needed for pickup)
- Purposes: **App functionality** (delivery routing)

### Personal info → Phone number
- Collected: **Yes**
- Shared: **Yes** — shared with the restaurant and the assigned delivery driver so they can contact the customer about the order
- Required or optional: **Required** (for order contact)
- Purposes: **App functionality**, **Communications**

---

### Location → Approximate location
- Collected: **Yes**
- Shared: **No**
- Required or optional: **Optional**
- Purposes: **App functionality** (showing nearby restaurants, default delivery zone)

### Location → Precise location
- Collected: **Yes**
- Shared: **Yes** — shared with the assigned delivery driver during the active delivery only (so the driver can reach the drop-off point); not shared after delivery completes
- Required or optional: **Optional** (user can type address manually instead)
- Purposes: **App functionality** (delivery navigation to drop-off)

---

### Photos and videos → Photos
- Collected: **Yes**
- Shared: **No**
- Required or optional: **Optional** (profile picture is optional)
- Purposes: **App functionality**, **Account management**, **Personalization**

---

### App activity → App interactions
- Collected: **Yes**
- Shared: **No**
- Required or optional: **Required**
- Purposes: **App functionality**, **Analytics**

### App activity → In-app search history
- Collected: **Yes**
- Shared: **No**
- Required or optional: **Required**
- Purposes: **App functionality**, **Analytics**

### App activity → Other user-generated content (chat, order notes)
- Collected: **Yes**
- Shared: **Yes** — chat messages and order notes are delivered to the **restaurant** the customer is ordering from (and to the **driver** when relevant to that delivery). This is the core function of the chat.
- Required or optional: **Optional** (user only sends a message if they choose to)
- Purposes: **App functionality**, **Communications**

---

### App info and performance → Crash logs
- Collected: **Yes**
- Shared: **No**
- Required or optional: **Required**
- Purposes: **Analytics**, **App functionality**

### App info and performance → Diagnostics
- Collected: **Yes**
- Shared: **No**
- Required or optional: **Required**
- Purposes: **Analytics**, **App functionality**

### App info and performance → Other app performance data
- Collected: **Yes**
- Shared: **No**
- Required or optional: **Required**
- Purposes: **Analytics**, **App functionality**

---

### Device or other IDs → Device or other IDs
- Collected: **Yes**
- Shared: **No**
- Required or optional: **Required**
- Purposes: **App functionality** (push notification delivery for order status), **Fraud prevention, security, and compliance**, **Analytics**

---

## Security practices (summary panel at end of Step 2)
- Data encrypted in transit: **Yes**
- Users can request deletion: **Yes** (full + partial, self-service web form)
- Committed to Google Play Families Policy: **N/A** (not targeted at children)
- Independently validated against a global security standard: **No** (leave unchecked unless you have a SOC 2 / ISO 27001 audit on file)

## Notes for click-through

1. **Payments** — if the reviewer asks: payment data is collected by the payment provider's own SDK/redirect, not by Barmagly Customer. Do not declare financial info.
2. **Google Sign-In** — the OAuth token + Google profile (name, email, Google user ID) are what populate the Personal info fields. No additional Google scopes are requested (no Drive, Calendar, Contacts).
3. **Sharing definition** — Google treats data sent to the **restaurant** and **driver** as *sharing* (they are separate businesses, not just service providers acting on Barmagly's behalf). That is why Address, Phone, Precise location, and chat content are marked Shared = Yes. Service providers (hosting, crash reporting) are **not** "sharing" under Google's definition and stay at Shared = No.
4. **Ephemeral question** — only appears when Collected = No. All categories above are Collected = Yes, so the ephemeral question will not be shown.
5. **Delete account URL** must return HTTP 200 without login, and must clearly describe both full and partial deletion paths — that page is at `https://pos.barmagly.tech/delete-account`.