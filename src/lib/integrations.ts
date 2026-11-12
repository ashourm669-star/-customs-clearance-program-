import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { carriers, integrationLogs, shipments } from "@/db/schema";
import { readProviderConfig } from "@/lib/dcsa";
import { importLiveTracking } from "@/lib/tracking";
import { sendNafezaDeclaration } from "@/lib/nafeza";

export type SyncResult = { ok: boolean; message: string; reference?: string; level: "success" | "warning" | "error" };

async function log(kind: string, status: string, message: string, reference?: string, carrierId?: number | null) {
  await db.insert(integrationLogs).values({ kind, status, message, reference: reference ?? null, carrierId: carrierId ?? null });
}

export async function syncCarrier(carrierId: number, actor: string): Promise<SyncResult> {
  const carrier = (await db.select().from(carriers).where(eq(carriers.id, carrierId)).limit(1))[0];
  if (!carrier) return { ok: false, message: "الناقل غير موجود.", level: "error" };
  if (readProviderConfig().kind === "unconfigured") {
    const message = `${carrier.name}: لا توجد مفاتيح DCSA أو TRACKING_API صالحة؛ لم تتم مزامنة أي بوليصة.`;
    await log("carrier_sync", "warning", message, undefined, carrierId);
    return { ok: false, message, level: "warning" };
  }
  const sample = (await db.select({ blNumber: shipments.blNumber }).from(shipments)
    .where(eq(shipments.carrierId, carrierId)).limit(1))[0];
  if (!sample?.blNumber) {
    const message = `${carrier.name}: لا توجد بوليصة فعلية مرتبطة بالناقل للاستعلام عنها.`;
    await log("carrier_sync", "warning", message, undefined, carrierId);
    return { ok: false, message, level: "warning" };
  }
  const result = await importLiveTracking(sample.blNumber, actor);
  if (!result.ok) {
    await log("carrier_sync", "warning", result.message, sample.blNumber, carrierId);
    return { ok: false, message: result.message, level: "warning" };
  }
  await db.update(carriers).set({
    lastSyncAt: new Date(), integrationStatus: "connected",
    shipmentsSynced: sql`${carriers.shipmentsSynced} + ${result.eventsSaved}`,
  }).where(eq(carriers.id, carrierId));
  const message = `${carrier.name}: رد تتبع حقيقي للبوليصة ${sample.blNumber}؛ حُفظت ${result.eventsSaved} حركة جديدة.`;
  await log("carrier_sync", "success", message, sample.blNumber, carrierId);
  return { ok: true, message, reference: sample.blNumber, level: "success" };
}

export async function submitToNafeza(shipmentId: number, actor: string): Promise<SyncResult> {
  const shipment = (await db.select().from(shipments).where(eq(shipments.id, shipmentId)).limit(1))[0];
  if (!shipment) return { ok: false, message: "ملف التخليص غير موجود.", level: "error" };
  if (!shipment.blNumber) return { ok: false, message: "لا يمكن الإرسال بدون بوليصة مسجلة للملف.", level: "error" };
  const response = await sendNafezaDeclaration(shipment.blNumber, actor);
  const message = response.message;
  await log("nafeza_declaration", response.ok ? "success" : "warning", message, response.reference ?? shipment.reference);
  return {
    ok: response.ok,
    message,
    reference: response.reference ?? undefined,
    level: response.ok ? "success" : "warning",
  };
}

export async function refreshTracking(shipmentId: number, actor: string): Promise<SyncResult> {
  const shipment = (await db.select().from(shipments).where(eq(shipments.id, shipmentId)).limit(1))[0];
  if (!shipment) return { ok: false, message: "ملف التخليص غير موجود.", level: "error" };
  if (!shipment.blNumber) return { ok: false, message: "سجّل رقم البوليصة أولاً.", level: "error" };
  if (readProviderConfig().kind === "unconfigured") {
    return { ok: false, message: "لا يوجد مزوّد تتبع API مُعتمد. افتح بوابة الناقل الرسمية من صفحة التتبع.", level: "warning" };
  }
  const result = await importLiveTracking(shipment.blNumber, actor);
  await log("tracking", result.ok ? "success" : "warning", result.message, shipment.blNumber, shipment.carrierId);
  return { ok: result.ok, message: result.message, reference: shipment.blNumber, level: result.ok ? "success" : "warning" };
}

export async function syncAll(actor: string) {
  const all = await db.select({ id: carriers.id, type: carriers.type }).from(carriers);
  let success = 0;
  let failed = 0;
  let warnings = 0;
  for (const carrier of all.filter((item) => item.type !== "platform")) {
    const result = await syncCarrier(carrier.id, actor);
    if (result.level === "error") failed += 1;
    else if (result.level === "warning") warnings += 1;
    else success += 1;
  }
  return { success, failed, warnings, total: success + warnings + failed };
}
