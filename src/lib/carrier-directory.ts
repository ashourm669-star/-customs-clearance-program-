export type TrackingPortal = {
  name: string;
  code: string;
  kind: "airline" | "courier" | "shipping" | "handler";
  url: string;
  prefix?: string;
  note?: string;
};

/** مواقع تتبع حقيقية لا APIs. لا نزعم أننا نستخرج بياناتها دون تصريح من المزوّد. */
export const TRACKING_PORTALS: TrackingPortal[] = [
  { name: "CACC CargoLinx — مناولة شحن جوي بالقاهرة", code: "CARGOLINX", kind: "handler", url: "https://portal.cargolinx.com/", note: "مناول لشحنات لوفتهانزا وعدة شركات في مطار القاهرة؛ قد يتطلب حساباً." },
  { name: "Lufthansa Cargo", code: "LH", kind: "airline", prefix: "020", url: "https://www.lufthansa-cargo.com/", note: "بوليصة تبدأ 020. API رسمي متاح بعد اعتماد المطوّر." },
  { name: "مصر للطيران للشحن EgyptAir Cargo", code: "MS", kind: "airline", prefix: "077", url: "https://egyptair-cargo.com/home.htm" },
  { name: "Air France Cargo", code: "AF", kind: "airline", prefix: "057", url: "https://www.afklcargo.com/" },
  { name: "KLM Cargo", code: "KL", kind: "airline", prefix: "074", url: "https://www.afklcargo.com/" },
  { name: "Emirates SkyCargo", code: "EK", kind: "airline", prefix: "176", url: "https://www.skycargo.com/" },
  { name: "Qatar Airways Cargo", code: "QR", kind: "airline", prefix: "157", url: "https://www.qrcargo.com/" },
  { name: "Turkish Cargo", code: "TK", kind: "airline", prefix: "235", url: "https://www.turkishcargo.com.tr/" },
  { name: "Etihad Cargo", code: "EY", kind: "airline", prefix: "607", url: "https://www.etihadcargo.com/" },
  { name: "Saudia Cargo", code: "SV", kind: "airline", prefix: "065", url: "https://www.saudiacargo.com/" },
  { name: "British Airways Cargo / IAG", code: "BA", kind: "airline", prefix: "125", url: "https://www.iagcargo.com/" },
  { name: "DHL Express", code: "DHL", kind: "courier", url: "https://www.dhl.com/eg-en/home/tracking.html", note: "API التتبع الرسمي يتطلب DHL-API-Key." },
  { name: "FedEx", code: "FDX", kind: "courier", url: "https://www.fedex.com/en-us/tracking.html" },
  { name: "UPS", code: "UPS", kind: "courier", url: "https://www.ups.com/track" },
  { name: "Aramex", code: "ARX", kind: "courier", url: "https://www.aramex.com/track/shipments" },
  { name: "Maersk", code: "MAERSK", kind: "shipping", url: "https://www.maersk.com/tracking/" },
  { name: "MSC", code: "MSC", kind: "shipping", url: "https://www.msc.com/en/track-a-shipment" },
  { name: "CMA CGM", code: "CMDU", kind: "shipping", url: "https://www.cma-cgm.com/ebusiness/tracking" },
  { name: "Hapag-Lloyd", code: "HLCU", kind: "shipping", url: "https://www.hapag-lloyd.com/en/online-business/track/track-by-container-solution.html" },
  { name: "ONE", code: "ONEY", kind: "shipping", url: "https://www.one-line.com/en/tracking" },
  { name: "Evergreen", code: "EGLV", kind: "shipping", url: "https://www.evergreen-line.com/" },
  { name: "COSCO Shipping", code: "COSU", kind: "shipping", url: "https://elines.coscoshipping.com/" },
  { name: "HMM", code: "HMMU", kind: "shipping", url: "https://www.hmm21.com/" },
  { name: "ZIM", code: "ZIMU", kind: "shipping", url: "https://www.zim.com/tools/track-a-shipment" },
  { name: "Yang Ming", code: "YMLU", kind: "shipping", url: "https://www.yangming.com/" },
];

