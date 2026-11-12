import {
  Building2, ClipboardList, FileText, Globe2, Plane, ReceiptText, Ship,
  UsersRound, Wallet,
} from "lucide-react";
import {
  activeStates, carrierTypes, clientTypes, currencies, directions, documentStatuses,
  documentTypes, eventStatuses, eventTypes, integrationStates, invoiceStatuses,
  portTypes, priorities, roles, shipmentStatuses, taskStages, taskStatuses,
  transportModes, type Option,
} from "@/lib/constants";
import type { DataKey, Row } from "@/components/data-provider";

export type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "textarea" | "email" | "password" | "tel" | "url";
  options?: Option[];
  relation?: DataKey;
  relationLabel?: string;
  placeholder?: string;
  required?: boolean;
  wide?: boolean;
  hint?: string;
};

export type ColumnDef = {
  key: string;
  label: string;
  kind?: "text" | "mono" | "badge" | "date" | "money" | "number" | "relation" | "bool" | "secret";
  options?: Option[];
  relation?: DataKey;
  relationLabel?: string;
  currencyKey?: string;
  wide?: boolean;
};

export type PageConfig = {
  resource: DataKey;
  title: string;
  subtitle: string;
  singular: string;
  addLabel: string;
  icon: typeof Building2;
  columns: ColumnDef[];
  fields: FieldDef[];
  searchKeys: string[];
  filters?: { key: string; label: string; options: Option[]; relation?: DataKey }[];
  defaults?: Row;
  searchPlaceholder?: string;
  relationSearch?: { key: string; relation: DataKey; label: string }[];
};

const activeFilter = { key: "status", label: "الحالة", options: activeStates };

