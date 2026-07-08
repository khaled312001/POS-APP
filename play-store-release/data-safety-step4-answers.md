# Data Safety Step 4 — Final Answer Reference

## ملخص سريع: لكل واحد من الـ14 نوع، اضغط Next مع الإجابات التالية

---

### 1. Name
**Collected?** Yes
**Shared?** Yes (only if WhatsApp Business API و/أو SMTP خارجي مفعّلين)
**Ephemeral?** No
**Required or Optional?** Required
**Collection purposes** (check these boxes):
- [x] App functionality
- [x] Account management
- [ ] Analytics
- [ ] Developer communications
- [ ] Advertising or marketing
- [ ] Fraud prevention, security and compliance
- [ ] Personalisation

**Sharing purposes** (only if Shared = Yes):
- [x] App functionality
- [ ] (everything else)

**ليه؟** أسماء الموظفين والأدمنز تتخزن على pos.barmagly.tech للـ login والـ audit logs والإيصالات (Required لأي استخدام واحد بيخلي الـ row Required بالكامل). أسماء العملاء اختيارية لكنها بتطلع لـ WhatsApp/SMTP لما الإيصال يتبعت — ده Share حقيقي مع شركة تانية (Meta و/أو SMTP provider خارجي). لازم Privacy Policy توضح إن فيه جمهورين: موظفين (Required) وعملاء (Conditional).

---

### 2. Email address
**Collected?** Yes
**Shared?** Yes (فقط لو SMTP provider خارجي زي SendGrid/Mailgun/SES مستخدم؛ لو الـ MTA داخلي على pos.barmagly.tech بدون طرف ثالث، اعمله No)
**Ephemeral?** No
**Required or Optional?** Required
**Collection purposes** (check these boxes):
- [x] App functionality
- [x] Account management
- [x] Developer communications
- [ ] Analytics
- [ ] Advertising or marketing
- [ ] Fraud prevention, security and compliance
- [ ] Personalisation

**Sharing purposes** (only if Shared = Yes):
- [x] App functionality
- [ ] (everything else)

**ليه؟** إيميل الأدمن مطلوب للـ login واستعادة كلمة السر وإشعارات الأمان (Developer communications). إيميل العميل اختياري ويتبعت لـ SMTP لتسليم الإيصال — ده Share مع طرف ثالث لو الـ SMTP خارجي. القاعدة: لو أي استخدام Required، الـ row كله Required.

---

### 3. User IDs
**Collected?** Yes
**Shared?** No
**Ephemeral?** No
**Required or Optional?** Required
**Collection purposes** (check these boxes):
- [x] App functionality
- [x] Account management
- [x] Fraud prevention, security and compliance
- [ ] Analytics
- [ ] Developer communications
- [ ] Advertising or marketing
- [ ] Personalisation

**Sharing purposes:** N/A (Shared = No)

**ليه؟** الـ License Key (BARMAGLY-XXXX...) معرّف **tenant/installation** (مش per-end-user) وبيتخزن على pos.barmagly.tech للعزل بين المتاجر وحماية الـ API من تفعيلات غير مصرّح بها. الـ Employee/Admin IDs الداخلية بتدخل هنا كمان. الـ PIN نفسه **auth credential** مش معرّف ومش بيتعلن كـ User ID — مجرد بيانات اعتماد للتحقق.

---

### 4. Address
**Collected?** Yes
**Shared?** Yes (مشروط — راجع الملاحظات تحت)
**Ephemeral?** No
**Required or Optional?** Optional
**Collection purposes** (check these boxes):
- [x] App functionality
- [ ] Account management
- [ ] Analytics
- [ ] Developer communications
- [ ] Advertising or marketing
- [ ] Fraud prevention, security and compliance
- [ ] Personalisation

**Sharing purposes** (only if Shared = Yes):
- [x] App functionality
- [x] Fraud prevention, security and compliance (لو العنوان بيتبعت مع Stripe charge لاستخدامه في Radar/AVS)
- [ ] (everything else)

**ليه؟** عنوان العميل بيتجمع بس لطلبات الدليفري، وعنوان المتجر بيظهر على الإيصال. لو العنوان مكتوب في نص رسالة WhatsApp أو الإيصال بالإيميل، فهو Shared مع Meta/SMTP. لو الـ Stripe payment بيستقبل العنوان كـ billing/shipping address فالـ Fraud prevention لازم تتشيك. Optional لأن الـ walk-in والـ dine-in مش محتاجين عنوان.

---

