// Auto-generated from play-store-release/. Do not edit by hand.
export const DELETE_ACCOUNT_HTML = String.raw`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Delete Your Account — Kassenta POS</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    line-height: 1.65;
    color: #1f2937;
    background: #f9fafb;
    margin: 0;
    padding: 0;
  }
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 48px 24px 80px;
    background: #ffffff;
  }
  header {
    border-bottom: 3px solid #2FD3C6;
    padding-bottom: 24px;
    margin-bottom: 32px;
  }
  h1 { color: #0A0E27; font-size: 32px; margin: 0 0 8px; }
  .subtitle { color: #6b7280; font-size: 16px; margin: 0; }
  h2 { color: #0A0E27; font-size: 22px; margin-top: 40px; padding-top: 8px; }
  h3 { color: #374151; font-size: 18px; margin-top: 28px; }
  p, li { font-size: 16px; }
  a { color: #2FD3C6; }
  a:hover { text-decoration: underline; }
  .card {
    background: #f3f4f6;
    border-left: 4px solid #2FD3C6;
    padding: 16px 20px;
    border-radius: 6px;
    margin: 20px 0;
  }
  .card.warn {
    border-left-color: #f59e0b;
    background: #fffbeb;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0 24px;
  }
  th, td {
    text-align: left;
    padding: 12px;
    border-bottom: 1px solid #e5e7eb;
  }
  th { background: #f9fafb; color: #374151; }
  code {
    background: #f3f4f6;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 14px;
    color: #c026d3;
  }
  .button {
    display: inline-block;
    background: #2FD3C6;
    color: #0A0E27;
    padding: 12px 24px;
    text-decoration: none;
    border-radius: 6px;
    font-weight: 600;
    margin-top: 12px;
  }
  footer {
    margin-top: 64px;
    padding-top: 24px;
    border-top: 1px solid #e5e7eb;
    color: #6b7280;
    font-size: 14px;
  }
</style>
</head>
<body>
<div class="container">

<header>
  <h1>Delete Your Account &amp; Data</h1>
  <p class="subtitle">Kassenta POS — Account &amp; data deletion request</p>
</header>

<p>This page explains how to permanently delete your <strong>Kassenta POS</strong> account, all data associated with it, and what is retained for legal and accounting reasons after deletion.</p>

<div class="card">
  <strong>Developer name shown on Google Play:</strong> Kassenta<br>
  <strong>App:</strong> Kassenta POS (<code>com.barmagly.pos</code>)
</div>

<h2>1. How to request deletion</h2>

<p>You can request account and data deletion in any of these ways:</p>

<h3>Option A — Email (recommended)</h3>
<ol>
  <li>Send an email from your registered admin address to <a href="mailto:privacy@kassenta.com?subject=Account%20Deletion%20Request">privacy@kassenta.com</a></li>
  <li>Use the subject line: <code>Account Deletion Request</code></li>
  <li>Include in the body:
    <ul>
      <li>Your store name</li>
      <li>Your license key (<code>KASSENTA-XXXX-XXXX-XXXX-XXXX</code>)</li>
      <li>The admin email registered with the account</li>
    </ul>
  </li>
  <li>You will receive confirmation within <strong>3 business days</strong> and full deletion within <strong>30 days</strong>.</li>
</ol>

<p><a class="button" href="mailto:privacy@kassenta.com?subject=Account%20Deletion%20Request">Email a deletion request</a></p>

<h3>Option B — Web form</h3>
<ol>
  <li>Sign in at <a href="https://kassenta.com/login">kassenta.com/login</a></li>
  <li>Go to <strong>Settings → Account → Delete account</strong></li>
  <li>Confirm with your password and the one-time code sent to your email</li>
</ol>

<h3>Option C — Inside the app</h3>
<ol>
  <li>Open Kassenta POS on your device</li>
  <li>Tap the <strong>Settings</strong> tab (admin role required)</li>
  <li>Scroll to <strong>Danger zone → Request account deletion</strong></li>
  <li>Follow the on-screen confirmation steps</li>
</ol>

<h2>2. What gets deleted</h2>

<p>When your deletion request is processed, the following data is permanently removed from our active systems:</p>

<table>
  <tr><th>Data category</th><th>Action</th><th>When</th></tr>
  <tr><td>Admin and employee account profiles (names, emails, PINs)</td><td>Permanently deleted</td><td>Within 30 days</td></tr>
  <tr><td>Customer CRM records (names, phones, addresses)</td><td>Permanently deleted</td><td>Within 30 days</td></tr>
  <tr><td>Product catalog and images</td><td>Permanently deleted</td><td>Within 30 days</td></tr>
  <tr><td>Online order history</td><td>Permanently deleted</td><td>Within 30 days</td></tr>
  <tr><td>Cached files, session tokens, license activation records</td><td>Permanently deleted</td><td>Within 30 days</td></tr>
  <tr><td>Backups</td><td>Permanently deleted</td><td>Within 90 days (rolling backup expiry)</td></tr>
</table>

<h2>3. What is retained</h2>

<div class="card warn">
  <strong>Important:</strong> Some data must be retained to comply with legal, tax, and accounting obligations even after you request deletion.
</div>

<table>
  <tr><th>Data category</th><th>Retention period</th><th>Reason</th></tr>
  <tr><td>Sales transaction records (totals, dates, payment method — anonymised)</td><td>10 years</td><td>Swiss/EU/Egyptian tax and bookkeeping laws (OR Art. 957a, GDPR Art. 6(1)(c))</td></tr>
  <tr><td>VAT / invoice records</td><td>10 years</td><td>Tax compliance</td></tr>
  <tr><td>Payment processor logs (tokenised, no card numbers)</td><td>As required by Stripe / TWINT</td><td>Fraud prevention, processor compliance</td></tr>
  <tr><td>Anonymised aggregate analytics</td><td>Indefinite</td><td>Aggregated data cannot be re-identified to you</td></tr>
</table>

<p>Personal identifiers are scrubbed from retained records wherever legally permissible.</p>

<h2>4. Partial deletion (without closing the account)</h2>

<p>If you want to delete <em>some</em> data but keep your account active, you can:</p>
<ul>
  <li>Delete individual customers from <strong>Customers → [tap row] → Delete</strong></li>
  <li>Delete employee accounts from <strong>Settings → Employees → Remove</strong></li>
  <li>Delete products from <strong>Products → [edit] → Delete</strong></li>
  <li>Request a bulk export and selective deletion by emailing <a href="mailto:privacy@kassenta.com">privacy@kassenta.com</a></li>
</ul>

<h2>5. After deletion — what to expect</h2>

<ul>
  <li>Your license key is deactivated and cannot be reused</li>
  <li>You will be signed out of all devices</li>
  <li>The app will return to its initial state on next launch</li>
  <li>If you change your mind, contact us within 7 days of the deletion request to attempt restoration (no guarantee after that)</li>
</ul>

<h2>6. Questions</h2>

<p>If you have any questions about the deletion process or what data is retained:</p>
<ul>
  <li>Privacy questions: <a href="mailto:privacy@kassenta.com">privacy@kassenta.com</a></li>
  <li>General support: <a href="mailto:support@kassenta.com">support@kassenta.com</a></li>
  <li>Website: <a href="https://kassenta.com">kassenta.com</a></li>
</ul>

<footer>
  <p><strong>Last updated:</strong> 29 May 2026<br>
  <strong>Operated by:</strong> Kassenta · Egypt<br>
  See also our <a href="/privacy">Privacy Policy</a>.</p>
</footer>

</div>
</body>
</html>
`;
export const PRIVACY_POLICY_HTML = String.raw`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Privacy Policy — Kassenta POS</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    line-height: 1.65;
    color: #1f2937;
    background: #f9fafb;
    margin: 0;
    padding: 0;
  }
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 48px 24px 80px;
    background: #ffffff;
  }
  header {
    border-bottom: 3px solid #2FD3C6;
    padding-bottom: 24px;
    margin-bottom: 32px;
  }
  h1 {
    color: #0f172a;
    font-size: 32px;
    margin: 0 0 8px 0;
    font-weight: 700;
  }
  h2 {
    color: #0f172a;
    font-size: 22px;
    margin-top: 40px;
    margin-bottom: 12px;
    padding-bottom: 6px;
    border-bottom: 1px solid #e5e7eb;
    font-weight: 600;
  }
  h3 {
    color: #1f2937;
    font-size: 17px;
    margin-top: 24px;
    margin-bottom: 8px;
    font-weight: 600;
  }
  p, li {
    font-size: 16px;
    color: #374151;
  }
  ul, ol {
    padding-left: 24px;
  }
  li {
    margin-bottom: 6px;
  }
  a {
    color: #0d9488;
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
  .meta {
    color: #6b7280;
    font-size: 14px;
    margin: 0;
  }
  .callout {
    background: #f0fdfa;
    border-left: 4px solid #2FD3C6;
    padding: 14px 18px;
    margin: 20px 0;
    border-radius: 4px;
    font-size: 15px;
  }
  .contact-box {
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 18px 22px;
    margin-top: 16px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    font-size: 15px;
  }
  th, td {
    border: 1px solid #e5e7eb;
    padding: 10px 12px;
    text-align: left;
    vertical-align: top;
  }
  th {
    background: #f9fafb;
    font-weight: 600;
    color: #111827;
  }
  footer {
    margin-top: 56px;
    padding-top: 20px;
    border-top: 1px solid #e5e7eb;
    color: #6b7280;
    font-size: 14px;
    text-align: center;
  }
</style>
</head>
<body>
<div class="container">

<header>
  <h1>Privacy Policy — Kassenta POS</h1>
  <p class="meta"><strong>Effective date:</strong> 29 May 2026</p>
  <p class="meta"><strong>Last updated:</strong> 29 May 2026</p>
</header>

<h2>1. Introduction</h2>
<p>
  This Privacy Policy explains how <strong>Kassenta</strong> ("Kassenta", "we", "us", or "our"), a company based in Egypt operating at
  <a href="https://www.kassenta.com">www.kassenta.com</a>, handles information in connection with the
  <strong>Kassenta POS</strong> mobile application (package <code>com.barmagly.pos</code>) and its supporting backend services at
  <code>kassenta.com</code>.
</p>
<p>
  Kassenta POS is a tablet-optimized Point of Sale and mini-ERP application for pharmacies, retail stores, cafes,
  restaurants, and small businesses. It provides cart and checkout, inventory and product management, customer CRM,
  reporting, table and online ordering, delivery management, and multi-currency payments. Each merchant ("Store")
  operates an isolated workspace activated via a license key.
</p>
<div class="callout">
  <strong>Who is the data controller?</strong> When a merchant uses Kassenta POS to run their business, the merchant
  is the <em>controller</em> of customer and transaction data they enter. Kassenta acts as a <em>processor</em> on
  the merchant's behalf. For account holders (merchants, owners, managers, cashiers), Kassenta is the controller of
  the account information needed to provide the service.
</div>

<h2>2. Data We Collect</h2>

<h3>2.1 Information merchants enter into the app</h3>
<p>Merchants and their staff voluntarily enter business data into Kassenta POS, which may include:</p>
<ul>
  <li>Account and staff information: employee names, PINs (stored hashed), email addresses for administrators, and roles (Admin/Owner, Manager, Cashier).</li>
  <li>Store information: store name, branches, addresses, tax IDs, logos, operating hours, and currency configuration.</li>
  <li>Product and inventory data: product names, prices, categories, modifiers, sizes, addons, stock levels, and barcodes.</li>
  <li>Customer data entered by the merchant: customer name, phone number, delivery address, and order history (used for CRM and delivery).</li>
  <li>Order and transaction records: cart contents, discounts, payment method (Cash, Card, TWINT, Stripe), receipts, returns, and notes.</li>
  <li>Operational data: delivery zones, promo codes, driver assignments, table layouts, QR-based online orders.</li>
</ul>

<h3>2.2 Information collected automatically</h3>
<ul>
  <li>Authentication tokens and session identifiers associated with the merchant's license key.</li>
  <li>Technical logs from the backend (IP address, timestamps, request paths, HTTP status codes, app version, device OS) used for security, abuse prevention, and debugging.</li>
  <li>Crash and error events generated by the app or server, used to diagnose issues.</li>
</ul>

<h3>2.3 What we do <u>not</u> collect</h3>
<ul>
  <li>We do not embed third-party analytics or advertising SDKs by default.</li>
  <li>We do not collect contacts, SMS, call logs, photos, or files outside the app's own storage.</li>
  <li>We do not sell personal data to anyone, for any purpose.</li>
  <li>We do not use customer or transaction data for advertising or profiling.</li>
  <li>We do not track precise location in the background.</li>
</ul>

<h2>3. Permissions</h2>
<p>Kassenta POS requests only the permissions required for its features:</p>
<table>
  <thead>
    <tr><th>Permission</th><th>Why it is used</th><th>Optional?</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>INTERNET</strong> / <strong>ACCESS_NETWORK_STATE</strong></td>
      <td>To synchronize with the Kassenta backend (kassenta.com), receive online orders, and process payments.</td>
      <td>Required</td>
    </tr>
    <tr>
      <td><strong>CAMERA</strong></td>
      <td>To scan product barcodes during checkout and inventory entry. Camera frames are processed on-device and are not uploaded or stored.</td>
      <td>Required for barcode scanning only</td>
    </tr>
    <tr>
      <td><strong>Location</strong> (runtime, foreground)</td>
      <td>Used optionally to determine the store's delivery zone or to help configure delivery boundaries. Location is only read when the merchant explicitly invokes a location-related feature.</td>
      <td>Optional — the app works without it</td>
    </tr>
    <tr>
      <td><strong>VIBRATE</strong></td>
      <td>To provide haptic feedback (e.g., scan confirmation, button presses). No data is collected.</td>
      <td>Required for UI feedback</td>
    </tr>
  </tbody>
</table>

<h2>4. How We Use Data</h2>
<p>We process data to:</p>
<ul>
  <li>Provide the core POS, inventory, CRM, reporting, and delivery features of the app.</li>
  <li>Authenticate users and enforce role-based access (Admin/Owner, Manager, Cashier).</li>
  <li>Activate and validate license keys (format <code>KASSENTA-XXXX-XXXX-XXXX-XXXX</code>).</li>
  <li>Generate receipts, reports, and merchant communications.</li>
  <li>Process payments through merchant-configured providers (Stripe, TWINT, Card, Cash).</li>
  <li>Send transactional notifications (WhatsApp, email) when the merchant configures them.</li>
  <li>Maintain system security, prevent fraud, and debug technical issues.</li>
  <li>Comply with applicable legal, accounting, and tax obligations.</li>
</ul>
<p>We do not use merchant or customer data for advertising, profiling, or training third-party AI models.</p>

<h2>5. Data Sharing and Sub-Processors</h2>
<p>We do not sell personal data. We share data only with the limited sub-processors necessary to operate the service:</p>
<table>
  <thead>
    <tr><th>Sub-processor</th><th>Purpose</th><th>Region</th></tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Google Cloud Storage</strong></td>
      <td>Stores product images, store logos, and receipt assets uploaded by merchants. Access is server-side and authenticated.</td>
      <td>EU / Global</td>
    </tr>
    <tr>
      <td><strong>Stripe</strong></td>
      <td>Processes card payments — only if the merchant explicitly configures Stripe. Cardholder data is sent directly to Stripe and is not stored on our servers.</td>
      <td>Global</td>
    </tr>
    <tr>
      <td><strong>Kassenta infrastructure</strong> (kassenta.com)</td>
      <td>Hosts the application backend and PostgreSQL database. Operated by Kassenta under HTTPS.</td>
      <td>EU</td>
    </tr>
  </tbody>
</table>
<p>
  We may also disclose information if required by law, court order, or to protect the rights, safety, or property of
  Kassenta, our users, or the public. In the event of a corporate transaction (merger, acquisition), data may be
  transferred to the successor entity under equivalent protections.
</p>

<h2>6. Data Retention</h2>
<p>
  We retain merchant and transaction data for as long as the merchant maintains an active Kassenta POS license, so
  the merchant can access historical reports and comply with accounting and tax laws.
</p>
<ul>
  <li>On verified request from the merchant (the data controller), we will delete or anonymize personal data within <strong>30 days</strong>, except where longer retention is required by law (e.g., financial records).</li>
  <li>Backups containing deleted data are rotated out within a reasonable additional period and are not restored to live systems.</li>
  <li>Technical logs are typically retained for up to 90 days for security and debugging.</li>
</ul>
<p>To request deletion, email <a href="mailto:privacy@kassenta.com">privacy@kassenta.com</a>.</p>

<h2>7. Children's Privacy</h2>
<p>
  Kassenta POS is a business tool intended for use by adults aged <strong>18 or older</strong>. It is not directed at
  children, and we do not knowingly collect personal information from anyone under 18. If you believe a child has
  provided personal information through the app, please contact us and we will delete it.
</p>

<h2>8. Your Rights</h2>
<p>
  Depending on where you live, you may have rights under the EU General Data Protection Regulation (<strong>GDPR</strong>),
  the Swiss Federal Act on Data Protection (<strong>FADP / nFADP</strong>), the Egyptian Personal Data Protection Law
  (<strong>PDPL — Law No. 151 of 2020</strong>), or other applicable laws. These rights generally include:
</p>
<ul>
  <li><strong>Access</strong> — request a copy of the personal data we hold about you.</li>
  <li><strong>Rectification</strong> — ask us to correct inaccurate or incomplete data.</li>
  <li><strong>Erasure</strong> ("right to be forgotten") — request deletion of personal data.</li>
  <li><strong>Restriction</strong> — ask us to limit how we process your data.</li>
  <li><strong>Portability</strong> — receive your data in a structured, machine-readable format.</li>
  <li><strong>Objection</strong> — object to certain processing activities.</li>
  <li><strong>Withdraw consent</strong> — where processing relies on consent, withdraw it at any time.</li>
  <li><strong>Lodge a complaint</strong> with your local data protection authority (e.g., the Swiss FDPIC, an EU supervisory authority, or the Egyptian Personal Data Protection Center).</li>
</ul>
<p>
  Because merchants control the data they enter about their own customers, end-customers should first contact the
  merchant. If you cannot reach them or need our help, contact
  <a href="mailto:privacy@kassenta.com">privacy@kassenta.com</a> and we will assist or route the request appropriately.
</p>

<h2>9. Cookies</h2>
<p>
  The Kassenta POS mobile app does <strong>not</strong> use cookies. It uses secure tokens stored locally on the device
  to keep the merchant signed in.
</p>
<p>
  Our website (<a href="https://www.kassenta.com">www.kassenta.com</a>) uses only essential cookies required for the
  site to function and for basic security. We do not use advertising or cross-site tracking cookies. If we ever
  introduce optional analytics cookies, we will request your consent first.
</p>

<h2>10. International Transfers</h2>
<p>
  Kassenta is based in Egypt, our primary infrastructure is hosted in the EU, and our sub-processors (Google Cloud
  Storage, Stripe) operate globally. As a result, your information may be transferred to and processed in countries
  outside your own, including Egypt, Switzerland, the European Union, and the United States.
</p>
<p>
  When we transfer personal data internationally, we rely on appropriate safeguards such as the European Commission's
  <strong>Standard Contractual Clauses (SCCs)</strong>, equivalent Swiss FADP safeguards, adequacy decisions where
  available, and our sub-processors' own certifications and data processing agreements.
</p>

<h2>11. Security</h2>
<p>We apply industry-standard technical and organizational measures to protect your data, including:</p>
<ul>
  <li><strong>HTTPS / TLS</strong> encryption for all traffic between the app and kassenta.com.</li>
  <li><strong>bcrypt</strong> hashing for passwords and employee PINs — we never store them in plain text.</li>
  <li><strong>License-key authentication</strong> with per-store isolation and signed session tokens.</li>
  <li>Role-based access control (Admin/Owner, Manager, Cashier) inside each store.</li>
  <li>Server-side validation, rate-limiting, and audit logging of sensitive actions.</li>
  <li>Encrypted backups and least-privilege access for our engineering team.</li>
</ul>
<p>
  No system is perfectly secure. If we become aware of a personal-data breach that is likely to affect you, we will
  notify you and the relevant authorities as required by applicable law.
</p>

<h2>12. Changes to This Policy</h2>
<p>
  We may update this Privacy Policy from time to time to reflect changes in the app, our services, or applicable law.
  When we do, we will update the "Effective date" above and, for material changes, we will notify merchants in-app or
  by email before the changes take effect. The current version is always available at
  <a href="https://kassenta.com/privacy">https://kassenta.com/privacy</a>.
</p>

<h2>13. Contact Us</h2>
<p>If you have questions, requests, or concerns about this Privacy Policy or your personal data, please contact:</p>
<div class="contact-box">
  <strong>Kassenta</strong><br>
  Privacy team<br>
  Egypt<br>
  Email: <a href="mailto:privacy@kassenta.com">privacy@kassenta.com</a><br>
  Website: <a href="https://www.kassenta.com">www.kassenta.com</a>
</div>

<footer>
  &copy; 2026 Kassenta. All rights reserved.
</footer>

</div>
</body>
</html>`;
