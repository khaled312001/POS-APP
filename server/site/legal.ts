import { renderPage } from "./shell";

/**
 * Terms and imprint, rendered through the shared marketing shell so the theme
 * toggle, language switch, navigation and footer match the rest of the site.
 * (The Play Store privacy and deletion pages in ../legal-pages.ts stay
 * standalone on purpose — their URLs are registered with Google and must not
 * depend on anything that could change.)
 */
const LEGAL_BASE = process.env.PUBLIC_BASE_URL || "https://kassenta.com";

const LEGAL_CSS = `<style>
  .legal { padding: 52px 0 80px; }
  .legal .wrap { max-width: 820px; }
  .legal h2 { font-size: 1.32rem; margin: 38px 0 12px; }
  .legal p, .legal li { color: var(--text-2); font-size: .96rem; }
  .legal ul, .legal ol { margin: 12px 0; padding-inline-start: 22px; display: grid; gap: 8px; }
  .legal a { color: var(--accent); font-weight: 600; }
  .legal a:hover { text-decoration: underline; text-underline-offset: 3px; }
  .legal .updated { font-size: .84rem; color: var(--text-3); }
  .legal dl { display: grid; grid-template-columns: minmax(150px, auto) 1fr; gap: 10px 24px; margin-top: 16px; }
  .legal dt { font-weight: 700; color: var(--text); font-size: .92rem; }
  .legal dd { color: var(--text-2); font-size: .92rem; }
  @media (max-width: 560px) { .legal dl { grid-template-columns: 1fr; gap: 2px 0; } .legal dd { margin-bottom: 12px; } }
</style>`;

export const TERMS_HTML = renderPage(
  {
    path: "/terms",
    title: { en: "Terms of Service — Kassenta POS", de: "AGB — Kassenta POS", ar: "شروط الخدمة — Kassenta POS" },
    description: {
      en: "The terms under which Kassenta provides its point of sale, online ordering and delivery software.",
      de: "Die Bedingungen, unter denen Kassenta seine Kassen-, Online-Bestell- und Liefersoftware bereitstellt.",
      ar: "الشروط التي يقدّم بموجبها Kassenta برامج نقاط البيع والطلب الإلكتروني والتوصيل.",
    },
  },
  `${LEGAL_CSS}
  <section class="page-head">
    <div class="wrap">
      <div class="crumbs"><a href="/">Home</a><span>/</span><span>Terms</span></div>
      <h1>Terms of Service</h1>
      <p class="updated">Last updated: 11 August 2026</p>
    </div>
  </section>
  <section class="legal">
    <div class="wrap">
      <h2>1. Who these terms are between</h2>
      <p>These terms govern your use of the Kassenta point of sale, online ordering, delivery management and reporting software (the &quot;Service&quot;). By creating an account or using a licence key issued to your business, you accept them on behalf of that business.</p>

      <h2>2. Your licence</h2>
      <p>We grant your business a non-exclusive, non-transferable right to use the Service for as long as your subscription is active. The licence covers the number of locations and devices in your plan. You may not resell, sublicense or white-label the Service without a written agreement with us.</p>

      <h2>3. Your account and your staff</h2>
      <ul>
        <li>You are responsible for keeping licence keys, administrator passwords and staff PINs confidential.</li>
        <li>Actions taken with your credentials are treated as your actions. Tell us immediately if you believe a credential has been exposed and we will revoke it.</li>
        <li>You decide which staff hold which role. Roles govern both the screens and the API, so grant administrator rights sparingly.</li>
      </ul>

      <h2>4. Fees and billing</h2>
      <ul>
        <li>Fees are stated per location in Swiss francs, excluding VAT, and are charged in advance for the billing period you selected.</li>
        <li>Monthly subscriptions renew monthly until cancelled, with effect from the end of the current period.</li>
        <li>Yearly subscriptions are charged once for twelve months and are not refundable pro rata, except where required by law.</li>
        <li>We take no commission on orders placed through your own storefront, and we never sit between you and your payment provider.</li>
        <li>If a payment fails we contact you before restricting access. We do not delete data because of a missed payment.</li>
      </ul>

      <h2>5. Your data</h2>
      <p>Your products, customers, sales and settings belong to you. We process them to provide the Service and for no other purpose. We do not sell aggregated data and we do not market to your customers. Export to CSV is available from the reporting screens at any time, and a full export can be requested from support. Our handling of personal data is described in the <a href="/privacy">Privacy Policy</a>.</p>

      <h2>6. Availability</h2>
      <p>We aim for continuous availability and run daily encrypted backups with point-in-time restore. The point of sale continues to accept orders from its local cache during a network interruption and synchronises when the connection returns. We do not guarantee uninterrupted operation; planned maintenance is announced in advance where practical.</p>

      <h2>7. Acceptable use</h2>
      <ul>
        <li>Do not use the Service to break the law, to process payments for goods you are not licensed to sell, or to send unsolicited messages to customers.</li>
        <li>Do not attempt to access another business&#39;s data, probe the Service for vulnerabilities without written permission, or circumvent licence limits.</li>
        <li>Security researchers are welcome to report findings to <a href="mailto:info@kassenta.com">info@kassenta.com</a>; we will not pursue good-faith reports.</li>
      </ul>

      <h2>8. Fiscal and tax responsibility</h2>
      <p>The Service applies the tax rates, rounding rules and record retention that you configure. Confirming that your configuration matches the law in your market remains your responsibility and that of your accountant. Where a market requires a certification we have not completed, this is stated plainly on the <a href="/compliance/">Compliance</a> page.</p>

      <h2>9. Liability</h2>
      <p>We are liable without limitation for damage caused intentionally or by gross negligence, and for damage to life, body or health. In all other cases our aggregate liability is limited to the fees you paid in the twelve months before the event. We are not liable for indirect or consequential loss, including lost profit, where such exclusion is permitted by law.</p>

      <h2>10. Ending the agreement</h2>
      <p>You may cancel at any time with effect from the end of your current billing period. We may terminate for a material breach that is not remedied within 30 days of written notice. On termination we keep your data available for export for 60 days, then delete it.</p>

      <h2>11. Changes</h2>
      <p>We may update these terms. Material changes are announced by email at least 30 days before they take effect; continuing to use the Service after that date constitutes acceptance.</p>

      <h2>12. Governing law</h2>
      <p>These terms are governed by Swiss law. The place of jurisdiction is the registered seat of Kassenta, unless mandatory consumer protection law provides otherwise.</p>

      <h2>13. Contact</h2>
      <p>Questions about these terms: <a href="mailto:info@kassenta.com">info@kassenta.com</a></p>
    </div>
  </section>`,
  LEGAL_BASE
);

