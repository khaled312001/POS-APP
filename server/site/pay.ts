/**
 * Stripe Checkout return pages.
 *
 * Checkout needs a `success_url` and a `cancel_url` on our own origin, and the
 * two of them are the only routes on the site a search engine has no business
 * indexing — hence `noindex` on both.
 *
 * The success page is deliberately careful: nothing a browser is told on the
 * way back from Stripe is proof of anything. The signed webhook is what marks
 * a payment settled, so this page opens with "we are confirming", asks the
 * server what Stripe says about the session, and only firms the wording up
 * once the server answers `paid`. With no session id, a failed lookup or a
 * payment still in flight, it stays neutral rather than congratulating someone
 * whose TWINT redirect quietly failed.
 */
import { icons, tAttrs, esc, type PageMeta, type T3 } from "./shell";

const crumbs = (label: T3) => `
      <div class="crumbs"><a href="/" ${tAttrs({ en: "Home", de: "Start", ar: "الرئيسية" })}>Home</a><span>/</span><a href="/pricing/" ${tAttrs({ en: "Pricing", de: "Preise", ar: "الأسعار" })}>Pricing</a><span>/</span><span ${tAttrs(label)}>${esc(label.en)}</span></div>`;

const step = (title: T3, body: T3) => `
        <div class="step">
          <div>
            <h3 ${tAttrs(title)}>${esc(title.en)}</h3>
            <p ${tAttrs(body)}>${esc(body.en)}</p>
          </div>
        </div>`;