export type TrackingDetection = {
  kind: "air_waybill" | "container" | "bill_of_lading" | "courier" | "unknown";
  portal: TrackingPortal | null;
  confidence: "high" | "suggestion" | "unknown";
  ready: boolean;
  message: string;
  normalized: string;
};

const CONTAINER_OWNERS: Record<string, string> = {
  MAEU: "MAERSK", MRKU: "MAERSK", MSKU: "MAERSK",
  MSCU: "MSC", MEDU: "MSC", CMAU: "CMDU", CMDU: "CMDU",
  HLCU: "HLCU", HLXU: "HLCU", ONEU: "ONEY", ONEY: "ONEY",
  EGLV: "EGLV", EGHU: "EGLV", COSU: "COSU", CSNU: "COSU",
  HMMU: "HMMU", ZIMU: "ZIMU", YMLU: "YMLU",
};

export function detectTrackingNumber(input: string, courierHint?: string): TrackingDetection {
  const normalized = input.trim().replace(/[\s-]/g, "").toUpperCase();
  const byCode = (code?: string) => TRACKING_PORTALS.find((item) => item.code === code) ?? null;
  if (courierHint && ["DHL", "FDX", "UPS", "ARX"].includes(courierHint.toUpperCase())) {
    const portal = byCode(courierHint.toUpperCase());
    const ready = portal?.code === "DHL" ? normalized.length >= 10 : portal?.code === "UPS" && normalized.startsWith("1Z") ? normalized.length === 18 : normalized.length >= 12;
    return { kind: "courier", portal, confidence: "high", ready,
      message: `${portal?.name ?? courierHint} — شركة حُددت يدوياً؛ سيُستخدم API المصرّح إن وُجد.`, normalized };
  }
  if (/^\d{11}$/.test(normalized)) {
    const portal = TRACKING_PORTALS.find((item) => item.prefix === normalized.slice(0, 3)) ?? null;
    return { kind: "air_waybill", portal, confidence: portal ? "high" : "suggestion", ready: true,
      message: portal ? `بوليصة جوية AWB تتبع ${portal.name} (بادئة ${portal.prefix}).` : `بوليصة جوية AWB — بادئة ${normalized.slice(0, 3)}؛ يمكن لمزوّد تتبع مرخص تحديد الناقل.`, normalized };
  }
  if (/^1Z[A-Z0-9]{16}$/.test(normalized)) {
    return { kind: "courier", portal: byCode("UPS"), confidence: "high", ready: true,
      message: "رقم شحنة UPS، ويمكن جلب حالته عبر API مرخص.", normalized };
  }
  if (/^[A-Z]{4}\d{7}$/.test(normalized)) {
    const portal = byCode(CONTAINER_OWNERS[normalized.slice(0, 4)]);
    return { kind: "container", portal, confidence: "suggestion", ready: true,
      message: portal ? `رمز مالك الحاوية يشير إلى ${portal.name}؛ قد يكون الخط الناقل مختلفاً.` : "رقم حاوية قياسي — اسم الخط لا يُستنتج من رقم الحاوية وحده.", normalized };
  }
  if (/^[A-Z]{4}[A-Z0-9]{7,}$/.test(normalized)) {
    const portal = byCode(CONTAINER_OWNERS[normalized.slice(0, 4)]);
    return { kind: "bill_of_lading", portal, confidence: portal ? "suggestion" : "unknown", ready: normalized.length >= 12,
      message: portal ? `البادئة ترجّح ${portal.name}؛ تحقق من البوليصة على موقع الناقل.` : "بوليصة بحرية محتملة؛ يلزم API أو موقع الناقل للتحقق.", normalized };
  }
  return { kind: "unknown", portal: null, confidence: "unknown", ready: normalized.length >= 12,
    message: normalized.length >= 8 ? "الناقل غير محسوم من الرقم وحده؛ اختر شركة الطرود أو ابحث يدوياً." : "اكتب رقم البوليصة كاملاً ليتعرف عليه النظام.", normalized };
}

export function suggestedPortal(value: string): TrackingPortal | null {
  return detectTrackingNumber(value).portal;
}
