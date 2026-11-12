import {
  ArrowLeftRight,
  BadgeCheck,
  Building2,
  CircleDollarSign,
  Database,
  FileCheck2,
  FileText,
  Globe2,
  Layers,
  Lock,
  Plane,
  RadioTower,
  ScrollText,
  Ship,
  Timer,
  Webhook,
} from "lucide-react";
import { Badge } from "@/components/ui";

const CHANNELS = [
  {
    key: "air",
    icon: <Plane className="size-5" />,
    title: "شركات الطيران (Cargo)",
    subtitle: "مصر للطيران · الإمارات · القطرية · التركية · لوفتهانزا",
    accent: "#0ea5e9",
    inbound: [
      "بوليصة الشحن الجوي AWB / e-AWB ورقم الماستر",
      "بيانات الرحلة ورقمها وتاريخ الوصول الفعلي والمتوقع",
      "عدد الطرود والوزن الإجمالي والوزن الحجمي",
      "حالة الشحنة: محجوزة / مشحونة / وصلت / مسلّمة",
    ],
    outbound: [
      "طلب حجز مساحة (Booking) ورقم الملف المرجعي",
      "تعديل بيانات الشحنة قبل الإقلاع",
      "طلب إثبات التسليم POD",
    ],
    protocol: "REST/JSON + IATA ONE Record · مفتاح API في الهيدر",
  },
  {
    key: "sea",
    icon: <Ship className="size-5" />,
    title: "الخطوط الملاحية",
    subtitle: "ميرسك · MSC · CMA CGM · هاباج لويد · إيفرجرين",
    accent: "#0f9d8b",
    inbound: [
      "بوليصة الشحن البحري B/L ورقم الحاوية وعدد الحاويات",
      "اسم السفينة والرحلة وميناء التحميل وميناء الوصول",
      "حركات الحاوية: محمّلة / في البحر / رصيف / تفريغ / خروج",
      "تاريخ الوصول المتوقع ETA وتنبيهات الأرضيات والغرامات",
    ],
    outbound: [
      "طلب إفراج جمركي إلكتروني مرتبط بالبوليصة",
      "طلب تصريح خروج الحاوية من المحطة",
      "استعلام عن حالة البوليصة (Status Inquiry)",
    ],
    protocol: "DCSA Track & Trace 2.2 · OAuth2 Client Credentials",
  },
  {
    key: "nafeza",
    icon: <Globe2 className="size-5" />,
    title: "منصة نافذة (الشباك الواحد)",
    subtitle: "مصلحة الجمارك المصرية · ACID · ACI · التصاريح",
    accent: "#6366f1",
    inbound: [
      "رقم ACID المعتمد وربطه ببوليصة الشحن",
      "حالة الإقرار الجمركي: مسودة / مراجعة / مقبول / مرفوض",
      "قيمة الرسوم الجمركية وضريبة القيمة المضافة المقدَّرة",
      "التصاريح والموافقات (هيئة الدواء، الرقابة الزراعية، البيئة)",
      "شهادة الإفراج الجمركي النهائية",
    ],
    outbound: [
      "إقرار ACID المبدئي قبل الشحن (بيانات المنشأ والمنشأ والبضاعة)",
      "بيان ACI ومطابقة بيانات المورد والمستورد",
      "تقديم المستندات: فاتورة، قائمة تعبئة، شهادة منشأ، تصريح",
      "طلب تقييم جمركي أو فحص لجنة",
    ],
    protocol: "Government REST API · توقيع رقمي + مفاتيح منشأة",
  },
];

const MAPPING = [
  { system: "بوليصة / AWB", field: "bl_number", usage: "مفتاح ربط الإقرار الجمركي برقم ACID ومنع التكرار" },
  { system: "السفينة / الرحلة", field: "vessel_flight", usage: "تحديد الرحلة في بيان ACI ومتابعة الوصول" },
  { system: "الوصول المتوقع ETA", field: "eta", usage: "تنبيهات التأخير وأولوية التخليص" },
  { system: "الحاويات / الطرود / الوزن", field: "container_count · package_count · gross_weight", usage: "أساس حساب الرسوم ومطابقة البيان" },
  { system: "وصف البضاعة والرقم الجمركي", field: "goods_description · hs_code", usage: "تصنيف البند الجمركي وتحديد نسبة الضريبة" },
  { system: "الرسوم الجمركية وض.ق.م", field: "duty_amount · vat_amount", usage: "توليد الفاتورة وسداد المستحقات" },
  { system: "حالة الملف", field: "status", usage: "مرآة لحالة الإقرار في نافذة على مدار الساعة" },
];

