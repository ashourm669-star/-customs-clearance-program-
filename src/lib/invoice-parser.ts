import { CURRENCIES } from "@/lib/constants";
import { INCOTERMS, PAYMENT_METHODS } from "@/lib/customs";

export type ParsedInvoice = {
  number: string | null;
  date: string | null;
  supplierName: string | null;
  originCountry: string | null;
  currency: string;
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
  hsCodes: string[];
  items: { description: string; hsCode: string | null; quantity: number; unitValue: number; invoiceValue: number; currency: string }[];
  warnings: string[];
};

const money = (value: string | undefined) => {
  if (!value) return null;
  const n = Number(value.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};

/** Deterministic field extraction. No invented values and no legal classification. */
export function parseInvoiceText(text: string): ParsedInvoice {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const labeled = (labels: string): string | null => {
    const pattern = new RegExp(`(?:^|\\n)\\s*(?:${labels})\\s*[:#\\-]?\\s*([^\\n\\r]+)`, "i");
    return text.match(pattern)?.[1]?.trim() ?? null;
  };
  const amount = (labels: string): number | null => {
    const value = labeled(labels);
    return money(value?.match(/-?\d[\d,]*(?:\.\d+)?/)?.[0]);
  };
  const currencyText = labeled("currency|العملة")?.toUpperCase() ?? "";
  const currency = CURRENCIES.find((code) => currencyText.includes(code)) ?? (currencyText.includes("ج.م") || currencyText.includes("جنيه") ? "EGP" : "USD");
  const incotermText = (labeled("incoterm|شروط التجارة|التعاقد") ?? text).toUpperCase();
  const incoterm = INCOTERMS.find((code) => new RegExp(`\\b${code}\\b`).test(incotermText)) ?? null;
  const paymentText = (labeled("payment terms|payment method|طريقة السداد|أسلوب السداد") ?? "").toLowerCase();
  const paymentMethod = PAYMENT_METHODS.find((method) => paymentText.includes(method) || (method === "bank_transfer" && /تحويل|حوالة/.test(paymentText)) || (method === "letter_of_credit" && /اعتماد/.test(paymentText))) ?? null;
  const dateText = labeled("invoice date|date|تاريخ الفاتورة|التاريخ");
  const dateMatch = dateText?.match(/\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{4}/)?.[0];
  const date = dateMatch && !Number.isNaN(new Date(dateMatch).getTime()) ? new Date(dateMatch).toISOString() : null;
  const hsCodes = [...new Set((text.match(/\b\d{4}\.?\d{2,6}\b/g) ?? []).map((code) => code.replace(/\s/g, "")))];
  const items: ParsedInvoice["items"] = [];
  for (const line of lines) {
    const numbers = line.match(/\d[\d,]*(?:\.\d+)?/g)?.map((value) => money(value) ?? 0) ?? [];
    if (numbers.length < 2) continue;
    const hs = line.match(/\b\d{4}\.?\d{2,6}\b/)?.[0]?.replace(/\s/g, "") ?? null;
    const description = line.replace(/\b\d{4}\.?\d{2,6}\b/g, "").replace(/\d[\d,]*(?:\.\d+)?/g, "").replace(/[|;]+/g, " ").trim();
    if (description.length < 3) continue;
    const amountIndex = numbers.length - 1;
    const quantity = numbers.length >= 3 ? numbers[amountIndex - 2] : 1;
    const unitValue = numbers.length >= 3 ? numbers[amountIndex - 1] : numbers[amountIndex];
    const lineTotal = numbers[amountIndex];
    if (quantity <= 0 || unitValue < 0 || lineTotal < 0) continue;
    if (Math.abs(quantity * unitValue - lineTotal) > Math.max(1, lineTotal * 0.02)) continue;
    items.push({ description, hsCode: hs, quantity, unitValue, invoiceValue: lineTotal, currency });
  }
  const warnings = [
    "هذه قراءة آلية نصية، وليست اعتماداً جمركياً أو OCR حاسوبياً؛ راجع كل الحقول يدوياً.",
    "رمز HS المقترح من نص الفاتورة لا يثبت تصنيف الصنف؛ طابقه مع التعريفة الرسمية.",
    "المنشأ ونوع التعاقد وأسلوب السداد لا يُفترضوا إذا لم يردوا صراحة في الفاتورة.",
  ];
  if (!items.length) warnings.push("لم تُعثر على بنود بتسعير متطابق. أدخل البنود يدوياً أو ارفع صورة أوضح.");
  return {
    number: labeled("invoice number|invoice no|invoice #|رقم الفاتورة|الفاتورة رقم"),
    date,
    supplierName: labeled("supplier|seller|exporter|المورد|الشركة المصدرة|اسم المورد"),
    originCountry: labeled("country of origin|origin|بلد المنشأ|المنشأ"),
    currency,
    subtotal: amount("subtotal|sub total|إجمالي البضاعة|الإجمالي قبل الشحن"),
    freight: amount("freight|shipping|الشحن|تكلفة الشحن"),
    insurance: amount("insurance|التأمين|قيمة التأمين"),
    total: amount("grand total|invoice total|total amount|الإجمالي|المبلغ الإجمالي|قيمة الفاتورة"),
    incoterm,
    paymentMethod,
    bankName: labeled("bank name|bank|البنك|اسم البنك"),
    bankSwift: labeled("swift|swift code|سويفت")?.match(/[A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?/)?.[0] ?? null,
    bankAccount: labeled("account number|account no|a/c number|رقم الحساب|الحساب"),
    bankIban: labeled("iban|آيبان")?.match(/[A-Z]{2}\d{2}[A-Z0-9]{10,30}/)?.[0] ?? null,
    acidNumber: labeled("acid|ACID number|رقم ACID")?.match(/[A-Z0-9-]{8,}/i)?.[0] ?? null,
    hsCodes,
    items,
    warnings,
  };
}