export const IMPRINT_HTML = renderPage(
  {
    path: "/imprint",
    title: { en: "Imprint — Kassenta POS", de: "Impressum — Kassenta POS", ar: "بيانات الناشر — Kassenta POS" },
    description: {
      en: "Legal disclosure and contact details for Kassenta.",
      de: "Anbieterkennzeichnung und Kontaktangaben von Kassenta.",
      ar: "الإفصاح القانوني وبيانات التواصل الخاصة بـ Kassenta.",
    },
  },
  `${LEGAL_CSS}
  <section class="page-head">
    <div class="wrap">
      <div class="crumbs"><a href="/">Home</a><span>/</span><span>Imprint</span></div>
      <h1>Imprint</h1>
      <p class="updated">Legal disclosure under applicable Swiss and EU information duties</p>
    </div>
  </section>
  <section class="legal">
    <div class="wrap">
      <h2>Service provider</h2>
      <dl>
        <dt>Trading name</dt><dd>Kassenta</dd>
        <dt>Product</dt><dd>Kassenta POS System — point of sale, online ordering and delivery software</dd>
        <dt>Email</dt><dd><a href="mailto:info@kassenta.com">info@kassenta.com</a></dd>
        <dt>Website</dt><dd><a href="https://kassenta.com">kassenta.com</a></dd>
      </dl>
      <p class="updated" style="margin-top:18px">Postal address, commercial register number and VAT identification number are supplied on request and appear on every invoice.</p>

      <h2>Responsible for content</h2>
      <p>The operator named above is responsible for the content of this website.</p>

      <h2>Liability for content</h2>
      <p>We prepare the content of these pages with care but cannot guarantee that it is accurate, complete and current at all times. Product statements describe the Service as delivered at the time of publication; anything still under development is marked as such on the <a href="/compliance/">Compliance</a> page.</p>

      <h2>Liability for links</h2>
      <p>This site links to external websites over whose content we have no control. Responsibility for that content lies with the respective operator. We check linked pages for legal violations at the time of linking and remove links promptly if we become aware of a violation.</p>

      <h2>Copyright</h2>
      <p>The content and design of these pages are protected by copyright. Reproduction, adaptation or distribution beyond the limits of copyright law requires our written consent. The Kassenta name and logo are our trademarks.</p>

      <h2>Data protection</h2>
      <p>How we handle personal data is described in the <a href="/privacy">Privacy Policy</a>. Requests to export or delete your data can be sent to <a href="mailto:info@kassenta.com">info@kassenta.com</a> and are executed within 30 days.</p>

      <h2>Dispute resolution</h2>
      <p>We are neither obliged nor willing to participate in dispute resolution proceedings before a consumer arbitration board. Business customers should raise any dispute with us directly at the address above.</p>
    </div>
  </section>`,
  LEGAL_BASE
);
