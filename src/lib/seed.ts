import { db } from "@/db";
import {
  carriers,
  clients,
  documents,
  invoices,
  integrationLogs,
  shipmentEvents,
  shipments,
  tariffCodes,
  users,
  appSettings,
  banks,
} from "@/db/schema";
import { hashPassword } from "@/lib/password";
import { and, eq, sql } from "drizzle-orm";
import { ensureSchema } from "@/lib/db-bootstrap";
import { seedCustomsReference } from "@/lib/seed-customs";
import type { DocType, Direction, InvoiceStatus, Mode, Priority, ShipmentStatus } from "@/lib/constants";
import { BANK_DIRECTORY } from "@/lib/bank-directory";

const DAY = 86_400_000;
const ago = (days: number, hours = 9) => new Date(Date.now() - days * DAY + hours * 3_600_000);
const ahead = (days: number, hours = 10) => new Date(Date.now() + days * DAY + hours * 3_600_000);

type SeedShipment = {
  reference: string;
  clientIdx: number;
  carrierIdx: number;
  mode: Mode;
  direction: Direction;
  status: ShipmentStatus;
  priority: Priority;
  port: string;
  origin: string;
  destination: string;
  bl: string;
  vessel: string;
  containers: number;
  packages: number;
  weight: number;
  goods: string;
  hs: string;
  value: number;
  currency: string;
  duty: number;
  vat: number;
  fees: number;
  createdDays: number;
  etaDays: number;
  arrivedDays: number | null;
  releasedDays: number | null;
  notes: string;
  docs?: { name: string; type: DocType; status: string }[];
  invoice?: { status: InvoiceStatus; paidRatio: number; dueDays: number };
};

