export const COMPANY = {
  name: "الشركة العربي للخدمات الجمركية واللوجستية",
  shortName: "العربي",
  englishName: "Al-Arabi Customs Clearance & Logistics",
  license: "ترخيص مزاولة مهنة التخليص الجمركي رقم ١٤٥٨ / ٢٠٢٦",
  taxNumber: "٦٢١-٤٤٨-٩٠٣",
  phone: "+٢٠ ٢ ٢٤٤٨ ٩٠١٢",
  email: "operations@alarabi-eg.com",
  address: "٤٢ شارع الجمهورية، الدور السابع، القاهرة - جمهورية مصر العربية",
};

export type Option = { value: string; label: string };

export const shipmentStatuses: Option[] = [
  { value: "new", label: "شحنة جديدة" },
  { value: "documents", label: "تجهيز المستندات" },
  { value: "nafeza", label: "تسجيل نافذة" },
  { value: "inspection", label: "الفحص والمعاينة" },
  { value: "payment", label: "سداد الرسوم" },
  { value: "released", label: "تم الإفراج" },
  { value: "delivered", label: "تم التسليم" },
  { value: "delayed", label: "متعثرة / تأخير" },
];

export const directions: Option[] = [
  { value: "import", label: "استيراد" },
  { value: "export", label: "تصدير" },
  { value: "transit", label: "ترانزيت" },
];

export const transportModes: Option[] = [
  { value: "air", label: "جوي" },
  { value: "sea", label: "بحري" },
  { value: "land", label: "بري" },
];

export const currencies: Option[] = [
  { value: "EGP", label: "جنيه مصري (EGP)" },
  { value: "USD", label: "دولار أمريكي (USD)" },
  { value: "EUR", label: "يورو (EUR)" },
  { value: "CNY", label: "يوان صيني (CNY)" },
];

export const clientTypes: Option[] = [
  { value: "company", label: "شركة" },
  { value: "individual", label: "فرد" },
  { value: "government", label: "جهة حكومية" },
  { value: "agent", label: "وكيل تجاري" },
];

export const carrierTypes: Option[] = [
  { value: "airline", label: "شركة طيران" },
  { value: "shipping", label: "خط ملاحي" },
  { value: "land", label: "نقل بري" },
];

export const portTypes: Option[] = [
  { value: "sea", label: "ميناء بحري" },
  { value: "air", label: "مطار / منفذ جوي" },
  { value: "land", label: "منفذ بري" },
];

export const integrationStates: Option[] = [
  { value: "connected", label: "متصل عبر API" },
  { value: "pending", label: "جاري الربط" },
  { value: "manual", label: "تحديث يدوي" },
];

export const activeStates: Option[] = [
  { value: "active", label: "نشط" },
  { value: "inactive", label: "غير نشط" },
];

export const documentTypes: Option[] = [
  { value: "commercial_invoice", label: "فاتورة تجارية" },
  { value: "bill_of_lading", label: "بوليصة شحن / AWB" },
  { value: "certificate_origin", label: "شهادة المنشأ" },
  { value: "packing_list", label: "قائمة التعبئة" },
  { value: "declaration", label: "بيان جمركي" },
  { value: "release_order", label: "إذن تسليم" },
  { value: "inspection", label: "شهادة فحص" },
  { value: "other", label: "أخرى" },
];

export const documentStatuses: Option[] = [
  { value: "required", label: "مطلوب" },
  { value: "review", label: "قيد المراجعة" },
  { value: "approved", label: "معتمد" },
  { value: "rejected", label: "مرفوض" },
];

export const taskStatuses: Option[] = [
  { value: "pending", label: "قيد الانتظار" },
  { value: "in_progress", label: "جاري التنفيذ" },
  { value: "done", label: "مكتملة" },
  { value: "blocked", label: "متوقفة" },
];

export const taskStages: Option[] = [
  { value: "documents", label: "المستندات" },
  { value: "nafeza", label: "نافذة / ACID" },
  { value: "customs", label: "الجمارك" },
  { value: "inspection", label: "الفحص" },
  { value: "payment", label: "السداد" },
  { value: "delivery", label: "التسليم" },
];

