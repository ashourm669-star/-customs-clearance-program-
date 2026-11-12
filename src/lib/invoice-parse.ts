export type ParsedInvoice = {
  invoiceNo: string;
  invoiceDate: string;
  currency: string;
  amount: number;
  contractType: string;
  paymentMethod: string;
  origin: string;
  companyName: string;
  taxNumber: string;
  goods: string;
  lines: Array<{ hsCode: string; name: string; amount: number; origin: string }>;
  notes: string[];
};

const INCOTERMS = ["EXW", "FCA", "FAS", "FOB", "CFR", "CIF", "CPT", "CIP", "DAP", "DPU", "DDP"];
const PAYMENTS: Array<[RegExp, string]> = [
  [/letter of credit|\bL\/?C\b|اعتماد/i, "LC"],
  [/telegraphic|wire transfer|\bT\/?T\b|تحويل/i, "TT"],
  [/\bCAD\b|cash against documents|مقابل الدفع/i, "CAD"],
  [/\bD\/?P\b|documents against acceptance/i, "DP"],
  [/open account|حساب مفتوح/i, "OA"],
  [/advance|مقدم/i, "Advance"],
];

function pick(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

export function parseInvoiceText(raw: string): ParsedInvoice {
  const text = raw.replace(/\u00a0/g, " ");
  const currency = (text.match(/\b(USD|EUR|GBP|CNY|SAR|AED|EGP)\b/i)?.[1] ?? "USD").toUpperCase();
  const contractType = INCOTERMS.find((term) => new RegExp(`\\b${term}\\b`, "i").test(text)) ?? "";
  const paymentMethod = PAYMENTS.find(([pattern]) => pattern.test(text))?.[1] ?? "";
  const amountRaw = pick(text, [
    /(?:total|amount|invoice value|القيمة|الإجمالي|المبلغ)\s*[:\-]?\s*([0-9][0-9,\.]*)/i,
    /([0-9]{2,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?)/,
  ]);
  const hsCodes = [...text.matchAll(/\b(\d{4}\.\d{2}(?:\.\d{2})?|\d{6,10})\b/g)].map((m) => m[1]);
  const uniqueHs = [...new Set(hsCodes)].slice(0, 12);
  return {
    invoiceNo: pick(text, [/(?:invoice\s*(?:no|number|#)|رقم الفاتورة|فاتورة رقم)\s*[:\-]?\s*([A-Z0-9\-\/]+)/i]),
    invoiceDate: pick(text, [/(?:date|تاريخ)\s*[:\-]?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i]),
    currency,
    amount: Number(amountRaw.replace(/,/g, "")) || 0,
    contractType,
    paymentMethod,
    origin: pick(text, [/(?:origin|country of origin|المنشأ|بلد المنشأ)\s*[:\-]?\s*([^\n,]{2,40})/i]),
    companyName: pick(text, [/(?:seller|supplier|exporter|البائع|المورد|الشركة)\s*[:\-]?\s*([^\n]{2,80})/i]),
    taxNumber: pick(text, [/(?:tax|vat|الرقم الضريبي)\s*[:\-]?\s*([0-9\-]{5,20})/i]),
    goods: pick(text, [/(?:description|goods|الصنف|البضاعة|البيان)\s*[:\-]?\s*([^\n]{2,120})/i]),
    lines: uniqueHs.map((hsCode) => ({ hsCode, name: "", amount: 0, origin: "" })),
    notes: uniqueHs.length ? [`تم استخراج ${uniqueHs.length} بند جمركي من نص الفاتورة`] : ["لم يُستخرج بند رقمي؛ راجع النص أو ارفع Excel"],
  };
}

export function parseInvoiceRows(rows: Array<Record<string, unknown>>): ParsedInvoice {
  const first = rows[0] ?? {};
  const valueOf = (row: Record<string, unknown>, keys: string[]) => {
    const found = Object.entries(row).find(([key]) => keys.some((candidate) => key.toLowerCase().includes(candidate)));
    return found ? String(found[1] ?? "") : "";
  };
  const lines = rows.map((row) => ({
    hsCode: valueOf(row, ["hs", "بند", "code", "tariff"]),
    name: valueOf(row, ["item", "desc", "صنف", "بيان", "name", "goods"]),
    amount: Number(String(valueOf(row, ["amount", "value", "قيمة", "total", "price"])).replace(/,/g, "")) || 0,
    origin: valueOf(row, ["origin", "منشأ", "country"]),
  })).filter((line) => line.hsCode || line.name);
  const text = rows.map((row) => Object.values(row).join(" ")).join("\n");
  const parsed = parseInvoiceText(`${Object.entries(first).map(([k, v]) => `${k}: ${v}`).join("\n")}\n${text}`);
  const amount = lines.reduce((sum, line) => sum + line.amount, 0) || parsed.amount;
  return { ...parsed, amount, lines: lines.length ? lines : parsed.lines, goods: lines[0]?.name || parsed.goods };
}
