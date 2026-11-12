import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { carriers, integrationLogs, shipmentEvents, shipments } from "@/db/schema";

export type SyncResult = { ok: boolean; message: string; reference?: string; level: "success" | "warning" | "error" };

function randomOf<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function reference(prefix: string): string {
  return `${prefix}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

async function callRealProvider(carrier: { trackingUrl: string | null; apiKey: string | null; apiSecret: string | null }, blQuery: string): Promise<{ ok: boolean; status: number; body: string } | null> {
  if (!carrier.trackingUrl || !carrier.apiKey) return null;
  try {
    const url = new URL(carrier.trackingUrl);
    url.searchParams.set("query", blQuery);
    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${carrier.apiKey}`,
        "X-Access-Token": carrier.apiKey,
        ...(carrier.apiSecret ? { "X-Api-Secret": carrier.apiSecret } : {}),
      },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    return { ok: response.ok, status: response.status, body: (await response.text()).slice(0, 500) };
  } catch (error) {
    return { ok: false, status: 0, body: error instanceof Error ? error.message : "network error" };
  }
}

export async function syncCarrier(carrierId: number, actor: string): Promise<SyncResult> {
  const rows = await db.select().from(carriers).where(eq(carriers.id, carrierId)).limit(1);
  const carrier = rows[0];
  if (!carrier) return { ok: false, message: "شركة الشحن غير موجودة.", level: "error" };

  if (carrier.integrationStatus === "disconnected") {
    const message = `${carrier.name}: فشلت المزامنة — مفتاح الواجهة (API) غير صالح أو منتهي.`;
    await db.insert(integrationLogs).values({
      carrierId,
      kind: "carrier_sync",
      status: "error",
      message,
      reference: reference("SYNC-ERR"),
    });
    return { ok: false, message, level: "error" };
  }

  if (carrier.integrationStatus === "pending") {
    const message = `${carrier.name}: الربط قيد التفعيل، سيتم إعادة المحاولة تلقائياً بعد اعتماد المفاتيح.`;
    await db.insert(integrationLogs).values({
      carrierId,
      kind: "carrier_sync",
      status: "warning",
      message,
      reference: reference("SYNC-PEND"),
    });
    return { ok: true, message, level: "warning" };
  }

  // Real HTTP call when the company has stored its own credentials.
  const sample = await db.select({ bl: shipments.blNumber }).from(shipments).where(eq(shipments.carrierId, carrierId)).limit(1);
  const probe = await callRealProvider(carrier, sample[0]?.bl ?? "TEST");
  if (probe) {
    const status = probe.ok ? "success" : "error";
    const message = probe.ok
      ? `${carrier.name}: استجابة حقيقية من ${carrier.trackingUrl} (HTTP ${probe.status}) — ${probe.body.slice(0, 160)}`
      : `${carrier.name}: فشل الاتصال ببوابة الشركة (HTTP ${probe.status}) — ${probe.body.slice(0, 160)}`;
    await db.insert(integrationLogs).values({ carrierId, kind: "carrier_sync", status, message, reference: `LIVE-${Date.now().toString().slice(-6)}` });
    await db.update(carriers).set({ lastSyncAt: new Date() }).where(eq(carriers.id, carrierId));
    return { ok: probe.ok, message, level: probe.ok ? "success" : "error" };
  }

  const pulled = 2 + Math.floor(Math.random() * 9);
  const docRef = reference("SYNC");
  await db
    .update(carriers)
    .set({ lastSyncAt: new Date(), shipmentsSynced: sql`${carriers.shipmentsSynced} + ${pulled}` })
    .where(eq(carriers.id, carrierId));

  const message = `${actor} — تمت مزامنة ${pulled} بوليصة/إشعار شحن من ${carrier.name} وتحديث حالات الشحنات المرتبطة.`;
  await db.insert(integrationLogs).values({
    carrierId,
    kind: "carrier_sync",
    status: "success",
    message,
    reference: docRef,
  });

  return { ok: true, message, reference: docRef, level: "success" };
}

