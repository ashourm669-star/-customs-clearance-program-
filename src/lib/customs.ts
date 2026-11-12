import type { contracts, shipmentItems, tariffCodes } from "@/db/schema";
import { CURRENCIES } from "@/lib/constants";

export const CONTRACT_TYPES = ["sale", "service", "temporary_admission", "transit", "consignment", "lease"] as const;
export const CONTRACT_TYPE_META: Record<string, { label: string; labelEn: string }> = {
  sale: { label: "بيع تجاري", labelEn: "Sale" },
  service: { label: "توريد / خدمات", labelEn: "Supply / Service" },
  temporary_admission: { label: "إدخال مؤقت", labelEn: "Temporary admission" },
  transit: { label: "عبور / ترانزيت", labelEn: "Transit" },
  consignment: { label: "عمولة / وكالة", labelEn: "Consignment" },
  lease: { label: "إيجار / استئجار", labelEn: "Lease" },
};

export const INCOTERMS = ["EXW", "FCA", "FAS", "FOB", "CFR", "CIF", "CPT", "CIP", "DAP", "DPU", "DDP"] as const;
export const INCOTERM_META: Record<string, { label: string; freightIncluded: boolean; insuranceIncluded: boolean }> = {
  EXW: { label: "تسليم عند باب المورد", freightIncluded: false, insuranceIncluded: false },
  FCA: { label: "تسليم للناقل", freightIncluded: false, insuranceIncluded: false },
  FAS: { label: "تسليم بجانب السفينة", freightIncluded: false, insuranceIncluded: false },
  FOB: { label: "تسليم على ظهر السفينة", freightIncluded: false, insuranceIncluded: false },
  CFR: { label: "التكلفة والشحن", freightIncluded: true, insuranceIncluded: false },
  CIF: { label: "التكلفة والتأمين والشحن", freightIncluded: true, insuranceIncluded: true },
  CPT: { label: "الشحن المدفوع للناقل", freightIncluded: true, insuranceIncluded: false },
  CIP: { label: "الشحن والتأمين المدفوعان", freightIncluded: true, insuranceIncluded: true },
  DAP: { label: "تسليم في المكان المتفق عليه", freightIncluded: true, insuranceIncluded: true },
  DPU: { label: "تسليم بعد التفريغ", freightIncluded: true, insuranceIncluded: true },
  DDP: { label: "تسليم مع الرسوم المدفوعة", freightIncluded: true, insuranceIncluded: true },
};

export const PAYMENT_METHODS = [
  "bank_transfer", "letter_of_credit", "documentary_collection", "documents_against_payment",
  "documents_against_acceptance", "cash_against_documents", "advance_payment", "cash", "cheque", "open_account",
] as const;
/** تسميات تجارة دولية شائعة؛ كود نافذة النهائي يخضع لخيارات الحساب المعتمد على المنصة. */
export const PAYMENT_METHOD_META: Record<string, { label: string; labelEn: string }> = {
  bank_transfer: { label: "T/T · Telegraphic Transfer — تحويل بنكي", labelEn: "T/T (Telegraphic Transfer)" },
  letter_of_credit: { label: "L/C · Letter of Credit — اعتماد مستندي", labelEn: "L/C (Letter of Credit)" },
  documentary_collection: { label: "Documentary Collection — تحصيل مستندي", labelEn: "Documentary Collection" },
  documents_against_payment: { label: "D/P · Documents against Payment — مستندات مقابل الدفع", labelEn: "D/P (Documents against Payment)" },
  documents_against_acceptance: { label: "D/A · Documents against Acceptance — مستندات مقابل القبول", labelEn: "D/A (Documents against Acceptance)" },
  cash_against_documents: { label: "CAD · Cash against Documents — نقد مقابل مستندات", labelEn: "CAD (Cash against Documents)" },
  advance_payment: { label: "Advance Payment — دفع مقدم", labelEn: "Advance Payment" },
  cash: { label: "Cash — نقدي", labelEn: "Cash" },
  cheque: { label: "Cheque — شيك", labelEn: "Cheque" },
  open_account: { label: "Open Account — حساب مفتوح", labelEn: "Open Account" },
};