const SEED_SHIPMENTS: SeedShipment[] = [
  {
    reference: "CLR-2026-1001",
    clientIdx: 0,
    carrierIdx: 5,
    mode: "sea",
    direction: "import",
    status: "customs_clearance",
    priority: "high",
    port: "ميناء الإسكندرية",
    origin: "نابولي، إيطاليا",
    destination: "القاهرة",
    bl: "MAEU-8841203",
    vessel: "MAERSK SEALAND V.442",
    containers: 3,
    packages: 1450,
    weight: 62400,
    goods: "زيت زيتون بكر ممتاز - عبوات معدنية",
    hs: "1509.10",
    value: 128000,
    currency: "USD",
    duty: 384000,
    vat: 512000,
    fees: 18500,
    createdDays: 22,
    etaDays: -2,
    arrivedDays: 3,
    releasedDays: null,
    notes: "مطلوب شهادة مطابقة من هيئة الرقابة على الصادرات والواردات قبل الإفراج.",
    docs: [
      { name: "فاتورة تجارية - Lotto 44.pdf", type: "commercial_invoice", status: "approved" },
      { name: "قائمة تعبئة النهائية.pdf", type: "packing_list", status: "approved" },
      { name: "بوليصة شحن MAEU-8841203.pdf", type: "bill_of_lading", status: "approved" },
      { name: "شهادة منشأ إيطاليا.pdf", type: "certificate_of_origin", status: "approved" },
      { name: "شهادة مطابقة - قيد الانتظار.pdf", type: "permit", status: "pending" },
    ],
    invoice: { status: "partially_paid", paidRatio: 0.5, dueDays: 12 },
  },
  {
    reference: "CLR-2026-1002",
    clientIdx: 3,
    carrierIdx: 0,
    mode: "air",
    direction: "import",
    status: "released",
    priority: "urgent",
    port: "مطار القاهرة الدولي",
    origin: "فرانكفورت، ألمانيا",
    destination: "القاهرة",
    bl: "MS-AWB-7742510",
    vessel: "MS 787 - رحلة MS786",
    containers: 0,
    packages: 18,
    weight: 940,
    goods: "أجهزة أشعة تشخيصية وقطع غيار طبية",
    hs: "9022.14",
    value: 215000,
    currency: "EUR",
    duty: 129000,
    vat: 258000,
    fees: 12400,
    createdDays: 16,
    etaDays: -6,
    arrivedDays: 6,
    releasedDays: 2,
    notes: "تم الإفراج بعد موافقة وزارة الصحة. الشحنة مسلّمة للعميل بمخزنه بالعبور.",
    invoice: { status: "paid", paidRatio: 1, dueDays: -3 },
  },
  {
    reference: "CLR-2026-1003",
    clientIdx: 6,
    carrierIdx: 1,
    mode: "air",
    direction: "import",
    status: "documents_pending",
    priority: "high",
    port: "مطار القاهرة الدولي",
    origin: "شنتشن، الصين",
    destination: "القاهرة",
    bl: "EK-AWB-3329901",
    vessel: "EK 9842 - رحلة EK923",
    containers: 0,
    packages: 240,
    weight: 3980,
    goods: "شاشات LED ولوحات إلكترونية",
    hs: "8528.72",
    value: 96000,
    currency: "USD",
    duty: 172800,
    vat: 230400,
    fees: 15600,
    createdDays: 5,
    etaDays: 4,
    arrivedDays: null,
    releasedDays: null,
    notes: "بانتظار شهادة المنشأ الأصلية وبوليصة الشحن النهائية من المورد.",
    docs: [
      { name: "فاتورة تجارية - Shenzhen Ltd.pdf", type: "commercial_invoice", status: "approved" },
      { name: "قائمة تعبئة.pdf", type: "packing_list", status: "approved" },
      { name: "بوليصة جوية مبدئية.pdf", type: "awb", status: "pending" },
      { name: "شهادة منشأ - نسخة.pdf", type: "certificate_of_origin", status: "rejected" },
    ],
    invoice: { status: "sent", paidRatio: 0, dueDays: 20 },
  },
  {
    reference: "CLR-2026-1004",
    clientIdx: 2,
    carrierIdx: 6,
    mode: "sea",
    direction: "export",
    status: "under_review",
    priority: "normal",
    port: "ميناء دمياط",
    origin: "دمياط، مصر",
    destination: "ميناء جنوى، إيطاليا",
    bl: "MSCU-EX-552110",
    vessel: "MSC RANIA V.118",
    containers: 2,
    packages: 860,
    weight: 41000,
    goods: "أقمشة قطنية مصري 100% - صادر",
    hs: "5208.11",
    value: 74000,
    currency: "EUR",
    duty: 0,
    vat: 0,
    fees: 9800,
    createdDays: 9,
    etaDays: 6,
    arrivedDays: 2,
    releasedDays: null,
    notes: "صادر بغرض التصنيع المؤقت. مطلوب تأكيد رقم EUR.1 من مصلحة الجمارك.",
    invoice: { status: "sent", paidRatio: 0.3, dueDays: 15 },
  },
  {
    reference: "CLR-2026-1005",
    clientIdx: 4,
    carrierIdx: 7,
    mode: "sea",
    direction: "import",
    status: "on_hold",
    priority: "urgent",
    port: "ميناء السخنة",
    origin: "شنغهاي، الصين",
    destination: "العاشر من رمضان",
    bl: "CMDU-7733910",
    vessel: "CMA CGM OCEAN V.206",
    containers: 4,
    packages: 2100,
    weight: 86000,
    goods: "مواد كيماوية صناعية - بوليمرات",
    hs: "3901.20",
    value: 168000,
    currency: "USD",
    duty: 512000,
    vat: 640000,
    fees: 21400,
    createdDays: 27,
    etaDays: -9,
    arrivedDays: 9,
    releasedDays: null,
    notes: "معلّق بسبب مطابقة بيانات الرقم الجمركي وطلب فحص من جهاز شؤون البيئة.",
    docs: [
      { name: "فاتورة تجارية.pdf", type: "commercial_invoice", status: "approved" },
      { name: "شهادة تحليل - SDS.pdf", type: "permit", status: "pending" },
      { name: "بوليصة الشحن.pdf", type: "bill_of_lading", status: "approved" },
    ],
    invoice: { status: "overdue", paidRatio: 0, dueDays: -4 },
  },
  {
    reference: "CLR-2026-1006",
    clientIdx: 1,
    carrierIdx: 8,
    mode: "sea",
    direction: "import",
    status: "delivered",
    priority: "normal",
    port: "ميناء الدخيلة",
    origin: "جبل علي، الإمارات",
    destination: "الإسكندرية",
    bl: "HLCU-9915520",
    vessel: "HAPAG BERLIN V.331",
    containers: 1,
    packages: 320,
    weight: 18600,
    goods: "أدوات منزلية من الستانلس ستيل",
    hs: "7323.93",
    value: 42000,
    currency: "AED",
    duty: 96000,
    vat: 118000,
    fees: 7600,
    createdDays: 34,
    etaDays: -24,
    arrivedDays: 22,
    releasedDays: 14,
    notes: "تم التسليم لمخازن العميل بعد سداد كامل الرسوم.",
    invoice: { status: "paid", paidRatio: 1, dueDays: -8 },
  },
  {
    reference: "CLR-2026-1007",
    clientIdx: 5,
    carrierIdx: 3,
    mode: "air",
    direction: "import",
    status: "customs_clearance",
    priority: "high",
    port: "مطار القاهرة الدولي",
    origin: "إسطنبول، تركيا",
    destination: "مدينة السادس من أكتوبر",
    bl: "TK-AWB-5590122",
    vessel: "TK 6501 - رحلة TK692",
    containers: 0,
    packages: 64,
    weight: 2200,
    goods: "قطع غيار سيارات وملحقات كهربائية",
    hs: "8708.99",
    value: 88000,
    currency: "USD",
    duty: 158400,
    vat: 211200,
    fees: 13200,
    createdDays: 11,
    etaDays: -1,
    arrivedDays: 1,
    releasedDays: null,
    notes: "قيد تقدير القيمة الجمركية - بانتظار رد لجنة التقييم.",
    invoice: { status: "partially_paid", paidRatio: 0.4, dueDays: 9 },
  },
  {
    reference: "CLR-2026-1008",
    clientIdx: 7,
    carrierIdx: 2,
    mode: "air",
    direction: "import",
    status: "under_review",
    priority: "low",
    port: "مطار برج العرب",
    origin: "الدوحة، قطر",
    destination: "الإسكندرية",
    bl: "QR-AWB-2201845",
    vessel: "QR 8712 - رحلة QR1301",
    containers: 0,
    packages: 12,
    weight: 610,
    goods: "أثاث مكتبي فاخر",
    hs: "9403.30",
    value: 31000,
    currency: "USD",
    duty: 55800,
    vat: 74400,
    fees: 5400,
    createdDays: 4,
    etaDays: 3,
    arrivedDays: 0,
    releasedDays: null,
    notes: "تم فتح ملف التخليص وجاري مراجعة الفاتورة التجارية.",
    invoice: { status: "draft", paidRatio: 0, dueDays: 25 },
  },
  {
    reference: "CLR-2026-1009",
    clientIdx: 0,
    carrierIdx: 9,
    mode: "sea",
    direction: "import",
    status: "documents_pending",
    priority: "normal",
    port: "ميناء بورسعيد",
    origin: "كاوهسيونغ، تايوان",
    destination: "طنطا",
    bl: "EGLV-1145009",
    vessel: "EVER GLORY V.088",
    containers: 2,
    packages: 940,
    weight: 36500,
    goods: "ماكينات تعبئة وتغليف غذائي",
    hs: "8422.30",
    value: 132000,
    currency: "USD",
    duty: 264000,
    vat: 352000,
    fees: 16800,
    createdDays: 6,
    etaDays: 8,
    arrivedDays: null,
    releasedDays: null,
    notes: "بانتظار قائمة تعبئة مفصلة بالماكينات وقطع الغيار.",
    docs: [
      { name: "فاتورة تجارية.pdf", type: "commercial_invoice", status: "approved" },
      { name: "بوليصة الشحن المبدئية.pdf", type: "bill_of_lading", status: "pending" },
    ],
    invoice: { status: "draft", paidRatio: 0, dueDays: 30 },
  },
  {
    reference: "CLR-2026-1010",
    clientIdx: 3,
    carrierIdx: 4,
    mode: "air",
    direction: "transit",
    status: "released",
    priority: "normal",
    port: "مطار القاهرة الدولي",
    origin: "ميونخ، ألمانيا",
    destination: "الرياض، السعودية",
    bl: "LH-AWB-8890012",
    vessel: "LH 4420 - رحلة LH586",
    containers: 0,
    packages: 8,
    weight: 320,
    goods: "قطع غيار أجهزة معملية - عبور",
    hs: "9027.90",
    value: 27500,
    currency: "EUR",
    duty: 0,
    vat: 0,
    fees: 4200,
    createdDays: 13,
    etaDays: -4,
    arrivedDays: 4,
    releasedDays: 1,
    notes: "شحنة عبور - تم نقلها إلى الرحلة المتصلة تحت إشراف الجمارك.",
    invoice: { status: "paid", paidRatio: 1, dueDays: -1 },
  },
  {
    reference: "CLR-2026-1011",
    clientIdx: 6,
    carrierIdx: 5,
    mode: "sea",
    direction: "import",
    status: "delivered",
    priority: "normal",
    port: "ميناء الإسكندرية",
    origin: "فالنسيا، إسبانيا",
    destination: "القاهرة",
    bl: "MAEU-8810221",
    vessel: "MAERSK IBN SINA V.311",
    containers: 1,
    packages: 180,
    weight: 9800,
    goods: "معدات شبكات وموزعات إنترنت",
    hs: "8517.62",
    value: 64000,
    currency: "EUR",
    duty: 115200,
    vat: 153600,
    fees: 8900,
    createdDays: 41,
    etaDays: -31,
    arrivedDays: 29,
    releasedDays: 18,
    notes: "ملف مكتمل ومحصل بالكامل.",
    invoice: { status: "paid", paidRatio: 1, dueDays: -20 },
  },
  {
    reference: "CLR-2026-1012",
    clientIdx: 2,
    carrierIdx: 7,
    mode: "sea",
    direction: "export",
    status: "draft",
    priority: "low",
    port: "ميناء الإسكندرية",
    origin: "المحلة الكبرى، مصر",
    destination: "مرسيليا، فرنسا",
    bl: "CMDU-EX-118820",
    vessel: "CMA CGM TAGE V.155",
    containers: 1,
    packages: 410,
    weight: 15200,
    goods: "ملابس قطنية جاهزة - صادر",
    hs: "6109.10",
    value: 38000,
    currency: "EUR",
    duty: 0,
    vat: 0,
    fees: 5200,
    createdDays: 1,
    etaDays: 14,
    arrivedDays: null,
    releasedDays: null,
    notes: "ملف جديد - جاري تجهيز مستندات التصدير.",
  },
  {
    reference: "CLR-2026-1013",
    clientIdx: 4,
    carrierIdx: 10,
    mode: "land",
    direction: "import",
    status: "customs_clearance",
    priority: "high",
    port: "معبر السلوم",
    origin: "مصراتة، ليبيا",
    destination: "الإسكندرية",
    bl: "NAFEZA-TR-445120",
    vessel: "شاحنة نقل بري - لوحة 8842",
    containers: 0,
    packages: 90,
    weight: 12400,
    goods: "مواد بناء ودهانات صناعية",
    hs: "3208.90",
    value: 22000,
    currency: "USD",
    duty: 44000,
    vat: 59000,
    fees: 4300,
    createdDays: 8,
    etaDays: 1,
    arrivedDays: 0,
    releasedDays: null,
    notes: "تم تسجيل إقرار ACID في نافذة، بانتظار توقيع لجنة الفحص بالمعبر.",
    invoice: { status: "sent", paidRatio: 0.2, dueDays: 11 },
  },
  {
    reference: "CLR-2026-1014",
    clientIdx: 1,
    carrierIdx: 0,
    mode: "air",
    direction: "import",
    status: "on_hold",
    priority: "high",
    port: "مطار القاهرة الدولي",
    origin: "دبي، الإمارات",
    destination: "الجيزة",
    bl: "MS-AWB-7710099",
    vessel: "MS 7860 - رحلة MS913",
    containers: 0,
    packages: 46,
    weight: 1280,
    goods: "مستحضرات تجميل ومكملات غذائية",
    hs: "3304.99",
    value: 57000,
    currency: "AED",
    duty: 91200,
    vat: 114000,
    fees: 6400,
    createdDays: 18,
    etaDays: -5,
    arrivedDays: 5,
    releasedDays: null,
    notes: "معلّق لحين اعتماد تسجيل هيئة الدواء المصرية.",
    docs: [
      { name: "فاتورة تجارية.pdf", type: "commercial_invoice", status: "approved" },
      { name: "شهادة تسجيل هيئة الدواء.pdf", type: "permit", status: "rejected" },
      { name: "بوليصة جوية.pdf", type: "awb", status: "approved" },
    ],
    invoice: { status: "overdue", paidRatio: 0, dueDays: -7 },
  },
  {
    reference: "CLR-2026-1015",
    clientIdx: 7,
    carrierIdx: 6,
    mode: "sea",
    direction: "import",
    status: "released",
    priority: "normal",
    port: "ميناء الإسكندرية",
    origin: "بورصة، تركيا",
    destination: "الإسكندرية",
    bl: "MSCU-7720418",
    vessel: "MSC LORETO V.224",
    containers: 1,
    packages: 210,
    weight: 11300,
    goods: "أثاث منزلي وقطع خشبية",
    hs: "9403.60",
    value: 26000,
    currency: "EUR",
    duty: 46800,
    vat: 62400,
    fees: 4900,
    createdDays: 19,
    etaDays: -10,
    arrivedDays: 8,
    releasedDays: 2,
    notes: "تم الإفراج وجاري ترتيب نقل الشحنة لمخزن العميل.",
    invoice: { status: "partially_paid", paidRatio: 0.65, dueDays: 4 },
  },
  {
    reference: "CLR-2026-1016",
    clientIdx: 0,
    carrierIdx: 8,
    mode: "sea",
    direction: "import",
    status: "under_review",
    priority: "normal",
    port: "ميناء دمياط",
    origin: "مومباسا، كينيا",
    destination: "المنصورة",
    bl: "HLCU-9901128",
    vessel: "HAPAG ROMA V.190",
    containers: 2,
    packages: 1120,
    weight: 43800,
    goods: "حبوب وتوابل معبأة",
    hs: "0908.31",
    value: 72000,
    currency: "USD",
    duty: 144000,
    vat: 187000,
    fees: 11200,
    createdDays: 7,
    etaDays: 5,
    arrivedDays: 1,
    releasedDays: null,
    notes: "بانتظار نتيجة تحليل الحجر الزراعي.",
    invoice: { status: "draft", paidRatio: 0, dueDays: 29 },
  },
];

