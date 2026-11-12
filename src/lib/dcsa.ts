import type { LiveEvent } from "@/lib/tracking-types";

export type ProviderConfig =
  | {
      kind: "dcsa";
      baseUrl: string;
      tokenUrl: string;
      clientId: string;
      clientSecret: string;
      scope?: string;
    }
  | { kind: "generic"; url: string; apiKey: string; header: string; queryParam: string }
  | { kind: "unconfigured"; missing: string[] };

export type LiveResult = {
  status: "ok" | "unconfigured" | "unauthorized" | "not_found" | "error";
  provider: string | null;
  kind: ProviderConfig["kind"];
  httpStatus: number | null;
  message: string;
  events: LiveEvent[];
  raw: unknown;
  fetchedAt: string;
};

export function readProviderConfig(): ProviderConfig {
  const dcsaBase = process.env.DCSA_BASE_URL;
  const dcsaToken = process.env.DCSA_TOKEN_URL;
  const dcsaId = process.env.DCSA_CLIENT_ID;
  const dcsaSecret = process.env.DCSA_CLIENT_SECRET;
  const missingDcsa = [
    !dcsaBase && "DCSA_BASE_URL",
    !dcsaToken && "DCSA_TOKEN_URL",
    !dcsaId && "DCSA_CLIENT_ID",
    !dcsaSecret && "DCSA_CLIENT_SECRET",
  ].filter(Boolean) as string[];

  if (missingDcsa.length === 0) {
    return {
      kind: "dcsa",
      baseUrl: dcsaBase as string,
      tokenUrl: dcsaToken as string,
      clientId: dcsaId as string,
      clientSecret: dcsaSecret as string,
      scope: process.env.DCSA_SCOPE,
    };
  }

  const genericUrl = process.env.TRACKING_API_URL;
  const genericKey = process.env.TRACKING_API_KEY;
  if (genericUrl && genericKey) {
    return {
      kind: "generic",
      url: genericUrl,
      apiKey: genericKey,
      header: process.env.TRACKING_API_HEADER ?? "Authorization",
      queryParam: process.env.TRACKING_QUERY_PARAM ?? "query",
    };
  }

  return {
    kind: "unconfigured",
    missing: [
      ...missingDcsa,
      ...(genericUrl ? [] : ["TRACKING_API_URL"]),
      ...(genericKey ? [] : ["TRACKING_API_KEY"]),
    ],
  };
}

function authHeaders(config: Extract<ProviderConfig, { kind: "generic" }>) {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (config.header.toLowerCase() === "authorization") {
    headers.Authorization = config.apiKey.startsWith("Bearer ") ? config.apiKey : `Bearer ${config.apiKey}`;
  } else {
    headers[config.header] = config.apiKey;
  }
  return headers;
}

async function requestToken(config: Extract<ProviderConfig, { kind: "dcsa" }>) {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    ...(config.scope ? { scope: config.scope } : {}),
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
    signal: AbortSignal.timeout(12_000),
    cache: "no-store",
  });
  const text = await response.text();
  if (!response.ok) {
    return { ok: false as const, httpStatus: response.status, detail: text.slice(0, 400) };
  }
  try {
    const json = JSON.parse(text) as { access_token?: string };
    if (!json.access_token) return { ok: false as const, httpStatus: response.status, detail: "الرد لا يحتوي access_token" };
    return { ok: true as const, token: json.access_token };
  } catch {
    return { ok: false as const, httpStatus: response.status, detail: "الرد ليس JSON صالحاً" };
  }
}

type DcsaEvent = {
  eventID?: string;
  eventType?: string;
  eventClassifierCode?: string;
  eventDateTime?: string;
  description?: string;
  location?: { locationName?: string; UNLocationCode?: string; countryCode?: string };
  transportCall?: {
    UNLocationCode?: string;
    location?: { locationName?: string };
    vessel?: { vesselName?: string; vesselIMONumber?: string };
    voyage?: { carrierVoyageNumber?: string };
  };
  transportDocumentReference?: string;
  equipmentReference?: string;
  shipmentEventTypeCode?: string;
};

