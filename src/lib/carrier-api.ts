import { detectTrackingNumber, type TrackingDetection } from "@/lib/carrier-directory";
import { lookupLive, readProviderConfig, type LiveResult } from "@/lib/dcsa";

export type CarrierLookup = { detection: TrackingDetection; live: LiveResult };
const cache = new Map<string, { expiresAt: number; value: LiveResult }>();

function empty(kind: LiveResult["kind"], status: LiveResult["status"], message: string, provider: string | null = null, httpStatus: number | null = null, raw: unknown = null): LiveResult {
  return { kind, status, message, provider, httpStatus, raw, events: [], fetchedAt: new Date().toISOString() };
}

async function decode(response: Response): Promise<Record<string, any>> {
  const text = await response.text();
  try { return JSON.parse(text) as Record<string, any>; }
  catch { return { raw: text.slice(0, 600) }; }
}

function fail(kind: LiveResult["kind"], statusCode: number, raw: Record<string, any>, provider: string): LiveResult {
  const status = statusCode === 401 || statusCode === 403 ? "unauthorized" : statusCode === 404 ? "not_found" : "error";
  const info = String(raw.meta?.message ?? raw.message ?? raw.error ?? `HTTP ${statusCode}`).slice(0, 180);
  return empty(kind, status, `${provider} لم يُرجع بيانات: ${info}`, provider, statusCode, raw);
}

function airlineEvents(raw: Record<string, any>) {
  const candidates = [
    raw.shipmentTrackingStatus?.shipment?.milestones,
    raw.shipmentTrackingStatus?.milestones,
    raw.ShipmentTracking?.Shipment?.Milestone,
    raw.ShipmentDetails?.Progress?.Events,
    raw.ShipmentDetails?.Progress?.Routes,
    raw.events,
  ];
  const flat = candidates.flatMap((value) => Array.isArray(value) ? value : value && typeof value === "object" ? [value] : []);
  return flat.flatMap((item: Record<string, any>) => {
    const nested = Array.isArray(item.events) ? item.events : [item];
    return nested.flatMap((event: Record<string, any>) => {
      const date = event.actualTime ?? event.actual_date ?? event.eventDateTime ?? event.plannedTime ?? event.dateUtc ?? null;
      if (!date || Number.isNaN(new Date(date).getTime())) return [];
      return [{
        title: String(event.type ?? event.status ?? event.eventType ?? item.type ?? "تحديث رحلة جوية"),
        description: event.flightNumber ? `الرحلة ${event.flightNumber}` : null,
        location: event.station ?? event.routingLocationId ?? item.station ?? null,
        occurredAt: new Date(date).toISOString(), type: "integration" as const, source: "provider" as const,
      }];
    });
  });
}