const CLIENTS = [
  { name: "الشركة المصرية للصناعات الغذائية", contactName: "محمود عبد الحميد", email: "logistics@egy-food.com", phone: "0100 224 8811", taxId: "512-884-331", city: "الإسكندرية", industry: "صناعات غذائية", creditLimit: 1200000, address: "المنطقة الصناعية - برج العرب الجديدة" },
  { name: "النور للأدوات المنزلية", contactName: "هالة كمال", email: "hala@alnoor-home.com", phone: "0111 335 7220", taxId: "441-221-880", city: "الإسكندرية", industry: "أدوات منزلية", creditLimit: 650000, address: "شارع فؤاد - محرم بك" },
  { name: "دلتا تكس للمنسوجات", contactName: "سامي الجندي", email: "sami@deltatex.com", phone: "0122 778 4109", taxId: "773-119-442", city: "المحلة الكبرى", industry: "منسوجات", creditLimit: 900000, address: "طريق المحلة - طنطا" },
  { name: "القاهرة للمعدات الطبية", contactName: "د. نهى شريف", email: "procurement@cairo-med.com", phone: "0106 550 9821", taxId: "229-664-778", city: "القاهرة", industry: "معدات طبية", creditLimit: 1500000, address: "التجمع الخامس - القاهرة الجديدة" },
  { name: "العربية للكيماويات", contactName: "أيمن عبد الرحمن", email: "imports@arabchem-eg.com", phone: "0128 991 5530", taxId: "884-330-112", country: "مصر", city: "العاشر من رمضان", industry: "كيماويات", creditLimit: 2000000, address: "المنطقة الصناعية B1" },
  { name: "سمارت موتورز للتجارة", contactName: "طارق منير", email: "tarek@smart-motors.com", phone: "0109 224 6677", taxId: "331-887-220", city: "مدينة السادس من أكتوبر", industry: "سيارات وقطع غيار", creditLimit: 1100000, address: "المنطقة الصناعية الرابعة" },
  { name: "النيل للإلكترونيات", contactName: "منة الله حسن", email: "menna@nile-elec.com", phone: "0155 330 1177", taxId: "667-441-909", city: "القاهرة", industry: "إلكترونيات", creditLimit: 800000, address: "شبرا الخيمة - القاهرة" },
  { name: "الأهرام للأثاث", contactName: "عمرو لطفي", email: "amr@ahram-furniture.com", phone: "0120 664 2201", taxId: "119-774-662", city: "دمياط", industry: "أثاث", creditLimit: 500000, address: "منطقة شط الملح - دمياط" },
];