function humanizeDcsaType(event: DcsaEvent): string {
  const code = (event.eventType ?? event.shipmentEventTypeCode ?? "").toUpperCase();
  const map: Record<string, string> = {
    SHIPMENT: "تحديث شحنة",
    TRANSPORT: "حركة النقل",
    EQUIPMENT: "حركة حاوية",
    TRANSPORTEQUIPMENT: "حركة حاوية/نقل",
    GATEIN: "دخول المحطة",
    GATEOUT: "خروج من المحطة",
    LOAD: "تحميل على السفينة",
    DISCHARGE: "تفريغ من السفينة",
    ARRIVAL: "وصول",
    DEPARTURE: "مغادرة",
    "TRANSPORT.DEPARTURE": "مغادرة",
    "TRANSPORT.ARRIVAL": "وصول",
    "EQUIPMENT.DISCHARGE": "تفريغ الحاوية",
    "EQUIPMENT.LOAD": "تحميل الحاوية",
  };
  return map[code] ?? (code ? `حركة ${code}` : "تحديث تتبع");
}

export function normalizeDcsaEvents(raw: unknown): LiveEvent[] {
  const list: DcsaEvent[] = Array.isArray(raw)
    ? (raw as DcsaEvent[])
    : ((raw as { events?: DcsaEvent[] })?.events ?? []);

  return list
    .filter((event) => Boolean(event?.eventDateTime ?? event?.description))
    .map((event) => {
      const vessel = event.transportCall?.vessel?.vesselName;
      const voyage = event.transportCall?.voyage?.carrierVoyageNumber;
      const location =
        event.location?.locationName ??
        event.transportCall?.location?.locationName ??
        event.transportCall?.UNLocationCode ??
        event.location?.UNLocationCode ??
        null;
      const parts = [
        event.description,
        vessel ? `السفينة: ${vessel}` : null,
        voyage ? `الرحلة: ${voyage}` : null,
        event.equipmentReference ? `الحاوية: ${event.equipmentReference}` : null,
      ].filter(Boolean);

      return {
        title: humanizeDcsaType(event),
        description: parts.join(" · ") || null,
        location,
        occurredAt: event.eventDateTime ?? new Date().toISOString(),
        type: "integration" as const,
        source: "dcsa" as const,
      };
    })
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}

/** Best-effort normalization for non-DCSA gateways (ShipsGo / Vizion / custom). */
export function normalizeGenericEvents(raw: unknown): LiveEvent[] {
  type Loose = Record<string, unknown>;
  const candidates: Loose[] = [];
  const pushArray = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item && typeof item === "object") candidates.push(item as Loose);
      });
    }
  };

  const root = raw as Loose | null;
  if (root && typeof root === "object") {
    pushArray(root.events);
    pushArray(root.data);
    pushArray(root.tracking);
    pushArray(root.movements);
    pushArray(root.containers);
    const data = root.data as Loose | undefined;
    if (data && typeof data === "object") {
      pushArray(data.events);
      pushArray(data.movements);
      pushArray(data.containers);
      pushArray((data as { tracking?: unknown }).tracking);
    }
    if (candidates.length === 0) candidates.push(root);
  }

  return candidates
    .map((item) => {
      const pick = (...keys: string[]) => {
        for (const key of keys) {
          const value = item[key];
          if (typeof value === "string" && value.trim()) return value.trim();
        }
        return null;
      };
      const title = pick("title", "event", "status", "name", "movement", "description") ?? "تحديث تتبع";
      const description =
        pick("details", "detail", "remark", "remarks", "message", "vessel", "voyage", "carrier") ?? null;
      const location = pick("location", "port", "place", "unLocationCode", "city");
      const occurredAt =
        pick("date", "timestamp", "eventDate", "occurredAt", "createdAt", "actualDate", "eta", "dateTime") ??
        new Date().toISOString();
      return {
        title,
        description,
        location,
        occurredAt: Number.isNaN(new Date(occurredAt).getTime()) ? new Date().toISOString() : occurredAt,
        type: "integration" as const,
        source: "provider" as const,
      };
    })
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}

