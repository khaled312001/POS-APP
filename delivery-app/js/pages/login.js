/**
 * login.js — Auth page: Phone OTP + Email/Password tabs + Registration
 */
window.pages = window.pages || {};

pages.login = {
  _tab: "phone",
  _otpStep: false,
  _phone: "",

  render(params, container) {
    const rtl = isRtl();
    container.innerHTML = pages.login._build(rtl);
    pages.login._bindEvents(rtl);
  },

  _build(rtl) {
    return `
<div class="auth-page">
  <div class="auth-card">
    <div class="auth-card__header">
      <div class="auth-logo">🍽️</div>
      <div class="auth-title">${rtl ? "مرحباً بك" : "Welcome back"}</div>
      <div class="auth-subtitle">${rtl ? "سجّل دخولك لمتابعة طلباتك" : "Sign in to track your orders"}</div>
    </div>

    <div class="auth-tabs" role="tablist">
      <button class="auth-tab active" role="tab" id="tab-phone" onclick="pages.login._switchTab('phone')">
        📱 ${rtl ? "الهاتف" : "Phone"}
      </button>
      <button class="auth-tab" role="tab" id="tab-email" onclick="pages.login._switchTab('email')">
        ✉️ ${rtl ? "البريد الإلكتروني" : "Email"}
      </button>
    </div>

    <div class="auth-body">

      <!-- Phone OTP panel -->
      <div id="panel-phone">
        <div id="phone-step-1">
          <div class="form-group">
            <label class="form-label" for="auth-phone">${rtl ? "رقم الهاتف" : "Phone number"}</label>
            <input id="auth-phone" class="form-input" type="tel" placeholder="+20 1xx xxx xxxx" autocomplete="tel" />
          </div>
          <button class="btn btn-primary btn-full" id="send-otp-btn" onclick="pages.login._sendOtp()">
            ${rtl ? "إرسال رمز التحقق" : "Send verification code"}
          </button>
        </div>

        <div id="phone-step-2" class="hidden">
          <p style="text-align:center;color:var(--delivery-text-secondary);margin-bottom:var(--space-lg)" id="otp-sent-msg">
            ${rtl ? "تم إرسال الرمز إلى" : "Code sent to"} <strong id="otp-phone-display"></strong>
          </p>
          <div class="otp-inputs" id="otp-inputs">
            ${[0,1,2,3,4,5].map(i =>
              `<input class="otp-input" type="text" maxlength="1" inputmode="numeric" data-idx="${i}" aria-label="Digit ${i+1}" />`
            ).join("")}
          </div>
          <div class="form-error hidden" id="otp-error" style="text-align:center;margin-top:var(--space-sm)"></div>
          <button class="btn btn-primary btn-full" style="margin-top:var(--space-lg)" id="verify-otp-btn" onclick="pages.login._verifyOtp()">
            ${rtl ? "تحقق وادخل" : "Verify & sign in"}
          </button>
          <div style="text-align:center;margin-top:var(--space-md)">
            <button class="text-primary text-sm" onclick="pages.login._resetOtp()">
              ${rtl ? "← تغيير رقم الهاتف" : "← Change number"}
            </button>
          </div>
          <div id="resend-row" class="hidden" style="text-align:center;margin-top:var(--space-sm)">
            <button class="text-primary text-sm" onclick="pages.login._sendOtp()">
              ${rtl ? "إعادة إرسال الرمز" : "Resend code"}
            </button>
          </div>
        </div>
      </div>

      <!-- Email/Password panel -->
      <div id="panel-email" class="hidden">
        <div id="email-login-form">
          <div class="form-group">
            <label class="form-label" for="auth-email">${rtl ? "البريد الإلكتروني" : "Email address"}</label>
            <input id="auth-email" class="form-input" type="email" placeholder="you@example.com" autocomplete="email" />
          </div>
          <div class="form-group">
            <label class="form-label" for="auth-password">${rtl ? "كلمة المرور" : "Password"}</label>
            <input id="auth-password" class="form-input" type="password" placeholder="••••••••" autocomplete="current-password" />
          </div>
          <div class="form-error hidden" id="email-error" style="margin-top:var(--space-sm)"></div>
          <button class="btn btn-primary btn-full" style="margin-top:var(--space-md)" id="email-login-btn" onclick="pages.login._emailLogin()">
            ${rtl ? "تسجيل الدخول" : "Sign in"}
          </button>

          <div class="auth-divider">${rtl ? "ليس لديك حساب؟" : "Don't have an account?"}</div>
          <button class="btn btn-outline btn-full" onclick="pages.login._showRegister()">
            ${rtl ? "إنشاء حساب جديد" : "Create account"}
          </button>
        </div>

        <!-- Register form -->
        <div id="email-register-form" class="hidden">
          <div class="form-group">
            <label class="form-label" for="reg-name">${rtl ? "الاسم الكامل" : "Full name"}</label>
            <input id="reg-name" class="form-input" type="text" placeholder="${rtl ? "محمد أحمد" : "John Smith"}" autocomplete="name" />
          </div>
          <div class="form-group">
            <label class="form-label" for="reg-email">${rtl ? "البريد الإلكتروني" : "Email"}</label>
            <input id="reg-email" class="form-input" type="email" placeholder="you@example.com" autocomplete="email" />
          </div>
          <div class="form-group">
            <label class="form-label" for="reg-phone">${rtl ? "الهاتف" : "Phone"}</label>
            <input id="reg-phone" class="form-input" type="tel" placeholder="+20 1xx xxx xxxx" autocomplete="tel" />
          </div>
          <div class="form-group">
            <label class="form-label" for="reg-password">${rtl ? "كلمة المرور" : "Password"}</label>
            <input id="reg-password" class="form-input" type="password" placeholder="${rtl ? "8 أحرف على الأقل" : "8+ characters"}" autocomplete="new-password" />
          </div>
          <div class="form-error hidden" id="reg-error" style="margin-top:var(--space-sm)"></div>
          <button class="btn btn-primary btn-full" style="margin-top:var(--space-md)" id="reg-btn" onclick="pages.login._register()">
            ${rtl ? "إنشاء الحساب" : "Create account"}
          </button>
          <button class="btn btn-ghost btn-full" style="margin-top:var(--space-sm)" onclick="pages.login._showLogin()">
            ${rtl ? "← تسجيل الدخول" : "← Sign in"}
          </button>
        </div>
      </div>

      <!-- Skip -->
      <div style="text-align:center;margin-top:var(--space-md)">
        <button class="text-muted text-sm" onclick="history.back()">
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

    // Enter on phone
    document.getElementById("auth-phone")?.addEventListener("keydown", e => {
      if (e.key === "Enter") pages.login._sendOtp();
    });

    // Enter on password
    document.getElementById("auth-password")?.addEventListener("keydown", e => {
      if (e.key === "Enter") pages.login._emailLogin();
    });
  },

  _switchTab(tab) {
    pages.login._tab = tab;
    document.getElementById("panel-phone").classList.toggle("hidden", tab !== "phone");
    document.getElementById("panel-email").classList.toggle("hidden", tab !== "email");
    document.getElementById("tab-phone").classList.toggle("active", tab === "phone");
    document.getElementById("tab-email").classList.toggle("active", tab === "email");
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

      // Show resend after 30s
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
      showToast(isRtl() ? "مرحباً 👋 " + (result.customer?.name || "") : "Welcome 👋 " + (result.customer?.name || ""), "success");

      // Update nav label
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
      showToast(isRtl() ? "مرحباً 👋 " + (result.customer?.name || "") : "Welcome back 👋", "success");
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
    const cfg = window.DELIVERY_CONFIG || {};
    const btn = document.getElementById("reg-btn");
    const errEl = document.getElementById("reg-error");

    if (!name || !email || !password) { showToast(isRtl() ? "أدخل البيانات كاملة" : "Fill in required fields", "warning"); return; }
    if (password.length < 8) { showToast(isRtl() ? "كلمة المرور قصيرة" : "Password too short", "warning"); return; }

    if (btn) btn.classList.add("loading");
    if (errEl) errEl.classList.add("hidden");

    try {
      const result = await api.auth.register({ name, email, phone, password, tenantId: cfg.tenantId });
      auth.setSession(result.token, result.customer);
      showToast(isRtl() ? "تم إنشاء الحساب 🎉" : "Account created! 🎉", "success");
      const navLabel = document.getElementById("nav-user-label");
      if (navLabel) navLabel.textContent = name.split(" ")[0];
      history.back();
    } catch (err) {
      if (errEl) { errEl.textContent = err.message || (isRtl() ? "فشل في إنشاء الحساب" : "Registration failed"); errEl.classList.remove("hidden"); }
    } finally {
      if (btn) btn.classList.remove("loading");
    }
  },
};