// ════════════════════════════════════════════════════════════════════════════
// /pay/success
// ════════════════════════════════════════════════════════════════════════════
export const paySuccess: { meta: PageMeta; body: string } = {
  meta: {
    path: "/pay/success",
    noindex: true,
    title: { en: "Confirming your payment — Kassenta POS", de: "Zahlung wird bestätigt — Kassenta POS", ar: "جارٍ تأكيد دفعتك — Kassenta POS" },
    description: {
      en: "We are confirming your Kassenta payment with Stripe. Once it settles we set your account up and send your licence key to the address you paid with.",
      de: "Wir bestätigen Ihre Kassenta-Zahlung bei Stripe. Sobald sie verbucht ist, richten wir Ihr Konto ein und senden den Lizenzschlüssel an die Zahlungsadresse.",
      ar: "نؤكّد دفعتك لدى Stripe الآن. وبمجرد تسويتها نجهّز حسابك ونرسل مفتاح الترخيص إلى العنوان الذي دفعت به.",
    },
  },
  body: `
  <section class="page-head">
    <div class="wrap">
      ${crumbs({ en: "Payment", de: "Zahlung", ar: "الدفع" })}
      <h1 id="pay-title" ${tAttrs({ en: "We are confirming your payment", de: "Wir bestätigen Ihre Zahlung", ar: "نؤكّد دفعتك الآن" })}>We are confirming your payment</h1>
      <p class="lead" id="pay-lead" ${tAttrs({
        en: "Stripe has sent you back to us. The confirmation comes from Stripe itself, not from this page, so give it a few seconds.",
        de: "Stripe hat Sie zu uns zurückgeleitet. Die Bestätigung kommt von Stripe selbst, nicht von dieser Seite — geben Sie ihr ein paar Sekunden.",
        ar: "أعادك Stripe إلينا. التأكيد يأتي من Stripe نفسه لا من هذه الصفحة، فامنحه بضع ثوانٍ.",
      })}>Stripe has sent you back to us. The confirmation comes from Stripe itself, not from this page, so give it a few seconds.</p>
    </div>
  </section>

  <section class="section">
    <div class="wrap" style="max-width:760px">
      <article class="card" style="display:grid;gap:16px">
        <div class="card-icon" id="pay-icon">${icons.clock}</div>
        <h2 id="pay-headline" ${tAttrs({ en: "Checking with Stripe", de: "Abgleich mit Stripe", ar: "جارٍ المراجعة مع Stripe" })}>Checking with Stripe</h2>
        <p id="pay-body" ${tAttrs({
          en: "This page asks our server what Stripe recorded for your checkout. Nothing here decides whether you were charged.",
          de: "Diese Seite fragt unseren Server, was Stripe zu Ihrem Checkout erfasst hat. Nichts auf dieser Seite entscheidet über die Belastung.",
          ar: "تسأل هذه الصفحة خادمنا عمّا سجّله Stripe لعملية الدفع. لا شيء هنا يقرّر ما إذا كنت قد دُفع منك.",
        })}>This page asks our server what Stripe recorded for your checkout. Nothing here decides whether you were charged.</p>
        <div class="form-status wait" id="pay-status" role="status" aria-live="polite" ${tAttrs({
          en: "Confirming…",
          de: "Wird bestätigt…",
          ar: "جارٍ التأكيد…",
        })}>Confirming…</div>
        <p class="form-note" id="pay-detail"></p>
      </article>

      <div class="section-head" style="margin-top:48px;margin-bottom:24px">
        <h2 ${tAttrs({ en: "What happens next", de: "Wie es weitergeht", ar: "ما الذي يحدث بعد ذلك" })}>What happens next</h2>
      </div>
      <div class="steps">
        ${step(
          { en: "Stripe settles the payment", de: "Stripe verbucht die Zahlung", ar: "يسوّي Stripe الدفعة" },
          {
            en: "Card payments settle at once. TWINT and other redirect methods can take a minute, and you do not need to keep this page open.",
            de: "Kartenzahlungen sind sofort verbucht. TWINT und andere Weiterleitungen können eine Minute brauchen; diese Seite muss nicht offen bleiben.",
            ar: "تُسوَّى مدفوعات البطاقة فورًا. أما TWINT وطرق التحويل الأخرى فقد تستغرق دقيقة، ولا يلزم إبقاء هذه الصفحة مفتوحة.",
          }
        )}
        ${step(
          { en: "We set your account up", de: "Wir richten Ihr Konto ein", ar: "نجهّز حسابك" },
          {
            en: "Account creation is not automatic — a person at Kassenta opens it, which is also when we ask about your branches and your menu. Expect the licence key at the address you paid with within one business day.",
            de: "Die Kontoeröffnung läuft nicht automatisch — ein Mensch bei Kassenta legt es an und fragt dabei nach Filialen und Karte. Der Lizenzschlüssel kommt innerhalb eines Werktags an die Zahlungsadresse.",
            ar: "إنشاء الحساب ليس آليًا — يفتحه شخص لدى Kassenta، وعندها نسأل عن فروعك وقائمتك. توقّع مفتاح الترخيص على عنوان الدفع خلال يوم عمل واحد.",
          }
        )}
        ${step(
          { en: "Open the POS and activate", de: "Kasse öffnen und aktivieren", ar: "افتح الكاشير وفعّل" },
          {
            en: "Enter the licence key once on the device you will use at the counter. We import your menu and train your team before you go live.",
            de: "Geben Sie den Lizenzschlüssel einmalig auf dem Kassengerät ein. Wir importieren Ihre Karte und schulen Ihr Team vor dem Livegang.",
            ar: "أدخل مفتاح الترخيص مرة واحدة على الجهاز الذي ستستخدمه عند الكاشير. نستورد قائمتك وندرّب فريقك قبل التشغيل.",
          }
        )}
      </div>

      <div class="btn-row" style="margin-top:32px">
        <a class="btn btn-primary" href="/app" ${tAttrs({ en: "Open the POS", de: "Kasse öffnen", ar: "افتح الكاشير" })}>Open the POS</a>
        <a class="btn btn-ghost" href="/contact/" ${tAttrs({ en: "Something looks wrong", de: "Etwas stimmt nicht", ar: "هناك ما يبدو خاطئًا" })}>Something looks wrong</a>
      </div>
    </div>
  </section>

  <script>
    (function () {
      var status = document.getElementById('pay-status');
      var detail = document.getElementById('pay-detail');
      var headline = document.getElementById('pay-headline');
      var body = document.getElementById('pay-body');
      var icon = document.getElementById('pay-icon');
      if (!status) return;

      /* Writes the three data-* attributes as well as the text, so the language
         switcher keeps working on copy this script replaced. */
      function say(el, msg) {
        if (!el) return;
        el.setAttribute('data-en', msg.en);
        el.setAttribute('data-de', msg.de);
        el.setAttribute('data-ar', msg.ar);
        var lang = document.documentElement.lang || 'en';
        el.textContent = msg[lang] || msg.en;
      }

      var MSG = {
        waiting: {
          en: 'Confirming with Stripe…',
          de: 'Bestätigung bei Stripe…',
          ar: 'جارٍ التأكيد مع Stripe…'
        },
        paid: {
          en: 'Stripe has confirmed the payment.',
          de: 'Stripe hat die Zahlung bestätigt.',
          ar: 'أكّد Stripe الدفعة.'
        },
        paidBody: {
          en: 'Stripe has your money and we can see it. Your account is opened by a person, not by this page, so the licence key reaches the address you paid with within one business day.',
          de: 'Stripe hat Ihre Zahlung und wir sehen sie. Ihr Konto wird von einem Menschen angelegt, nicht von dieser Seite — der Lizenzschlüssel erreicht die Zahlungsadresse innerhalb eines Werktags.',
          ar: 'استلم Stripe مبلغك ونراه لدينا. يفتح حسابك شخص لا هذه الصفحة، فيصلك مفتاح الترخيص على عنوان الدفع خلال يوم عمل واحد.'
        },
        pending: {
          en: 'Stripe has not settled this payment yet.',
          de: 'Stripe hat diese Zahlung noch nicht verbucht.',
          ar: 'لم يسوِّ Stripe هذه الدفعة بعد.'
        },
        pendingBody: {
          en: 'TWINT and bank redirects can take a minute to settle. Nothing is lost if you close this page: whatever Stripe clears, we see, and we pick it up from there.',
          de: 'TWINT und Bank-Weiterleitungen brauchen manchmal eine Minute. Es geht nichts verloren, wenn Sie diese Seite schliessen: Was Stripe verbucht, sehen wir — und machen von dort weiter.',
          ar: 'قد يستغرق TWINT والتحويلات البنكية دقيقة حتى تُسوَّى. لا يضيع شيء إن أغلقت الصفحة: ما يسوّيه Stripe نراه ونكمل منه.'
        },
        unknown: {
          en: 'We could not read this checkout from here.',
          de: 'Wir konnten diesen Checkout hier nicht auslesen.',
          ar: 'تعذّر علينا قراءة عملية الدفع هذه من هنا.'
        },
        unknownBody: {
          en: 'That does not mean the payment failed — only that this page cannot see it. Stripe emails you a receipt for anything it charged. If nothing arrives within ten minutes, contact us and we will look it up.',
          de: 'Das heisst nicht, dass die Zahlung fehlgeschlagen ist — nur, dass diese Seite sie nicht sieht. Stripe sendet für jede Belastung eine Quittung per E-Mail. Kommt binnen zehn Minuten nichts an, melden Sie sich; wir prüfen das.',
          ar: 'هذا لا يعني فشل الدفع، بل أن هذه الصفحة لا تراه فحسب. يرسل Stripe إيصالًا بالبريد لأي مبلغ حصّله. إن لم يصلك شيء خلال عشر دقائق فتواصل معنا وسنتحقّق.'
        },
        expired: {
          en: 'This checkout expired before it was paid.',
          de: 'Dieser Checkout ist abgelaufen, bevor er bezahlt wurde.',
          ar: 'انتهت صلاحية عملية الدفع هذه قبل إتمامها.'
        },
        expiredBody: {
          en: 'Nothing was charged. Pick your plan again from the pricing page and the checkout starts fresh.',
          de: 'Es wurde nichts belastet. Wählen Sie Ihren Plan auf der Preisseite erneut, der Checkout startet neu.',
          ar: 'لم يُخصم أي مبلغ. اختر باقتك من صفحة الأسعار من جديد وستبدأ عملية دفع جديدة.'
        }
      };

      var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';

      function amountLine(data) {
        if (typeof data.amountTotal !== 'number' || !data.currency) return;
        var major = (data.amountTotal / 100).toFixed(2);
        var cur = String(data.currency).toUpperCase();
        var name = data.planName ? ' — ' + data.planName : '';
        detail.textContent = cur + ' ' + major + name;
      }

      var sid = new URLSearchParams(location.search).get('session_id');
      if (!sid || !/^cs_[A-Za-z0-9_]+$/.test(sid)) {
        say(headline, MSG.unknown);
        say(body, MSG.unknownBody);
        say(status, MSG.unknown);
        status.className = 'form-status wait';
        return;
      }

      say(status, MSG.waiting);

      /* Polls for the settled state rather than trusting the redirect: the
         webhook is the authority and a TWINT redirect returns before it fires. */
      var deadline = Date.now() + 45000;

      function poll() {
        fetch('/api/landing/checkout-session/' + encodeURIComponent(sid), {
          headers: { Accept: 'application/json' }
        }).then(function (r) {
          if (!r.ok) throw new Error(String(r.status));
          return r.json();
        }).then(function (data) {
          amountLine(data);

          if (data.paymentStatus === 'paid') {
            icon.innerHTML = CHECK;
            say(headline, MSG.paid);
            say(body, MSG.paidBody);
            say(status, MSG.paid);
            status.className = 'form-status ok';
            return;
          }
          if (data.status === 'expired') {
            say(headline, MSG.expired);
            say(body, MSG.expiredBody);
            say(status, MSG.expired);
            status.className = 'form-status err';
            return;
          }
          if (Date.now() < deadline) return setTimeout(poll, 2500);

          say(headline, MSG.pending);
          say(body, MSG.pendingBody);
          say(status, MSG.pending);
          status.className = 'form-status wait';
        }).catch(function () {
          if (Date.now() < deadline) return setTimeout(poll, 4000);
          say(headline, MSG.unknown);
          say(body, MSG.unknownBody);
          say(status, MSG.unknown);
          status.className = 'form-status wait';
        });
      }

      poll();
    })();
  </script>`,
};