### 5. Phone number
**Collected?** Yes
**Shared?** Yes (لو WhatsApp Business API مفعّل)
**Ephemeral?** No
**Required or Optional?** Optional
**Collection purposes** (check these boxes):
- [x] App functionality
- [x] Account management
- [ ] Analytics
- [ ] Developer communications
- [ ] Advertising or marketing
- [ ] Fraud prevention, security and compliance
- [ ] Personalisation

**Sharing purposes** (only if Shared = Yes):
- [x] App functionality
- [ ] (everything else)

**ليه؟** تليفون الموظف/الأدمن بيتخزن لاستعادة الحساب (Account management)، وتليفون العميل بيتخزن للبحث عن الطلبات (App functionality). لو WhatsApp Business API مفعّل، تليفون العميل بيروح لـ Meta — Share حقيقي مع شركة تانية. Optional لأن POS بيشتغل كامل من غير ما يجمع أي تليفون.

---

### 6. User payment info
**Collected?** No (لو Stripe Elements / TWINT SDK بيعملوا tokenize على الجهاز و pos.barmagly.tech بيستقبل token reference بس — وده الـ default integration وموقف PCI-DSS SAQ-A)
**Shared?** Yes (Stripe و/أو TWINT)
**Ephemeral?** N/A (لأن Collected = No، السؤال ده مش هيظهر)
**Required or Optional?** Optional
**Collection purposes:** N/A (Collected = No)
**Sharing purposes** (only if Shared = Yes):
- [x] App functionality
- [x] Fraud prevention, security and compliance
- [ ] (everything else)

**ليه؟** الـ PAN/CVV بيتم tokenize بالـ SDK على الجهاز ومبيمرش على pos.barmagly.tech أبدًا — الـ token reference مش بيانات دفع خام. الإعلان الصحيح: مش Collected لكن Shared (الـ SDK بياخد البيانات من الجهاز ويبعتها لـ Stripe/TWINT مباشرة). لو أي merchant مش مفعّل Stripe ولا TWINT، خلي Shared = No والـ row كله ممكن يبقى Collected = No / Shared = No.

> تنبيه: لو الـ backend بيستقبل raw card data (مش الحالة العادية)، غيّر Collected = Yes وراجع PCI scope.

---

### 7. Purchase history
**Collected?** Yes
**Shared?** Yes (لما Stripe/TWINT يتم استخدامهم أو الإيصال يتبعت عبر WhatsApp/SMTP)
**Ephemeral?** No
**Required or Optional?** Required
**Collection purposes** (check these boxes):
- [x] App functionality
- [x] Analytics
- [ ] Account management
- [ ] Developer communications
- [ ] Advertising or marketing
- [ ] Fraud prevention, security and compliance
- [ ] Personalisation

**Sharing purposes** (only if Shared = Yes):
- [x] App functionality
- [x] Fraud prevention, security and compliance (Stripe/TWINT بيستخدمو بيانات المعاملة لـ fraud checks تحت دورهم كـ controllers)
- [ ] (everything else)

**ليه؟** كل أوردر بيتخزن على pos.barmagly.tech — ده الـ core function لأي POS/mini-ERP، وبيغذي تقارير المبيعات الداخلية للـ merchant (Analytics داخلي بس). للـ Sharing: الـ amount + reference بتروح لـ Stripe/TWINT لتنفيذ الدفع وحماية من الـ fraud؛ الـ line items بتروح لـ WhatsApp/SMTP لو الإيصال بيتبعت. **تأكد:** لو مش بتبعت `line_items` لـ Stripe Checkout، الـ share مع Stripe محدود بـ amount + reference بس.

---

### 8. Photos
**Collected?** Yes
**Shared?** No
**Ephemeral?** No
**Required or Optional?** Optional
**Collection purposes** (check these boxes):
- [x] App functionality
- [ ] (everything else)

**Sharing purposes:** N/A (Shared = No)

**ليه؟** الـ merchant بيرفع صور المنتجات وبتتخزن على Google Cloud Storage تحت Barmagly's GCP project مع DPA سارية — Google Cloud هنا **service provider** بيتصرف نيابة عن المطوّر، مش "Sharing" حسب Google Data Safety FAQ. مفيش التقاط صور للعملاء ولا facial data. Optional لأن المنتجات ممكن تتعمل بدون صور.

> احتفظ بنسخة من الـ DPA جاهزة لو أي reviewer سأل.

---

### 9. App interactions
**Collected?** Yes — **فقط لو فيه فعلًا telemetry endpoint بيستقبل أحداث (cart actions, voids, shift open/close)**
**Shared?** No
**Ephemeral?** No
**Required or Optional?** Required
**Collection purposes** (check these boxes):
- [x] App functionality
- [x] Analytics
- [ ] (everything else)