const FLOW = [
  { step: "١", title: "الشركة تحجز وتُصدر البوليصة", text: "من بوابة شركة الطيران أو الخط الملاحي تُستلم البوليصة آلياً في ملف التخليص." },
  { step: "٢", title: "إنشاء ملف التخليص", text: "يُربط الملف بالعميل وشركة الشحن، ويُحسب الرقم الجمركي والرسوم التقديرية." },
  { step: "٣", title: "إرسال إقرار ACID إلى نافذة", text: "يُرسل البيان إلكترونياً، وتُستلم ACID ويُحدَّث الملف إلى «قيد المراجعة»." },
  { step: "٤", title: "المستندات والتصاريح", text: "الفواتير وقوائم التعبئة وشهادات المنشأ وموافقات الجهات الرقابية تُسجَّل وتُعتمد." },
  { step: "٥", title: "التقييم والفحص", text: "قد تطلب نافذة تقييماً جمركياً أو فحص لجنة؛ تُسجَّل النتيجة في سجل التتبع." },
  { step: "٦", title: "سداد الرسوم والإفراج", text: "تُسدد الرسوم، ويُستلم إشعار الإفراج، ويُحدَّث الملف وتُصدر الفاتورة." },
  { step: "٧", title: "التسليم والتتبع", text: "يُستلم إثبات التسليم من الشركة ويُغلق الملف مع تحديث التحصيل." },
];

