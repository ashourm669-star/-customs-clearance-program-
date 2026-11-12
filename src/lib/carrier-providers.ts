/**
 * Real carrier data adapters.
 * No data is ever fabricated: a lookup succeeds only when an authenticated
 * upstream API returns it. Otherwise we return the official tracking URL.
 */

export type CarrierMatch = {
  carrierCode: string;
  isAir: boolean;
  prefix: string;
};

const SEA_PREFIXES: Record<string, string> = {
  MSCU: "MSC", MSKU: "MSC", MEDU: "MSC",
  MRKU: "MAERSK", MAEU: "MAERSK", MSKU1: "MAERSK",
  CMAU: "CMDU", CMDU: "CMDU", CGMU: "CMDU",
  HLXU: "HLCU", HLCU: "HLCU",
  EGHU: "EGLV", EGLV: "EGLV",
  CSNU: "COSU", COSU: "COSU",
  ONEU: "ONEY", ONEY: "ONEY",
  HMMU: "HMMU",
  ZIMU: "ZIMU",
  YMLU: "YMLU", YMLU1: "YMLU",
};

const AIR_PREFIXES: Record<string, string> = {
  "077": "MS", "176": "EK", "157": "QR", "607": "EY", "235": "TK",
  "020": "LH", "057": "AF", "065": "SV", "502": "G9", "512": "RJ",
  "297": "MS", "999": "QR",
};

export function detectCarrier(documentNumber: string): CarrierMatch | null {
  const value = documentNumber.trim().toUpperCase().replace(/[\s-]/g, "");
  for (const [prefix, code] of Object.entries(SEA_PREFIXES)) {
    if (value.startsWith(prefix)) return { carrierCode: code, isAir: false, prefix };
  }
  const digits = value.replace(/\D/g, "");
  if (digits.length >= 8) {
    const code = AIR_PREFIXES[digits.slice(0, 3)];
    if (code) return { carrierCode: code, isAir: true, prefix: digits.slice(0, 3) };
  }
  return null;
}

export function buildTrackingUrl(template: string | null | undefined, documentNumber: string): string | null {
  if (!template) return null;
  return template.replaceAll("{number}", encodeURIComponent(documentNumber));
}

export type ProviderInput = {
  provider: string;
  apiKey?: string | null;
  apiUrl?: string | null;
  providerCode?: string | null;
  documentNumber: string;
  carrierCode: string;
  isAir: boolean;
};

export type ProviderResult = {
  ok: boolean;
  provider: string;
  message: string;
  raw: Record<string, any>;
  normalized: Record<string, any>;
};

async function requestJson(url: string, init: RequestInit): Promise<{ ok: boolean; body: Record<string, any> }> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(12000), cache: "no-store" });
  const text = await response.text();
  let body: Record<string, any>;
  try { body = JSON.parse(text) as Record<string, any>; } catch { body = { raw: text.slice(0, 2000) }; }
  return { ok: response.ok, body };
}

export function normalizeCarrierData(raw: Record<string, any>, input: ProviderInput): Record<string, any> {
  const data = (raw.data ?? raw.result ?? raw) as Record<string, any>;
  const first = Array.isArray(data) ? (data[0] ?? {}) : data;
  const events = Array.isArray(first.events) ? first.events
    : Array.isArray(first.items) ? first.items
      : Array.isArray(first.tracking_events) ? first.tracking_events
        : Array.isArray(raw.events) ? raw.events : [];
  const latest = events[0] as Record<string, any> | undefined;
  return {
    documentNumber: input.documentNumber,
    carrierCode: input.carrierCode,
    documentType: input.isAir ? "بوليصة شحن جوي AWB" : "بوليصة شحن بحرية / حاوية",
    provider: input.provider,
    status: String(first.status ?? first.tracking_status ?? first.shipment_status ?? raw.status ?? "unknown"),
    origin: String(first.origin ?? first.origin_country ?? first.from ?? first.ship_from ?? ""),
    destination: String(first.destination ?? first.destination_country ?? first.to ?? first.ship_to ?? ""),
    eta: first.estimated_delivery_date ?? first.eta ?? first.estimated_arrival ?? first.arrival_date ?? null,
    vessel: first.vessel ?? first.flight_number ?? first.transport ?? null,
    containerNumber: first.container_number ?? first.container ?? null,
    eventsCount: events.length,
    latestEvent: latest ? String(latest.description ?? latest.status ?? latest.event ?? "") : null,
    latestEventDate: latest ? (latest.time ?? latest.date ?? latest.timestamp ?? null) : null,
  };
}

