/**
 * login.js — sign in with a WhatsApp code (primary) or Google.
 *
 * Phone + WhatsApp code must always work, so nothing here waits on Google:
 * Google's script is loaded in the background with a timeout and, if it can't
 * load (blocked or slow network), the button says so instead of hanging.
 * Inside the Android app the WebView can't run Google's web SDK, so the app
 * signs in natively and hands back an ID token (window.__kassentaGoogleResult).
 */
window.pages = window.pages || {};

pages.login = {
  _GOOGLE_CLIENT_ID: "852311970344-8q8a01gm3jip4k9vooljk8ttjpd30802.apps.googleusercontent.com",
  _gis: null,          // promise for Google's script
  _gisState: "idle",   // idle | loading | ready | failed
  _timer: null,

  _isNativeApp() { return !!(window.__KASSENTA_NATIVE__ && window.ReactNativeWebView); },

  _loadGoogle() {
    if (window.google && window.google.accounts && window.google.accounts.oauth2) { pages.login._gisState = "ready"; return Promise.resolve(); }
    if (pages.login._gis) return pages.login._gis;
    pages.login._gisState = "loading";
    pages.login._gis = loadScript("https://accounts.google.com/gsi/client", 10000).then(() => {
      if (!(window.google && window.google.accounts && window.google.accounts.oauth2)) throw new Error("gsi");
      pages.login._gisState = "ready";
    }).catch((e) => {
      pages.login._gis = null;
      pages.login._gisState = "failed";
      throw e;
    });
    return pages.login._gis;
  },

  render(params, container, alive) {
    if (auth.isLoggedIn()) { pages.login._done(); return; }
    const storeCfg = shop.cachedConfig();
    const cfg = kx.cfg;
    const logo = fixImageUrl(storeCfg.logo || cfg.logo || "");
    const st = { step: "phone", phone: safeStorage.get("kassenta_login_phone") || "", norm: null, busy: false, resendAt: 0 };

    const googleBtn = () => `
      <div class="divider"><span>${esc(L("or", "أو"))}</span></div>
      <button type="button" class="btn btn-outline btn-lg btn-block google-btn" data-google>
        <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
        <span data-google-label>${esc(L("Continue with Google", "المتابعة عبر Google"))}</span>
      </button>
      <p class="small muted center" data-google-msg hidden></p>`;

    const draw = () => {
      const pre = kx.phoneFieldPrefix();
      let body;
      if (st.step === "phone") {
        body = `
        <form id="phone-form" novalidate>
          <label class="field">
            <span class="field__label">${esc(L("Mobile number", "رقم الموبايل"))}</span>
            <span class="input-group">${pre ? `<span class="input-group__pre" dir="ltr">${esc(pre)}</span>` : ""}
              <input class="input input--lg" id="l-phone" type="tel" inputmode="tel" dir="ltr" autocomplete="tel" maxlength="20" value="${esc(st.phone)}" placeholder="${esc(kx.phoneHint().replace(/^[^\d+]*/, ""))}" required></span>
            <span class="field__hint">${esc(L("We'll send a 6-digit code to this number on WhatsApp.", "سنرسل رمزاً من 6 أرقام إلى هذا الرقم عبر واتساب."))}</span>
          </label>
          <p class="field__err" id="l-err" role="alert" hidden></p>
          <button class="btn btn-primary btn-lg btn-block" type="submit">${icon("message-circle", "icon-sm")} <span>${esc(L("Send code on WhatsApp", "أرسل الرمز عبر واتساب"))}</span></button>
        </form>
        ${googleBtn()}`;
      } else if (st.step === "code") {
        body = `
        <form id="code-form" novalidate>
          <p class="center">${esc(L("Enter the code we sent on WhatsApp to", "أدخل الرمز الذي أرسلناه عبر واتساب إلى"))}<br><strong dir="ltr">${esc(st.norm.display)}</strong>
            <button type="button" class="link" data-change>${esc(L("Change", "تغيير"))}</button></p>
          <input class="input otp-input" id="l-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" dir="ltr" aria-label="${esc(L("6-digit code", "الرمز المكوّن من 6 أرقام"))}" placeholder="••••••">
          <p class="field__err" id="l-err" role="alert" hidden></p>
          <button class="btn btn-primary btn-lg btn-block" type="submit"><span>${esc(L("Confirm", "تأكيد"))}</span></button>
          <p class="center small"><button type="button" class="link" data-resend disabled></button></p>
          <p class="small muted center">${esc(L("No message? Make sure the number has WhatsApp, or sign in with Google.", "لم تصلك رسالة؟ تأكّد أن الرقم مسجّل على واتساب، أو سجّل الدخول عبر Google."))}</p>
        </form>`;
      } else {
        body = `
        <form id="name-form" novalidate>
          <p class="center">${esc(L("What should we call you?", "ما الاسم الذي نناديك به؟"))}</p>
          <label class="field">
            <span class="field__label">${esc(L("Your name", "اسمك"))}</span>
            <input class="input input--lg" id="l-name" maxlength="80" autocomplete="name">
          </label>
          <p class="field__err" id="l-err" role="alert" hidden></p>
          <button class="btn btn-primary btn-lg btn-block" type="submit"><span>${esc(L("Save", "حفظ"))}</span></button>
          <button class="btn btn-ghost btn-block" type="button" data-skip>${esc(L("Skip", "تخطٍّ"))}</button>
        </form>`;
      }
      container.innerHTML = `
${ui.topBar(L("Sign in", "تسجيل الدخول"), { back: "account" })}
<div class="page page--auth">
  <div class="auth-card">
    <div class="auth-card__brand">
      ${logo ? `<img src="${esc(logo)}" alt="" class="auth-card__logo" onerror="this.remove()">` : `<span class="auth-card__logo auth-card__logo--ph">${icon("store", "icon-lg")}</span>`}
      <h1 class="auth-card__title">${esc(st.step === "name" ? L("Welcome!", "أهلاً بك!") : L("Sign in to ", "تسجيل الدخول إلى ") + (storeCfg.storeName || cfg.storeName || ""))}</h1>
      ${st.step === "phone" ? `<p class="muted">${esc(L("Track orders, save addresses and earn rewards.", "تابع طلباتك واحفظ عناوينك واكسب المكافآت."))}</p>` : ""}
    </div>
    ${body}
  </div>
</div>`;
      bind();
      refreshIcons();
    };

    const say = (m) => { const e = container.querySelector("#l-err"); if (e) { e.textContent = m || ""; e.hidden = !m; } };
    const busy = (form, on) => {
      st.busy = on;
      const b = form && form.querySelector('button[type="submit"]');
      if (b) { b.disabled = on; b.classList.toggle("is-loading", on); }
    };

    const tickResend = () => {
      const b = container.querySelector("[data-resend]");
      if (!b) return;
      const left = Math.ceil((st.resendAt - Date.now()) / 1000);
      if (left > 0) {
        b.disabled = true;
        b.textContent = L("Resend code in ", "إعادة الإرسال بعد ") + left + L("s", " ث");
      } else {
        b.disabled = false;
        b.textContent = L("Resend code", "أعد إرسال الرمز");
        clearInterval(pages.login._timer);
      }
    };

    const sendCode = async (form) => {
      if (st.busy) return;
      say("");
      busy(form, true);
      try {
        await api.auth.requestOtp(st.norm.value, cfg.tenantId);
        safeStorage.set("kassenta_login_phone", st.phone);
        st.step = "code";
        st.resendAt = Date.now() + 60000;
        st.busy = false;
        draw();
        const inp = container.querySelector("#l-code");
        if (inp) inp.focus();
        clearInterval(pages.login._timer);
        pages.login._timer = setInterval(tickResend, 1000);
        tickResend();
        showToast(L("Code sent on WhatsApp", "تم إرسال الرمز عبر واتساب"), "success");
      } catch (e) {
        busy(form, false);
        say(e.status === 429 ? L("Too many attempts. Please wait a few minutes and try again.", "محاولات كثيرة. انتظر بضع دقائق ثم أعد المحاولة.") : e.message);
      }
    };

    const bind = () => {
      const pf = container.querySelector("#phone-form");
      if (pf) pf.onsubmit = (e) => {
        e.preventDefault();
        st.phone = container.querySelector("#l-phone").value;
        st.norm = kx.normalizePhone(st.phone);
        if (!st.norm.valid) { say(L("Enter a valid mobile number. ", "أدخل رقم موبايل صحيحاً. ") + kx.phoneHint()); return; }
        sendCode(pf);
      };

      const cf = container.querySelector("#code-form");
      if (cf) {
        const inp = cf.querySelector("#l-code");
        inp.oninput = () => {
          const v = kx.latinDigits(inp.value).replace(/\D/g, "").slice(0, 6);
          if (inp.value !== v) inp.value = v;
          if (v.length === 6) cf.requestSubmit ? cf.requestSubmit() : cf.onsubmit(new Event("submit"));
        };
        cf.onsubmit = async (e) => {
          e.preventDefault();
          if (st.busy) return;
          const code = kx.latinDigits(inp.value).replace(/\D/g, "");
          if (code.length !== 6) { say(L("Enter the 6-digit code.", "أدخل الرمز المكوّن من 6 أرقام.")); return; }
          say("");
          busy(cf, true);
          try {
            const r = await api.auth.verifyOtp(st.norm.value, cfg.tenantId, code);
            if (!r || !r.token) throw new Error(L("Sign-in failed. Please try again.", "تعذّر تسجيل الدخول. حاول مرة أخرى."));
            clearInterval(pages.login._timer);
            auth.setSession(r.token, r.customer);
            afterLogin();
          } catch (ex) {
            busy(cf, false);
            inp.value = "";
            inp.focus();
            say(/invalid|expired|incorrect/i.test(ex.message) ? L("That code is wrong or has expired.", "الرمز غير صحيح أو انتهت صلاحيته.") : ex.message);
          }
        };
        cf.querySelector("[data-change]").onclick = () => { clearInterval(pages.login._timer); st.step = "phone"; draw(); };
        cf.querySelector("[data-resend]").onclick = () => { if (Date.now() >= st.resendAt) sendCode(cf); };
      }

      const nf = container.querySelector("#name-form");
      if (nf) {
        nf.onsubmit = async (e) => {
          e.preventDefault();
          if (st.busy) return;
          const name = nf.querySelector("#l-name").value.trim();
          if (name.length < 2) { say(L("Enter your name, or tap Skip.", "أدخل اسمك أو اضغط تخطٍّ.")); return; }
          busy(nf, true);
          try {
            await api.auth.updateMe({ name });
            await auth.loadMe();
            pages.login._done();
          } catch (ex) { busy(nf, false); say(ex.message); }
        };
        nf.querySelector("[data-skip]").onclick = () => pages.login._done();
      }

      const g = container.querySelector("[data-google]");
      if (g) {
        g.onclick = () => pages.login._google(g, afterLogin);
        pages.login._paintGoogle(container);
        if (!pages.login._isNativeApp() && pages.login._gisState !== "ready") {
          pages.login._loadGoogle().catch(() => {}).then(() => { if (alive()) pages.login._paintGoogle(container); });
        }
      }
    };

    const afterLogin = () => {
      showToast(L("You're signed in", "تم تسجيل الدخول"), "success");
      if (!auth.displayName()) { st.step = "name"; st.busy = false; draw(); const n = container.querySelector("#l-name"); if (n) n.focus(); return; }
      pages.login._done();
    };

    router.onLeave(() => clearInterval(pages.login._timer));
    draw();
  },

  _paintGoogle(container) {
    const label = container.querySelector("[data-google-label]");
    const msg = container.querySelector("[data-google-msg]");
    if (!label || pages.login._isNativeApp()) return;
    const s = pages.login._gisState;
    if (s === "failed") {
      label.textContent = L("Retry Google sign-in", "أعد محاولة الدخول عبر Google");
      msg.textContent = L("Google couldn't be reached on this connection. Use your mobile number instead.", "تعذّر الوصول إلى Google على هذا الاتصال. استخدم رقم موبايلك بدلاً من ذلك.");
      msg.hidden = false;
    } else {
      label.textContent = L("Continue with Google", "المتابعة عبر Google");
      msg.hidden = true;
    }
  },

  _google(btn, afterLogin) {
    const fail = (m) => showToast(m || L("Google sign-in failed. Use your mobile number instead.", "تعذّر الدخول عبر Google. استخدم رقم موبايلك بدلاً من ذلك."), "error", 5000);

    if (pages.login._isNativeApp()) {
      btn.disabled = true;
      const t = setTimeout(() => { btn.disabled = false; }, 60000);
      window.__kassentaGoogleResult = (res) => {
        clearTimeout(t);
        btn.disabled = false;
        if (!res || !res.ok) { if (!res || !res.cancelled) fail(res && res.error); return; }
        pages.login._finishGoogle({ credential: res.idToken }, btn, afterLogin);
      };
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: "google-signin" }));
      return;
    }

    // The popup has to open inside this click, so the script must already be here.
    if (pages.login._gisState !== "ready") {
      const container = btn.closest(".page") || document;
      const label = btn.querySelector("[data-google-label]");
      btn.disabled = true;
      if (label) label.textContent = L("Loading Google…", "جارٍ تحميل Google…");
      pages.login._loadGoogle().then(() => {
        btn.disabled = false;
        pages.login._paintGoogle(container.parentNode || document);
        showToast(L("Google is ready — tap the button again.", "أصبح Google جاهزاً — اضغط الزر مرة أخرى."), "info");
      }, () => {
        btn.disabled = false;
        pages.login._paintGoogle(container.parentNode || document);
      });
      return;
    }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: pages.login._GOOGLE_CLIENT_ID,
      scope: "openid email profile",
      callback: (resp) => {
        if (!resp || !resp.access_token) { showToast(L("Sign-in cancelled", "تم إلغاء تسجيل الدخول"), "info"); return; }
        pages.login._finishGoogle({ accessToken: resp.access_token }, btn, afterLogin);
      },
      error_callback: (err) => {
        const type = (err && err.type) || "";
        if (type === "popup_closed") return;
        if (type === "popup_failed_to_open") return fail(L("Allow pop-ups for this site, then try again.", "اسمح بالنوافذ المنبثقة لهذا الموقع ثم أعد المحاولة."));
        fail();
      },
    });
    client.requestAccessToken({ prompt: "select_account" });
  },

  async _finishGoogle(payload, btn, afterLogin) {
    if (btn) { btn.disabled = true; btn.classList.add("is-loading"); }
    try {
      const r = await api.auth.googleLogin(payload, kx.cfg.tenantId);
      if (!r || !r.token) throw new Error();
      auth.setSession(r.token, r.customer);
      afterLogin();
    } catch (e) {
      showToast((e && e.message) || L("Google sign-in failed. Use your mobile number instead.", "تعذّر الدخول عبر Google. استخدم رقم موبايلك بدلاً من ذلك."), "error", 5000);
    } finally {
      if (btn) { btn.disabled = false; btn.classList.remove("is-loading"); }
    }
  },

  _done() {
    const r = auth.takeReturn();
    if (r && r.name && r.name !== "login") router.replace(r.name, r.params || {});
    else router.replace("account");
  },
};