export const pageConfigs: Record<string, PageConfig> = {
  clients: {
    resource: "clients",
    title: "إدارة العملاء",
    subtitle: "قاعدة بيانات العملاء والجهات المستفيدة من خدمات التخليص الجمركي",
    singular: "عميل",
    addLabel: "إضافة عميل",
    icon: Building2,
    searchKeys: ["name", "code", "taxNumber", "phone", "email", "city"],
    searchPlaceholder: "بحث بالاسم، الكود، الرقم الضريبي أو الهاتف...",
    defaults: { type: "company", status: "active", creditLimit: 0 },
    filters: [
      { key: "type", label: "نوع العميل", options: clientTypes },
      activeFilter,
    ],
    columns: [
      { key: "code", label: "الكود", kind: "mono" },
      { key: "name", label: "اسم العميل", wide: true },
      { key: "type", label: "النوع", kind: "badge", options: clientTypes },
      { key: "taxNumber", label: "الرقم الضريبي", kind: "mono" },
      { key: "phone", label: "الهاتف", kind: "mono" },
      { key: "city", label: "المدينة" },
      { key: "status", label: "الحالة", kind: "badge", options: activeStates },
    ],
    fields: [
      { key: "name", label: "اسم العميل / الشركة", required: true, placeholder: "مثال: شركة النيل للتجارة" },
      { key: "code", label: "كود العميل", hint: "يتم إنشاؤه تلقائياً عند تركه فارغاً" },
      { key: "type", label: "نوع العميل", type: "select", options: clientTypes },
      { key: "taxNumber", label: "الرقم الضريبي" },
      { key: "phone", label: "رقم الهاتف", type: "tel" },
      { key: "email", label: "البريد الإلكتروني", type: "email" },
      { key: "city", label: "المدينة" },
      { key: "creditLimit", label: "الحد الائتماني", type: "number", placeholder: "٠" },
      { key: "status", label: "الحالة", type: "select", options: activeStates },
      { key: "address", label: "العنوان", wide: true },
      { key: "notes", label: "ملاحظات", type: "textarea", wide: true },
    ],
  },
  carriers: {
    resource: "carriers",
    title: "شركات الطيران والخطوط الملاحية",
    subtitle: "دليل الناقلين المرتبطين بالنظام ومنصة نافذة مع حالة الربط التقني لكل ناقل",
    singular: "ناقل",
    addLabel: "إضافة ناقل",
    icon: Plane,
    searchKeys: ["name", "englishName", "code", "country", "nafezaCode"],
    searchPlaceholder: "بحث باسم الناقل، الكود (IATA / SCAC) أو الدولة...",
    defaults: { type: "airline", integration: "connected", status: "active" },
    filters: [
      { key: "type", label: "نوع الناقل", options: carrierTypes },
      { key: "integration", label: "حالة الربط", options: integrationStates },
    ],
    columns: [
      { key: "code", label: "الكود", kind: "mono" },
      { key: "name", label: "الناقل", wide: true },
      { key: "englishName", label: "الاسم الإنجليزي" },
      { key: "type", label: "النوع", kind: "badge", options: carrierTypes },
      { key: "country", label: "الدولة" },
      { key: "nafezaCode", label: "كود نافذة", kind: "mono" },
      { key: "integration", label: "الربط التقني", kind: "badge", options: integrationStates },
    ],
    fields: [
      { key: "name", label: "اسم الناقل", required: true, placeholder: "مثال: مصر للطيران للشحن" },
      { key: "code", label: "الكود (IATA / SCAC)", hint: "يتم إنشاؤه تلقائياً عند تركه فارغاً" },
      { key: "englishName", label: "الاسم الإنجليزي" },
      { key: "type", label: "نوع الناقل", type: "select", options: carrierTypes },
      { key: "country", label: "الدولة" },
      { key: "contactPerson", label: "مسؤول التواصل" },
      { key: "contactPhone", label: "هاتف التواصل", type: "tel" },
      { key: "website", label: "الموقع الإلكتروني", type: "url" },
      { key: "apiEndpoint", label: "رابط ربط API", type: "url", wide: true },
      { key: "nafezaCode", label: "كود الربط مع نافذة" },
      { key: "integration", label: "حالة الربط التقني", type: "select", options: integrationStates },
      { key: "status", label: "الحالة", type: "select", options: activeStates },
    ],
  },
  carrierConnections: {
    resource: "carrierConnections",
    title: "ربط الناقلين بمصادر البيانات الحقيقية",
    subtitle: "إعداد مفاتيح API وروابط التتبع الرسمية لكل شركة طيران وخط ملاحي",
    singular: "إعداد ربط",
    addLabel: "إضافة ربط",
    icon: Globe2,
    searchKeys: ["provider", "providerCode", "apiUrl", "trackingUrlTemplate", "notes"],
    searchPlaceholder: "بحث بالناقل، المزوّد أو كود التتبع...",
    defaults: { provider: "official", enabled: true },
    filters: [
      { key: "provider", label: "المزوّد", options: [
        { value: "official", label: "رابط الموقع الرسمي" },
        { value: "trackingmore", label: "TrackingMore API v4" },
        { value: "custom", label: "API الناقل المباشر" },
      ] },
    ],
    columns: [
      { key: "carrierId", label: "الناقل", kind: "relation", relation: "carriers", relationLabel: "name", wide: true },
      { key: "provider", label: "المزوّد", kind: "badge", options: [
        { value: "official", label: "موقع رسمي" },
        { value: "trackingmore", label: "TrackingMore" },
        { value: "custom", label: "API مباشر" },
      ] },
      { key: "providerCode", label: "كود المزوّد", kind: "mono" },
      { key: "apiUrl", label: "رابط API" },
      { key: "apiKey", label: "مفتاح API", kind: "secret" },
      { key: "enabled", label: "مفعّل", kind: "bool" },
    ],
    fields: [
      { key: "carrierId", label: "الناقل / شركة الطيران", type: "select", relation: "carriers", relationLabel: "name", required: true },
      { key: "provider", label: "نوع الربط", type: "select", options: [
        { value: "official", label: "رابط التتبع الرسمي فقط (بدون مفتاح)" },
        { value: "trackingmore", label: "TrackingMore API v4 (حاويات + AWB)" },
        { value: "custom", label: "API الناقل المباشر" },
      ] },
      { key: "providerCode", label: "كود الناقل لدى المزوّد", hint: "مثال: maersk / msc / egyptair-cargo" },
      { key: "apiUrl", label: "رابط الـ API", type: "url", wide: true },
      { key: "apiKey", label: "مفتاح API", type: "password", hint: "يُحفظ في قاعدة بيانات السيرفر ولا يظهر للمتصفح العام" },
      { key: "trackingUrlTemplate", label: "قالب رابط التتبع الرسمي", wide: true, hint: "استخدم {number} مكان رقم البوليصة" },
      { key: "enabled", label: "حالة الربط", type: "select", options: [{ value: "true", label: "مفعّل" }, { value: "false", label: "معطل" }] },
      { key: "notes", label: "ملاحظات", type: "textarea", wide: true },
    ],
  },
  ports: {
    resource: "ports",
    title: "الموانئ والمنافذ الجمركية",
    subtitle: "الموانئ البحرية والمطارات والمنافذ البرية المرتبطة بمنصة نافذة",
    singular: "منفذ",
    addLabel: "إضافة منفذ",
    icon: Globe2,
    searchKeys: ["name", "code", "city", "customsOffice", "nafezaCode"],
    searchPlaceholder: "بحث باسم المنفذ أو المدينة أو مكتب الجمارك...",
    defaults: { type: "sea", status: "active" },
    filters: [{ key: "type", label: "نوع المنفذ", options: portTypes }],
    columns: [
      { key: "code", label: "الكود", kind: "mono" },
      { key: "name", label: "اسم المنفذ", wide: true },
      { key: "type", label: "النوع", kind: "badge", options: portTypes },
      { key: "city", label: "المدينة" },
      { key: "customsOffice", label: "مكتب الجمارك" },
      { key: "nafezaCode", label: "كود نافذة", kind: "mono" },
      { key: "status", label: "الحالة", kind: "badge", options: activeStates },
    ],
    fields: [
      { key: "name", label: "اسم المنفذ", required: true },
      { key: "code", label: "كود المنفذ", hint: "يتم إنشاؤه تلقائياً عند تركه فارغاً" },
      { key: "type", label: "نوع المنفذ", type: "select", options: portTypes },
      { key: "city", label: "المدينة / المحافظة" },
      { key: "customsOffice", label: "مكتب الجمارك التابع" },
      { key: "nafezaCode", label: "كود الربط مع نافذة" },
      { key: "status", label: "الحالة", type: "select", options: activeStates },
    ],
  },
  shipments: {
    resource: "shipments",
    title: "الشحنات وعمليات التخليص",
    subtitle: "متابعة دورة حياة كل شحنة من التسجيل حتى الإفراج والتسليم",
    singular: "شحنة",
    addLabel: "شحنة جديدة",
    icon: Ship,
    searchKeys: ["refNo", "goodsDescription", "acidNumber", "declarationNumber", "transportRef", "origin", "destination"],
    searchPlaceholder: "بحث برقم الشحنة، ACID، البيان الجمركي أو البضاعة...",
    relationSearch: [{ key: "clientId", relation: "clients", label: "name" }],
    defaults: { direction: "import", mode: "sea", status: "new", currency: "EGP" },
    filters: [
      { key: "status", label: "حالة الشحنة", options: shipmentStatuses },
      { key: "direction", label: "الاتجاه", options: directions },
      { key: "mode", label: "وسيلة النقل", options: transportModes },
    ],
    columns: [
      { key: "refNo", label: "رقم الشحنة", kind: "mono" },
      { key: "clientId", label: "العميل", kind: "relation", relation: "clients", relationLabel: "name", wide: true },
      { key: "goodsDescription", label: "وصف البضاعة", wide: true },
      { key: "mode", label: "النقل", kind: "badge", options: transportModes },
      { key: "direction", label: "الاتجاه", kind: "badge", options: directions },
      { key: "eta", label: "الوصول", kind: "date" },
      { key: "cargoValue", label: "القيمة", kind: "money", currencyKey: "currency" },
      { key: "status", label: "الحالة", kind: "badge", options: shipmentStatuses },
    ],
    fields: [
      { key: "refNo", label: "رقم الشحنة", hint: "يتم إنشاؤه تلقائياً عند تركه فارغاً" },
      { key: "clientId", label: "العميل", type: "select", relation: "clients", relationLabel: "name", required: true },
      { key: "direction", label: "الاتجاه", type: "select", options: directions },
      { key: "mode", label: "وسيلة النقل", type: "select", options: transportModes },
      { key: "carrierId", label: "الناقل / الخط الملاحي", type: "select", relation: "carriers", relationLabel: "name" },
      { key: "portId", label: "منفذ الدخول", type: "select", relation: "ports", relationLabel: "name" },
      { key: "transportRef", label: "رقم بوليصة الشحن / AWB" },
      { key: "acidNumber", label: "رقم ACID - نافذة" },
      { key: "declarationNumber", label: "رقم البيان الجمركي" },
      { key: "goodsDescription", label: "وصف البضاعة", required: true, wide: true },
      { key: "origin", label: "بلد / ميناء المصدر" },
      { key: "destination", label: "جهة الوصول" },
      { key: "packages", label: "عدد الطرود", type: "number" },
      { key: "weightKg", label: "الوزن (كجم)", type: "number" },
      { key: "containerCount", label: "عدد الحاويات", type: "number" },
      { key: "cargoValue", label: "قيمة البضاعة", type: "number" },
      { key: "currency", label: "العملة", type: "select", options: currencies },
      { key: "etd", label: "تاريخ الشحن", type: "date" },
      { key: "eta", label: "تاريخ الوصول المتوقع", type: "date" },
      { key: "status", label: "حالة الشحنة", type: "select", options: shipmentStatuses },
      { key: "clearanceOfficer", label: "المخلص المسؤول" },
      { key: "notes", label: "ملاحظات", type: "textarea", wide: true },
    ],
  },
  tasks: {
    resource: "tasks",
    title: "مهام التخليص الجمركي",
    subtitle: "قائمة مهام الفريق عبر مراحل المستندات ونافذة والجمارك والتسليم",
    singular: "مهمة",
    addLabel: "مهمة جديدة",
    icon: ClipboardList,
    searchKeys: ["title", "assignee", "notes"],
    searchPlaceholder: "بحث بعنوان المهمة أو المسؤول...",
    defaults: { stage: "documents", priority: "normal", status: "pending" },
    filters: [
      { key: "status", label: "الحالة", options: taskStatuses },
      { key: "stage", label: "المرحلة", options: taskStages },
      { key: "priority", label: "الأولوية", options: priorities },
    ],
    columns: [
      { key: "title", label: "المهمة", wide: true },
      { key: "shipmentId", label: "الشحنة", kind: "relation", relation: "shipments", relationLabel: "refNo" },
      { key: "stage", label: "المرحلة", kind: "badge", options: taskStages },
      { key: "assignee", label: "المسؤول" },
      { key: "priority", label: "الأولوية", kind: "badge", options: priorities },
      { key: "dueDate", label: "الاستحقاق", kind: "date" },
      { key: "status", label: "الحالة", kind: "badge", options: taskStatuses },
    ],
    fields: [
      { key: "title", label: "عنوان المهمة", required: true, wide: true },
      { key: "shipmentId", label: "الشحنة المرتبطة", type: "select", relation: "shipments", relationLabel: "refNo" },
      { key: "stage", label: "المرحلة", type: "select", options: taskStages },
      { key: "assignee", label: "المسؤول" },
      { key: "priority", label: "الأولوية", type: "select", options: priorities },
      { key: "status", label: "الحالة", type: "select", options: taskStatuses },
      { key: "dueDate", label: "تاريخ الاستحقاق", type: "date" },
      { key: "notes", label: "ملاحظات", type: "textarea", wide: true },
    ],
  },
  documents: {
    resource: "documents",
    title: "المستندات الجمركية",
    subtitle: "أرشيف مستندات الشحنات وحالة اعتمادها لدى الجهات المعنية",
    singular: "مستند",
    addLabel: "إضافة مستند",
    icon: FileText,
    searchKeys: ["name", "referenceNo", "fileName", "notes"],
    searchPlaceholder: "بحث باسم المستند أو رقم المرجع...",
    defaults: { type: "commercial_invoice", status: "required" },
    filters: [
      { key: "type", label: "نوع المستند", options: documentTypes },
      { key: "status", label: "حالة الاعتماد", options: documentStatuses },
    ],
    columns: [
      { key: "name", label: "المستند", wide: true },
      { key: "shipmentId", label: "الشحنة", kind: "relation", relation: "shipments", relationLabel: "refNo" },
      { key: "type", label: "النوع", kind: "badge", options: documentTypes },
      { key: "referenceNo", label: "رقم المرجع", kind: "mono" },
      { key: "fileName", label: "اسم الملف", kind: "mono" },
      { key: "status", label: "الحالة", kind: "badge", options: documentStatuses },
    ],
    fields: [
      { key: "name", label: "اسم المستند", required: true },
      { key: "shipmentId", label: "الشحنة المرتبطة", type: "select", relation: "shipments", relationLabel: "refNo" },
      { key: "type", label: "نوع المستند", type: "select", options: documentTypes },
      { key: "referenceNo", label: "رقم المرجع" },
      { key: "fileName", label: "اسم الملف", placeholder: "invoice.pdf" },
      { key: "status", label: "حالة الاعتماد", type: "select", options: documentStatuses },
      { key: "notes", label: "ملاحظات", type: "textarea", wide: true },
    ],
  },
  invoices: {
    resource: "invoices",
    title: "الفواتير والمدفوعات",
    subtitle: "فواتير أتعاب التخليص والمصروفات الجمركية وحالة تحصيلها",
    singular: "فاتورة",
    addLabel: "فاتورة جديدة",
    icon: ReceiptText,
    searchKeys: ["invoiceNo", "description"],
    relationSearch: [{ key: "clientId", relation: "clients", label: "name" }],
    searchPlaceholder: "بحث برقم الفاتورة أو البيان...",
    defaults: { currency: "EGP", status: "pending", amount: 0, tax: 0 },
    filters: [{ key: "status", label: "حالة الفاتورة", options: invoiceStatuses }],
    columns: [
      { key: "invoiceNo", label: "رقم الفاتورة", kind: "mono" },
      { key: "clientId", label: "العميل", kind: "relation", relation: "clients", relationLabel: "name", wide: true },
      { key: "description", label: "البيان" },
      { key: "amount", label: "المبلغ", kind: "money", currencyKey: "currency" },
      { key: "tax", label: "الضريبة", kind: "money", currencyKey: "currency" },
      { key: "issueDate", label: "تاريخ الإصدار", kind: "date" },
      { key: "status", label: "الحالة", kind: "badge", options: invoiceStatuses },
    ],
    fields: [
      { key: "invoiceNo", label: "رقم الفاتورة", hint: "يتم إنشاؤه تلقائياً عند تركه فارغاً" },
      { key: "clientId", label: "العميل", type: "select", relation: "clients", relationLabel: "name", required: true },
      { key: "shipmentId", label: "الشحنة المرتبطة", type: "select", relation: "shipments", relationLabel: "refNo" },
      { key: "description", label: "بيان الخدمة", wide: true },
      { key: "amount", label: "المبلغ", type: "number", required: true },
      { key: "tax", label: "الضريبة", type: "number" },
      { key: "currency", label: "العملة", type: "select", options: currencies },
      { key: "status", label: "الحالة", type: "select", options: invoiceStatuses },
      { key: "issueDate", label: "تاريخ الإصدار", type: "date" },
      { key: "dueDate", label: "تاريخ الاستحقاق", type: "date" },
    ],
  },
  users: {
    resource: "users",
    title: "المستخدمون والصلاحيات",
    subtitle: "حسابات فريق العمل ومستويات الوصول إلى النظام",
    singular: "مستخدم",
    addLabel: "مستخدم جديد",
    icon: UsersRound,
    searchKeys: ["name", "email", "phone"],
    searchPlaceholder: "بحث بالاسم أو البريد الإلكتروني...",
    defaults: { role: "operator", active: true },
    filters: [{ key: "role", label: "الدور", options: roles }],
    columns: [
      { key: "name", label: "الاسم" },
      { key: "email", label: "البريد الإلكتروني", kind: "mono" },
      { key: "role", label: "الدور", kind: "badge", options: roles },
      { key: "phone", label: "الهاتف", kind: "mono" },
      { key: "active", label: "الحالة", kind: "bool" },
      { key: "createdAt", label: "تاريخ الإنشاء", kind: "date" },
    ],
    fields: [
      { key: "name", label: "الاسم الكامل", required: true },
      { key: "email", label: "البريد الإلكتروني", type: "email", required: true },
      { key: "role", label: "الدور / الصلاحية", type: "select", options: roles },
      { key: "phone", label: "رقم الهاتف", type: "tel" },
      { key: "active", label: "حالة الحساب", type: "select", options: [{ value: "true", label: "نشط" }, { value: "false", label: "معطل" }] },
      { key: "password", label: "كلمة المرور", type: "password", hint: "اتركها فارغة عند التعديل للاحتفاظ بكلمة المرور الحالية" },
    ],
  },
  nafezaEvents: {
    resource: "nafezaEvents",
    title: "أحداث منصة نافذة",
    subtitle: "سجل التكامل مع النافذة الموحدة لتجارة القاهرة والإسكندرية",
    singular: "حدث",
    addLabel: "تسجيل حدث",
    icon: Wallet,
    searchKeys: ["reference", "message", "carrier", "eventType"],
    searchPlaceholder: "بحث برقم المرجع أو الناقل...",
    defaults: { channel: "نافذة", status: "pending" },
    filters: [
      { key: "status", label: "الحالة", options: eventStatuses },
      { key: "eventType", label: "نوع الحدث", options: eventTypes },
    ],
    columns: [
      { key: "reference", label: "المرجع", kind: "mono" },
      { key: "eventType", label: "نوع الحدث", kind: "badge", options: eventTypes },
      { key: "channel", label: "القناة" },
      { key: "carrier", label: "الناقل", kind: "mono" },
      { key: "status", label: "الحالة", kind: "badge", options: eventStatuses },
      { key: "createdAt", label: "التاريخ", kind: "date" },
    ],
    fields: [
      { key: "eventType", label: "نوع الحدث", type: "select", options: eventTypes, required: true },
      { key: "reference", label: "رقم المرجع / ACID" },
      { key: "shipmentId", label: "الشحنة المرتبطة", type: "select", relation: "shipments", relationLabel: "refNo" },
      { key: "channel", label: "قناة الربط" },
      { key: "carrier", label: "كود الناقل" },
      { key: "status", label: "الحالة", type: "select", options: eventStatuses },
      { key: "message", label: "تفاصيل الحدث", type: "textarea", wide: true },
    ],
  },
};
