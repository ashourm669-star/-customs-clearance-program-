/**
 * Integration layer for Nafeza (Egyptian Single Window) and carrier APIs.
 *
 * The app works in two modes:
 *  - "sandbox": no credentials configured -> the exchange is simulated, validated
 *    and fully persisted in nafeza_events (including request + response payload).
 *  - "live": NAFEZA_API_URL/NAFEZA_API_KEY or CARRIER_API_URL/CARRIER_API_KEY are
 *    configured -> a real signed HTTPS POST is sent to the configured endpoint.
 */

export type IntegrationAction = "acid" | "declaration" | "manifest" | "carrier_test" | "sync_all";
export type IntegrationMode = "sandbox" | "live";
export type Entity = Record<string, any>;

export type DispatchResult = {
  mode: IntegrationMode;
  ok: boolean;
  status: "accepted" | "rejected" | "pending";
  message: string;
  reference: string;
  channel: string;
  payload: Entity;
  response: Entity;
  updates?: { acidNumber?: string; status?: string };
  issues: string[];
};

export function integrationConfig() {
  const nafezaUrl = process.env.NAFEZA_API_URL ?? "";
  const nafezaKey = process.env.NAFEZA_API_KEY ?? "";
  const carrierUrl = process.env.CARRIER_API_URL ?? "";
  const carrierKey = process.env.CARRIER_API_KEY ?? "";
  const carrierLookupUrl = process.env.CARRIER_LOOKUP_URL ?? "";
  return {
    mode: (nafezaUrl && nafezaKey) || (carrierUrl && carrierKey) ? "live" : "sandbox",
    nafezaConfigured: Boolean(nafezaUrl && nafezaKey),
    carrierConfigured: Boolean(carrierUrl && carrierKey),
    nafezaUrl: nafezaUrl || "https://api.nafeza.gov.eg/v2/declarations",
    carrierUrl: carrierUrl || "https://api.nafeza.gov.eg/v2/carriers/manifest",
    carrierLookupUrl: carrierLookupUrl || "https://api.nafeza.gov.eg/v2/carriers/manifest/lookup",
    requiredEnv: ["NAFEZA_API_URL", "NAFEZA_API_KEY", "CARRIER_API_URL", "CARRIER_API_KEY"],
  } as const;
}

export function buildPayload(
  action: IntegrationAction,
  shipment?: Entity,
  carrier?: Entity,
  port?: Entity,
  client?: Entity,
): Entity {
  const base: Entity = {
    eventType: action,
    sentAt: new Date().toISOString(),
    source: "al-arabi-customs-erp",
    operator: "الشركة العربي للخدمات الجمركية واللوجستية",
  };
  if (carrier) {
    base.carrier = {
      code: carrier.code ?? null,
      name: carrier.englishName ?? carrier.name ?? null,
      nafezaCode: carrier.nafezaCode ?? null,
      integration: carrier.integration ?? null,
      endpoint: carrier.apiEndpoint ?? null,
    };
  }
  if (port) {
    base.port = { code: port.code ?? null, customsOffice: port.customsOffice ?? null, nafezaCode: port.nafezaCode ?? null };
  }
  if (shipment) {
    base.shipment = {
      refNo: shipment.refNo ?? null,
      acidNumber: shipment.acidNumber ?? null,
      declarationNumber: shipment.declarationNumber ?? null,
      transportDocument: shipment.transportRef ?? null,
      direction: shipment.direction ?? null,
      mode: shipment.mode ?? null,
      goodsDescription: shipment.goodsDescription ?? null,
      packages: shipment.packages ?? null,
      weightKg: shipment.weightKg ?? null,
      cargoValue: shipment.cargoValue ?? null,
      currency: shipment.currency ?? null,
      eta: shipment.eta ?? null,
    };
    base.importer = client ? { name: client.name, taxNumber: client.taxNumber ?? null } : null;
  }
  return base;
}

function validate(action: IntegrationAction, payload: Entity, carrier?: Entity): string[] {
  const issues: string[] = [];
  const shipment = payload.shipment as Entity | undefined;
  if (action === "carrier_test" || action === "sync_all") {
    if (!carrier?.code) issues.push("كود الناقل غير مسجل");
    if (!carrier?.nafezaCode) issues.push("كود ربط الناقل مع نافذة مفقود");
    if (carrier?.integration !== "connected") issues.push("الناقل غير متصل عبر API");
    return issues;
  }
  if (!shipment) { issues.push("لا توجد شحنة مرتبطة بالطلب"); return issues; }
  if (!shipment.acidNumber) issues.push("رقم ACID غير مسجل على الشحنة");
  if (!shipment.transportDocument) issues.push("رقم بوليصة الشحن / AWB مفقود");
  if (!shipment.declarationNumber) issues.push("رقم البيان الجمركي مفقود");
  if (!payload.carrier?.code) issues.push("الناقل غير محدد على الشحنة");
  if (!payload.port?.nafezaCode) issues.push("منفذ الدخول غير مرتبط بنافذة");
  return issues;
}

