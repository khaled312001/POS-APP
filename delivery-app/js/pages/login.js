/**
 * login.js — Auth page: Google Sign-In, Phone OTP, Email/Password + Registration
 * Professional Just Eat-inspired design
 */
window.pages = window.pages || {};

pages.login = {
  _tab: "phone",
  _otpStep: false,
  _phone: "",
  _showPassword: false,

  render(params, container) {
    const rtl = isRtl();
    container.innerHTML = pages.login._build(rtl);
    pages.login._bindEvents(rtl);
    if (window.lucide) window.lucide.createIcons();
  },

  _build(rtl) {
    return `
<div class="auth-page">
  <!-- Back button -->
  <button class="auth-back" onclick="history.back()" aria-label="Go back">
    <i data-lucide="${rtl ? 'chevron-right' : 'chevron-left'}" class="icon-md"></i>
  </button>

  <div class="auth-card">
    <!-- Header -->
    <div class="auth-card__header">
      <div class="auth-logo-wrap">
        <div class="auth-logo-icon"><i data-lucide="utensils" class="icon-2xl"></i></div>
        <span class="auth-logo-text">Barmagly</span>
      </div>
      <h1 class="auth-title">${rtl ? "مرحباً بك" : "Welcome"}</h1>
      <p class="auth-subtitle">${rtl ? "سجّل دخولك أو أنشئ حساباً للمتابعة" : "Sign in or create an account to continue"}</p>
    </div>

    <div class="auth-body">

      <!-- Social Sign-In -->
      <div class="auth-social">
        <button class="auth-social-btn auth-social-btn--google" onclick="pages.login._googleSignIn()">
          <svg viewBox="0 0 24 24" width="20" height="20"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          ${rtl ? "المتابعة مع Google" : "Continue with Google"}
        </button>
        <button class="auth-social-btn auth-social-btn--apple" onclick="pages.login._appleSignIn()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
          ${rtl ? "المتابعة مع Apple" : "Continue with Apple"}
        </button>
      </div>

      <div class="auth-divider"><span>${rtl ? "أو" : "or"}</span></div>

      <!-- Tabs -->
      <div class="auth-tabs" role="tablist">
        <button class="auth-tab active" role="tab" id="tab-phone" onclick="pages.login._switchTab('phone')">
          <i data-lucide="smartphone" class="icon-sm"></i>
          ${rtl ? "الهاتف" : "Phone"}
        </button>
        <button class="auth-tab" role="tab" id="tab-email" onclick="pages.login._switchTab('email')">
          <i data-lucide="mail" class="icon-sm"></i>
          ${rtl ? "البريد" : "Email"}
        </button>
      </div>

      <!-- Phone OTP panel -->
      <div id="panel-phone">
        <div id="phone-step-1">
          <div class="auth-field">
            <label class="auth-field__label" for="auth-phone">${rtl ? "رقم الهاتف" : "Phone number"}</label>
            <div class="auth-field__input-wrap">
              <span class="auth-field__prefix">
                <i data-lucide="phone" class="icon-sm"></i>
              </span>
              <input id="auth-phone" class="auth-field__input" type="tel" placeholder="+41 7x xxx xxxx" autocomplete="tel" />
            </div>
          </div>
          <button class="btn btn-primary btn-full auth-submit" id="send-otp-btn" onclick="pages.login._sendOtp()">
            ${rtl ? "إرسال رمز التحقق" : "Send verification code"}
            <i data-lucide="arrow-right" class="icon-sm"></i>
          </button>
        </div>

        <div id="phone-step-2" class="hidden">
          <div class="auth-otp-header">
            <div class="auth-otp-icon"><i data-lucide="shield-check" class="icon-xl"></i></div>
            <p class="auth-otp-sent">${rtl ? "تم إرسال الرمز إلى" : "Code sent to"}</p>
            <strong id="otp-phone-display"></strong>
          </div>
          <div class="otp-inputs" id="otp-inputs">
            ${[0,1,2,3,4,5].map(i =>
              `<input class="otp-input" type="text" maxlength="1" inputmode="numeric" data-idx="${i}" aria-label="Digit ${i+1}" />`
            ).join("")}
          </div>
          <div class="form-error hidden" id="otp-error"></div>
          <button class="btn btn-primary btn-full auth-submit" id="verify-otp-btn" onclick="pages.login._verifyOtp()">
            ${rtl ? "تحقق وادخل" : "Verify & sign in"}
          </button>
          <div class="auth-link-row">
            <button class="auth-link" onclick="pages.login._resetOtp()">
              <i data-lucide="arrow-left" class="icon-xs"></i>
              ${rtl ? "تغيير الرقم" : "Change number"}
            </button>
          </div>
          <div id="resend-row" class="hidden auth-link-row">
            <button class="auth-link" onclick="pages.login._sendOtp()">
              <i data-lucide="refresh-cw" class="icon-xs"></i>
              ${rtl ? "إعادة إرسال الرمز" : "Resend code"}
            </button>
          </div>
        </div>
      </div>

      <!-- Email/Password panel -->
      <div id="panel-email" class="hidden">
        <div id="email-login-form">
          <div class="auth-field">
            <label class="auth-field__label" for="auth-email">${rtl ? "البريد الإلكتروني" : "Email address"}</label>
            <div class="auth-field__input-wrap">
              <span class="auth-field__prefix"><i data-lucide="mail" class="icon-sm"></i></span>
              <input id="auth-email" class="auth-field__input" type="email" placeholder="you@example.com" autocomplete="email" />
            </div>
          </div>
          <div class="auth-field">
            <label class="auth-field__label" for="auth-password">${rtl ? "كلمة المرور" : "Password"}</label>
            <div class="auth-field__input-wrap">
              <span class="auth-field__prefix"><i data-lucide="lock" class="icon-sm"></i></span>
              <input id="auth-password" class="auth-field__input" type="password" placeholder="••••••••" autocomplete="current-password" />
              <button type="button" class="auth-field__toggle" onclick="pages.login._togglePassword('auth-password', this)" aria-label="Toggle password">
                <i data-lucide="eye" class="icon-sm"></i>
              </button>
            </div>
          </div>
          <div class="form-error hidden" id="email-error"></div>
          <button class="btn btn-primary btn-full auth-submit" id="email-login-btn" onclick="pages.login._emailLogin()">
            ${rtl ? "تسجيل الدخول" : "Sign in"}
          </button>
          <div class="auth-divider"><span>${rtl ? "ليس لديك حساب؟" : "Don't have an account?"}</span></div>
          <button class="btn btn-outline btn-full" onclick="pages.login._showRegister()">
            ${rtl ? "إنشاء حساب جديد" : "Create account"}
          </button>
        </div>

        <!-- Register form -->
        <div id="email-register-form" class="hidden">
          <div class="auth-field">
            <label class="auth-field__label" for="reg-name">${rtl ? "الاسم الكامل" : "Full name"}</label>
            <div class="auth-field__input-wrap">
              <span class="auth-field__prefix"><i data-lucide="user" class="icon-sm"></i></span>
              <input id="reg-name" class="auth-field__input" type="text" placeholder="${rtl ? "محمد أحمد" : "John Smith"}" autocomplete="name" />
            </div>
          </div>
          <div class="auth-field">
            <label class="auth-field__label" for="reg-email">${rtl ? "البريد الإلكتروني" : "Email"}</label>
            <div class="auth-field__input-wrap">
              <span class="auth-field__prefix"><i data-lucide="mail" class="icon-sm"></i></span>
              <input id="reg-email" class="auth-field__input" type="email" placeholder="you@example.com" autocomplete="email" />
            </div>
          </div>
          <div class="auth-field">
            <label class="auth-field__label" for="reg-phone">${rtl ? "الهاتف" : "Phone"}</label>
            <div class="auth-field__input-wrap">
              <span class="auth-field__prefix"><i data-lucide="phone" class="icon-sm"></i></span>
              <input id="reg-phone" class="auth-field__input" type="tel" placeholder="+41 7x xxx xxxx" autocomplete="tel" />
            </div>
          </div>
          <div class="auth-field">
            <label class="auth-field__label" for="reg-password">${rtl ? "كلمة المرور" : "Password"}</label>
            <div class="auth-field__input-wrap">
              <span class="auth-field__prefix"><i data-lucide="lock" class="icon-sm"></i></span>
              <input id="reg-password" class="auth-field__input" type="password" placeholder="${rtl ? "8 أحرف على الأقل" : "8+ characters"}" autocomplete="new-password" />
              <button type="button" class="auth-field__toggle" onclick="pages.login._togglePassword('reg-password', this)" aria-label="Toggle password">
                <i data-lucide="eye" class="icon-sm"></i>
              </button>
            </div>
          </div>
          <div class="auth-terms">
            <label>
              <input type="checkbox" id="reg-terms">
              <span>${rtl ? "أوافق على" : "I agree to the"} <a href="javascript:void(0)" onclick="pages.login._showTerms()">${rtl ? "الشروط والأحكام" : "Terms & Conditions"}</a> ${rtl ? "و" : "and"} <a href="javascript:void(0)" onclick="pages.login._showPrivacy()">${rtl ? "سياسة الخصوصية" : "Privacy Policy"}</a></span>
            </label>
          </div>
          <div class="form-error hidden" id="reg-error"></div>
          <button class="btn btn-primary btn-full auth-submit" id="reg-btn" onclick="pages.login._register()">
            ${rtl ? "إنشاء الحساب" : "Create account"}
          </button>
          <div class="auth-link-row">
            <button class="auth-link" onclick="pages.login._showLogin()">
              <i data-lucide="arrow-left" class="icon-xs"></i>
              ${rtl ? "تسجيل الدخول" : "Back to sign in"}
            </button>
          </div>
        </div>
      </div>

      <!-- Skip -->
      <div class="auth-link-row auth-link-row--skip">
        <button class="auth-link auth-link--muted" onclick="history.back()">
          ${rtl ? "تخطي، متابعة كضيف" : "Skip, continue as guest"}
        </button>
      </div>

    </div>
  </div>
</div>`;
  },

  _bindEvents(rtl) {
    // OTP inputs auto-advance
    const inputs = document.querySelectorAll(".otp-input");
    inputs.forEach((input, i) => {
      input.addEventListener("input", (e) => {
        const val = e.target.value.replace(/\D/, "");
        e.target.value = val;
        e.target.classList.toggle("filled", !!val);
        if (val && i < inputs.length - 1) inputs[i + 1].focus();
        if (!val && i > 0 && e.inputType === "deleteContentBackward") inputs[i - 1].focus();
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !input.value && i > 0) inputs[i - 1].focus();
        if (e.key === "Enter") pages.login._verifyOtp();
      });
      input.addEventListener("paste", (e) => {
        const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        [...text].forEach((ch, j) => { if (inputs[j]) { inputs[j].value = ch; inputs[j].classList.add("filled"); } });
        if (inputs[Math.min(text.length, inputs.length - 1)]) inputs[Math.min(text.length, inputs.length - 1)].focus();
        e.preventDefault();
      });
    });

    document.getElementById("auth-phone")?.addEventListener("keydown", e => {
      if (e.key === "Enter") pages.login._sendOtp();
    });
    document.getElementById("auth-password")?.addEventListener("keydown", e => {
      if (e.key === "Enter") pages.login._emailLogin();
    });
  },

  _togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password";
    const icon = btn.querySelector("i");
    if (icon) {
      icon.setAttribute("data-lucide", isPassword ? "eye-off" : "eye");
      if (window.lucide) window.lucide.createIcons();
    }
  },

  _switchTab(tab) {
    pages.login._tab = tab;
    document.getElementById("panel-phone").classList.toggle("hidden", tab !== "phone");
    document.getElementById("panel-email").classList.toggle("hidden", tab !== "email");
    document.getElementById("tab-phone").classList.toggle("active", tab === "phone");
    document.getElementById("tab-email").classList.toggle("active", tab === "email");
  },

  _googleSignIn() {
    const rtl = isRtl();
    // Try Google Identity Services
    if (window.google && window.google.accounts) {
      window.google.accounts.id.initialize({
        client_id: window.DELIVERY_CONFIG?.googleClientId || "",
        callback: pages.login._handleGoogleResponse,
      });
      window.google.accounts.id.prompt();
    } else {
      showToast(rtl ? "Google Sign-In غير متاح حالياً" : "Google Sign-In is not available yet", "info");
    }
  },

  async _handleGoogleResponse(response) {
    const cfg = window.DELIVERY_CONFIG || {};
    try {
      const result = await api.auth.googleLogin(response.credential, cfg.tenantId);
      auth.setSession(result.token, result.customer);
      showToast(isRtl() ? "مرحباً " + (result.customer?.name || "") : "Welcome " + (result.customer?.name || ""), "success");
      const navLabel = document.getElementById("nav-user-label");
      if (navLabel && result.customer?.name) navLabel.textContent = result.customer.name.split(" ")[0];
      history.back();
    } catch (err) {
      showToast(err.message || "Google sign-in failed", "error");
    }
  },

  _appleSignIn() {
    showToast(isRtl() ? "قريباً!" : "Coming soon!", "info");
  },

  async _sendOtp() {
    const phone = document.getElementById("auth-phone")?.value.trim();
    if (!phone) { showToast(isRtl() ? "أدخل رقم الهاتف" : "Enter phone number", "warning"); return; }

    const cfg = window.DELIVERY_CONFIG || {};
    const btn = document.getElementById("send-otp-btn");
    if (btn) btn.classList.add("loading");

    try {
      await api.auth.requestOtp(phone, cfg.tenantId);
      pages.login._phone = phone;
      pages.login._otpStep = true;

      document.getElementById("phone-step-1").classList.add("hidden");
      document.getElementById("phone-step-2").classList.remove("hidden");
      const display = document.getElementById("otp-phone-display");
      if (display) display.textContent = phone;

      const firstInput = document.querySelector(".otp-input");
      if (firstInput) firstInput.focus();

      setTimeout(() => {
        const resendRow = document.getElementById("resend-row");
        if (resendRow) resendRow.classList.remove("hidden");
      }, 30000);

    } catch (err) {
      showToast(err.message || (isRtl() ? "فشل في إرسال الرمز" : "Failed to send code"), "error");
    } finally {
      if (btn) btn.classList.remove("loading");
    }
  },

  _resetOtp() {
    pages.login._otpStep = false;
    document.getElementById("phone-step-1").classList.remove("hidden");
    document.getElementById("phone-step-2").classList.add("hidden");
    document.querySelectorAll(".otp-input").forEach(i => { i.value = ""; i.classList.remove("filled"); });
  },

  async _verifyOtp() {
    const inputs = document.querySelectorAll(".otp-input");
    const otp = [...inputs].map(i => i.value).join("");
    if (otp.length < 4) { showToast(isRtl() ? "أدخل رمز التحقق كاملاً" : "Enter the full code", "warning"); return; }

    const cfg = window.DELIVERY_CONFIG || {};
    const btn = document.getElementById("verify-otp-btn");
    const errEl = document.getElementById("otp-error");
    if (btn) btn.classList.add("loading");
    if (errEl) errEl.classList.add("hidden");

    try {
      const result = await api.auth.verifyOtp(pages.login._phone, cfg.tenantId, otp);
      auth.setSession(result.token, result.customer);
      showToast(isRtl() ? "مرحباً " + (result.customer?.name || "") : "Welcome " + (result.customer?.name || ""), "success");
      const navLabel = document.getElementById("nav-user-label");
      if (navLabel && result.customer?.name) navLabel.textContent = result.customer.name.split(" ")[0];
      history.back();
    } catch (err) {
      if (errEl) { errEl.textContent = err.message || (isRtl() ? "رمز خاطئ" : "Wrong code"); errEl.classList.remove("hidden"); }
      document.querySelectorAll(".otp-input").forEach(i => i.classList.add("error"));
    } finally {
      if (btn) btn.classList.remove("loading");
    }
  },

  async _emailLogin() {
    const email = document.getElementById("auth-email")?.value.trim();
    const password = document.getElementById("auth-password")?.value;
    const cfg = window.DELIVERY_CONFIG || {};
    const btn = document.getElementById("email-login-btn");
    const errEl = document.getElementById("email-error");

    if (!email || !password) { showToast(isRtl() ? "أدخل البيانات كاملة" : "Fill in all fields", "warning"); return; }

    if (btn) btn.classList.add("loading");
    if (errEl) errEl.classList.add("hidden");

    try {
      const result = await api.auth.login(email, password, cfg.tenantId);
      auth.setSession(result.token, result.customer);
      showToast(isRtl() ? "مرحباً " + (result.customer?.name || "") : "Welcome back", "success");
      const navLabel = document.getElementById("nav-user-label");
      if (navLabel && result.customer?.name) navLabel.textContent = result.customer.name.split(" ")[0];
      history.back();
    } catch (err) {
      if (errEl) { errEl.textContent = err.message || (isRtl() ? "فشل في تسجيل الدخول" : "Login failed"); errEl.classList.remove("hidden"); }
    } finally {
      if (btn) btn.classList.remove("loading");
    }
  },

  _showRegister() {
    document.getElementById("email-login-form").classList.add("hidden");
    document.getElementById("email-register-form").classList.remove("hidden");
    if (window.lucide) window.lucide.createIcons();
  },

  _showLogin() {
    document.getElementById("email-login-form").classList.remove("hidden");
    document.getElementById("email-register-form").classList.add("hidden");
  },

  async _register() {
    const name = document.getElementById("reg-name")?.value.trim();
    const email = document.getElementById("reg-email")?.value.trim();
    const phone = document.getElementById("reg-phone")?.value.trim();
    const password = document.getElementById("reg-password")?.value;
    const terms = document.getElementById("reg-terms")?.checked;
    const cfg = window.DELIVERY_CONFIG || {};
    const btn = document.getElementById("reg-btn");
    const errEl = document.getElementById("reg-error");
    const rtl = isRtl();

    if (!name || !email || !password) { showToast(rtl ? "أدخل البيانات كاملة" : "Fill in required fields", "warning"); return; }
    if (password.length < 8) { showToast(rtl ? "كلمة المرور قصيرة" : "Password too short (8+ chars)", "warning"); return; }
    if (!terms) { showToast(rtl ? "يجب الموافقة على الشروط" : "Please accept Terms & Conditions", "warning"); return; }

    if (btn) btn.classList.add("loading");
    if (errEl) errEl.classList.add("hidden");

    try {
      const result = await api.auth.register({ name, email, phone, password, tenantId: cfg.tenantId });
      auth.setSession(result.token, result.customer);
      showToast(rtl ? "تم إنشاء الحساب" : "Account created!", "success");
      const navLabel = document.getElementById("nav-user-label");
      if (navLabel) navLabel.textContent = name.split(" ")[0];
      history.back();
    } catch (err) {
      if (errEl) { errEl.textContent = err.message || (rtl ? "فشل في إنشاء الحساب" : "Registration failed"); errEl.classList.remove("hidden"); }
    } finally {
      if (btn) btn.classList.remove("loading");
    }
  },

  _showTerms() {
    alert(isRtl() ? "صفحة الشروط والأحكام ستتوفر قريباً" : "Terms & Conditions page coming soon");
  },

  _showPrivacy() {
    alert(isRtl() ? "صفحة سياسة الخصوصية ستتوفر قريباً" : "Privacy Policy page coming soon");
  },
};
