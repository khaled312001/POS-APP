# تثبيت درايفرات AVM FRITZ!Card USB v2.1

## الخطوة 1 — التحقق من الدرايفرات الحالية

1. افتح **Device Manager** (ابحث في Start Menu عن "Device Manager")
2. ابحث تحت **"Network adapters"** أو **"ISDN adapters"**
3. يجب أن ترى: `AVM FRITZ!Card USB v2.1`
4. إذا ظهر بعلامة تعجب (!) → الدرايفر معطل أو خاطئ

## الخطوة 2 — التحقق من CAPI DLL

افتح PowerShell أو CMD وتحقق:
```
dir C:\Windows\System32\capi2032.dll
```
- **موجود** → CAPI جاهز، انتقل للخطوة 4
- **غير موجود** → ثبّت الدرايفرات أولاً (الخطوة 3)

## الخطوة 3 — تثبيت الدرايفرات

### للتحميل:
- موقع AVM الرسمي: https://avm.de/service/download/
- ابحث عن: **FRITZ!Card USB v2.1** → اختر نظامك (Windows 10/11)
- أو ابحث مباشرة في Google: `AVM FRITZ!Card USB v2.1 driver Windows 11`

### التثبيت:
1. نزّل ملف الدرايفر (عادةً `fritzcard_usb_v21_drv.exe`)
2. شغّل كـ Administrator
3. اتبع خطوات التثبيت
4. أعد تشغيل الكمبيوتر
5. تحقق من Device Manager مجدداً

## الخطوة 4 — إعداد config.json

افتح ملف `config.json` وعدّل:

```json
{
  "serverUrl": "https://pos.barmagly.tech",
  "tenantId": 1,
  "secret": "fritzbridge-secret-change-me",
  "pollingIntervalMs": 100,
  "capiController": 1,
  "maxSlots": 4
}
```

**مهم:**
- `tenantId`: رقم الـ tenant الخاص بك في نظام POS
- `secret`: نفس القيمة المكتوبة في `CALLER_ID_BRIDGE_SECRET` على السيرفر
- `capiController`: عادةً 1 (إذا عندك FRITZ!Card واحدة فقط)

## الخطوة 5 — إعداد السيرفر

تأكد من وجود المتغير في `.env` على السيرفر (Replit/VPS):
```
CALLER_ID_BRIDGE_SECRET=fritzbridge-secret-change-me
```
استبدل القيمة بكلمة سر قوية وعدّلها في `config.json` أيضاً.

## الخطوة 6 — التشغيل

انقر نقراً مزدوجاً على `start.bat`، أو:
```
cd caller-id-bridge
npm install
node capi-bridge.js
```

يجب أن ترى:
```
=================================================
  FRITZ!Card USB — POS Caller ID Bridge v1.0
=================================================
  Server : https://pos.barmagly.tech
  Tenant : 1
...
[Bridge] CAPI registered. AppID = 1
[Bridge] CAPI Manufacturer: AVM GmbH
[Bridge] LISTEN active — waiting for calls...
```

## الخطوة 7 — الاختبار

**طريقة سريعة بدون مكالمة حقيقية:**
```
curl -X POST https://pos.barmagly.tech/api/caller-id/incoming ^
  -H "x-bridge-secret: fritzbridge-secret-change-me" ^
  -H "Content-Type: application/json" ^
  -d "{\"phoneNumber\": \"0793379442\", \"tenantId\": 1}"
```

→ يجب أن يظهر popup في POS browser فوراً.

**مع مكالمة حقيقية:**
اتصل بالرقم المتصل بـ FRITZ!Card → سيظهر رقم المتصل في شاشة POS تلقائياً.

## الإعداد كـ Windows Service (اختياري)

لتشغيل البريدج تلقائياً عند بدء Windows، استخدم **NSSM**:
1. نزّل NSSM: https://nssm.cc/download
2. افتح CMD كـ Administrator:
```
nssm install FritzBridge "C:\path\to\node.exe" "C:\path\to\caller-id-bridge\capi-bridge.js"
nssm set FritzBridge AppDirectory "C:\path\to\caller-id-bridge"
nssm start FritzBridge
```

## استكشاف الأخطاء

| المشكلة | الحل |
|---------|------|
| `Cannot load capi2032.dll` | الدرايفرات غير مثبتة → الخطوة 3 |
| `CAPI_REGISTER failed: 0x1001` | جهاز FRITZ!Card غير متصل أو معطل |
| `Unauthorized` من السيرفر | تحقق من `secret` في config.json == `CALLER_ID_BRIDGE_SECRET` |
| لا يظهر popup | تحقق من أن `tenantId` صحيح في config.json |
| `ffi-napi` لا يُثبَّت | تحتاج Visual Studio Build Tools: `npm install --global windows-build-tools` |
