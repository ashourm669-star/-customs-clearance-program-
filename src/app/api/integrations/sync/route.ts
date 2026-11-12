import { asNumber, asString, getApiUser, jsonError, unauthorized } from "@/lib/api";
import { refreshTracking, submitToNafeza, syncAll, syncCarrier } from "@/lib/integrations";
import { listLogs } from "@/lib/queries";

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const payload = body as Record<string, unknown>;
  const target = asString(payload.target, "all");

  if (target === "carrier") {
    const carrierId = asNumber(payload.carrierId);
    if (!carrierId) return jsonError("يجب تحديد شركة الشحن.");
    const result = await syncCarrier(carrierId, user.name);
    return Response.json({ result, logs: await listLogs(12) });
  }

  if (target === "nafeza") {
    const shipmentId = asNumber(payload.shipmentId);
    if (!shipmentId) return jsonError("يجب تحديد ملف التخليص.");
    const result = await submitToNafeza(shipmentId, user.name);
    return Response.json({ result, logs: await listLogs(12) });
  }

  if (target === "tracking") {
    const shipmentId = asNumber(payload.shipmentId);
    if (!shipmentId) return jsonError("يجب تحديد ملف التخليص.");
    const result = await refreshTracking(shipmentId, user.name);
    return Response.json({ result, logs: await listLogs(12) });
  }

  const summary = await syncAll(user.name);
  return Response.json({
    result: {
      ok: summary.failed === 0,
      level: summary.failed === 0 ? "success" : "warning",
      message: `تمت مزامنة ${summary.success} شركة بنجاح، ${summary.warnings} تحذير، ${summary.failed} فشل من إجمالي ${summary.total}.`,
    },
    summary,
    logs: await listLogs(20),
  });
}
