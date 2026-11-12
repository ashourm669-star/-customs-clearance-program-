# نشر «العربي للخدمات الجمركية واللوجستية» على استضافة دائمة

النظام يعمل فوراً على أي قاعدة PostgreSQL جديدة: يبني الجداول ويضيف البيانات التجريبية تلقائياً عند أول زيارة (تم اختباره على قاعدة فارغة).

---

## الخيار ١ — Vercel + Neon (الأسرع، مجاني للبداية)

### ١. قاعدة بيانات سحابية
1. ادخل https://neon.tech وأنشئ مشروعاً (Region: Frankfurt أو AWS eu-central-1).
2. من **Connection string** انسخ رابطاً بالشكل:
   `postgresql://user:pass@ep-xxxx.eu-central-1.aws.neon.tech/neondb?sslmode=require`

### ٢. رفع الكود
```bash
npm i -g vercel
vercel login          # يسجّل بحسابك
vercel                # معاينة
vercel --prod         # نشر نهائي
```
أو ارفع المشروع إلى GitHub ثم: Vercel → **Add New → Project → Import** (سيتعرّف على Next.js تلقائياً).

### ٣. متغيرات البيئة (Project → Settings → Environment Variables)
| الاسم | القيمة |
|---|---|
| `DATABASE_URL` | رابط Neon أعلاه (مهم: `?sslmode=require`) |

اختياري (لاستخدام الربط الحقيقي وتتطلب تعاقداً):
`TRACKING_API_URL`, `TRACKING_API_KEY`, `DCSA_BASE_URL`, `DCSA_TOKEN_URL`, `DCSA_CLIENT_ID`, `DCSA_CLIENT_SECRET`, `NAFEZA_API_URL`, `NAFEZA_CLIENT_ID`, `NAFEZA_CLIENT_SECRET`.

### ٤. أول فتح
افتح `https://<مشروعك>.vercel.app` → ستُنشأ الجداول والبيانات التجريبية تلقائياً.
الحساب التجريبي: `admin@alarabi.com` / `123456` — **غيّر كلمة المرور فوراً من الإعدادات**.

> بدء بلا بيانات تجريبية: نفّذ في Neon `TRUNCATE users CASCADE;` قبل أول فتح، أو أضف `SEED_DEMO=false` (غير مدعوم حالياً — احذف المستخدمين فقط).

---

## الخيار ٢ — Railway / Render (قاعدة + تطبيق في مكان واحد)

1. أنشئ **PostgreSQL** من لوحة Railway وانسخ `DATABASE_URL`.
2. أنشئ خدمة Web من نفس المستودع، أوامر:
   - Build: `npm ci && npm run build`
   - Start: `npm run start`
3. أضف نفس متغيرات البيئة.

---

## الخيار ٣ — استضافة داخلية (Docker)

```bash
docker compose up -d --build
# http://localhost:3000
```
الملفات: `Dockerfile` و `docker-compose.yml` (Postgres + التطبيق).

---

## ملاحظات تشغيلية
- **الترحيل اليدوي**: `npx drizzle-kit push` (يقرأ `DATABASE_URL` من `drizzle.config.ts`).
- **إعادة الزرع**: `npx tsx src/db/seed.ts` (يمسح البيانات الحالية ويعيدها).
- **إعادة تعيين كلمة مرور**: `npx tsx src/db/reset-password.ts email@example.com كلمة-المرور`.
- **الصحة**: `GET /api/health` ترجع `{"ok":true}` وتُنشئ الجداول عند أول طلب.
- **الملفات المرفوعة لا تُخزَّن**: الفواتير تُقرأ نصياً وتُحفظ البيانات فقط، لذا لا حاجة لتخزين ملفات سحابي.
- **OCR**: يحتاج حزمة اللغة العربية/الإنجليزية داخل `.tessdata` (مضمّنة) أو اتصالاً بالشبكة لتحميلها.
- **حدود Vercel**: مسار قراءة الفواتير والتصدير مُهيّأ على `maxDuration: 60`.

## ما لا تفعله هذه النسخة
- لا ترسل بيانات فعلية إلى نافذة أو شركات الشحن بدون مفاتيح واعتماد رسمي.
- نسب التعريفة غير المعتمدة لا تُستخدم في الحساب (تظهر «غير معتمدة») حتى تستورد نسخة موثقة وتضع `verified=1`.

---

## نشر تلقائي من هذه البيئة (أمر واحد)

أضف المتغيرات التالية في إعدادات البيئة (Secrets) ثم شغّل الأمر:

| المتغير | إلزامي | المصدر |
|---|---|---|
| `VERCEL_TOKEN` | نعم | https://vercel.com/account/tokens → Create Token (Scope: Full Account) |
| `NEON_API_KEY` | اختياري | https://console.neon.tech/app/settings/api-keys (لإنشاء قاعدة مجانية تلقائياً) |
| `DATABASE_URL` | بديل عن Neon | رابط PostgreSQL سحابي يحتوي `?sslmode=require` |

```bash
node scripts/deploy-vercel.mjs
```
السكربت يتحقق من التوكن، ينشئ المشروع، يضبط متغيرات البيئة، ثم ينفّذ `vercel deploy --prod` ويطبع الرابط النهائي.

### الحصول على توكن Vercel
Vercel → أعلى اليمين (صورتك) → **Account Settings** → **Tokens** → **Create Token** → الاسم `al-araby` → Scope: **Full Account** → نسخ التوكن (يظهر مرة واحدة).

### الحصول على رابط قاعدة بيانات Neon
https://neon.tech → Sign up → **Create project** (Region: Frankfurt) → **Connection string** → انسخ الرابط وأضف `?sslmode=require` إن لم يكن موجوداً.