const CARRIERS = [
  { name: "مصر للطيران - الشحن الجوي", nameEn: "EgyptAir Cargo", code: "MS", type: "airline", country: "مصر", scac: "MSAW", apiEndpoint: "https://api.egyptair-cargo.com/v2", integrationStatus: "connected", color: "#c8102e", shipmentsSynced: 184, notes: "ربط مباشر مع نظام الشحن الجوي لإصدار بوالص AWB ومتابعة الرحلات." },
  { name: "طيران الإمارات - الشحن", nameEn: "Emirates SkyCargo", code: "EK", type: "airline", country: "الإمارات", scac: "EKAU", apiEndpoint: "https://api.skycargo.emirates.com/v1", integrationStatus: "connected", color: "#d71920", shipmentsSynced: 96, notes: "بيانات الرحلات ومساحات الحجز تُحدَّث تلقائياً كل ساعة." },
  { name: "الخطوط القطرية للشحن", nameEn: "Qatar Airways Cargo", code: "QR", type: "airline", country: "قطر", scac: "QACU", apiEndpoint: "https://api.qrcargo.com/v3", integrationStatus: "connected", color: "#5c0632", shipmentsSynced: 71, notes: "ربط AWB إلكتروني عبر IATA ONE Record." },
  { name: "الخطوط التركية للشحن", nameEn: "Turkish Cargo", code: "TK", type: "airline", country: "تركيا", scac: "TKCU", apiEndpoint: "https://api.turkishcargo.com/v2", integrationStatus: "connected", color: "#c70a0c", shipmentsSynced: 58, notes: "متابعة حالة الشحنة لحظياً عبر رقم AWB." },
  { name: "لوفتهانزا للشحن", nameEn: "Lufthansa Cargo", code: "LH", type: "airline", country: "ألمانيا", scac: "LHAC", apiEndpoint: "https://api.lufthansa-cargo.com/v1", integrationStatus: "pending", color: "#05164d", shipmentsSynced: 33, notes: "تم إرسال طلب اعتماد مفاتيح API - بانتظار التفعيل." },
  { name: "ميرسك", nameEn: "Maersk Line", code: "MAEU", type: "shipping_line", country: "الدنمارك", scac: "MAEU", apiEndpoint: "https://api.maersk.com/v2", integrationStatus: "connected", color: "#42b0d5", shipmentsSynced: 228, notes: "بوليصة إلكترونية + تتبع الحاويات عبر DCSA." },
  { name: "إم إس سي", nameEn: "MSC", code: "MSCU", type: "shipping_line", country: "سويسرا", scac: "MSCU", apiEndpoint: "https://api.msc.com/v1", integrationStatus: "connected", color: "#e2b007", shipmentsSynced: 201, notes: "ربط مباشر لبيانات البوالص وتواريخ الوصول." },
  { name: "سي إم إيه - سي جي إم", nameEn: "CMA CGM", code: "CMDU", type: "shipping_line", country: "فرنسا", scac: "CMDU", apiEndpoint: "https://api.cma-cgm.com/v3", integrationStatus: "connected", color: "#0e4b8a", shipmentsSynced: 176, notes: "تكامل كامل مع بوابة العملاء وتحديث الأرصفة." },
  { name: "هاباج لويد", nameEn: "Hapag-Lloyd", code: "HLCU", type: "shipping_line", country: "ألمانيا", scac: "HLCU", apiEndpoint: "https://api.hapag-lloyd.com/v2", integrationStatus: "connected", color: "#f58220", shipmentsSynced: 132, notes: "تتبع الحاويات عبر DCSA Track & Trace 2.2." },
  { name: "إيفرجرين", nameEn: "Evergreen Line", code: "EGLV", type: "shipping_line", country: "تايوان", scac: "EGLV", apiEndpoint: "https://api.evergreen-line.com/v1", integrationStatus: "disconnected", color: "#0f8a3c", shipmentsSynced: 45, notes: "انتهت صلاحية المفتاح - يلزم إعادة الربط مع الإدارة الفنية." },
  { name: "منصة نافذة", nameEn: "Nafeza - Single Window", code: "NAFEZA", type: "platform", country: "مصر", scac: null, apiEndpoint: "https://api.nafeza.gov.eg/v2", integrationStatus: "connected", color: "#0a2239", shipmentsSynced: 612, notes: "الشباك الواحد للتجارة الدولية: إقرارات ACID، التصاريح، ومنظومة ACI." },
];