export function IntegrationGuide() {
  return (
    <div className="mt-5 space-y-5">
      <section className="card overflow-hidden">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
              <ArrowLeftRight className="size-4 text-[#0f9d8b]" />
              دليل الربط — ما الذي يتبادله النظام مع كل جهة؟
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              بيانات تُستلم من الشركة ← تُخزَّن في قاعدة البيانات ← تُرسل إلى نافذة. الجدول أدناه يوضح كل قناة.
            </p>
          </div>
          <Badge tone="amber">
            <Lock className="size-3" />
            بيئة تجريبية — الاتصال الفعلي يحتاج مفاتيح API
          </Badge>
        </header>

        <div className="grid gap-px bg-slate-100 md:grid-cols-3">
          {CHANNELS.map((channel) => (
            <div key={channel.key} className="bg-white p-4">
              <div className="flex items-start gap-2">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: channel.accent }}>
                  {channel.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-extrabold text-slate-900">{channel.title}</p>
                  <p className="mt-0.5 text-[10px] leading-4 text-slate-500">{channel.subtitle}</p>
                </div>
              </div>

              <div className="mt-3 space-y-3">
                <div>
                  <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                    <Database className="size-3" />
                    يُستلم إلى المنصة
                  </p>
                  <ul className="space-y-1">
                    {channel.inbound.map((item) => (
                      <li key={item} className="flex gap-1.5 rounded-md bg-emerald-50/60 px-2 py-1 text-[10px] leading-4 text-emerald-900">
                        <span className="mt-1.5 size-1 shrink-0 rounded-full bg-emerald-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold text-sky-700">
                    <Webhook className="size-3" />
                    يُرسل من المنصة
                  </p>
                  <ul className="space-y-1">
                    {channel.outbound.map((item) => (
                      <li key={item} className="flex gap-1.5 rounded-md bg-sky-50/60 px-2 py-1 text-[10px] leading-4 text-sky-900">
                        <span className="mt-1.5 size-1 shrink-0 rounded-full bg-sky-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="rounded-md bg-slate-900 px-2 py-1.5 font-mono text-[9px] leading-4 text-emerald-300" dir="ltr">
                  {channel.protocol}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="card overflow-hidden">
          <header className="border-b border-slate-100 px-5 py-4">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
              <Layers className="size-4 text-[#0f9d8b]" />
              ربط الحقول بنظام التخليص
            </h2>
            <p className="text-[11px] text-slate-500">كل بيان خارجي يُخزَّن في حقل محدد بقاعدة البيانات</p>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[440px]">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="th">البيان القادم</th>
                  <th className="th">الحقل في القاعدة</th>
                  <th className="th">الاستخدام</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {MAPPING.map((row) => (
                  <tr key={row.field} className="hover:bg-slate-50/60">
                    <td className="td text-[11px] font-semibold text-slate-700">{row.system}</td>
                    <td className="td font-mono text-[9px] text-[#0a2239]" dir="ltr">
                      {row.field}
                    </td>
                    <td className="td text-[10px] leading-4 text-slate-500">{row.usage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card overflow-hidden">
          <header className="border-b border-slate-100 px-5 py-4">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
              <ScrollText className="size-4 text-[#0f9d8b]" />
              رحلة الملف من البوليصة إلى الإفراج
            </h2>
            <p className="text-[11px] text-slate-500">٧ مراحل موثّقة في سجل التتبع لكل ملف</p>
          </header>
          <ol className="divide-y divide-slate-100">
            {FLOW.map((item) => (
              <li key={item.step} className="flex items-start gap-3 px-5 py-2.5">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#0a2239] text-[10px] font-bold text-white">
                  {item.step}
                </span>
                <div>
                  <p className="text-[11px] font-bold text-slate-900">{item.title}</p>
                  <p className="text-[10px] leading-4 text-slate-500">{item.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            icon: <RadioTower className="size-4" />,
            title: "طرق الربط المدعومة",
            items: ["REST/JSON مباشر", "Webhooks للتتبع اللحظي", "DCSA للخطوط الملاحية", "SFTP/XML للجهات الحكومية"],
          },
          {
            icon: <Lock className="size-4" />,
            title: "الأمان والمفاتيح",
            items: ["مفاتيح API في متغيرات البيئة", "OAuth2 لبوابات الشركات", "توقيع رقمي لإقرارات نافذة", "سجل تدقيق لكل عملية"],
          },
          {
            icon: <Timer className="size-4" />,
            title: "معدل المزامنة",
            items: ["بوالص جديدة: كل ساعة", "تتبع الحاويات: كل ١٥ دقيقة", "إقرارات نافذة: فوري", "مزامنة يدوية من الشاشة"],
          },
          {
            icon: <Building2 className="size-4" />,
            title: "ما يحدث حال تعطّل الربط",
            items: ["تسجيل الخطأ في سجل التكامل", "تنبيه داخل الشاشة", "استمرار العمل يدوياً", "إعادة محاولة تلقائية"],
          },
        ].map((card) => (
          <div key={card.title} className="card p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-900">
              <span className="flex size-7 items-center justify-center rounded-lg bg-slate-100 text-[#0a2239]">{card.icon}</span>
              {card.title}
            </p>
            <ul className="mt-2 space-y-1">
              {card.items.map((item) => (
                <li key={item} className="flex items-start gap-1.5 text-[10px] leading-4 text-slate-600">
                  <BadgeCheck className="mt-0.5 size-3 shrink-0 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="flex items-center gap-1.5 text-[11px] font-extrabold text-amber-900">
          <FileCheck2 className="size-4" />
          ملاحظة مهمة عن البيئة الحالية
        </p>
        <p className="mt-1 text-[11px] leading-6 text-amber-800">
          الربط في هذه النسخة يعمل بنظام محاكاة واقعي: كل مزامنة أو إقرار يُسجَّل فعلياً في قاعدة البيانات (جداول{" "}
          <span className="font-mono text-[10px]" dir="ltr">integration_logs</span> و{" "}
          <span className="font-mono text-[10px]" dir="ltr">shipment_events</span>) ويُحدِّث حالة الملف والبوالص، لكنه لا
          يتصل بخوادم الشركات أو نافذة الحقيقية لعدم وجود مفاتيح API. لتشغيل الاتصال الفعلي يُضاف لكل شركة:
        </p>
        <ul className="mt-2 grid gap-1 text-[10px] leading-5 text-amber-900 sm:grid-cols-2">
          <li className="flex items-center gap-1.5">
            <FileText className="size-3 shrink-0" /> مفتاح API / Client ID + Secret في متغيرات البيئة
          </li>
          <li className="flex items-center gap-1.5">
            <Globe2 className="size-3 shrink-0" /> رابط الواجهة الصحيح لكل شركة (حقل API Endpoint)
          </li>
          <li className="flex items-center gap-1.5">
            <CircleDollarSign className="size-3 shrink-0" /> اعتماد تجاري من الشركة وربط الحساب
          </li>
          <li className="flex items-center gap-1.5">
            <FileCheck2 className="size-3 shrink-0" /> توقيع رقمي وشهادة منشأة لمنصة نافذة
          </li>
        </ul>
      </section>
    </div>
  );
}
