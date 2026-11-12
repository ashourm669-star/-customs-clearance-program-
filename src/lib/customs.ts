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

export const PAYMENT_METHODS = ["bank_transfer", "letter_of_credit", "documentary_collection", "cash", "cheque", "open_account"] as const;
export const PAYMENT_METHOD_META: Record<string, { label: string; labelEn: string }> = {
  bank_transfer: { label: "حوالة بنكية", labelEn: "Bank transfer" },
  letter_of_credit: { label: "اعتماد مستندي", labelEn: "Letter of credit" },
  documentary_collection: { label: "تحصيل مستندي", labelEn: "Documentary collection" },
  cash: { label: "نقدي", labelEn: "Cash" },
  cheque: { label: "شيك", labelEn: "Cheque" },
  open_account: { label: "حساب مفتوح", labelEn: "Open account" },
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
  const str = (key: string) => String(row[key] ?? "").trim();
  const code = str("code").replace(/\s/g, "");
  if (!/^\d{4,10}$/.test(code)) throw new Error(`كود جمركي غير صالح: ${code || "فارغ"}`);
  const parseRate = (key: string): number | null => {
    const raw = str(key);
    if (!raw) return null;
    const value = Number(raw.replace("%", ""));
    if (!Number.isFinite(value) || value < 0 || value > 1000) throw new Error(`نسبة غير صالحة في ${key}`);
    return Math.round(value * 100);
  };
  const list = (key: string) => str(key).split(/[|؛]/).map((s) => s.trim()).filter(Boolean);
  return {
    code,
    nameAr: str("nameAr") || str("name_ar") || code,
    nameEn: str("nameEn") || str("name_en") || null,
    chapter: str("chapter") || code.slice(0, 2),
    category: str("category") || null,
    unit: str("unit") || null,
    dutyBps: parseRate("dutyBps") ?? parseRate("duty_bps"),
    vatBps: parseRate("vatBps") ?? parseRate("vat_bps") ?? 1400,
    importStatus: str("importStatus") in IMPORT_STATUS_META ? str("importStatus") : "verification_required",
    authorities: list("authorities"),
    conditions: list("conditions"),
    sourceUrl: str("sourceUrl") || "https://customs.gov.eg/",
    sourceReference: str("sourceReference") || "بيانات مستوردة — تحتاج مراجعة معتمدة",
    legalUpdatedAt: str("legalUpdatedAt") ? new Date(str("legalUpdatedAt")) : null,
    verified: str("verified") === "1" || str("verified") === "true" ? 1 : 0,
    notes: str("notes") || null,
  };
}

void CURRENCIES;