function eventsFor(s: SeedShipment, carrierName: string) {
  const entries: { title: string; description: string; type: string; location: string | null; occurredAt: Date }[] = [
    {
      title: "فتح ملف التخليص الجمركي",
      description: `تم إنشاء الملف ${s.reference} وتسجيل بيانات ${s.goods}.`,
      type: "status",
      location: "مكتب العربي - الإسكندرية",
      occurredAt: ago(s.createdDays, 0),
    },
    {
      title: `استلام مستندات الشحن من ${carrierName}`,
      description: `تم الربط إلكترونياً واستلام بوليصة الشحن رقم ${s.bl}.`,
      type: "integration",
      location: null,
      occurredAt: ago(Math.max(s.createdDays - 1, 0), 2),
    },
  ];

  if (s.status !== "draft") {
    entries.push({
      title: "تسجيل إقرار ACID في منصة نافذة",
      description: `تم إرسال الإقرار الجمركي المبدئي وربطه ببوليصة الشحن ${s.bl}.`,
      type: "customs",
      location: "منصة نافذة",
      occurredAt: ago(Math.max(s.createdDays - 2, 0), 4),
    });
  }

  if (s.arrivedDays !== null) {
    entries.push({
      title: `وصول الشحنة إلى ${s.port}`,
      description: `تم تأكيد الوصول وتفريغ ${s.packages} طرد بوزن ${s.weight} كجم.`,
      type: "status",
      location: s.port,
      occurredAt: ago(s.arrivedDays, 1),
    });
  }

  if (s.status === "on_hold") {
    entries.push({
      title: "تعليق الملف - مستندات ناقصة",
      description: s.notes,
      type: "note",
      location: s.port,
      occurredAt: ago(Math.max((s.arrivedDays ?? s.createdDays) - 1, 0), 3),
    });
  }

  if (s.releasedDays !== null) {
    entries.push({
      title: "الإفراج الجمركي عن الشحنة",
      description: `تم سداد الرسوم الجمركية (${s.duty.toLocaleString("en-US")} ج.م) والإفراج النهائي.`,
      type: "customs",
      location: s.port,
      occurredAt: ago(s.releasedDays, 2),
    });
  }

  if (s.status === "delivered") {
    entries.push({
      title: "تسليم الشحنة للعميل",
      description: "تم النقل والتسليم في مخزن العميل مع توقيع محضر الاستلام.",
      type: "status",
      location: s.destination,
      occurredAt: ago(Math.max((s.releasedDays ?? 1) - 1, 0), 5),
    });
  }

  if (s.invoice) {
    entries.push({
      title: "إصدار فاتورة الرسوم والأتعاب",
      description: "تم إصدار الفاتورة وإرسالها للعميل بالبريد الإلكتروني.",
      type: "payment",
      location: null,
      occurredAt: ago(Math.max(s.createdDays - 3, 0), 6),
    });
  }

  return entries.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
}