async function postExternal(url: string, key: string, payload: Entity): Promise<{ ok: boolean; body: Entity }> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "X-Source": "al-arabi-erp" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(9000),
    cache: "no-store",
  });
  const text = await response.text();
  let body: Entity;
  try { body = JSON.parse(text) as Entity; } catch { body = { raw: text.slice(0, 1000) }; }
  return { ok: response.ok, body };
}

export async function dispatch(input: {
  action: IntegrationAction;
  shipment?: Entity;
  carrier?: Entity;
  port?: Entity;
  client?: Entity;
  note?: string;
}): Promise<DispatchResult> {
  const config = integrationConfig();
  const { action, shipment, carrier, port, client, note } = input;
  const isCarrierAction = action === "carrier_test" || action === "sync_all";
  const liveForAction = isCarrierAction ? config.carrierConfigured : config.nafezaConfigured;
  const mode: IntegrationMode = liveForAction ? "live" : "sandbox";

  let generatedAcid: string | undefined;
  let workingShipment = shipment ? { ...shipment } : undefined;
  if (action === "acid" && workingShipment && !workingShipment.acidNumber) {
    generatedAcid = `ACID-${new Date().getFullYear()}-${Math.floor(1000000 + Math.random() * 8999999)}`;
    workingShipment = { ...workingShipment, acidNumber: generatedAcid };
  }

  const payload = buildPayload(action, workingShipment, carrier, port, client);
  if (note) payload.note = note;
  const issues = validate(action, payload, carrier);
  const reference = workingShipment?.acidNumber ?? workingShipment?.refNo ?? carrier?.nafezaCode ?? `NFZ-${Date.now().toString().slice(-10)}`;
  const channel = isCarrierAction ? `API - ${carrier?.code ?? "CARRIER"}` : "نافذة · API v2.4";

  let status: DispatchResult["status"];
  let message: string;
  let response: Entity;
  let ok = false;

  if (mode === "live") {
    const key = isCarrierAction ? process.env.CARRIER_API_KEY! : process.env.NAFEZA_API_KEY!;
    const url = isCarrierAction ? config.carrierUrl : config.nafezaUrl;
    try {
      const result = await postExternal(url, key, payload);
      ok = result.ok;
      status = result.ok ? "accepted" : "rejected";
      response = result.body;
      message = result.ok
        ? `تم استلام رد ${isCarrierAction ? "الناقل" : "منصة نافذة"} بنجاح: ${String(result.body.reference ?? result.body.status ?? "OK")}`
        : `رفض الطلب من الجهة الخارجية: ${String(result.body.message ?? result.body.error ?? "استجابة غير مقبولة")}`;
    } catch (error) {
      status = "pending";
      response = { error: error instanceof Error ? error.message : "connection failed" };
      message = "تعذر الاتصال بالخدمة الخارجية، الطلب مسجل كقيد المعالجة لإعادة المحاولة";
    }
  } else {
    status = issues.length ? "rejected" : "accepted";
    ok = issues.length === 0;
    const labels: Record<IntegrationAction, string> = {
      acid: "تسجيل / اعتماد رقم ACID", declaration: "إرسال البيان الجمركي",
      manifest: "استلام منيفست وبوليصة الشحن", carrier_test: "اختبار اتصال الناقل", sync_all: "مزامنة بيانات الناقلين",
    };
    message = issues.length
      ? `تعذر إتمام ${labels[action]}: ${issues.join(" · ")}`
      : `${labels[action]} تم بنجاح${generatedAcid ? ` - رقم ACID الجديد ${generatedAcid}` : ""} (محاكاة معتمدة، لا يوجد مفتاح ربط فعلي)`;
    response = {
      sandbox: true,
      acknowledgedAt: new Date().toISOString(),
      externalReference: `NFZ-RES-${Date.now().toString().slice(-9)}`,
      validation: issues.length ? issues : "passed",
      manifest: workingShipment
        ? { document: workingShipment.transportRef ?? null, packages: workingShipment.packages ?? null, weightKg: workingShipment.weightKg ?? null, eta: workingShipment.eta ?? null }
        : { carrierCode: carrier?.code ?? null, status: "reachable", lastSync: new Date().toISOString() },
    };
  }

  return {
    mode, ok, status, message, reference, channel, payload, response, issues,
    updates: {
      ...(generatedAcid ? { acidNumber: generatedAcid } : {}),
      ...(action === "declaration" && ok && workingShipment?.status === "new" ? { status: "nafeza" } : {}),
    },
  };
}