// ════════════════════════════════════════════════════════════════════════════
// /pay/cancelled
// ════════════════════════════════════════════════════════════════════════════
export const payCancelled: { meta: PageMeta; body: string } = {
  meta: {
    path: "/pay/cancelled",
    noindex: true,
    title: { en: "Checkout cancelled — Kassenta POS", de: "Checkout abgebrochen — Kassenta POS", ar: "أُلغيت عملية الدفع — Kassenta POS" },
    description: {
      en: "You left the Kassenta checkout before paying. Nothing was charged and no account was created.",
      de: "Sie haben den Kassenta-Checkout vor der Zahlung verlassen. Es wurde nichts belastet und kein Konto angelegt.",
      ar: "غادرت صفحة الدفع قبل إتمامها. لم يُخصم أي مبلغ ولم يُنشأ أي حساب.",
    },
  },
  body: `
  <section class="page-head">
    <div class="wrap">
      ${crumbs({ en: "Cancelled", de: "Abgebrochen", ar: "ملغاة" })}
      <h1 ${tAttrs({ en: "Checkout cancelled", de: "Checkout abgebrochen", ar: "أُلغيت عملية الدفع" })}>Checkout cancelled</h1>
      <p class="lead" ${tAttrs({
        en: "You left the payment page before it completed. Nothing was charged and no account was created.",
        de: "Sie haben die Zahlungsseite vor dem Abschluss verlassen. Es wurde nichts belastet und kein Konto angelegt.",
        ar: "غادرت صفحة الدفع قبل إتمامها. لم يُخصم أي مبلغ ولم يُنشأ أي حساب.",
      })}>You left the payment page before it completed. Nothing was charged and no account was created.</p>
    </div>
  </section>

  <section class="section">
    <div class="wrap" style="max-width:760px">
      <article class="card" style="display:grid;gap:14px">
        <div class="card-icon">${icons.tag}</div>
        <h2 ${tAttrs({ en: "Pick up where you left off", de: "Machen Sie dort weiter, wo Sie aufgehört haben", ar: "أكمل من حيث توقّفت" })}>Pick up where you left off</h2>
        <p ${tAttrs({
          en: "The plan you chose is still on the pricing page, and starting the checkout again takes a few seconds. If something on the payment page stopped you, tell us what it was — that is worth knowing.",
          de: "Ihr gewählter Plan steht weiterhin auf der Preisseite, und ein neuer Checkout dauert wenige Sekunden. Falls Sie etwas auf der Zahlungsseite gestoppt hat, sagen Sie uns was — das ist wertvoll zu wissen.",
          ar: "باقتك المختارة ما زالت على صفحة الأسعار، وبدء الدفع من جديد يستغرق ثوانٍ. وإن أوقفك شيء في صفحة الدفع فأخبرنا به — فذلك يهمّنا.",
        })}>The plan you chose is still on the pricing page, and starting the checkout again takes a few seconds. If something on the payment page stopped you, tell us what it was — that is worth knowing.</p>
        <div class="btn-row">
          <a class="btn btn-primary" href="/pricing/" ${tAttrs({ en: "Back to pricing", de: "Zurück zu den Preisen", ar: "العودة إلى الأسعار" })}>Back to pricing</a>
          <a class="btn btn-ghost" href="/contact/" ${tAttrs({ en: "Talk to us instead", de: "Lieber sprechen", ar: "تحدّث إلينا بدلًا من ذلك" })}>Talk to us instead</a>
        </div>
      </article>

      <p class="form-note" style="margin-top:24px" ${tAttrs({
        en: "Prefer an invoice, a bank transfer or a demo before you commit? All three are fine — write to info@kassenta.com and we will set it up.",
        de: "Lieber Rechnung, Banküberweisung oder erst eine Demo? Alles möglich — schreiben Sie an info@kassenta.com und wir richten es ein.",
        ar: "تفضّل فاتورة أو تحويلًا بنكيًا أو عرضًا توضيحيًا قبل الالتزام؟ كلها متاحة — راسلنا على info@kassenta.com وسنرتّب ذلك.",
      })}>Prefer an invoice, a bank transfer or a demo before you commit? All three are fine — write to info@kassenta.com and we will set it up.</p>
    </div>
  </section>`,
};

export const PAY_PAGES = [paySuccess, payCancelled];