function defaultDocs(s: SeedShipment) {
  if (s.docs) return s.docs;
  const blType: DocType = s.mode === "air" ? "awb" : s.mode === "sea" ? "bill_of_lading" : "other";
  const docs: { name: string; type: DocType; status: string }[] = [
    { name: `فاتورة تجارية - ${s.reference}.pdf`, type: "commercial_invoice", status: "approved" },
    { name: "قائمة تعبئة مفصلة.pdf", type: "packing_list", status: s.status === "documents_pending" ? "pending" : "approved" },
    { name: `${s.bl}.pdf`, type: blType, status: "approved" },
  ];
  if (["under_review", "customs_clearance", "released", "delivered", "on_hold"].includes(s.status)) {
    docs.push({ name: "شهادة المنشأ.pdf", type: "certificate_of_origin", status: "approved" });
  }
  if (["released", "delivered"].includes(s.status)) {
    docs.push({ name: "شهادة التأمين على الشحنة.pdf", type: "insurance", status: "approved" });
  }
  return docs;
}

export async function seedDemoData() {
  await db.execute(sql`truncate table ${integrationLogs}, ${documents}, ${invoices}, ${shipmentEvents}, ${shipments}, ${carriers}, ${clients}, ${users} restart identity cascade`);

  await db.insert(users).values([
    {
      name: "أحمد العربي",
      email: "admin@alarabi.com",
      passwordHash: hashPassword("123456"),
      role: "admin",
      jobTitle: "المدير العام - مؤسس الشركة",
      phone: "0100 111 2233",
      avatarColor: "#0f9d8b",
    },
    {
      name: "منى صبري",
      email: "mona@alarabi.com",
      passwordHash: hashPassword("123456"),
      role: "manager",
      jobTitle: "مديرة التخليص الجمركي",
      phone: "0122 445 8899",
      avatarColor: "#6366f1",
    },
    {
      name: "كريم فؤاد",
      email: "karim@alarabi.com",
      passwordHash: hashPassword("123456"),
      role: "agent",
      jobTitle: "مخلص جمركي أول",
      phone: "0111 908 6644",
      avatarColor: "#c9a227",
    },
  ]);

  const clientRows = await db.insert(clients).values(CLIENTS).returning({ id: clients.id, name: clients.name });
  const carrierRows = await db.insert(carriers).values(CARRIERS).returning({ id: carriers.id, name: carriers.name });

  for (const s of SEED_SHIPMENTS) {
    const client = clientRows[s.clientIdx];
    const carrier = carrierRows[s.carrierIdx];
    const created = ago(s.createdDays, 0);

    const [shipment] = await db
      .insert(shipments)
      .values({
        reference: s.reference,
        clientId: client.id,
        carrierId: carrier.id,
        mode: s.mode,
        direction: s.direction,
        status: s.status,
        priority: s.priority,
        port: s.port,
        origin: s.origin,
        destination: s.destination,
        blNumber: s.bl,
        vesselFlight: s.vessel,
        containerCount: s.containers,
        packageCount: s.packages,
        grossWeight: s.weight,
        goodsDescription: s.goods,
        hsCode: s.hs,
        invoiceValue: s.value,
        currency: s.currency,
        dutyAmount: s.duty,
        vatAmount: s.vat,
        serviceFees: s.fees,
        eta: ahead(s.etaDays, 3),
        arrivedAt: s.arrivedDays === null ? null : ago(s.arrivedDays, 4),
        releasedAt: s.releasedDays === null ? null : ago(s.releasedDays, 6),
        brokerName: s.clientIdx % 2 === 0 ? "كريم فؤاد" : "منى صبري",
        notes: s.notes,
        createdAt: created,
        updatedAt: ago(Math.min(s.createdDays, 1), 3),
      })
      .returning({ id: shipments.id });

    await db.insert(shipmentEvents).values(
      eventsFor(s, carrier.name).map((event) => ({
        shipmentId: shipment.id,
        title: event.title,
        description: event.description,
        type: event.type,
        location: event.location,
        occurredAt: event.occurredAt,
      })),
    );

    const docs = defaultDocs(s);
    await db.insert(documents).values(
      docs.map((doc, index) => ({
        shipmentId: shipment.id,
        name: doc.name,
        type: doc.type,
        status: doc.status,
        sizeKb: 180 + index * 137 + (s.clientIdx % 5) * 41,
        uploadedBy: index % 2 === 0 ? "منى صبري" : "كريم فؤاد",
        createdAt: ago(Math.max(s.createdDays - index, 0), 2),
      })),
    );

    if (s.invoice) {
      const subtotal = s.fees + s.duty + s.vat;
      const taxAmount = Math.round(s.fees * 0.14);
      const total = subtotal + taxAmount;
      await db.insert(invoices).values({
        number: `INV-2026-${s.reference.slice(-4)}`,
        shipmentId: shipment.id,
        clientId: client.id,
        issueDate: ago(Math.max(s.createdDays - 2, 0), 1),
        dueDate: ahead(s.invoice.dueDays, 0),
        subtotal,
        taxAmount,
        total,
        paidAmount: Math.round(total * s.invoice.paidRatio),
        status: s.invoice.status,
        notes: "تشمل الرسوم الجمركية وضريبة القيمة المضافة وأتعاب التخليص.",
        createdAt: ago(Math.max(s.createdDays - 2, 0), 1),
      });
    }
  }

  const logTemplates: { carrierIdx: number | null; kind: string; status: string; message: string; reference: string; hoursAgo: number }[] = [
    { carrierIdx: 5, kind: "carrier_sync", status: "success", message: "تم مزامنة 12 بوليصة شحن جديدة من ميرسك وتحديث حالة 4 حاويات.", reference: "SYNC-MAEU-88214", hoursAgo: 1 },
    { carrierIdx: 0, kind: "carrier_sync", status: "success", message: "تم استلام 9 بوالص AWB من مصر للطيران وربطها بملفات التخليص.", reference: "SYNC-MSAW-19120", hoursAgo: 2 },
    { carrierIdx: 10, kind: "nafeza_declaration", status: "success", message: "تم قبول إقرار ACID رقم 2026-EG-4471 وتوليد رقم الشحنة الجمركية.", reference: "ACID-2026-EG-4471", hoursAgo: 3 },
    { carrierIdx: 1, kind: "tracking", status: "success", message: "تحديث تتبع الشحنة EK-AWB-3329901: غادرت دبي، الوصول المتوقع بعد 4 أيام.", reference: "TRK-EK-3329901", hoursAgo: 4 },
    { carrierIdx: 9, kind: "carrier_sync", status: "error", message: "فشلت المزامنة مع إيفرجرين: انتهت صلاحية مفتاح API (401).", reference: "SYNC-EGLV-ERR", hoursAgo: 6 },
    { carrierIdx: 4, kind: "carrier_sync", status: "warning", message: "لوفتهانزا للشحن: الربط قيد التفعيل، سيتم إعادة المحاولة تلقائياً.", reference: "SYNC-LHAC-PEND", hoursAgo: 8 },
    { carrierIdx: 6, kind: "carrier_sync", status: "success", message: "تم مزامنة 7 بوالص من MSC وتحديث أرصفة التفريغ.", reference: "SYNC-MSCU-33218", hoursAgo: 11 },
    { carrierIdx: 10, kind: "nafeza_declaration", status: "success", message: "تم إرسال 3 إقرارات جمركية إلى نافذة وربطها بمنظومة ACI.", reference: "ACID-2026-EG-4472", hoursAgo: 14 },
    { carrierIdx: 7, kind: "carrier_sync", status: "success", message: "CMA CGM: تحديث بوليصة CMDU-7733910 وإضافة تنبيه فحص بيئي.", reference: "SYNC-CMDU-7733910", hoursAgo: 20 },
    { carrierIdx: 2, kind: "tracking", status: "success", message: "الخطوط القطرية: تم تأكيد الحجز على رحلة QR1301 للشحنة QR-AWB-2201845.", reference: "TRK-QR-2201845", hoursAgo: 26 },
    { carrierIdx: 8, kind: "carrier_sync", status: "success", message: "هاباج لويد: تحديث تتبع الحاويات HLCU-9901128 عبر DCSA.", reference: "SYNC-HLCU-9901128", hoursAgo: 31 },
    { carrierIdx: 10, kind: "nafeza_declaration", status: "warning", message: "نافذة: إقرار CLR-2026-1005 معلّق لطلب فحص بيئي إضافي.", reference: "ACID-2026-EG-4402", hoursAgo: 38 },
  ];

  await db.insert(integrationLogs).values(
    logTemplates.map((log) => ({
      carrierId: log.carrierIdx === null ? null : carrierRows[log.carrierIdx].id,
      kind: log.kind,
      reference: log.reference,
      status: log.status,
      message: log.message,
      createdAt: ago(0, -log.hoursAgo),
    })),
  );

  await db.execute(sql`
    update carriers set last_sync_at = now() - (random() * interval '5 hours')
    where integration_status = 'connected'
  `);
}