async function trackLufthansa(number: string, clientId: string, clientSecret: string): Promise<LiveResult> {
  const provider = "Lufthansa Open API";
  try {
    const tokenResponse = await fetch("https://api.lufthansa.com/v1/oauth/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials" }),
      signal: AbortSignal.timeout(12_000), cache: "no-store",
    });
    const tokenBody = await decode(tokenResponse);
    if (!tokenResponse.ok || !tokenBody.access_token) return fail("lufthansa", tokenResponse.status, { message: "تصريح Lufthansa OAuth غير صالح أو لا يتيح Cargo Tracking." }, provider);
    const response = await fetch(`https://api.lufthansa.com/v1/cargo/shipmentTracking/${number.slice(0, 3)}-${number.slice(3)}`, {
      headers: { Authorization: `Bearer ${tokenBody.access_token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(15_000), cache: "no-store",
    });
    const raw = await decode(response);
    if (!response.ok) return fail("lufthansa", response.status, raw, provider);
    const events = airlineEvents(raw);
    if (!Object.keys(raw).some((key) => /shipment|tracking|status/i.test(key)) && !events.length) {
      return empty("lufthansa", "not_found", "لم يؤكد Lufthansa وجود هذه البوليصة.", provider, response.status, raw);
    }
    return { kind: "lufthansa", status: "ok", provider, httpStatus: response.status,
      message: events.length ? `وصلت ${events.length} حركة حقيقية من Lufthansa.` : "وصلت بيانات البوليصة من Lufthansa، لكن الرد بلا حركات مؤرخة قابلة للعرض؛ راجع التفاصيل الخام.",
      events, raw, fetchedAt: new Date().toISOString() };
  } catch (error) {
    return empty("lufthansa", "error", `تعذّر الاتصال بـLufthansa: ${error instanceof Error ? error.message : "خطأ شبكة"}`);
  }
}

async function trackAfkl(number: string, token: string): Promise<LiveResult> {
  const provider = "Air France-KLM Cargo API";
  try {
    const base = process.env.AFKL_CARGO_API_URL || "https://api.klm.com/cargo/tracking/awbs";
    const url = new URL(`${base.replace(/\/$/, "")}/${number.slice(0, 3)}-${number.slice(3)}`);
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(15_000), cache: "no-store",
    });
    const raw = await decode(response);
    if (!response.ok) return fail("afkl", response.status, raw, provider);
    const events = airlineEvents(raw);
    if (!raw.ShipmentDetails && !raw.shipmentDetails && !events.length) return empty("afkl", "not_found", "لم يؤكد مزوّد Air France-KLM وجود هذه البوليصة.", provider, response.status, raw);
    return { kind: "afkl", status: "ok", provider, httpStatus: response.status,
      message: events.length ? `وصلت ${events.length} حركة حقيقية من Air France-KLM.` : "وصلت بيانات البوليصة من Air France-KLM؛ راجع تفاصيل الرد الخام.",
      events, raw, fetchedAt: new Date().toISOString() };
  } catch (error) {
    return empty("afkl", "error", `تعذّر الاتصال بـAir France-KLM: ${error instanceof Error ? error.message : "خطأ شبكة"}`);
  }
}

async function trackAwb(number: string, key: string): Promise<LiveResult> {
  const provider = "TrackingMore Air Cargo";
  try {
    const response = await fetch("https://api.trackingmore.com/v4/awb", {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(15_000),
      headers: { "Tracking-Api-Key": key, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ awb_number: `${number.slice(0, 3)}-${number.slice(3)}` }),
    });
    const raw = await decode(response);
    if (!response.ok || Number(raw.meta?.code ?? 200) !== 200) return fail("trackingmore", response.status, raw, provider);
    const data = (raw.data ?? {}) as Record<string, any>;
    if (!data.awb_number || ["notfound", "expired"].includes(String(data.awb_status ?? "").toLowerCase())) {
      return empty("trackingmore", "not_found", "المزوّد لم يعثر على بوليصة نشطة بهذا الرقم.", provider, response.status, raw);
    }
    const trackInfo = Array.isArray(data.track_info) ? data.track_info : data.track_info && typeof data.track_info === "object" ? [data.track_info] : [];
    const events = trackInfo.flatMap((event: Record<string, any>) => {
      const date = event.actual_date ?? event.plan_date ?? null;
      if (!date || Number.isNaN(new Date(date).getTime())) return [];
      return [{
        title: String(event.event ?? event.status ?? data.awb_status ?? "تحديث بوليصة جوية"),
        description: [event.flight_number ? `الرحلة ${event.flight_number}` : null, event.piece ? `الطرود ${event.piece}` : null].filter(Boolean).join(" · ") || null,
        location: event.station ? String(event.station) : null,
        occurredAt: new Date(date).toISOString(),
        type: "integration" as const,
        source: "provider" as const,
      }];
    });
    return { kind: "trackingmore", status: "ok", provider, httpStatus: response.status,
      message: events.length ? `بيانات حقيقية من ${provider}: ${events.length} تحديث.` : `عُثر على البوليصة لدى ${provider} (${data.awb_status ?? "قيد التتبع"}) بدون حركات مؤرخة بعد.`,
      events, raw, fetchedAt: new Date().toISOString() };
  } catch (error) {
    return empty("trackingmore", "error", `تعذّر الاتصال بـ${provider}: ${error instanceof Error ? error.message : "خطأ شبكة"}`);
  }
}

async function trackDhl(number: string, key: string): Promise<LiveResult> {
  const provider = "DHL Unified Tracking";
  try {
    const url = new URL("https://api-eu.dhl.com/track/shipments");
    url.searchParams.set("trackingNumber", number);
    const response = await fetch(url, {
      headers: { "DHL-API-Key": key, Accept: "application/json" },
      signal: AbortSignal.timeout(15_000), cache: "no-store",
    });
    const raw = await decode(response);
    if (!response.ok) return fail("dhl", response.status, raw, provider);
    const shipment = Array.isArray(raw.shipments) ? raw.shipments[0] : null;
    if (!shipment) return empty("dhl", "not_found", "DHL لم يعثر على رقم التتبع.", provider, response.status, raw);
    const events = (Array.isArray(shipment.events) ? shipment.events : []).flatMap((event: Record<string, any>) => {
      const when = event.timestamp ?? event.date ?? null;
      if (!when || Number.isNaN(new Date(when).getTime())) return [];
      return [{
        title: String(event.status?.description ?? event.description ?? event.status?.statusCode ?? "تحديث DHL"),
        description: event.status?.remark ? String(event.status.remark) : null,
        location: event.location?.address?.addressLocality ?? event.location?.address?.countryCode ?? null,
        occurredAt: new Date(when).toISOString(),
        type: "integration" as const,
        source: "provider" as const,
      }];
    });
    return { kind: "dhl", status: "ok", provider, httpStatus: response.status,
      message: `بيانات حقيقية من DHL${events.length ? `: ${events.length} حركة` : "؛ لا توجد حركات مؤرخة بعد"}.`,
      events, raw, fetchedAt: new Date().toISOString() };
  } catch (error) {
    return empty("dhl", "error", `تعذّر الاتصال بـDHL: ${error instanceof Error ? error.message : "خطأ شبكة"}`);
  }
}

const COURIER_CODES: Record<string, string> = { UPS: "ups", FDX: "fedex", ARX: "aramex", DHL: "dhl" };

async function trackCourier(number: string, key: string, carrierCode: string): Promise<LiveResult> {
  const provider = `TrackingMore (${carrierCode})`;
  const rawMap = process.env.TRACKINGMORE_COURIER_CODES;
  let mapping = COURIER_CODES;
  if (rawMap) {
    try { mapping = { ...COURIER_CODES, ...JSON.parse(rawMap) }; }
    catch { /* use documented defaults */ }
  }
  const courierCode = mapping[carrierCode];
  if (!courierCode) return empty("trackingmore", "unconfigured", `كود ${carrierCode} لدى المزوّد غير مضبوط.`);
  try {
    const response = await fetch("https://api.trackingmore.com/v4/trackings/create", {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(15_000),
      headers: { "Tracking-Api-Key": key, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ tracking_number: number, courier_code: courierCode }),
    });
    const raw = await decode(response);
    if (!response.ok || Number(raw.meta?.code ?? 200) !== 200) return fail("trackingmore", response.status, raw, provider);
    const data = (raw.data ?? {}) as Record<string, any>;
    if (!data.tracking_number && !data.id) return empty("trackingmore", "not_found", "المزوّد لم يؤكد تسجيل رقم الشحنة.", provider, response.status, raw);
    const originEvents = Array.isArray(data.origin_info?.trackinfo) ? data.origin_info.trackinfo : [];
    const destinationEvents = Array.isArray(data.destination_info?.trackinfo) ? data.destination_info.trackinfo : [];
    const info = [...originEvents, ...destinationEvents];
    const events = info.flatMap((event: Record<string, any>) => {
      const when = event.checkpoint_date ?? event.time ?? null;
      if (!when || Number.isNaN(new Date(when).getTime())) return [];
      return [{
        title: String(event.checkpoint_status ?? event.status ?? "تحديث طرد"),
        description: event.details ? String(event.details) : null,
        location: event.location ? String(event.location) : null,
        occurredAt: new Date(when).toISOString(), type: "integration" as const, source: "provider" as const,
      }];
    });
    return { kind: "trackingmore", status: "ok", provider, httpStatus: response.status,
      message: events.length ? `تم استلام ${events.length} حركة من ${provider}.` : `الشحنة مسجلة لدى ${provider} بدون حركات مؤرخة بعد.`,
      events, raw, fetchedAt: new Date().toISOString() };
  } catch (error) {
    return empty("trackingmore", "error", `تعذّر الاتصال بـ${provider}: ${error instanceof Error ? error.message : "خطأ شبكة"}`);
  }
}

/** Returns only actual provider data. Unknown numbers do not get made-up statuses. */
export async function lookupCarrier(query: string, courierHint?: string): Promise<CarrierLookup> {
  const detection = detectTrackingNumber(query, courierHint);
  const normalized = detection.normalized;
  const key = `${detection.kind}:${detection.portal?.code ?? "?"}:${normalized}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return { detection, live: cached.value };

  let live: LiveResult;
  if (detection.kind === "air_waybill") {
    if (normalized.startsWith("020") && process.env.LUFTHANSA_CLIENT_ID && process.env.LUFTHANSA_CLIENT_SECRET) {
      live = await trackLufthansa(normalized, process.env.LUFTHANSA_CLIENT_ID, process.env.LUFTHANSA_CLIENT_SECRET);
    } else if ((normalized.startsWith("057") || normalized.startsWith("074")) && process.env.AFKL_CARGO_TOKEN) {
      live = await trackAfkl(normalized, process.env.AFKL_CARGO_TOKEN);
    } else if (process.env.TRACKINGMORE_API_KEY) {
      live = await trackAwb(normalized, process.env.TRACKINGMORE_API_KEY);
    } else if (readProviderConfig().kind === "generic") {
      live = await lookupLive(query);
    } else {
      live = empty("unconfigured", "unconfigured", "تم تحديد بوليصة AWB، لكن لا يوجد اعتماد API لهذا الناقل. Lufthansa تتطلب OAuth، وAir France-KLM رمزاً معتمداً، ومصر للطيران يمكن تتبعها عبر مزوّد AWB مرخص. افتح موقع الناقل إن لم يتوفر المفتاح.");
    }
  } else if (detection.kind === "courier" && detection.portal?.code === "DHL" && process.env.DHL_API_KEY) {
    live = await trackDhl(normalized, process.env.DHL_API_KEY);
  } else if (detection.kind === "courier" && detection.portal?.code && process.env.TRACKINGMORE_API_KEY) {
    live = await trackCourier(normalized, process.env.TRACKINGMORE_API_KEY, detection.portal.code);
  } else if (detection.kind === "courier" && readProviderConfig().kind === "generic") {
    live = await lookupLive(query);
  } else if (detection.kind === "courier") {
    live = empty("unconfigured", "unconfigured", `تم تحديد ${detection.portal?.name ?? "شركة الطرود"}؛ جلب بياناتها داخل البرنامج يتطلب DHL_API_KEY أو TRACKINGMORE_API_KEY مصرحاً.`);
  } else if (detection.kind === "container" || detection.kind === "bill_of_lading") {
    live = readProviderConfig().kind !== "unconfigured" ? await lookupLive(query)
      : empty("unconfigured", "unconfigured", "تم التعرف على رقم حاوية/بوليصة بحرية. جلب الحركات آلياً يتطلب DCSA أو مزوّد تتبع بحري مرخص؛ رابط الناقل موجود أدناه.");
  } else {
    live = readProviderConfig().kind !== "unconfigured" ? await lookupLive(query)
      : empty("unconfigured", "unconfigured", "لا يمكن تحديد الناقل بثقة من هذا الرقم. اختر شركة الطرود إن كانت شحنتك DHL/FedEx/UPS/Aramex، أو افتح بوابة الشركة الرسمية.");
  }
  if (live.status === "ok") {
    if (cache.size > 100) cache.clear();
    cache.set(key, { expiresAt: Date.now() + 5 * 60_000, value: live });
  }
  return { detection, live };
}