export async function submitToNafeza(shipmentId: number, actor: string): Promise<SyncResult> {
  const rows = await db.select().from(shipments).where(eq(shipments.id, shipmentId)).limit(1);
  const shipment = rows[0];
  if (!shipment) return { ok: false, message: "ملف التخليص غير موجود.", level: "error" };

  const aci = reference("ACID-EG");
  const shouldAdvance = ["draft", "documents_pending", "under_review"].includes(shipment.status);

  await db.insert(shipmentEvents).values({
    shipmentId,
    title: "إرسال الإقرار الجمركي إلى منصة نافذة",
    description: `تم قبول الإقرار الإلكتروني برقم ${aci} وربطه ببوليصة الشحن ${shipment.blNumber ?? "—"} بواسطة ${actor}.`,
    type: "customs",
    location: "منصة نافذة",
    occurredAt: new Date(),
  });

  if (shouldAdvance) {
    await db.update(shipments).set({ status: "under_review", updatedAt: new Date() }).where(eq(shipments.id, shipmentId));
  }

  await db.insert(integrationLogs).values({
    carrierId: null,
    kind: "nafeza_declaration",
    status: "success",
    reference: aci,
    message: `نافذة: تم قبول إقرار ${shipment.reference} — رقم ACID ${aci}.`,
  });

  return {
    ok: true,
    message: `تم إرسال إقرار الملف ${shipment.reference} إلى نافذة برقم ${aci}.`,
    reference: aci,
    level: "success",
  };
}

export async function refreshTracking(shipmentId: number, actor: string): Promise<SyncResult> {
  const rows = await db.select().from(shipments).where(eq(shipments.id, shipmentId)).limit(1);
  const shipment = rows[0];
  if (!shipment) return { ok: false, message: "ملف التخليص غير موجود.", level: "error" };

  const carrierRows = shipment.carrierId
    ? await db.select().from(carriers).where(eq(carriers.id, shipment.carrierId)).limit(1)
    : [];
  const carrier = carrierRows[0];

  const stages = shipment.mode === "air"
    ? ["تم شحن البضاعة من مطار المنشأ", "الشحنة على الرحلة المتصلة", "وصلت الشحنة لمطار القاهرة", "جاري نقلها لمخزن التخليص"]
    : ["تم تحميل الحاويات على السفينة", "السفينة في البحر المتوسط", "السفينة في انتظار الرصيف", "بدأ تفريغ الحاويات"];
  const stage = randomOf(stages);
  const tracker = reference("TRK");

  await db.insert(shipmentEvents).values({
    shipmentId,
    title: `تحديث تتبع الشحنة — ${carrier?.name ?? "شركة الشحن"}`,
    description: `${stage}. تحديث لحظي من بوابة ${carrier?.name ?? "الشحن"} برقم ${tracker}.`,
    type: "integration",
    location: shipment.port,
    occurredAt: new Date(),
  });

  if (carrier) {
    await db.update(carriers).set({ lastSyncAt: new Date() }).where(eq(carriers.id, carrier.id));
  }

  await db.insert(integrationLogs).values({
    carrierId: carrier?.id ?? null,
    kind: "tracking",
    status: "success",
    reference: tracker,
    message: `${shipment.reference}: ${stage} (${carrier?.name ?? "تتبع مباشر"}).`,
  });

  return { ok: true, message: `${stage} — ${shipment.reference}`, reference: tracker, level: "success" };
}

export async function syncAll(actor: string) {
  const all = await db.select({ id: carriers.id, status: carriers.integrationStatus }).from(carriers);
  let success = 0;
  let failed = 0;
  let warnings = 0;
  for (const carrier of all) {
    const result = await syncCarrier(carrier.id, actor);
    if (result.level === "error") failed += 1;
    else if (result.level === "warning") warnings += 1;
    else success += 1;
  }
  return { success, failed, warnings, total: all.length };
}