**Sharing purposes:** N/A (Shared = No)

**ليه؟** أحداث الـ in-app interactions بتتكتب على pos.barmagly.tech لتشغيل order pipeline وتقارير العمليات الداخلية للـ merchant (Analytics داخلي بس، مفيش SDK طرف ثالث). Required لأنها بتتجمع تلقائيًا بدون toggle للـ end user.

> **تأكد من الكود:** لو الأحداث مبتتبعتش كـ event stream منفصل، والتقارير بتتعمل من الـ orders table بس، فالـ row ده ممكن يكون overstated — لو الحالة دي، غيّر Collected = No والاكتفاء بـ Purchase history.

---

### 10. In-app search history
**Collected?** Yes — **فقط لو queries البحث بتتبعت لـ pos.barmagly.tech**
**Shared?** No
**Ephemeral?** No
**Required or Optional?** Required (مش Optional)
**Collection purposes** (check these boxes):
- [x] App functionality
- [x] Analytics
- [ ] (everything else)

**Sharing purposes:** N/A (Shared = No)

**ليه؟** Google بتعتبر "Optional" تعني وجود **toggle داخل التطبيق** يمنع الجمع — مش مجرد إن المستخدم يقدر ميستخدمش الفيتشر. ما دام مفيش toggle لإيقاف تسجيل الـ search history، الـ row ده **Required**. Analytics داخلي بس (recent-search shortcuts + معرفة المنتجات الأكثر بحثًا للـ merchant).

> **تأكد من الكود:** لو الـ search queries بتتخزن client-side بس (recent searches محلية) ومبتتبعتش للـ backend، غيّر Collected = No.

---

### 11. Crash logs
**Collected?** Yes — **فقط لو فيه crash-upload endpoint فعلي بيبعت لـ pos.barmagly.tech**
**Shared?** No
**Ephemeral?** No
**Required or Optional?** Required
**Collection purposes** (check these boxes):
- [x] App functionality
- [x] Fraud prevention, security and compliance
- [ ] Analytics (اشيلها إلا لو فعلًا بتجمع crashes في تقارير aggregated)
- [ ] (everything else)

**Sharing purposes:** N/A (Shared = No)

**ليه؟** الـ crash logs بتتبعت لـ pos.barmagly.tech لتشخيص مشاكل الاستقرار — مفيش Crashlytics/Sentry. Required لأن مفيش toggle لإيقاف الإرسال على مستوى الـ end user. التصنيف الأقرب حسب Google taxonomy هو **App functionality + Fraud prevention/security/compliance** (security hardening)، مش Analytics — إلا لو فعلًا بتعمل aggregated crash reports.

> **تأكد من الكود:** لو الـ crashes بتتكتب لـ logcat محلي فقط ومش بتـ POST لأي endpoint، غيّر Collected = No.

---

### 12. Diagnostics
**Collected?** Yes
**Shared?** No
**Ephemeral?** No
**Required or Optional?** Required
**Collection purposes** (check these boxes):
- [x] App functionality
- [x] Fraud prevention, security and compliance
- [ ] Analytics (اشيلها إلا لو فعلًا بتعمل aggregated performance dashboards)
- [ ] (everything else)

**Sharing purposes:** N/A (Shared = No)

**ليه؟** Performance metrics، sync timings، printer/scanner connectivity، و license-validation pings بتتبعت لـ pos.barmagly.tech. الـ **license enforcement** ده استخدام Fraud prevention/security/compliance صريح. الـ License Key نفسه بيتعلن تحت **User IDs** (مش بيتعدّ مرتين) — هنا بنعلن الـ ping metadata بس (timing, success/failure, app version).

---

### 13. Approximate location
**Collected?** Yes (لو الـ city/region المشتقة من IP بتتخزن على tenant profile على pos.barmagly.tech)
**Shared?** No
**Ephemeral?** No (لو متخزنة)
**Required or Optional?** Required
**Collection purposes** (check these boxes):
- [x] App functionality
- [x] Fraud prevention, security and compliance
- [ ] (everything else)

**Sharing purposes:** N/A (Shared = No)

**ليه؟** الـ backend بيشتق location تقريبي من الـ IP عند تفعيل الـ License Key وعلى الـ API calls لربط الترخيص بمنطقة وكشف التفعيلات المشبوهة. Required لأن المستخدم مش قادر يمنع الـ IP من الوصول للـ server. لازم الـ Privacy Policy توضح الـ IP-based geolocation صراحةً.