export async function lookupLive(query: string): Promise<LiveResult> {
  const config = readProviderConfig();
  const base: Pick<LiveResult, "provider" | "kind" | "httpStatus" | "fetchedAt"> = {
    provider: null,
    kind: config.kind,
    httpStatus: null,
    fetchedAt: new Date().toISOString(),
  };

  if (config.kind === "unconfigured") {
    return {
      ...base,
      status: "unconfigured",
      message: `لم يتم إعداد مفاتيح أي مزوّد تتبع. المتغيرات الناقصة: ${config.missing.slice(0, 4).join(" · ")}`,
      events: [],
      raw: null,
    };
  }

  try {
    if (config.kind === "dcsa") {
      const host = new URL(config.baseUrl).host;
      const token = await requestToken(config);
      if (!token.ok) {
        return {
          ...base,
          provider: host,
          status: token.httpStatus === 401 || token.httpStatus === 403 ? "unauthorized" : "error",
          httpStatus: token.httpStatus,
          message: `فشل الحصول على توكن DCSA (HTTP ${token.httpStatus}). تحقق من Client ID/Secret. ${token.detail}`,
          events: [],
          raw: token.detail,
        };
      }

      const url = new URL(config.baseUrl);
      url.searchParams.set("transportDocumentReference", query);
      const response = await fetch(url.toString(), {
        headers: { Accept: "application/json", Authorization: `Bearer ${token.token}` },
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      });
      const text = await response.text();
      let raw: unknown = text;
      try {
        raw = JSON.parse(text);
      } catch {
        // keep raw
      }

      if (response.status === 404) {
        return {
          ...base,
          provider: host,
          status: "not_found",
          httpStatus: 404,
          message: "المزوّد لم يجد أي أحداث لهذه البوليصة (404). تأكد من الرقم أو من أن الشركة تفعّل التتبع له.",
          events: [],
          raw,
        };
      }
      if (!response.ok) {
        return {
          ...base,
          provider: host,
          status: response.status === 401 || response.status === 403 ? "unauthorized" : "error",
          httpStatus: response.status,
          message: `المزوّد رفض الطلب (HTTP ${response.status}). ${response.status === 403 ? "تحقق من صلاحية الوصول لهذه الشحنة." : ""}`.trim(),
          events: [],
          raw,
        };
      }

      const events = normalizeDcsaEvents(raw);
      return {
        ...base,
        provider: host,
        status: "ok",
        httpStatus: response.status,
        message: events.length
          ? `تم استلام ${events.length} حركة حقيقية من ${host}.`
          : "استجابة ناجحة لكن لا تحتوي أحداثاً — قد تكون البوليصة بلا حركات مسجّلة بعد.",
        events,
        raw,
      };
    }

    const url = new URL(config.url);
    url.searchParams.set(config.queryParam, query);
    const response = await fetch(url.toString(), {
      headers: authHeaders(config),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    const text = await response.text();
    let raw: unknown = text;
    try {
      raw = JSON.parse(text);
    } catch {
      // keep raw
    }
    const host = url.host;
    if (!response.ok) {
      return {
        ...base,
        provider: host,
        status: response.status === 401 || response.status === 403 ? "unauthorized" : response.status === 404 ? "not_found" : "error",
        httpStatus: response.status,
        message: `المزوّد أرجع HTTP ${response.status}. ${text.slice(0, 160)}`,
        events: [],
        raw,
      };
    }
    const events = normalizeGenericEvents(raw);
    return {
      ...base,
      provider: host,
      status: "ok",
      httpStatus: response.status,
      message: events.length ? `تم استلام ${events.length} حركة من ${host}.` : "استجابة ناجحة بدون أحداث قابلة للعرض.",
      events,
      raw,
    };
  } catch (error) {
    const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return {
      ...base,
      status: "error",
      message: timeout ? "انتهت مهلة الاتصال بالمزوّد (15 ثانية)." : "تعذّر الوصول إلى المزوّد — تحقق من الرابط والشبكة.",
      events: [],
      raw: error instanceof Error ? error.message : null,
    };
  }
}