export const CUSTOMS_SYSTEMS = ["nafeza", "manifest", "email"] as const;
export const CUSTOMS_SYSTEM_META: Record<string, { label: string; labelEn: string }> = {
  nafeza: { label: "نافذة", labelEn: "Nafeza" },
  manifest: { label: "منافيست", labelEn: "Manifest" },
  email: { label: "البريد", labelEn: "Email" },
};

export const IMPORT_STATUS_META: Record<string, { label: string; tone: "emerald" | "amber" | "rose" | "slate" }> = {
  allowed: { label: "مسموح (بعد التحقق)", tone: "emerald" },
  conditional: { label: "بشروط / موافقات", tone: "amber" },
  prohibited: { label: "استيراد محظور", tone: "rose" },
  verification_required: { label: "يحتاج تحققاً", tone: "slate" },
};

export type TariffItem = {
  id: number;
  code: string;
  nameAr: string;
  nameEn: string | null;
  chapter: string | null;
  category: string | null;
  unit: string | null;
  dutyBps: number | null;
  vatBps: number | null;
  importStatus: string;
  authorities: string[] | null;
  conditions: string[] | null;
  sourceUrl: string | null;
  sourceReference: string | null;
  legalUpdatedAt: string | null;
  verified: number;
  notes: string | null;
  createdAt: string;
};

export type ContractItem = {
  id: number;
  number: string;
  clientId: number | null;
  name: string;
  type: string;
  incoterm: string | null;
  paymentMethod: string;
  bankId: number | null;
  currency: string | null;
  amount: number | null;
  startDate: string | null;
  endDate: string | null;
  paymentTerms: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
};

export type BankItem = {
  id: number;
  name: string;
  nameEn: string | null;
  code: string | null;
  swift: string | null;
  accountName: string | null;
  accountNumber: string | null;
  iban: string | null;
  currency: string | null;
  branch: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
};

export type CommercialInvoiceItem = {
  id: number;
  shipmentId: number | null;
  clientId: number | null;
  contractId: number | null;
  number: string;
  date: string | null;
  supplierName: string | null;
  originCountry: string | null;
  currency: string | null;
  subtotal: number | null;
  freight: number | null;
  insurance: number | null;
  total: number | null;
  incoterm: string | null;
  paymentMethod: string | null;
  bankName: string | null;
  bankSwift: string | null;
  bankAccount: string | null;
  bankIban: string | null;
  acidNumber: string | null;
  sourceText: string | null;
  sourceFilename: string | null;
  reviewStatus: string;
  createdAt: string;
};

export type ItemInput = {
  id?: number;
  shipmentId?: number;
  tariffId?: number | null;
  description: string;
  hsCode?: string | null;
  originCountry?: string | null;
  quantity: number;
  unit?: string | null;
  unitValue: number;
  currency: string;
  invoiceValue: number;
  freight: number;
  insurance: number;
  dutyBps?: number | null;
  vatBps?: number | null;
};

export type ItemCalculation = {
  amount: number;
  freight: number;
  insurance: number;
  cif: number;
  dutyBps: number | null;
  vatBps: number | null;
  duty: number | null;
  vat: number | null;
  total: number | null;
  complete: boolean;
};

const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Estimate only. Null rates are never silently treated as zero. */
export function calculateItem(item: ItemInput): ItemCalculation {
  const amount = round(item.quantity * item.unitValue || item.invoiceValue || 0);
  const freight = round(item.freight || 0);
  const insurance = round(item.insurance || 0);
  const cif = round(amount + freight + insurance);
  const complete = item.dutyBps !== null && item.dutyBps !== undefined && item.vatBps !== null && item.vatBps !== undefined;
  const duty = complete ? round(cif * (item.dutyBps ?? 0) / 10000) : null;
  const vat = complete ? round((cif + (duty ?? 0)) * (item.vatBps ?? 0) / 10000) : null;
  return {
    amount,
    freight,
    insurance,
    cif,
    dutyBps: item.dutyBps ?? null,
    vatBps: item.vatBps ?? null,
    duty,
    vat,
    total: duty !== null && vat !== null ? round(cif + duty + vat) : null,
    complete,
  };
}