> **تأكد من الكود:** لو الـ IP geolocation بتتحسب per-request وبتترمى من غير ما تتخزن في tenant profile، الـ row ده **يفضل يتشال نهائيًا** (Google مبتطلبش الإعلان عن transient server-side IP geolocation). لو متأكد إنها بتتخزن، سيبها Required كما هي.

---

### 14. Precise location
**Collected?** Yes
**Shared?** Yes (لو الإحداثيات بتطلع في WhatsApp/SMTP receipt مع باقي بيانات الأوردر)
**Ephemeral?** **No** (مش Yes)
**Required or Optional?** Optional
**Collection purposes** (check these boxes):
- [x] App functionality
- [ ] (everything else)

**Sharing purposes** (only if Shared = Yes):
- [x] App functionality
- [ ] (everything else)

**ليه؟** الـ GPS بيتقرأ بس لما الـ merchant يربط delivery pickup point أو يـ geotag متجر. **التصحيح الجوهري:** الإحداثية بتتكتب في الـ order/store record على pos.barmagly.tech — يعني بتتـ persist، فـ Ephemeral لازم يكون **No** (تعريف Google للـ ephemeral: في الذاكرة بس ومبتتكتبش لقرص/سيرفر). كمان لو الإحداثية بتطلع في رسالة WhatsApp/SMTP للعميل، الـ Shared = Yes. Optional لأن الـ merchant يقدر يكتب العنوان يدويًا.

> **خيار بديل:** لو عايز تسيب Ephemeral = Yes، لازم تشيل تخزين الإحداثية من order/store record وتسيبها in-memory بس.

---

## ملاحظات مهمة قبل الضغط على Next

- **Stripe/TWINT مش مفعّل عند الـ merchant؟** غيّر row 6 (User payment info) لـ Collected = No / Shared = No بالكامل، واشيل Fraud prevention/security/compliance من Sharing في row 7 (Purchase history) و row 4 (Address).
- **SMTP داخلي مش طرف ثالث (الـ MTA على pos.barmagly.tech نفسه)؟** غيّر row 2 (Email address) لـ Shared = No، واشيل SMTP من تبرير rows 1/4/7.
- **WhatsApp Business API مش مفعّل؟** غيّر rows 1 (Name), 4 (Address), 5 (Phone number), 7 (Purchase history) لـ Shared = No لو الـ SMTP كمان داخلي.
- **App interactions (row 9):** افتح الكود وتأكد إن فيه فعلًا endpoint بيستقبل events منفصلة عن الـ orders. لو لأ، خلي Collected = No.
- **In-app search history (row 10):** تأكد من الكود — لو الـ search recent محلية بس ومبتتبعتش، غيّر Collected = No. لو بتتبعت بدون toggle، سيبها Required (مش Optional زي الـ draft).
- **Crash logs (row 11):** تأكد إن فيه crash-upload endpoint فعلي. لو الـ crashes بتروح logcat بس، غيّر Collected = No.
- **Approximate location (row 13):** تأكد إن الـ city/region المشتقة من IP بتتخزن على tenant profile. لو transient per-request بس، اشيل الـ row نهائيًا.
- **Precise location (row 14):** القرار الجوهري: إما تسيب الإحداثيات بتتخزن وتعمل Ephemeral = No (زي ما المراجعة قالت)، أو توقف تخزينها وتسيبها in-memory بس وخليك على Ephemeral = Yes. **مينفعش الاتنين مع بعض.**
- **Device or other IDs (مفقود):** افتح الكود وشوف لو التطبيق بيبعت FCM token (push notifications), Android ID, أو installation UUID لـ pos.barmagly.tech. لو أيوة، **ضيف row جديد** بالإعدادات:
  - Collected: Yes / Shared: No / Ephemeral: No / Required / App functionality + Fraud prevention/security/compliance.
- **PIN auth:** الـ PIN مش بيتعلن كنوع بيانات مستقل — هو credential، مش identifier. مفيش تغيير في الـ form لكن الـ Privacy Policy لازم توضح إن الـ PIN credential.
- **DPA documentation:** احتفظ بنسخة من Data Processing Addendum مع Google Cloud (للصور) و Stripe/TWINT/Meta/SMTP provider جاهزة لو الـ reviewer طلبها.
- **Privacy Policy URL:** لازم يفصّل بين employee/admin data (Required) و customer data (Conditional/Optional) لـ Name و Email و Phone، ولازم يذكر IP-based geolocation صراحةً.