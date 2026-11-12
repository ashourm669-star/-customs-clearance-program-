export type Tone = "slate" | "amber" | "sky" | "indigo" | "emerald" | "teal" | "rose" | "gold";

export const SHIPMENT_STATUSES = [
  "draft",
  "documents_pending",
  "under_review",
  "customs_clearance",
  "released",
  "delivered",
  "on_hold",
] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export const SHIPMENT_STATUS_META: Record<ShipmentStatus, { label: string; tone: Tone; dot: string }> = {
  draft: { label: "مسودة", tone: "slate", dot: "#94a3b8" },
  documents_pending: { label: "بانتظار المستندات", tone: "amber", dot: "#f59e0b" },
  under_review: { label: "قيد المراجعة", tone: "sky", dot: "#0ea5e9" },
  customs_clearance: { label: "قيد التخليص", tone: "indigo", dot: "#6366f1" },
  released: { label: "تم الإفراج", tone: "emerald", dot: "#10b981" },
  delivered: { label: "تم التسليم", tone: "teal", dot: "#14b8a6" },
  on_hold: { label: "معلّق", tone: "rose", dot: "#f43f5e" },
};

export const MODES = ["sea", "air", "land"] as const;
export type Mode = (typeof MODES)[number];
export const MODE_META: Record<Mode, { label: string; icon: string }> = {
  sea: { label: "شحن بحري", icon: "🚢" },
  air: { label: "شحن جوي", icon: "✈️" },
  land: { label: "شحن بري", icon: "🚚" },
};

export const DIRECTIONS = ["import", "export", "transit"] as const;
export type Direction = (typeof DIRECTIONS)[number];
export const DIRECTION_META: Record<Direction, { label: string; tone: Tone }> = {
  import: { label: "وارد", tone: "sky" },
  export: { label: "صادر", tone: "emerald" },
  transit: { label: "عبور", tone: "gold" },
};

export const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];
export const PRIORITY_META: Record<Priority, { label: string; tone: Tone }> = {
  low: { label: "منخفضة", tone: "slate" },
  normal: { label: "عادية", tone: "sky" },
  high: { label: "عالية", tone: "amber" },
  urgent: { label: "عاجلة", tone: "rose" },
};

export const CARRIER_TYPES = ["airline", "shipping_line", "land", "platform"] as const;
export type CarrierType = (typeof CARRIER_TYPES)[number];
export const CARRIER_TYPE_META: Record<CarrierType, { label: string }> = {
  airline: { label: "شركة طيران" },
  shipping_line: { label: "خط ملاحي" },
  land: { label: "نقل بري" },
  platform: { label: "منصة حكومية" },
};

export const INTEGRATION_STATUSES = ["connected", "pending", "disconnected"] as const;
export const INTEGRATION_META: Record<string, { label: string; tone: Tone }> = {
  connected: { label: "متصل", tone: "emerald" },
  pending: { label: "قيد التفعيل", tone: "amber" },
  disconnected: { label: "غير متصل", tone: "rose" },
};

export const DOC_TYPES = [
  "commercial_invoice",
  "packing_list",
  "bill_of_lading",
  "awb",
  "certificate_of_origin",
  "permit",
  "insurance",
  "other",
] as const;
export type DocType = (typeof DOC_TYPES)[number];
export const DOC_TYPE_META: Record<DocType, { label: string }> = {
  commercial_invoice: { label: "فاتورة تجارية" },
  packing_list: { label: "قائمة تعبئة" },
  bill_of_lading: { label: "بوليصة شحن بحري" },
  awb: { label: "بوليصة شحن جوي" },
  certificate_of_origin: { label: "شهادة منشأ" },
  permit: { label: "تصريح / موافقة" },
  insurance: { label: "شهادة تأمين" },
  other: { label: "مستند آخر" },
};

export const DOC_STATUSES = ["pending", "approved", "rejected"] as const;
export const DOC_STATUS_META: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "بانتظار المراجعة", tone: "amber" },
  approved: { label: "معتمد", tone: "emerald" },
  rejected: { label: "مرفوض", tone: "rose" },
};

export const INVOICE_STATUSES = ["draft", "sent", "partially_paid", "paid", "overdue"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];
export const INVOICE_STATUS_META: Record<InvoiceStatus, { label: string; tone: Tone }> = {
  draft: { label: "مسودة", tone: "slate" },
  sent: { label: "مرسلة", tone: "sky" },
  partially_paid: { label: "مدفوعة جزئياً", tone: "amber" },
  paid: { label: "مدفوعة", tone: "emerald" },
  overdue: { label: "متأخرة", tone: "rose" },
};

export const EVENT_TYPES = ["status", "document", "customs", "payment", "note", "integration"] as const;
export const EVENT_TYPE_META: Record<string, { label: string; color: string }> = {
  status: { label: "تحديث حالة", color: "#0ea5e9" },
  document: { label: "مستند", color: "#8b5cf6" },
  customs: { label: "إجراء جمركي", color: "#6366f1" },
  payment: { label: "مدفوعات", color: "#10b981" },
  note: { label: "ملاحظة", color: "#64748b" },
  integration: { label: "تكامل / تتبع", color: "#0f9d8b" },
};

export const CURRENCIES = ["USD", "EUR", "EGP", "AED", "SAR", "GBP"] as const;

export const EGYPT_PORTS = [
  "ميناء الإسكندرية",
  "ميناء الدخيلة",
  "ميناء دمياط",
  "ميناء بورسعيد",
  "ميناء السخنة",
  "ميناء سفاجا",
  "مطار القاهرة الدولي",
  "مطار برج العرب",
  "معبر السلوم",
  "معبر قسطل",
];

export const navSections = [
  {
    title: "العمليات",
    items: [
      { href: "/dashboard", label: "لوحة التحكم", icon: "dashboard" },
      { href: "/shipments", label: "ملفات التخليص", icon: "shipments" },
      { href: "/tracking", label: "تتبع بوليصة / AWB", icon: "tracking" },
      { href: "/documents", label: "المستندات", icon: "documents" },
      { href: "/customs", label: "المنظومة الجمركية", icon: "customs" },
      { href: "/invoices", label: "الفواتير والتحصيل", icon: "invoices" },
    ],
  },
  {
    title: "الشركاء والتكامل",
    items: [
      { href: "/carriers", label: "شركات الطيران والملاحة", icon: "carriers" },
      { href: "/integrations", label: "الربط مع نافذة", icon: "integrations" },
    ],
  },
  {
    title: "الإدارة",
    items: [
      { href: "/clients", label: "العملاء", icon: "clients" },
      { href: "/reports", label: "التقارير والتحليلات", icon: "reports" },
      { href: "/users", label: "المستخدمون والصلاحيات", icon: "users" },
      { href: "/alerts", label: "الإشعارات والتنبيهات", icon: "alerts" },
      { href: "/settings", label: "الإعدادات", icon: "settings" },
    ],
  },
] as const;