export function egpValue(amount: number, currency: string, rates: Record<string, number>): number | null {
  if (currency === "EGP") return round(amount);
  const rate = rates[currency];
  return rate && rate > 0 ? round(amount * rate) : null;
}

export function acidCountdown(submittedAt: string | Date, expiresAt: string | Date): { expired: boolean; hours: number; label: string } {
  const end = new Date(expiresAt).getTime();
  const hours = (end - Date.now()) / 3_600_000;
  const submitted = new Date(submittedAt).getTime();
  const totalHours = Math.max(1, (end - submitted) / 3_600_000);
  return {
    expired: hours <= 0,
    hours: Math.max(0, hours),
    label: hours <= 0 ? "انتهت صلاحية رقم ACID — تحقق مع نافذة" : `متبقي ${Math.floor(hours)} ساعة من ${Math.ceil(totalHours)} ساعة`,
  };
}

export function normalizeImportedTariff(row: Record<string, unknown>): Omit<typeof tariffCodes.$inferInsert, "id" | "createdAt"> {
  const str = (...keys: string[]) => {
    for (const key of keys) {
      const found = Object.entries(row).find(([header]) => header.trim().toLowerCase() === key.toLowerCase());
      if (found?.[1] !== null && found?.[1] !== undefined && String(found[1]).trim()) return String(found[1]).trim();
    }
    return "";
  };
  const numeric = (value: string) => value.replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x6f0));
  const code = numeric(str("code", "hs code", "hscode", "البند الجمركي", "رمز البند", "البند", "كود البند"))
    .replace(/[.\s\-]/g, "");
  if (!/^\d{4,10}$/.test(code)) throw new Error(`كود جمركي غير صالح: ${code || "فارغ"}`);
  const parseRate = (...keys: string[]): number | null => {
    const raw = numeric(str(...keys)).replace(/[%٪,،\s]/g, "");
    if (!raw) return null;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error(`نسبة غير صالحة في ${keys[0]}`);
    return Math.round(value * 100);
  };
  const list = (...keys: string[]) => str(...keys).split(/[|؛;\n]/).map((s) => s.trim()).filter(Boolean);
  const state = str("importStatus", "import_status", "حالة الاستيراد");
  const legalDate = str("legalUpdatedAt", "تاريخ التحديث");
  const parsedDate = legalDate ? new Date(legalDate) : null;
  return {
    code,
    nameAr: str("nameAr", "name_ar", "وصف الصنف", "وصف البضاعة", "الصنف", "البيان", "الوصف") || code,
    nameEn: str("nameEn", "name_en", "English Description", "الوصف بالإنجليزية") || null,
    chapter: str("chapter", "الفصل") || code.slice(0, 2),
    category: str("category", "القسم", "مجموعة") || null,
    unit: str("unit", "الوحدة", "وحدة القياس") || null,
    dutyBps: parseRate("dutyBps", "duty_bps", "فئة الضريبة الجمركية", "نسبة الرسم الجمركي", "نسبة الجمارك"),
    vatBps: parseRate("vatBps", "vat_bps", "ضريبة القيمة المضافة", "نسبة ضريبة القيمة المضافة"),
    importStatus: state && Object.prototype.hasOwnProperty.call(IMPORT_STATUS_META, state) ? state : "verification_required",
    authorities: list("authorities", "الجهات الرقابية", "جهات العرض", "الجهات"),
    conditions: list("conditions", "شروط الاستيراد", "الاشتراطات", "الشروط"),
    sourceUrl: str("sourceUrl", "رابط المصدر") || null,
    sourceReference: str("sourceReference", "مرجع القرار", "المنشور") || "بيانات مستوردة — تحتاج مراجعة المصدر والتعديلات",
    legalUpdatedAt: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null,
    verified: str("verified", "معتمد") === "1" || str("verified", "معتمد").toLowerCase() === "true" ? 1 : 0,
    notes: str("notes", "ملاحظات") || null,
  };
}

void CURRENCIES;