export async function fetchCarrierData(input: ProviderInput): Promise<ProviderResult> {
  const provider = (input.provider || "official").toLowerCase();
  const base: ProviderResult = { ok: false, provider, message: "", raw: {}, normalized: {} };

  if (provider === "trackingmore") {
    const key = input.apiKey || process.env.TRACKINGMORE_API_KEY;
    if (!key) return { ...base, message: "مزوّد TrackingMore مختار لكن مفتاح API غير مُدخل" };
    const headers = { "Content-Type": "application/json", "Tracking-Api-Key": key };
    try {
      let raw: Record<string, any>;
      if (input.isAir) {
        const result = await requestJson("https://api.trackingmore.com/v4/awb", {
          method: "POST", headers, body: JSON.stringify({ awb_number: input.documentNumber }),
        });
        raw = result.body;
        if (!result.ok) return { ...base, raw, message: `رد المزوّد: ${String(raw.message ?? raw.meta?.message ?? "طلب غير مقبول")}` };
      } else {
        const created = await requestJson("https://api.trackingmore.com/v4/trackings/create", {
          method: "POST", headers,
          body: JSON.stringify({ tracking_number: input.documentNumber, courier_code: input.providerCode || input.carrierCode.toLowerCase() }),
        });
        const details = await requestJson(
          `https://api.trackingmore.com/v4/trackings/get?tracking_numbers=${encodeURIComponent(input.documentNumber)}`,
          { method: "GET", headers },
        );
        raw = { create: created.body, tracking: details.body };
        if (!details.ok && !created.ok) {
          return { ...base, raw, message: `تعذر جلب التتبع: ${String(details.body?.message ?? created.body?.message ?? "خطأ من المزوّد")}` };
        }
      }
      return {
        ok: true, provider, raw,
        normalized: normalizeCarrierData((raw.tracking ?? raw) as Record<string, any>, input),
        message: "تم جلب بيانات حقيقية من مزوّد التتبع",
      };
    } catch (error) {
      return { ...base, message: `تعذر الاتصال بـ TrackingMore: ${error instanceof Error ? error.message : "timeout"}` };
    }
  }

  if (provider === "custom") {
    const key = input.apiKey || process.env.CARRIER_API_KEY;
    const url = input.apiUrl || process.env.CARRIER_LOOKUP_URL || process.env.CARRIER_API_URL;
    if (!url || !key) return { ...base, message: "رابط الـ API أو مفتاح الناقل غير مُدخل في إعدادات الربط" };
    try {
      const result = await requestJson(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          documentNumber: input.documentNumber,
          carrierCode: input.carrierCode,
          courierCode: input.providerCode,
          type: input.isAir ? "AWB" : "B/L",
        }),
      });
      const raw = result.body;
      if (!result.ok) return { ...base, raw, message: `رد الناقل: ${String(raw.message ?? raw.error ?? "طلب غير مقبول")}` };
      return {
        ok: true, provider, raw,
        normalized: normalizeCarrierData(raw, input),
        message: "تم جلب بيانات حقيقية من بوابة الناقل",
      };
    } catch (error) {
      return { ...base, message: `تعذر الاتصال ببوابة الناقل: ${error instanceof Error ? error.message : "timeout"}` };
    }
  }

  if (provider === "official" && (input.apiUrl || process.env.CARRIER_LOOKUP_URL) && (input.apiKey || process.env.CARRIER_API_KEY)) {
    return fetchCarrierData({ ...input, provider: "custom" });
  }

  return {
    ...base,
    message: "لا يوجد مفتاح API مفعّل لهذا الناقل؛ البيانات الحقيقية متاحة على موقعه الرسمي عبر رابط التتبع",
  };
}
