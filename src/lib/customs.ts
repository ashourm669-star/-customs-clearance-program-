export const ACID_VALIDITY_DAYS = 180;

export const cargoKinds = [
  { value: "manifest", label: "منافيست Manifest", en: "Manifest cargo" },
  { value: "postal", label: "بريد Postal", en: "Postal consignment" },
];

export const customsRegimes = [
  { value: "final_release", label: "إفراج نهائي", en: "Final release" },
  { value: "temporary_admission", label: "إدخال مؤقت", en: "Temporary admission" },
  { value: "temporary_release", label: "إفراج مؤقت", en: "Temporary release" },
  { value: "transit", label: "ترانزيت", en: "Transit" },
  { value: "warehouse", label: "مستودع جمركي", en: "Customs warehouse" },
  { value: "free_zone", label: "منطقة حرة", en: "Free zone" },
  { value: "drawback", label: "دروباك", en: "Drawback" },
  { value: "exemption", label: "إعفاء جمركي", en: "Customs exemption" },
  { value: "reexport", label: "إعادة تصدير", en: "Re-export" },
  { value: "export_final", label: "تصدير نهائي", en: "Final export" },
  { value: "postal", label: "نظام البريد", en: "Postal regime" },
  { value: "personal", label: "أمتعة شخصية", en: "Personal effects" },
];

export const subjectionSystems = [
  { value: "duty_vat", label: "خاضع للضريبة الجمركية والقيمة المضافة", en: "Duty + VAT" },
  { value: "duty_only", label: "خاضع للضريبة الجمركية فقط", en: "Duty only" },
  { value: "vat_only", label: "خاضع للقيمة المضافة فقط", en: "VAT only" },
  { value: "exempt", label: "معفى بالكامل", en: "Fully exempt" },
  { value: "partial_exempt", label: "إعفاء جزئي", en: "Partial exemption" },
  { value: "table_tax", label: "خاضع لضريبة الجدول", en: "Schedule tax" },
  { value: "preferential", label: "اتفاق تفضيلي (كوميسا / أغادير / شراكة)", en: "Preferential agreement" },
  { value: "free_zone_out", label: "خارج الخضوع - منطقة حرة", en: "Free zone, out of scope" },
  { value: "export_zero", label: "تصدير - فئة صفر", en: "Export zero rate" },
];

export const incoterms = [
  { value: "EXW", label: "EXW تسليم المصنع", addsFreight: true, addsInsurance: true },
  { value: "FCA", label: "FCA تسليم الناقل", addsFreight: true, addsInsurance: true },
  { value: "FAS", label: "FAS تسليم جانب السفينة", addsFreight: true, addsInsurance: true },
  { value: "FOB", label: "FOB تسليم على ظهر السفينة", addsFreight: true, addsInsurance: true },
  { value: "CFR", label: "CFR التكلفة والشحن", addsFreight: false, addsInsurance: true },
  { value: "CIF", label: "CIF التكلفة والتأمين والشحن", addsFreight: false, addsInsurance: false },
  { value: "CPT", label: "CPT النقل مدفوع إلى", addsFreight: false, addsInsurance: true },
  { value: "CIP", label: "CIP النقل والتأمين مدفوع إلى", addsFreight: false, addsInsurance: false },
  { value: "DAP", label: "DAP التسليم في المكان", addsFreight: false, addsInsurance: false },
  { value: "DPU", label: "DPU التسليم في مكان التفريغ", addsFreight: false, addsInsurance: false },
  { value: "DDP", label: "DDP التسليم والرسوم مدفوعة", addsFreight: false, addsInsurance: false },
];

export const paymentMethods = [
  { value: "LC", label: "اعتماد مستندي LC", en: "Letter of Credit" },
  { value: "TT", label: "تحويل بنكي TT", en: "Telegraphic Transfer" },
  { value: "CAD", label: "مستندات مقابل الدفع CAD", en: "Cash Against Documents" },
  { value: "DP", label: "مستندات مقابل القبول DP", en: "Documents Against Acceptance" },
  { value: "OA", label: "حساب مفتوح OA", en: "Open Account" },
  { value: "Advance", label: "دفع مقدم Advance", en: "Advance Payment" },
];

export const importStatuses = [
  { value: "allowed", label: "مسموح استيراده" },
  { value: "restricted", label: "مقيد بشروط" },
  { value: "license", label: "يتطلب ترخيص جهة رقابية" },
  { value: "prohibited", label: "غير مسموح / محظور" },
];

export type RateMap = Record<string, number>;

export function rateFor(rates: RateMap, currency?: string | null) {
  const code = (currency || "EGP").toUpperCase();
  if (code === "EGP") return 1;
  return rates[code] ?? 0;
}

export function toEgp(amount: number, currency: string | null | undefined, rates: RateMap) {
  return Number(amount || 0) * rateFor(rates, currency);
}

export function assessableValue(input: {
  invoiceValue: number;
  currency: string;
  freight: number;
  insurance: number;
  contractType: string;
  rates: RateMap;
}) {
  const term = incoterms.find((item) => item.value === input.contractType) ?? incoterms.find((item) => item.value === "CIF")!;
  const invoiceEgp = toEgp(input.invoiceValue, input.currency, input.rates);
  let freight = Number(input.freight || 0);
  let insurance = Number(input.insurance || 0);
  let estimated = false;
  if (term.addsFreight && freight <= 0 && invoiceEgp > 0) { freight = input.invoiceValue * 0.04; estimated = true; }
  if (term.addsInsurance && insurance <= 0 && invoiceEgp > 0) { insurance = input.invoiceValue * 0.01; estimated = true; }
  const freightEgp = term.addsFreight ? toEgp(freight, input.currency, input.rates) : 0;
  const insuranceEgp = term.addsInsurance ? toEgp(insurance, input.currency, input.rates) : 0;
  return {
    invoiceEgp,
    freightEgp,
    insuranceEgp,
    cifEgp: invoiceEgp + freightEgp + insuranceEgp,
    estimated,
    rate: rateFor(input.rates, input.currency),
    term,
  };
}

export function lineFees(cifEgp: number, dutyRate: number, vatRate: number, tableTaxRate = 0, developmentRate = 0) {
  const duty = cifEgp * dutyRate / 100;
  const development = cifEgp * developmentRate / 100;
  const tableTax = cifEgp * tableTaxRate / 100;
  const vatBase = cifEgp + duty + development;
  const vat = vatBase * vatRate / 100;
  return { duty, vat, development, tableTax, vatBase, total: duty + vat + development + tableTax };
}

export function acidTimeline(issuedAt?: string | null, eta?: string | null) {
  if (!issuedAt) return null;
  const issued = new Date(issuedAt);
  if (Number.isNaN(issued.getTime())) return null;
  const expires = new Date(issued);
  expires.setDate(expires.getDate() + ACID_VALIDITY_DAYS);
  const now = new Date();
  const elapsed = Math.max(0, Math.floor((now.getTime() - issued.getTime()) / 86400000));
  const remaining = Math.ceil((expires.getTime() - now.getTime()) / 86400000);
  const etaDate = eta ? new Date(eta) : null;
  const arrivesAfterExpiry = etaDate && !Number.isNaN(etaDate.getTime()) ? etaDate > expires : false;
  return {
    issued, expires, elapsed, remaining,
    expired: remaining < 0,
    expiring: remaining >= 0 && remaining <= 21,
    arrivesAfterExpiry,
    progress: Math.min(100, Math.round(elapsed / ACID_VALIDITY_DAYS * 100)),
  };
}
