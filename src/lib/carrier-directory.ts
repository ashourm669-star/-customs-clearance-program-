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
  { name: "Air France-KLM Cargo", code: "AF", kind: "airline", prefix: "057", url: "https://www.afklcargo.com/" },
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
];

export function suggestedPortal(awb: string): TrackingPortal | null {
  const normalized = awb.trim().replace(/[-\s]/g, "").toUpperCase();
  if (normalized.startsWith("1Z")) return TRACKING_PORTALS.find((item) => item.code === "UPS") ?? null;
  const prefix = normalized.slice(0, 3);
  return TRACKING_PORTALS.find((item) => item.prefix === prefix) ?? null;
}