let seedPromise: Promise<void> | null = null;

export async function ensureSeeded() {
  if (!seedPromise) {
    seedPromise = (async () => {
      try {
        await ensureSchema();
        const existing = await db.select({ id: users.id }).from(users).limit(1);
        if (existing.length === 0) {
          await seedDemoData();
        }
        // Reference data for the customs workspace (tariffs, banks, contracts).
        // Kept separate and idempotent so hosted databases get it on first boot.
        const tariffCount = await db.select({ id: tariffCodes.id }).from(tariffCodes).limit(1);
        if (tariffCount.length === 0) {
          await seedCustomsReference();
        }

        // One-time requested business identity correction; future edits in Settings are preserved.
        const marker = await db.select({ key: appSettings.key }).from(appSettings)
          .where(eq(appSettings.key, "business_identity_2026_11_v1")).limit(1);
        if (!marker.length) {
          for (const [key, value] of Object.entries({ commercial_register: "364", tax_id: "439942616" })) {
            await db.insert(appSettings).values({ key, value }).onConflictDoUpdate({
              target: appSettings.key, set: { value, updatedAt: new Date() },
            });
          }
          await db.insert(appSettings).values({ key: "business_identity_2026_11_v1", value: "applied" })
            .onConflictDoNothing();
        }
        // Remove only placeholder contact information from the old demo; keep any real values the user entered.
        const cleanupMarker = await db.select({ key: appSettings.key }).from(appSettings)
          .where(eq(appSettings.key, "company_placeholder_cleanup_v1")).limit(1);
        if (!cleanupMarker.length) {
          const placeholders: Record<string, string> = {
            address: "الإسكندرية، مصر",
            phone: "+20 3 480 2244",
            email: "info@alarabi-logistics.com",
            customs_license: "EG-CB-10942",
          };
          for (const [key, oldValue] of Object.entries(placeholders)) {
            await db.update(appSettings).set({ value: "", updatedAt: new Date() })
              .where(and(eq(appSettings.key, key), eq(appSettings.value, oldValue)));
          }
          await db.insert(appSettings).values({ key: "company_placeholder_cleanup_v1", value: "applied" })
            .onConflictDoNothing();
        }
        // Change only the original demo admin email; never alter the user's password hash.
        const desiredEmail = "ashourm669@gmail.com";
        const targetExists = await db.select({ id: users.id }).from(users).where(eq(users.email, desiredEmail)).limit(1);
        if (!targetExists.length) {
          await db.update(users).set({ email: desiredEmail })
            .where(eq(users.email, "admin@alarabi.com"));
        }

        // Previous demo carrier statuses and activity logs were misleading.
        const integrationMarker = await db.select({ key: appSettings.key }).from(appSettings)
          .where(eq(appSettings.key, "integration_truth_2026_11_v1")).limit(1);
        if (!integrationMarker.length) {
          await db.execute(sql`
            update carriers set integration_status = 'disconnected'
            where integration_status = 'connected' and api_key is null and api_secret is null
          `);
          await db.execute(sql`
            update integration_logs
               set status = 'demo', message = 'بيانات عرض فقط — ' || message
             where reference in (
               'SYNC-MAEU-88214','SYNC-MSAW-19120','ACID-2026-EG-4471',
               'TRK-EK-3329901','SYNC-EGLV-ERR','SYNC-LHAC-PEND',
               'SYNC-MSCU-33218','ACID-2026-EG-4472','SYNC-CMDU-7733910',
               'TRK-QR-2201845','SYNC-HLCU-9901128','ACID-2026-EG-4402'
             ) and status <> 'demo'
          `);
          await db.insert(appSettings).values({ key: "integration_truth_2026_11_v1", value: "applied" })
            .onConflictDoNothing();
        }

        // Directory entries are reference data, not banking API connections.
        const presentBanks = await db.select({ code: banks.code }).from(banks);
        const codes = new Set(presentBanks.map((bank) => bank.code));
        for (const bank of BANK_DIRECTORY) {
          if (codes.has(bank.code)) continue;
          await db.insert(banks).values({
            ...bank, status: "manual", currency: "EGP",
            notes: "دليل مرجعي — رمز القائمة داخلي، ولا يوجد ربط بنكي مباشر أو حساب مُعتمد.",
          });
          codes.add(bank.code);
        }
      } catch (error) {
        console.error("[seed] skipped:", error);
        seedPromise = null;
      }
    })();
  }
  return seedPromise;
}
