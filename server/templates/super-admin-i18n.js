/*
 * Super Admin translation layer (English source → German / Arabic).
 *
 * The Super Admin pages are written in English. The server inlines this file
 * in place of the <!--SA_I18N--> marker; it translates text nodes and the
 * placeholder/title/aria-label attributes as they appear (a MutationObserver
 * also covers everything the page renders later), plus alert/confirm/prompt.
 * The language is shared with the POS app through localStorage.app_language;
 * switching reloads the page so every view is rendered fresh.
 */
(function () {
  var LANGS = [["en", "EN"], ["de", "DE"], ["ar", "عربي"]];
  var lang = "en";
  try {
    var saved = localStorage.getItem("app_language");
    if (saved === "de" || saved === "ar") lang = saved;
  } catch (e) { }
  var IDX = lang === "de" ? 0 : 1;

  function renderSwitch() {
    var holders = document.querySelectorAll(".lang-switch");
    if (!holders.length) {
      // The login page has no slot: pin one next to its theme toggle.
      var h = document.createElement("div");
      h.className = "lang-switch lang-switch--float";
      h.setAttribute("data-no-i18n", "");
      document.body.appendChild(h);
      holders = [h];
    }
    Array.prototype.forEach.call(holders, function (holder) {
      holder.innerHTML = "";
      LANGS.forEach(function (l) {
        var b = document.createElement("button");
        b.type = "button";
        b.textContent = l[1];
        b.className = l[0] === lang ? "on" : "";
        b.setAttribute("aria-pressed", l[0] === lang ? "true" : "false");
        b.onclick = function () {
          if (l[0] === lang) return;
          try { localStorage.setItem("app_language", l[0]); } catch (e) { }
          location.reload();
        };
        holder.appendChild(b);
      });
    });
  }

  var css = [
    ".lang-switch{display:flex;height:38px;border:1px solid var(--bd,rgba(127,127,127,.3));border-radius:10px;overflow:hidden;flex:none;direction:ltr}",
    ".lang-switch button{border:0;background:var(--card,transparent);color:var(--mu,#8a93a6);font:600 12px/1 'Inter','IBM Plex Sans Arabic',sans-serif;padding:0 10px;cursor:pointer;min-height:0}",
    ".lang-switch button+button{border-left:1px solid var(--bd,rgba(127,127,127,.3))}",
    ".lang-switch button.on{background:var(--pr-dim,rgba(47,211,198,.14));color:var(--pr,#2fd3c6)}",
    ".lang-switch button:hover{color:var(--pr,#2fd3c6)}",
    ".lang-switch--float{position:fixed;top:18px;right:68px;height:40px;z-index:10;border-color:var(--border,rgba(127,127,127,.3));box-shadow:var(--card-shadow,none);background:var(--bg-card,#fff)}",
    ".lang-switch--float button{background:var(--bg-card,#fff);color:var(--text-muted,#8a93a6)}",
    "html[dir=rtl] .lang-switch--float{right:auto;left:68px}",
  ];
  if (lang === "ar") {
    css.push(
      "*{font-family:'Inter','IBM Plex Sans Arabic',sans-serif}",
      "html[dir=rtl] .sb{left:auto;right:0;border-right:0;border-left:1px solid var(--bd)}",
      "html[dir=rtl] .main{margin-left:0;margin-right:var(--sw)}",
      "html[dir=rtl] .ni{border-left:0;border-right:3px solid transparent}",
      "html[dir=rtl] .ni.active{border-right-color:var(--pr)}",
      "html[dir=rtl] thead th,html[dir=rtl] th[style*='text-align:left']{text-align:right!important}",
      "html[dir=rtl] #toast{right:auto;left:24px}",
      "html[dir=rtl] .btn-sm[style*='margin-right:3px']{margin-right:0!important;margin-left:3px}",
      "html[dir=rtl] input[type=email],html[dir=rtl] input[type=password],html[dir=rtl] input[type=url],html[dir=rtl] code{direction:ltr}",
      "html[dir=rtl] input[type=email],html[dir=rtl] input[type=password],html[dir=rtl] input[type=url]{text-align:right}"
    );
  }
  var style = document.createElement("style");
  style.textContent = css.join("\n");
  document.head.appendChild(style);

  if (lang === "en") {
    document.addEventListener("DOMContentLoaded", renderSwitch);
    return;
  }

  document.documentElement.lang = lang;
  if (lang === "ar") {
    document.documentElement.dir = "rtl";
    var font = document.createElement("link");
    font.rel = "stylesheet";
    font.href = "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap";
    document.head.appendChild(font);
  }

  // English → [German, Arabic]
  var D = {
    // ── Navigation & page titles ──
    "Super Admin": ["Super-Admin", "المشرف العام"],
    "Overview": ["Übersicht", "نظرة عامة"],
    "Dashboard": ["Dashboard", "لوحة التحكم"],
    "Stores": ["Geschäfte", "المتاجر"],
    "Store Manager": ["Geschäftsverwaltung", "إدارة المتاجر"],
    "Landing Pages": ["Landingpages", "صفحات المتاجر"],
    "Platform": ["Plattform", "المنصة"],
    "Tenants": ["Mandanten", "المشتركون"],
    "Subscriptions": ["Abonnements", "الاشتراكات"],
    "Payments": ["Zahlungen", "المدفوعات"],
    "License Keys": ["Lizenzschlüssel", "مفاتيح الترخيص"],
    "Analytics": ["Analysen", "التحليلات"],
    "Commissions": ["Provisionen", "العمولات"],
    "System Health": ["Systemzustand", "صحة النظام"],
    "Notifications": ["Benachrichtigungen", "الإشعارات"],
    "Reports": ["Berichte", "التقارير"],
    "Activity Log": ["Aktivitätsprotokoll", "سجل النشاط"],
    "Expenses": ["Ausgaben", "المصروفات"],
    "Shifts": ["Schichten", "الورديات"],
    "Backup & Restore": ["Sicherung & Wiederherstellung", "النسخ الاحتياطي والاستعادة"],
    "Account": ["Konto", "الحساب"],
    "Settings": ["Einstellungen", "الإعدادات"],
    "Sign Out": ["Abmelden", "تسجيل الخروج"],
    "WhatsApp Integration": ["WhatsApp-Integration", "ربط واتساب"],
    "Platform overview": ["Plattformübersicht", "نظرة عامة على المنصة"],
    "Full control over any store": ["Volle Kontrolle über jedes Geschäft", "تحكم كامل في أي متجر"],
    "Manage all store tenants": ["Alle Mandanten verwalten", "إدارة كل المشتركين"],
    "Billing & subscription plans": ["Abrechnung & Abotarife", "الفوترة وخطط الاشتراك"],
    "Stripe charges, refunds and webhook deliveries": ["Stripe-Zahlungen, Erstattungen und Webhook-Zustellungen", "مدفوعات Stripe والاستردادات وإشعارات الـ Webhook"],
    "Manage software licenses": ["Softwarelizenzen verwalten", "إدارة تراخيص البرنامج"],
    "Revenue & usage metrics": ["Umsatz- & Nutzungskennzahlen", "مؤشرات الإيرادات والاستخدام"],
    "Server & database status": ["Server- & Datenbankstatus", "حالة الخادم وقاعدة البيانات"],
    "Send messages to tenants": ["Nachrichten an Mandanten senden", "إرسال رسائل للمشتركين"],
    "Full summary across all stores": ["Gesamtübersicht über alle Geschäfte", "ملخص شامل لكل المتاجر"],
    "All platform actions in real time": ["Alle Plattformaktionen in Echtzeit", "كل عمليات المنصة لحظة بلحظة"],
    "Cross-store expense monitoring": ["Ausgabenüberwachung aller Geschäfte", "مراقبة المصروفات في كل المتاجر"],
    "All employee shifts across stores": ["Alle Mitarbeiterschichten aller Geschäfte", "كل ورديات الموظفين في المتاجر"],
    "Automated and manual backups": ["Automatische und manuelle Sicherungen", "نسخ احتياطي تلقائي ويدوي"],
    "Account & preferences": ["Konto & Einstellungen", "الحساب والتفضيلات"],
    "Manage restaurant online stores": ["Online-Shops der Restaurants verwalten", "إدارة المتاجر الإلكترونية للمطاعم"],
    "Platform commission tracking & settings": ["Plattformprovisionen & Einstellungen", "تتبع عمولات المنصة وإعداداتها"],
    "Platform number for login codes and system messages": ["Plattformnummer für Anmeldecodes und Systemnachrichten", "رقم المنصة لرموز الدخول ورسائل النظام"],
    "Checking…": ["Wird geprüft…", "جارٍ الفحص…"],
    "Platform overview — all tenants and activity": ["Plattformübersicht — alle Mandanten und Aktivitäten", "نظرة عامة على المنصة — كل المشتركين والنشاط"],
    "Refresh": ["Aktualisieren", "تحديث"],
    "View system health": ["Systemzustand anzeigen", "عرض صحة النظام"],
    "Toggle colour theme": ["Farbschema wechseln", "تبديل المظهر"],
    "Light / dark": ["Hell / dunkel", "فاتح / داكن"],
    "System Healthy": ["System in Ordnung", "النظام سليم"],
    "Issue Detected": ["Problem erkannt", "تم اكتشاف مشكلة"],
    "Loading…": ["Wird geladen…", "جارٍ التحميل…"],

    // ── Dashboard & stat cards ──
    "Active Stores": ["Aktive Geschäfte", "المتاجر النشطة"],
    "Revenue by Tenant": ["Umsatz pro Mandant", "الإيرادات حسب المشترك"],
    "Total Stores": ["Geschäfte gesamt", "إجمالي المتاجر"],
    "Total Tenants": ["Mandanten gesamt", "إجمالي المشتركين"],
    "Total Revenue": ["Gesamtumsatz", "إجمالي الإيرادات"],
    "Total Sales": ["Verkäufe gesamt", "إجمالي المبيعات"],
    "Total Products": ["Produkte gesamt", "إجمالي المنتجات"],
    "Total Employees": ["Mitarbeiter gesamt", "إجمالي الموظفين"],
    "Total Expenses": ["Ausgaben gesamt", "إجمالي المصروفات"],
    "Expense Records": ["Ausgabenbuchungen", "سجلات المصروفات"],
    "Stores w/ Expenses": ["Geschäfte mit Ausgaben", "متاجر لديها مصروفات"],
    "Expiring Subs": ["Ablaufende Abos", "اشتراكات قاربت على الانتهاء"],
    "Sales Revenue": ["Verkaufsumsatz", "إيرادات المبيعات"],
    "Sub Revenue": ["Abo-Umsatz", "إيرادات الاشتراكات"],
    "Collected": ["Eingenommen", "المحصّل"],
    "Environment": ["Umgebung", "البيئة"],
    "Memory Total": ["Speicher gesamt", "إجمالي الذاكرة"],
    "Memory Used": ["Speicher belegt", "الذاكرة المستخدمة"],
    "Node Version": ["Node-Version", "إصدار Node"],
    "Uptime": ["Laufzeit", "مدة التشغيل"],
    "Employees": ["Mitarbeiter", "الموظفون"],
    "Email": ["E-Mail", "البريد الإلكتروني"],
    "Today": ["Heute", "اليوم"],

    // ── Store manager ──
    "— Select a store —": ["— Geschäft wählen —", "— اختر متجراً —"],
    "Products": ["Produkte", "المنتجات"],
    "Categories": ["Kategorien", "الفئات"],
    "Branches": ["Filialen", "الفروع"],
    "Customers": ["Kunden", "العملاء"],
    "Sales": ["Verkäufe", "المبيعات"],
    "Inventory": ["Bestand", "المخزون"],
    "Recent Sales": ["Letzte Verkäufe", "أحدث المبيعات"],
    "Top Products": ["Top-Produkte", "الأكثر مبيعاً"],
    "All Categories": ["Alle Kategorien", "كل الفئات"],
    "Add Product": ["Produkt hinzufügen", "إضافة منتج"],
    "Name": ["Name", "الاسم"],
    "Price": ["Preis", "السعر"],
    "Cost": ["Kosten", "التكلفة"],
    "SKU": ["SKU", "رمز المنتج"],
    "Barcode": ["Barcode", "الباركود"],
    "Category": ["Kategorie", "الفئة"],
    "Status": ["Status", "الحالة"],
    "Actions": ["Aktionen", "الإجراءات"],
    "Add Category": ["Kategorie hinzufügen", "إضافة فئة"],
    "ID": ["ID", "المعرّف"],
    "Color": ["Farbe", "اللون"],
    "Add Branch": ["Filiale hinzufügen", "إضافة فرع"],
    "Address": ["Adresse", "العنوان"],
    "Phone": ["Telefon", "الهاتف"],
    "Add Employee": ["Mitarbeiter hinzufügen", "إضافة موظف"],
    "Role": ["Rolle", "الدور"],
    "PIN": ["PIN", "الرمز السري"],
    "Branch": ["Filiale", "الفرع"],
    "Add Customer": ["Kunde hinzufügen", "إضافة عميل"],
    "Loyalty Pts": ["Treuepunkte", "نقاط الولاء"],
    "Total Spent": ["Gesamtausgaben", "إجمالي الإنفاق"],
    "Visits": ["Besuche", "الزيارات"],
    "Receipt#": ["Beleg-Nr.", "رقم الإيصال"],
    "Date": ["Datum", "التاريخ"],
    "Items": ["Artikel", "الأصناف"],
    "Payment": ["Zahlung", "الدفع"],
    "Total": ["Gesamt", "الإجمالي"],
    "All Branches": ["Alle Filialen", "كل الفروع"],
    "Adjust Stock": ["Bestand anpassen", "تعديل المخزون"],
    "Product": ["Produkt", "المنتج"],
    "Qty": ["Menge", "الكمية"],
    "Low Stock": ["Niedriger Bestand", "مخزون منخفض"],
    "Unit Price": ["Stückpreis", "سعر الوحدة"],
    "RECEIPT": ["BELEG", "الإيصال"],
    "DATE": ["DATUM", "التاريخ"],
    "PAYMENT": ["ZAHLUNG", "الدفع"],
    "STATUS": ["STATUS", "الحالة"],
    "SUBTOTAL": ["ZWISCHENSUMME", "المجموع الفرعي"],
    "TOTAL": ["GESAMT", "الإجمالي"],
    "OK": ["OK", "جيد"],
    "None": ["Keine", "لا يوجد"],
    "No sales yet": ["Noch keine Verkäufe", "لا توجد مبيعات بعد"],
    "No products yet": ["Noch keine Produkte", "لا توجد منتجات بعد"],
    "No categories yet": ["Noch keine Kategorien", "لا توجد فئات بعد"],
    "No branches yet": ["Noch keine Filialen", "لا توجد فروع بعد"],
    "No employees yet": ["Noch keine Mitarbeiter", "لا يوجد موظفون بعد"],
    "No customers yet": ["Noch keine Kunden", "لا يوجد عملاء بعد"],
    "No inventory data. Select a branch or add products.": ["Keine Bestandsdaten. Filiale wählen oder Produkte hinzufügen.", "لا توجد بيانات مخزون. اختر فرعاً أو أضف منتجات."],
    "Search products…": ["Produkte suchen…", "ابحث في المنتجات…"],
    "Search categories…": ["Kategorien suchen…", "ابحث في الفئات…"],
    "Search branches…": ["Filialen suchen…", "ابحث في الفروع…"],
    "Search employees…": ["Mitarbeiter suchen…", "ابحث في الموظفين…"],
    "Search customers…": ["Kunden suchen…", "ابحث في العملاء…"],
    "Search sales…": ["Verkäufe suchen…", "ابحث في المبيعات…"],
    "Search inventory…": ["Bestand suchen…", "ابحث في المخزون…"],
    "Search tenants…": ["Mandanten suchen…", "ابحث في المشتركين…"],
    "Search…": ["Suchen…", "بحث…"],
    "Search this page…": ["Diese Seite durchsuchen…", "ابحث في هذه الصفحة…"],
    "Filter activity…": ["Aktivität filtern…", "تصفية النشاط…"],
    "Filter expenses…": ["Ausgaben filtern…", "تصفية المصروفات…"],
    "Filter shifts…": ["Schichten filtern…", "تصفية الورديات…"],

    // ── Product / category / branch / employee / customer forms ──
    "Name (Arabic)": ["Name (Arabisch)", "الاسم (بالعربية)"],
    "Cost Price": ["Einkaufspreis", "سعر التكلفة"],
    "Unit": ["Einheit", "الوحدة"],
    "Piece": ["Stück", "قطعة"],
    "KG": ["kg", "كغ"],
    "Liter": ["Liter", "لتر"],
    "Box": ["Karton", "صندوق"],
    "Pack": ["Packung", "عبوة"],
    "Tax Rate %": ["Steuersatz %", "نسبة الضريبة %"],
    "Active": ["Aktiv", "نشط"],
    "Inactive": ["Inaktiv", "غير نشط"],
    "Cancel": ["Abbrechen", "إلغاء"],
    "Save Product": ["Produkt speichern", "حفظ المنتج"],
    "Save Category": ["Kategorie speichern", "حفظ الفئة"],
    "Branch Name": ["Filialname", "اسم الفرع"],
    "Save Branch": ["Filiale speichern", "حفظ الفرع"],
    "PIN (4-6 digits)": ["PIN (4–6 Ziffern)", "الرمز السري (4–6 أرقام)"],
    "Cashier": ["Kassierer", "كاشير"],
    "Manager": ["Manager", "مدير"],
    "Admin": ["Admin", "مسؤول"],
    "Waiter": ["Kellner", "نادل"],
    "Salary": ["Gehalt", "الراتب"],
    "Commission %": ["Provision %", "العمولة %"],
    "Save Employee": ["Mitarbeiter speichern", "حفظ الموظف"],
    "Loyalty Points": ["Treuepunkte", "نقاط الولاء"],
    "Notes": ["Notizen", "ملاحظات"],
    "Save Customer": ["Kunde speichern", "حفظ العميل"],
    "Sale Details": ["Verkaufsdetails", "تفاصيل البيع"],
    "Close": ["Schließen", "إغلاق"],
    "Adjustment (+ add / - remove)": ["Anpassung (+ hinzufügen / − entfernen)", "التعديل (+ إضافة / − خصم)"],
    "Set Absolute Quantity": ["Absolute Menge setzen", "تعيين كمية محددة"],
    "Save": ["Speichern", "حفظ"],
    "Edit Product": ["Produkt bearbeiten", "تعديل المنتج"],
    "Edit Category": ["Kategorie bearbeiten", "تعديل الفئة"],
    "Edit Branch": ["Filiale bearbeiten", "تعديل الفرع"],
    "Edit Employee": ["Mitarbeiter bearbeiten", "تعديل الموظف"],
    "Edit Customer": ["Kunde bearbeiten", "تعديل العميل"],
    "Product name": ["Produktname", "اسم المنتج"],
    "Optional description…": ["Optionale Beschreibung…", "وصف اختياري…"],
    "e.g. Beverages": ["z. B. Getränke", "مثال: مشروبات"],
    "Main Branch": ["Hauptfiliale", "الفرع الرئيسي"],
    "Street, City": ["Straße, Ort", "الشارع، المدينة"],
    "VIP, etc.": ["VIP usw.", "VIP، إلخ"],
    "e.g. 10 or -5": ["z. B. 10 oder -5", "مثال: 10 أو -5"],
    "Leave blank to use adjustment above": ["Leer lassen, um die Anpassung oben zu verwenden", "اتركه فارغاً لاستخدام التعديل أعلاه"],
    "Name and price are required": ["Name und Preis sind erforderlich", "الاسم والسعر مطلوبان"],
    "Failed to save product": ["Produkt konnte nicht gespeichert werden", "تعذّر حفظ المنتج"],
    "Product created": ["Produkt angelegt", "تم إنشاء المنتج"],
    "Product updated": ["Produkt aktualisiert", "تم تحديث المنتج"],
    "Product deleted": ["Produkt gelöscht", "تم حذف المنتج"],
    "Name is required": ["Name ist erforderlich", "الاسم مطلوب"],
    "Failed to save category": ["Kategorie konnte nicht gespeichert werden", "تعذّر حفظ الفئة"],
    "Category created": ["Kategorie angelegt", "تم إنشاء الفئة"],
    "Category updated": ["Kategorie aktualisiert", "تم تحديث الفئة"],
    "Deleted": ["Gelöscht", "تم الحذف"],
    "Failed to save branch": ["Filiale konnte nicht gespeichert werden", "تعذّر حفظ الفرع"],
    "Branch created": ["Filiale angelegt", "تم إنشاء الفرع"],
    "Branch updated": ["Filiale aktualisiert", "تم تحديث الفرع"],
    "Failed to save employee": ["Mitarbeiter konnte nicht gespeichert werden", "تعذّر حفظ الموظف"],
    "Employee created": ["Mitarbeiter angelegt", "تم إنشاء الموظف"],
    "Employee updated": ["Mitarbeiter aktualisiert", "تم تحديث الموظف"],
    "PIN updated": ["PIN aktualisiert", "تم تحديث الرمز السري"],
    "Failed to save customer": ["Kunde konnte nicht gespeichert werden", "تعذّر حفظ العميل"],
    "Customer created": ["Kunde angelegt", "تم إنشاء العميل"],
    "Customer updated": ["Kunde aktualisiert", "تم تحديث العميل"],
    "Customer deactivated": ["Kunde deaktiviert", "تم تعطيل العميل"],
    "Failed to deactivate customer": ["Kunde konnte nicht deaktiviert werden", "تعذّر تعطيل العميل"],
    "Failed to load sale": ["Verkauf konnte nicht geladen werden", "تعذّر تحميل عملية البيع"],
    "Select product and branch": ["Produkt und Filiale wählen", "اختر المنتج والفرع"],
    "Enter adjustment or absolute quantity": ["Anpassung oder absolute Menge eingeben", "أدخل التعديل أو الكمية المحددة"],
    "Inventory updated": ["Bestand aktualisiert", "تم تحديث المخزون"],
    "Failed to save": ["Speichern fehlgeschlagen", "تعذّر الحفظ"],

    // ── Tenants & subscriptions ──
    "Add Tenant": ["Mandant hinzufügen", "إضافة مشترك"],
    "Business": ["Unternehmen", "النشاط التجاري"],
    "Owner": ["Inhaber", "المالك"],
    "Type": ["Typ", "النوع"],
    "Limits": ["Limits", "الحدود"],
    "View Store": ["Geschäft öffnen", "فتح المتجر"],
    "No tenants yet": ["Noch keine Mandanten", "لا يوجد مشتركون بعد"],
    "Business Name": ["Firmenname", "اسم النشاط"],
    "Store Type": ["Geschäftstyp", "نوع المتجر"],
    "Supermarket": ["Supermarkt", "سوبرماركت"],
    "Restaurant": ["Restaurant", "مطعم"],
    "Cafe": ["Café", "مقهى"],
    "Retail": ["Einzelhandel", "بيع بالتجزئة"],
    "Owner Name": ["Name des Inhabers", "اسم المالك"],
    "Owner Email": ["E-Mail des Inhabers", "بريد المالك"],
    "Suspended": ["Gesperrt", "موقوف"],
    "Max Branches": ["Max. Filialen", "الحد الأقصى للفروع"],
    "Max Employees": ["Max. Mitarbeiter", "الحد الأقصى للموظفين"],
    "Create Tenant": ["Mandant anlegen", "إنشاء مشترك"],
    "Acme Corp": ["Muster AG", "شركة المثال"],
    "Fill required fields": ["Pflichtfelder ausfüllen", "املأ الحقول المطلوبة"],
    "Tenant created": ["Mandant angelegt", "تم إنشاء المشترك"],
    "Failed to create tenant": ["Mandant konnte nicht angelegt werden", "تعذّر إنشاء المشترك"],
    "New Subscription": ["Neues Abonnement", "اشتراك جديد"],
    "Tenant": ["Mandant", "المشترك"],
    "Plan": ["Tarif", "الخطة"],
    "License until": ["Lizenz bis", "الترخيص حتى"],
    "Subscription ends": ["Abo endet", "ينتهي الاشتراك"],
    "Next payment": ["Nächste Zahlung", "الدفعة التالية"],
    "no key": ["kein Schlüssel", "لا يوجد مفتاح"],
    "manual": ["manuell", "يدوي"],
    "auto-renew, not scheduled": ["automatische Verlängerung, nicht geplant", "تجديد تلقائي، غير مجدول"],
    "No subscriptions": ["Keine Abonnements", "لا توجد اشتراكات"],
    "Plan Type": ["Tariftyp", "نوع الخطة"],
    "Trial": ["Testphase", "تجريبي"],
    "Monthly": ["Monatlich", "شهري"],
    "Yearly": ["Jährlich", "سنوي"],
    "Plan Name": ["Tarifname", "اسم الخطة"],
    "Create": ["Erstellen", "إنشاء"],
    "Subscription created": ["Abonnement erstellt", "تم إنشاء الاشتراك"],
    "+30 days": ["+30 Tage", "+30 يوماً"],
    "+30 days on the subscription — this tenant’s license key already runs past that date": ["+30 Tage auf das Abonnement — der Lizenzschlüssel dieses Mandanten läuft bereits darüber hinaus", "+30 يوماً على الاشتراك — مفتاح ترخيص هذا المشترك يمتد أصلاً بعد هذا التاريخ"],
    "+30 days on the subscription, but this tenant has no active license key — generate one or they stay locked out": ["+30 Tage auf das Abonnement, aber dieser Mandant hat keinen aktiven Lizenzschlüssel — erzeugen Sie einen, sonst bleibt er gesperrt", "+30 يوماً على الاشتراك، لكن هذا المشترك ليس لديه مفتاح ترخيص نشط — أنشئ له مفتاحاً وإلا سيبقى مقفلاً"],
    "Delete subscription?": ["Abonnement löschen?", "حذف الاشتراك؟"],

    // ── Payments / Stripe ──
    "Stripe Connection": ["Stripe-Verbindung", "اتصال Stripe"],
    "All tenants": ["Alle Mandanten", "كل المشتركين"],
    "Orders & till sales": ["Bestellungen & Kassenverkäufe", "الطلبات ومبيعات الكاشير"],
    "Online orders": ["Online-Bestellungen", "الطلبات الإلكترونية"],
    "Till sales": ["Kassenverkäufe", "مبيعات الكاشير"],
    "Any status": ["Jeder Status", "أي حالة"],
    "Paid": ["Bezahlt", "مدفوع"],
    "Completed": ["Abgeschlossen", "مكتمل"],
    "Pending": ["Ausstehend", "قيد الانتظار"],
    "Failed": ["Fehlgeschlagen", "فشل"],
    "Refunded": ["Erstattet", "مسترد"],
    "Partially refunded": ["Teilweise erstattet", "مسترد جزئياً"],
    "Include cash & other non-Stripe rows": ["Bar- & andere Nicht-Stripe-Zahlungen einbeziehen", "تضمين النقد والمدفوعات الأخرى غير Stripe"],
    "Apply": ["Anwenden", "تطبيق"],
    "When": ["Wann", "الوقت"],
    "Reference": ["Referenz", "المرجع"],
    "Method": ["Methode", "الطريقة"],
    "Amount": ["Betrag", "المبلغ"],
    "Recent Stripe Webhook Deliveries": ["Letzte Stripe-Webhook-Zustellungen", "أحدث إشعارات Stripe (Webhook)"],
    "Received": ["Empfangen", "وقت الاستلام"],
    "Event": ["Ereignis", "الحدث"],
    "Mode": ["Modus", "الوضع"],
    "Processed": ["Verarbeitet", "المعالجة"],
    "Could not reach the Stripe status endpoint.": ["Stripe-Status nicht erreichbar.", "تعذّر الوصول إلى حالة Stripe."],
    "not connected": ["nicht verbunden", "غير متصل"],
    "No Stripe secret key is configured on this server.": ["Auf diesem Server ist kein Stripe-Secret-Key hinterlegt.", "لا يوجد مفتاح Stripe السري على هذا الخادم."],
    "Card and TWINT payments cannot be taken and nothing will appear below until STRIPE_SECRET_KEY is set on the server.": ["Karten- und TWINT-Zahlungen sind nicht möglich, und unten erscheint nichts, bis STRIPE_SECRET_KEY auf dem Server gesetzt ist.", "لا يمكن قبول مدفوعات البطاقات وTWINT ولن يظهر شيء أدناه حتى يُضبط STRIPE_SECRET_KEY على الخادم."],
    "Default currency": ["Standardwährung", "العملة الافتراضية"],
    "Charges enabled": ["Zahlungen aktiviert", "استلام المدفوعات مفعّل"],
    "Payouts enabled": ["Auszahlungen aktiviert", "التحويلات مفعّلة"],
    "Yes": ["Ja", "نعم"],
    "No": ["Nein", "لا"],
    "none reported": ["keine gemeldet", "لا شيء"],
    "TWINT is not enabled — it is the method Swiss customers expect, and it can only be turned on in the Stripe Dashboard.": ["TWINT ist nicht aktiviert — Schweizer Kunden erwarten es, und es lässt sich nur im Stripe-Dashboard einschalten.", "TWINT غير مفعّل — وهي الطريقة التي يتوقعها العملاء في سويسرا، ولا يمكن تفعيلها إلا من لوحة Stripe."],
    "Failed to load payments.": ["Zahlungen konnten nicht geladen werden.", "تعذّر تحميل المدفوعات."],
    "No payments recorded yet.": ["Noch keine Zahlungen erfasst.", "لا توجد مدفوعات مسجلة بعد."],
    "not a Stripe payment": ["keine Stripe-Zahlung", "ليست دفعة Stripe"],
    "Failed to load webhook deliveries.": ["Webhook-Zustellungen konnten nicht geladen werden.", "تعذّر تحميل إشعارات الـ Webhook."],
    "live": ["live", "مباشر"],
    "test": ["Test", "تجريبي"],
    "LIVE": ["LIVE", "مباشر"],
    "TEST": ["TEST", "تجريبي"],
    "Stripe has never delivered a webhook to this server. Until it does, no payment can be marked paid.": ["Stripe hat noch nie einen Webhook an diesen Server zugestellt. Bis dahin kann keine Zahlung als bezahlt markiert werden.", "لم يرسل Stripe أي إشعار Webhook لهذا الخادم بعد. وحتى يحدث ذلك لا يمكن تعليم أي دفعة كمدفوعة."],
    "Refund Payment": ["Zahlung erstatten", "استرداد الدفعة"],
    "Charged": ["Belastet", "المبلغ المحصّل"],
    "Still refundable": ["Noch erstattbar", "المتبقي للاسترداد"],
    "Amount (blank = full remaining)": ["Betrag (leer = gesamter Restbetrag)", "المبلغ (فارغ = كامل المتبقي)"],
    "Full refund": ["Volle Erstattung", "استرداد كامل"],
    "Reason": ["Grund", "السبب"],
    "Not specified": ["Nicht angegeben", "غير محدد"],
    "Requested by customer": ["Vom Kunden gewünscht", "بطلب من العميل"],
    "Duplicate": ["Doppelt", "مكرر"],
    "Fraudulent": ["Betrügerisch", "احتيالي"],
    "Refund": ["Erstatten", "استرداد"],
    "Refunding…": ["Wird erstattet…", "جارٍ الاسترداد…"],
    "That row has no Stripe PaymentIntent to refund": ["Diese Zeile hat keinen Stripe-PaymentIntent zum Erstatten", "هذا السجل لا يحتوي على PaymentIntent من Stripe لاسترداده"],

    // ── Licenses ──
    "Generate Key": ["Schlüssel erzeugen", "توليد مفتاح"],
    "Key": ["Schlüssel", "المفتاح"],
    "Activations": ["Aktivierungen", "التفعيلات"],
    "Expires": ["Läuft ab", "ينتهي"],
    "No license keys": ["Keine Lizenzschlüssel", "لا توجد مفاتيح ترخيص"],
    "Generate License Key": ["Lizenzschlüssel erzeugen", "توليد مفتاح ترخيص"],
    "Max Activations": ["Max. Aktivierungen", "الحد الأقصى للتفعيلات"],
    "Expires At": ["Läuft ab am", "ينتهي في"],
    "Custom Key (optional)": ["Eigener Schlüssel (optional)", "مفتاح مخصص (اختياري)"],
    "Leave blank to auto-generate": ["Leer lassen für automatische Erzeugung", "اتركه فارغاً للتوليد التلقائي"],
    "Internal notes…": ["Interne Notizen…", "ملاحظات داخلية…"],
    "Generate": ["Erzeugen", "توليد"],
    "Copied!": ["Kopiert!", "تم النسخ!"],
    "Copy": ["Kopieren", "نسخ"],
    "Revoke this license?": ["Diese Lizenz widerrufen?", "إلغاء هذا الترخيص؟"],
    "Revoked": ["Widerrufen", "تم الإلغاء"],
    "License deleted": ["Lizenz gelöscht", "تم حذف الترخيص"],
    "Delete failed": ["Löschen fehlgeschlagen", "فشل الحذف"],

    // ── Analytics & commissions ──
    "Monthly Revenue": ["Monatsumsatz", "الإيرادات الشهرية"],
    "Plan Breakdown": ["Aufteilung nach Tarif", "توزيع الخطط"],
    "Sales by Tenant": ["Verkäufe pro Mandant", "المبيعات حسب المشترك"],
    "No revenue data": ["Keine Umsatzdaten", "لا توجد بيانات إيرادات"],
    "No stores yet": ["Noch keine Geschäfte", "لا توجد متاجر بعد"],
    "No data": ["Keine Daten", "لا توجد بيانات"],
    "Failed to load": ["Laden fehlgeschlagen", "فشل التحميل"],
    "Failed to load stats. Check API connection.": ["Statistiken konnten nicht geladen werden. API-Verbindung prüfen.", "تعذّر تحميل الإحصائيات. تحقق من اتصال الـ API."],
    "Commission Rate Settings": ["Provisionssatz", "إعدادات نسبة العمولة"],
    "Platform Commission Rate (%)": ["Plattform-Provisionssatz (%)", "نسبة عمولة المنصة (%)"],
    "Save Rate": ["Satz speichern", "حفظ النسبة"],
    "This rate is embedded in customer-facing prices. A 6% rate means prices are shown as price × 1.06, and the commission is extracted from each online order.": ["Dieser Satz ist in den Kundenpreisen enthalten. Bei 6 % werden Preise als Preis × 1,06 angezeigt, und die Provision wird aus jeder Online-Bestellung herausgerechnet.", "هذه النسبة مضمّنة في الأسعار التي يراها العميل. نسبة 6% تعني عرض السعر × 1.06، وتُقتطع العمولة من كل طلب إلكتروني."],
    "Commission Summary": ["Provisionsübersicht", "ملخص العمولات"],
    "Store": ["Geschäft", "المتجر"],
    "Orders": ["Bestellungen", "الطلبات"],
    "Commission Earned": ["Verdiente Provision", "العمولة المكتسبة"],
    "Recent Commission Transactions": ["Letzte Provisionsbuchungen", "أحدث معاملات العمولة"],
    "All Tenants": ["Alle Mandanten", "كل المشتركين"],
    "Apply Filter": ["Filter anwenden", "تطبيق الفلتر"],
    "Clear": ["Leeren", "مسح"],
    "Order ID": ["Bestell-ID", "رقم الطلب"],
    "Sale Total": ["Verkaufssumme", "إجمالي البيع"],
    "Rate %": ["Satz %", "النسبة %"],
    "Commission": ["Provision", "العمولة"],
    "Total Commission Earned": ["Gesamte verdiente Provision", "إجمالي العمولة المكتسبة"],
    "Stores Tracked": ["Erfasste Geschäfte", "المتاجر المتتبَّعة"],
    "No commission data yet.": ["Noch keine Provisionsdaten.", "لا توجد بيانات عمولة بعد."],
    "No transactions found.": ["Keine Buchungen gefunden.", "لا توجد معاملات."],
    "Enter a valid rate": ["Gültigen Satz eingeben", "أدخل نسبة صحيحة"],
    "Failed to save rate": ["Satz konnte nicht gespeichert werden", "تعذّر حفظ النسبة"],

    // ── System, notifications, reports, activity, expenses, shifts ──
    "System Status": ["Systemstatus", "حالة النظام"],
    "Active Shifts": ["Aktive Schichten", "الورديات النشطة"],
    "No active shifts": ["Keine aktiven Schichten", "لا توجد ورديات نشطة"],
    "Broadcast": ["Rundsendung", "بث"],
    "Send Notification": ["Benachrichtigung senden", "إرسال إشعار"],
    "Title": ["Titel", "العنوان"],
    "Message": ["Nachricht", "الرسالة"],
    "Priority": ["Priorität", "الأولوية"],
    "Info": ["Info", "معلومة"],
    "Warning": ["Warnung", "تحذير"],
    "Success": ["Erfolg", "نجاح"],
    "Error": ["Fehler", "خطأ"],
    "Normal": ["Normal", "عادي"],
    "High": ["Hoch", "مرتفع"],
    "Urgent": ["Dringend", "عاجل"],
    "Send": ["Senden", "إرسال"],
    "Notification title": ["Titel der Benachrichtigung", "عنوان الإشعار"],
    "Your message…": ["Ihre Nachricht…", "رسالتك…"],
    "Broadcast to All Tenants": ["An alle Mandanten senden", "إرسال لكل المشتركين"],
    "Announcement": ["Ankündigung", "إعلان"],
    "Read": ["Gelesen", "مقروء"],
    "Unread": ["Ungelesen", "غير مقروء"],
    "Mark Read": ["Als gelesen markieren", "تعليم كمقروء"],
    "No notifications yet": ["Noch keine Benachrichtigungen", "لا توجد إشعارات بعد"],
    "No title set": ["Kein Titel", "بلا عنوان"],
    "Title and message required": ["Titel und Nachricht erforderlich", "العنوان والرسالة مطلوبان"],
    "Sent": ["Gesendet", "تم الإرسال"],
    "Marked read": ["Als gelesen markiert", "تم التعليم كمقروء"],
    "Full store-by-store summary report": ["Vollständiger Bericht pro Geschäft", "تقرير ملخص كامل لكل متجر"],
    "Export CSV": ["CSV exportieren", "تصدير CSV"],
    "Revenue": ["Umsatz", "الإيرادات"],
    "Subscription": ["Abonnement", "الاشتراك"],
    "Joined": ["Beigetreten", "تاريخ الانضمام"],
    "Load reports first": ["Zuerst Berichte laden", "حمّل التقارير أولاً"],
    "Time": ["Zeit", "الوقت"],
    "Action": ["Aktion", "الإجراء"],
    "Entity": ["Objekt", "الكيان"],
    "Details": ["Details", "التفاصيل"],
    "No activity yet": ["Noch keine Aktivität", "لا يوجد نشاط بعد"],
    "Description": ["Beschreibung", "الوصف"],
    "No expenses recorded": ["Keine Ausgaben erfasst", "لا توجد مصروفات مسجلة"],
    "Start": ["Beginn", "البداية"],
    "End": ["Ende", "النهاية"],
    "Opening Cash": ["Anfangsbestand", "النقد الافتتاحي"],
    "Closing Cash": ["Endbestand", "النقد الختامي"],
    "No shifts found": ["Keine Schichten gefunden", "لا توجد ورديات"],

    // ── Backup ──
    "Manual Backup": ["Manuelle Sicherung", "نسخ احتياطي يدوي"],
    "Create an on-demand backup of one or all stores. Backups include products, employees, sales, customers, and subscriptions.": ["Erstellen Sie jederzeit eine Sicherung eines oder aller Geschäfte. Sicherungen umfassen Produkte, Mitarbeiter, Verkäufe, Kunden und Abonnements.", "أنشئ نسخة احتياطية فورية لمتجر واحد أو لكل المتاجر. تشمل النسخ المنتجات والموظفين والمبيعات والعملاء والاشتراكات."],
    "Store (leave blank for ALL)": ["Geschäft (leer = ALLE)", "المتجر (اتركه فارغاً للكل)"],
    "— All Stores —": ["— Alle Geschäfte —", "— كل المتاجر —"],
    "Create Backup Now": ["Jetzt sichern", "إنشاء نسخة احتياطية الآن"],
    "Auto-Backup Schedule": ["Automatische Sicherung", "جدول النسخ التلقائي"],
    "Daily auto-backup is running": ["Tägliche automatische Sicherung läuft", "النسخ التلقائي اليومي يعمل"],
    "Every store is automatically backed up once every 24 hours. Backups older than 30 days are automatically deleted.": ["Jedes Geschäft wird alle 24 Stunden automatisch gesichert. Sicherungen, die älter als 30 Tage sind, werden automatisch gelöscht.", "يُنسخ كل متجر احتياطياً تلقائياً مرة كل 24 ساعة، وتُحذف النسخ الأقدم من 30 يوماً تلقائياً."],
    "Running – next run in ~24h from server start": ["Läuft – nächster Lauf ca. 24 h nach Serverstart", "يعمل – التشغيل التالي بعد ~24 ساعة من بدء الخادم"],
    "Backup Files": ["Sicherungsdateien", "ملفات النسخ الاحتياطي"],
    "Filename": ["Dateiname", "اسم الملف"],
    "Size": ["Größe", "الحجم"],
    "Created": ["Erstellt", "تاريخ الإنشاء"],
    "Download": ["Herunterladen", "تنزيل"],
    "Restore": ["Wiederherstellen", "استعادة"],
    "No backups yet. Create one above.": ["Noch keine Sicherungen. Oben eine erstellen.", "لا توجد نسخ احتياطية بعد. أنشئ واحدة من الأعلى."],
    "Backup failed": ["Sicherung fehlgeschlagen", "فشل النسخ الاحتياطي"],
    "Download failed": ["Download fehlgeschlagen", "فشل التنزيل"],
    "Restore failed": ["Wiederherstellung fehlgeschlagen", "فشلت الاستعادة"],
    "Restoring…": ["Wird wiederhergestellt…", "جارٍ الاستعادة…"],

    // ── Account ──
    "Account Info": ["Kontoinformationen", "معلومات الحساب"],
    "Super Administrator": ["Super-Administrator", "المشرف العام"],
    "Change Password": ["Passwort ändern", "تغيير كلمة المرور"],
    "Current Password": ["Aktuelles Passwort", "كلمة المرور الحالية"],
    "New Password": ["Neues Passwort", "كلمة المرور الجديدة"],
    "Confirm New Password": ["Neues Passwort bestätigen", "تأكيد كلمة المرور الجديدة"],
    "Update Password": ["Passwort aktualisieren", "تحديث كلمة المرور"],
    "Fill all fields": ["Alle Felder ausfüllen", "املأ كل الحقول"],
    "Passwords do not match": ["Passwörter stimmen nicht überein", "كلمتا المرور غير متطابقتين"],
    "Password changed": ["Passwort geändert", "تم تغيير كلمة المرور"],

    // ── Landing pages ──
    "Manage restaurant landing pages & online ordering stores": ["Landingpages und Online-Bestellshops verwalten", "إدارة صفحات المطاعم ومتاجر الطلب الإلكتروني"],
    "Sync Pizza Lemon": ["Pizza Lemon synchronisieren", "مزامنة Pizza Lemon"],
    "Update Pizza Lemon images & landing page config": ["Pizza-Lemon-Bilder & Landingpage aktualisieren", "تحديث صور Pizza Lemon وإعداد صفحتها"],
    "Create Landing Page": ["Landingpage erstellen", "إنشاء صفحة متجر"],
    "Not configured": ["Nicht eingerichtet", "غير مُعدّ"],
    "Not set": ["Nicht festgelegt", "غير محدد"],
    "Click Edit to set up this store's landing page": ["Auf „Bearbeiten“ klicken, um die Landingpage einzurichten", "اضغط «تعديل» لإعداد صفحة هذا المتجر"],
    "View Live": ["Live ansehen", "عرض الصفحة"],
    "Live": ["Live", "منشورة"],
    "Draft": ["Entwurf", "مسودة"],
    "Edit": ["Bearbeiten", "تعديل"],
    "Setup": ["Einrichten", "إعداد"],
    "Slug": ["Kürzel", "الرابط"],
    "Landing Page Configuration": ["Landingpage-Konfiguration", "إعداد صفحة المتجر"],
    "Store (Tenant)": ["Geschäft (Mandant)", "المتجر (المشترك)"],
    "Select tenant…": ["Mandant wählen…", "اختر مشتركاً…"],
    "URL Slug": ["URL-Kürzel", "رابط المتجر"],
    "Hero Title": ["Titel (Hero)", "العنوان الرئيسي"],
    "Hero Subtitle": ["Untertitel (Hero)", "العنوان الفرعي"],
    "Hero / Logo Image URL": ["Hero-/Logo-Bild-URL", "رابط صورة الغلاف / الشعار"],
    "About Text": ["Über-uns-Text", "نص «من نحن»"],
    "Primary Color": ["Primärfarbe", "اللون الأساسي"],
    "Accent Color": ["Akzentfarbe", "اللون الثانوي"],
    "Min Order (CHF)": ["Mindestbestellwert (CHF)", "الحد الأدنى للطلب (CHF)"],
    "Est. Delivery Time (min)": ["Gesch. Lieferzeit (Min.)", "وقت التوصيل المتوقع (دقيقة)"],
    "WhatsApp Number": ["WhatsApp-Nummer", "رقم واتساب"],
    "Instagram URL": ["Instagram-URL", "رابط إنستغرام"],
    "Footer Text": ["Fußzeilentext", "نص التذييل"],
    "Enable Online Ordering": ["Online-Bestellung aktivieren", "تفعيل الطلب الإلكتروني"],
    "Delivery": ["Lieferung", "توصيل"],
    "Pickup": ["Abholung", "استلام"],
    "Cash": ["Bar", "نقداً"],
    "Card": ["Karte", "بطاقة"],
    "Mobile Pay": ["Mobile Zahlung", "دفع بالجوال"],
    "Published": ["Veröffentlicht", "منشور"],
    "Save & Publish": ["Speichern & veröffentlichen", "حفظ ونشر"],
    "Best Pizza in Town": ["Die beste Pizza der Stadt", "أفضل بيتزا في المدينة"],
    "Fresh, hot & delivered fast": ["Frisch, heiß & schnell geliefert", "طازجة وساخنة وتصلك بسرعة"],
    "Tell your story…": ["Erzählen Sie Ihre Geschichte…", "احكِ قصتك…"],
    "© 2025 Your Restaurant": ["© 2025 Ihr Restaurant", "© 2025 مطعمك"],
    "Syncing Pizza Lemon data…": ["Pizza-Lemon-Daten werden synchronisiert…", "جارٍ مزامنة بيانات Pizza Lemon…"],
    "✅ Pizza Lemon synced! Images & landing page updated.": ["✅ Pizza Lemon synchronisiert! Bilder & Landingpage aktualisiert.", "✅ تمت مزامنة Pizza Lemon! تم تحديث الصور والصفحة."],
    "Sync failed": ["Synchronisierung fehlgeschlagen", "فشلت المزامنة"],
    "Tenant and slug are required": ["Mandant und Kürzel sind erforderlich", "المشترك والرابط مطلوبان"],
    "Saved!": ["Gespeichert!", "تم الحفظ!"],
    "Creating…": ["Wird erstellt…", "جارٍ الإنشاء…"],

    // ── WhatsApp ──
    "Connection Status": ["Verbindungsstatus", "حالة الاتصال"],
    "Disconnected": ["Getrennt", "غير متصل"],
    "Connected": ["Verbunden", "متصل"],
    "Connecting — please wait…": ["Verbindung wird hergestellt — bitte warten…", "جارٍ الاتصال — يرجى الانتظار…"],
    "QR Ready — scan with WhatsApp": ["QR bereit — mit WhatsApp scannen", "رمز QR جاهز — امسحه بواتساب"],
    "Connect WhatsApp": ["WhatsApp verbinden", "ربط واتساب"],
    "Disconnect": ["Trennen", "قطع الاتصال"],
    "Refresh Status": ["Status aktualisieren", "تحديث الحالة"],
    "Admin Number": ["Admin-Nummer", "رقم الإدارة"],
    "Test messages go to this number — digits only, e.g. 201204593124": ["Testnachrichten gehen an diese Nummer — nur Ziffern, z. B. 201204593124", "تُرسل رسائل الاختبار إلى هذا الرقم — أرقام فقط، مثال: 201204593124"],
    "QR Code": ["QR-Code", "رمز QR"],
    "Test Message": ["Testnachricht", "رسالة اختبار"],
    "Send a test message to verify the connection is working.": ["Senden Sie eine Testnachricht, um die Verbindung zu prüfen.", "أرسل رسالة اختبار للتأكد من أن الاتصال يعمل."],
    "Send Test": ["Test senden", "إرسال اختبار"],
    "Admin WhatsApp": ["Admin-WhatsApp", "واتساب الإدارة"],
    "Connection Log": ["Verbindungsprotokoll", "سجل الاتصال"],
    "No events yet": ["Noch keine Ereignisse", "لا توجد أحداث بعد"],
    "— log cleared —": ["— Protokoll geleert —", "— تم مسح السجل —"],
    "How to scan": ["So scannen Sie", "طريقة المسح"],
    "1. Open WhatsApp on your phone": ["1. WhatsApp auf dem Handy öffnen", "1. افتح واتساب على هاتفك"],
    "2. Tap ⋮ → Linked devices": ["2. Auf ⋮ → Verknüpfte Geräte tippen", "2. اضغط ⋮ ← الأجهزة المرتبطة"],
    "3. Tap “Link a device”": ["3. Auf „Gerät verknüpfen“ tippen", "3. اضغط «ربط جهاز»"],
    "4. Point the camera at the QR code above": ["4. Kamera auf den QR-Code oben richten", "4. وجّه الكاميرا نحو الرمز أعلاه"],
    "Connected to WhatsApp": ["Mit WhatsApp verbunden", "متصل بواتساب"],
    "You can now send messages and test the connection.": ["Sie können jetzt Nachrichten senden und die Verbindung testen.", "يمكنك الآن إرسال الرسائل واختبار الاتصال."],
    "Generating QR…": ["QR wird erzeugt…", "جارٍ توليد رمز QR…"],
    "This takes a few seconds.": ["Das dauert einige Sekunden.", "يستغرق ذلك بضع ثوانٍ."],
    "Click \"Connect WhatsApp\" to start and generate a QR code.": ["Auf „WhatsApp verbinden“ klicken, um einen QR-Code zu erzeugen.", "اضغط «ربط واتساب» للبدء وتوليد رمز QR."],
    "WhatsApp QR": ["WhatsApp-QR", "رمز QR لواتساب"],
    "✅ WhatsApp connected successfully!": ["✅ WhatsApp erfolgreich verbunden!", "✅ تم ربط واتساب بنجاح!"],
    "❌ Connection failed — check the log and try again": ["❌ Verbindung fehlgeschlagen — Protokoll prüfen und erneut versuchen", "❌ فشل الاتصال — راجع السجل وحاول مجدداً"],
    "⏱ Connection timed out — please try again": ["⏱ Zeitüberschreitung — bitte erneut versuchen", "⏱ انتهت مهلة الاتصال — حاول مجدداً"],
    "❌ Enter a valid phone number (digits only)": ["❌ Gültige Telefonnummer eingeben (nur Ziffern)", "❌ أدخل رقم هاتف صحيحاً (أرقام فقط)"],
    "✅ Admin phone saved!": ["✅ Admin-Nummer gespeichert!", "✅ تم حفظ رقم الإدارة!"],
    "❌ Failed to save phone number": ["❌ Nummer konnte nicht gespeichert werden", "❌ تعذّر حفظ الرقم"],
    "Connecting to WhatsApp…": ["Verbindung zu WhatsApp…", "جارٍ الاتصال بواتساب…"],
    "Connection initiated — wait for QR code to appear": ["Verbindung gestartet — auf den QR-Code warten", "بدأ الاتصال — انتظر ظهور رمز QR"],
    "WhatsApp disconnected": ["WhatsApp getrennt", "تم قطع اتصال واتساب"],
    "❌ Enter a phone number first": ["❌ Zuerst eine Telefonnummer eingeben", "❌ أدخل رقم هاتف أولاً"],
    "❌ Failed — make sure WhatsApp is connected first": ["❌ Fehlgeschlagen — zuerst WhatsApp verbinden", "❌ فشل — تأكد أولاً من ربط واتساب"],
    "Sending…": ["Wird gesendet…", "جارٍ الإرسال…"],
    "Session saved — auto-reconnect on restart ✅": ["Sitzung gespeichert — verbindet sich nach Neustart automatisch ✅", "تم حفظ الجلسة — يعاد الاتصال تلقائياً بعد إعادة التشغيل ✅"],
    "Session saved — auto-reconnect on restart": ["Sitzung gespeichert — verbindet sich nach Neustart automatisch", "تم حفظ الجلسة — يعاد الاتصال تلقائياً بعد إعادة التشغيل"],
    "within 7 days": ["innerhalb von 7 Tagen", "خلال 7 أيام"],
    "Employee": ["Mitarbeiter", "موظف"],

    // ── Status badges (raw values) ──
    "active": ["aktiv", "نشط"],
    "inactive": ["inaktiv", "غير نشط"],
    "suspended": ["gesperrt", "موقوف"],
    "cancelled": ["storniert", "ملغى"],
    "trial": ["Testphase", "تجريبي"],
    "expired": ["abgelaufen", "منتهي"],
    "revoked": ["widerrufen", "ملغى"],
    "pending": ["ausstehend", "قيد الانتظار"],
    "healthy": ["gesund", "سليم"],
    "info": ["Info", "معلومة"],
    "warning": ["Warnung", "تحذير"],
    "success": ["Erfolg", "نجاح"],
    "error": ["Fehler", "خطأ"],
    "normal": ["normal", "عادي"],
    "high": ["hoch", "مرتفع"],
    "urgent": ["dringend", "عاجل"],
    "cashier": ["Kassierer", "كاشير"],
    "manager": ["Manager", "مدير"],
    "admin": ["Admin", "مسؤول"],
    "waiter": ["Kellner", "نادل"],
    "owner": ["Inhaber", "مالك"],
    "paid": ["bezahlt", "مدفوع"],
    "completed": ["abgeschlossen", "مكتمل"],
    "succeeded": ["erfolgreich", "ناجح"],
    "failed": ["fehlgeschlagen", "فشل"],
    "refunded": ["erstattet", "مسترد"],
    "partially_refunded": ["teilw. erstattet", "مسترد جزئياً"],
    "past_due": ["überfällig", "متأخر السداد"],
    "processed": ["verarbeitet", "تمت المعالجة"],
    "received": ["empfangen", "مستلم"],
    "skipped": ["übersprungen", "تم التخطي"],
    "ignored": ["ignoriert", "تم التجاهل"],
    "monthly": ["monatlich", "شهري"],
    "yearly": ["jährlich", "سنوي"],
    "supermarket": ["Supermarkt", "سوبرماركت"],
    "restaurant": ["Restaurant", "مطعم"],
    "pharmacy": ["Apotheke", "صيدلية"],
    "cafe": ["Café", "مقهى"],
    "retail": ["Einzelhandel", "بيع بالتجزئة"],

    // ── Login page ──
    "Kassenta Super Admin | Login": ["Kassenta Super-Admin | Anmeldung", "كاسنتا — المشرف العام | تسجيل الدخول"],
    "Kassenta Super Admin": ["Kassenta Super-Admin", "كاسنتا — المشرف العام"],
    "Super Admin Console": ["Super-Admin-Konsole", "لوحة المشرف العام"],
    "Invalid username or password": ["Ungültiger Benutzername oder Passwort", "اسم المستخدم أو كلمة المرور غير صحيحة"],
    "Invalid credentials": ["Ungültige Anmeldedaten", "بيانات الدخول غير صحيحة"],
    "Authentication failed": ["Anmeldung fehlgeschlagen", "فشل تسجيل الدخول"],
    "Email Address": ["E-Mail-Adresse", "البريد الإلكتروني"],
    "Password": ["Passwort", "كلمة المرور"],
    "Authenticate": ["Anmelden", "تسجيل الدخول"],
  };

  // Text built from data: [pattern, German, Arabic] ($1… are the captures).
  var P = [
    [/^(\d+) branches · (\d+) employees · (\d+) products$/, "$1 Filialen · $2 Mitarbeiter · $3 Produkte", "$1 فروع · $2 موظفين · $3 منتجات"],
    [/^(\d+) branches · (\d+) employees$/, "$1 Filialen · $2 Mitarbeiter", "$1 فروع · $2 موظفين"],
    [/^([\d,.'’]+) pts$/, "$1 Pkt.", "$1 نقطة"],
    [/^Discount: (.+)$/, "Rabatt: $1", "الخصم: $1"],
    [/^Notes: ([\s\S]+)$/, "Notizen: $1", "ملاحظات: $1"],
    [/^(\d+) br \/ (\d+) emp$/, "$1 Fil. / $2 Mitarb.", "$1 فرع / $2 موظف"],
    [/^(\d+) subs$/, "$1 Abos", "$1 اشتراك"],
    [/^(\d+) tenants$/, "$1 Mandanten", "$1 مشترك"],
    [/^Shift #(\d+) — Started: (.+)$/, "Schicht #$1 — Beginn: $2", "وردية #$1 — البداية: $2"],
    [/^until (.+)$/, "bis $1", "حتى $1"],
    [/^Emp #(\d+)$/, "Mitarb. #$1", "موظف #$1"],
    [/^Branch #(\d+)$/, "Filiale #$1", "فرع #$1"],
    [/^\(last saved: (.+)\)$/, "(zuletzt gespeichert: $1)", "(آخر حفظ: $1)"],
    [/^Slug: ?(.*)$/, "Kürzel: $1", "الرابط: $1"],
    [/^License: (.+)$/, "Lizenz: $1", "الترخيص: $1"],
    [/^(.+) \(full remaining\)$/, "$1 (gesamter Rest)", "$1 (كامل المتبقي)"],
    [/^· already refunded (.+)$/, "· bereits erstattet $1", "· تم استرداد $1 مسبقاً"],
    [/^(\d+) sales · Total: (.+)$/, "$1 Verkäufe · Gesamt: $2", "$1 عملية بيع · الإجمالي: $2"],
    [/^Refund failed: ([\s\S]*)$/, "Erstattung fehlgeschlagen: $1", "فشل الاسترداد: $1"],
    [/^Commission rate updated to (.+)$/, "Provisionssatz auf $1 geändert", "تم تحديث نسبة العمولة إلى $1"],
    [/^Sent to (\d+) tenants$/, "An $1 Mandanten gesendet", "تم الإرسال إلى $1 مشترك"],
    [/^Landing page saved! Live at (.+)$/, "Landingpage gespeichert! Live unter $1", "تم حفظ الصفحة! متاحة على $1"],
    [/^Delete product "(.+)"\?$/, "Produkt „$1“ löschen?", "حذف المنتج «$1»؟"],
    [/^Delete category "(.+)"\?$/, "Kategorie „$1“ löschen?", "حذف الفئة «$1»؟"],
    [/^Delete branch "(.+)"\?$/, "Filiale „$1“ löschen?", "حذف الفرع «$1»؟"],
    [/^Delete employee "(.+)"\?$/, "Mitarbeiter „$1“ löschen?", "حذف الموظف «$1»؟"],
    [/^Set new PIN for (.+):$/, "Neue PIN für $1:", "رمز سري جديد لـ $1:"],
    [/^Deactivate customer "(.+)"\? They will be marked as inactive\.$/, "Kunde „$1“ deaktivieren? Er wird als inaktiv markiert.", "تعطيل العميل «$1»؟ سيُعلَّم كغير نشط."],
    [/^Delete tenant "(.+)"\? This removes ALL data for this store\.$/, "Mandant „$1“ löschen? Dabei werden ALLE Daten dieses Geschäfts entfernt.", "حذف المشترك «$1»؟ سيؤدي ذلك إلى حذف كل بيانات هذا المتجر."],
    [/^Stripe accepted refund (\S+)\. The row changes when the charge\.refunded webhook arrives\.$/, "Stripe hat die Erstattung $1 angenommen. Die Zeile ändert sich, sobald der charge.refunded-Webhook eintrifft.", "قبل Stripe الاسترداد $1. سيتغير السجل عند وصول إشعار charge.refunded."],
    [/^Permanently delete license key:\n([\s\S]+)\n\nThis cannot be undone\.$/, "Lizenzschlüssel endgültig löschen:\n$1\n\nDies kann nicht rückgängig gemacht werden.", "حذف مفتاح الترخيص نهائياً:\n$1\n\nلا يمكن التراجع عن ذلك."],
    [/^Delete backup (.+)\?$/, "Sicherung $1 löschen?", "حذف النسخة الاحتياطية $1؟"],
    [/^Restore data from backup "(.+)"\?\n\nThis will re-import products and customers into the original tenant\. Existing data with matching barcodes will be updated\.$/, "Daten aus der Sicherung „$1“ wiederherstellen?\n\nProdukte und Kunden werden in den ursprünglichen Mandanten reimportiert. Vorhandene Daten mit gleichem Barcode werden aktualisiert.", "استعادة البيانات من النسخة «$1»؟\n\nسيُعاد استيراد المنتجات والعملاء إلى المشترك الأصلي، وتُحدَّث البيانات الموجودة ذات الباركود المطابق."],
    [/^Refund (.+) on (.+)\?\n\nPaymentIntent: (\S+)\n\nThis moves real money at Stripe and cannot be undone\.$/, "$1 für $2 erstatten?\n\nPaymentIntent: $3\n\nDies bewegt echtes Geld bei Stripe und kann nicht rückgängig gemacht werden.", "استرداد $1 للطلب $2؟\n\nPaymentIntent: $3\n\nهذه العملية تحرّك أموالاً حقيقية في Stripe ولا يمكن التراجع عنها."],
    [/^(\d+) active · (\d+) expiring$/, "$1 aktiv · $2 laufen ab", "$1 نشط · $2 قارب على الانتهاء"],
    [/^(\d+) active$/, "$1 aktiv", "$1 نشط"],
    [/^Connected as (\+?\d+)$/, "Verbunden als $1", "متصل بالرقم $1"],
    [/^HTTP (\d+)$/, "HTTP $1", "HTTP $1"],
  ];

  // Paragraphs that mix text with <b>/<code>: replaced as whole blocks.
  var H = {
    subsNote: [
      "Was einem Mandanten tatsächlich Zugang gibt, ist das Ablaufdatum des <b>Lizenzschlüssels</b>, nicht das Abo-Enddatum. „+30 Tage“ verschiebt beides. Ein rotes <b>Lizenz bis</b> bedeutet, dass der Mandant gesperrt ist, obwohl das Abo bezahlt aussieht — stellen Sie ihm einen Schlüssel aus oder verlängern Sie ihn.",
      "ما يسمح للمشترك بالدخول فعلياً هو تاريخ انتهاء <b>مفتاح الترخيص</b>، وليس تاريخ انتهاء الاشتراك. زر «+30 يوماً» يمدّد الاثنين. إذا ظهر <b>الترخيص حتى</b> باللون الأحمر فالمشترك مقفل رغم أن الاشتراك يبدو مدفوعاً — أصدر له مفتاحاً أو مدّده.",
    ],
    refundNote: [
      "Eine Erstattung wird durch den signierten <code>charge.refunded</code>-Webhook von Stripe eingetragen, nie durch diese Seite — eine Zeile behält ihren Status, bis diese Zustellung unten erscheint.",
      "يُسجَّل الاسترداد عبر إشعار <code>charge.refunded</code> الموقّع من Stripe، وليس من هذه الشاشة — يبقى السجل بحالته الحالية حتى يظهر هذا الإشعار أدناه.",
    ],
    refundWarn: [
      "Dies bewegt echtes Geld bei Stripe und kann nicht rückgängig gemacht werden. Der Bestellstatus ändert sich erst, wenn der <code>charge.refunded</code>-Webhook von Stripe zurückkommt.",
      "هذه العملية تحرّك أموالاً حقيقية في Stripe ولا يمكن التراجع عنها. لا تتغير حالة الطلب إلا بعد وصول إشعار <code>charge.refunded</code> من Stripe.",
    ],
    qrHint: [
      "Klicken Sie auf <strong style=\"color:var(--tx)\">„WhatsApp verbinden“</strong>, um einen QR-Code zu erzeugen.<br>Scannen Sie ihn dann mit der WhatsApp-App.",
      "اضغط <strong style=\"color:var(--tx)\">«ربط واتساب»</strong> لتوليد رمز QR.<br>ثم امسحه من تطبيق واتساب على الهاتف.",
    ],
  };

  function lookup(s) {
    var hit = D[s];
    if (hit) return hit[IDX];
    for (var i = 0; i < P.length; i++) {
      if (P[i][0].test(s)) return s.replace(P[i][0], P[i][1 + IDX]);
    }
    return null;
  }

  // "↻ Refresh", "+ Add Product", "Role:", "Name *" … keep the decoration
  // around the words and translate the words.
  var EDGE = /^([^A-Za-z"“(]*)([\s\S]*?)([\s:*.!?…]*)$/;
  function tr(text) {
    var trimmed = text.replace(/^\s+|\s+$/g, "");
    if (!trimmed || !/[A-Za-z]/.test(trimmed)) return null;
    var norm = trimmed.replace(/[ \t\r\n]+/g, " ");
    var out = lookup(trimmed) || (norm !== trimmed ? lookup(norm) : null);
    if (out == null) {
      var m = EDGE.exec(norm);
      if (m && (m[1] || m[3])) {
        var whole = lookup(m[2] + m[3]);
        var core = whole == null ? lookup(m[2]) : null;
        if (whole != null) out = m[1] + whole;
        else if (core != null) out = m[1] + core + m[3];
      }
    }
    if (out == null) return null;
    var lead = text.match(/^\s*/)[0], tail = text.match(/\s*$/)[0];
    return lead + out + tail;
  }

  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, CODE: 1, PRE: 1, NOSCRIPT: 1 };
  function skipped(el) {
    for (var n = el; n && n.nodeType === 1; n = n.parentNode) {
      if (SKIP[n.nodeName] || n.hasAttribute("data-no-i18n") || n.isContentEditable) return true;
    }
    return false;
  }

  function doText(node) {
    var p = node.parentNode;
    if (!p || skipped(p)) return;
    var out = tr(node.nodeValue);
    if (out != null && out !== node.nodeValue) node.nodeValue = out;
  }

  var ATTRS = ["placeholder", "title", "aria-label"];
  function doAttrs(el) {
    if (skipped(el)) return;
    for (var i = 0; i < ATTRS.length; i++) {
      var v = el.getAttribute(ATTRS[i]);
      if (v) {
        var out = tr(v);
        if (out != null && out !== v) el.setAttribute(ATTRS[i], out);
      }
    }
    var key = el.getAttribute("data-i18n-html");
    if (key && H[key] && el.getAttribute("data-i18n-done") !== lang) {
      el.innerHTML = H[key][IDX];
      el.setAttribute("data-i18n-done", lang);
    }
  }

  function walk(root) {
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) {
      if (SKIP[root.nodeName]) return;
      doAttrs(root);
    }
    var els = root.querySelectorAll ? root.querySelectorAll("[placeholder],[title],[aria-label],[data-i18n-html]") : [];
    for (var i = 0; i < els.length; i++) doAttrs(els[i]);
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var n, list = [];
    while ((n = tw.nextNode())) list.push(n);
    for (var j = 0; j < list.length; j++) doText(list[j]);
  }

  // Dialogs raised from the page's own scripts
  ["alert", "confirm", "prompt"].forEach(function (name) {
    var orig = window[name];
    if (typeof orig !== "function") return;
    window[name] = function (msg) {
      var args = Array.prototype.slice.call(arguments);
      if (typeof msg === "string") { var out = tr(msg); if (out != null) args[0] = out; }
      return orig.apply(window, args);
    };
  });

  function translateTitle() {
    var t = tr(document.title);
    if (t != null) document.title = t;
  }

  function start() {
    translateTitle();
    walk(document.body);
    renderSwitch();
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var r = records[i];
        if (r.type === "characterData") doText(r.target);
        else if (r.type === "attributes") doAttrs(r.target);
        else for (var j = 0; j < r.addedNodes.length; j++) walk(r.addedNodes[j]);
      }
    }).observe(document.body, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ATTRS,
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