export const priorities: Option[] = [
  { value: "low", label: "منخفضة" },
  { value: "normal", label: "عادية" },
  { value: "high", label: "عالية" },
  { value: "urgent", label: "عاجلة" },
];

export const invoiceStatuses: Option[] = [
  { value: "draft", label: "مسودة" },
  { value: "pending", label: "مستحقة" },
  { value: "paid", label: "مدفوعة" },
  { value: "overdue", label: "متأخرة" },
];

export const eventStatuses: Option[] = [
  { value: "accepted", label: "مقبول" },
  { value: "sent", label: "تم الإرسال" },
  { value: "pending", label: "قيد المعالجة" },
  { value: "rejected", label: "مرفوض" },
];

export const eventTypes: Option[] = [
  { value: "acid_registration", label: "تسجيل ACID" },
  { value: "declaration", label: "إرسال بيان جمركي" },
  { value: "manifest", label: "استلام منيفست" },
  { value: "carrier_sync", label: "مزامنة الناقل" },
  { value: "release", label: "إذن الإفراج" },
  { value: "inspection", label: "طلب معاينة" },
  { value: "payment", label: "سداد رسوم" },
];

export const roles: Option[] = [
  { value: "admin", label: "مدير النظام" },
  { value: "manager", label: "مدير العمليات" },
  { value: "operator", label: "مخلص جمركي" },
  { value: "accountant", label: "محاسب" },
  { value: "viewer", label: "مشاهد فقط" },
];

export const statusLabel = (list: Option[], value?: string | null) =>
  list.find((item) => item.value === value)?.label ?? value ?? "—";

export const toneByStatus: Record<string, string> = {
  new: "bg-sky-50 text-sky-700 ring-sky-200",
  draft: "bg-slate-50 text-slate-600 ring-slate-200",
  documents: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  nafeza: "bg-violet-50 text-violet-700 ring-violet-200",
  inspection: "bg-amber-50 text-amber-700 ring-amber-200",
  payment: "bg-orange-50 text-orange-700 ring-orange-200",
  released: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  delivered: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  accepted: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  connected: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  done: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  sent: "bg-sky-50 text-sky-700 ring-sky-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  required: "bg-amber-50 text-amber-700 ring-amber-200",
  review: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  in_progress: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  overdue: "bg-rose-50 text-rose-700 ring-rose-200",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200",
  delayed: "bg-rose-50 text-rose-700 ring-rose-200",
  blocked: "bg-rose-50 text-rose-700 ring-rose-200",
  inactive: "bg-slate-100 text-slate-500 ring-slate-200",
  manual: "bg-slate-100 text-slate-600 ring-slate-200",
};

export const tone = (value?: string | null) =>
  `inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap ${toneByStatus[value ?? ""] ?? "bg-slate-50 text-slate-600 ring-slate-200"}`;

export const formatNumber = (value?: number | string | null) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toLocaleString("ar-EG", { maximumFractionDigits: 2 }) : "٠";
};

export const formatMoney = (value?: number | string | null, currency = "EGP") =>
  `${formatNumber(value)} ${currency === "EGP" ? "ج.م" : currency}`;

export const formatDate = (value?: string | Date | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
};

export const formatDateTime = (value?: string | Date | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });
};

export const RESOURCE_NAMES: Record<string, string> = {
  clients: "العملاء",
  carriers: "شركات النقل",
  ports: "الموانئ والمنافذ",
  carrierConnections: "ربط الناقلين",
  tariffItems: "البنود الجمركية",
  shipmentItems: "أصناف الشحنة",
  banks: "البنوك",
  shipments: "الشحنات",
  tasks: "المهام",
  documents: "المستندات",
  invoices: "الفواتير",
  nafezaEvents: "أحداث نافذة",
  users: "المستخدمون",
  activities: "سجل النشاط",
};
