import { eq } from "drizzle-orm";
import { db } from "@/db";
import { shipmentEvents, shipments } from "@/db/schema";
import { getApiUser, jsonError, notFound, unauthorized } from "@/lib/api";
import { shipmentPatchValues } from "@/lib/payloads";
import { getShipmentById } from "@/lib/queries";
import { SHIPMENT_STATUS_META, type ShipmentStatus } from "@/lib/constants";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const shipment = await getShipmentById(Number(id));
  if (!shipment) return notFound("ملف التخليص");
  return Response.json({ shipment });
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const shipmentId = Number(id);
  if (!Number.isFinite(shipmentId)) return jsonError("رقم الملف غير صالح.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("بيانات التحديث غير صالحة.");
  }
  const payload = body as Record<string, unknown>;

  const existingRows = await db.select().from(shipments).where(eq(shipments.id, shipmentId)).limit(1);
  const existing = existingRows[0];
  if (!existing) return notFound("ملف التخليص");

  const patch = shipmentPatchValues(payload);

  if (patch.status && patch.status !== existing.status) {
    if (["released", "delivered"].includes(patch.status) && !patch.releasedAt) {
      patch.releasedAt = new Date();
    }
    if (patch.status === "on_hold") patch.releasedAt = null;
    await db.insert(shipmentEvents).values({
      shipmentId,
      title: `تحديث حالة الملف إلى «${SHIPMENT_STATUS_META[patch.status as ShipmentStatus]?.label ?? patch.status}»`,
      description: `تم التحديث بواسطة ${user.name}.`,
      type: "status",
      occurredAt: new Date(),
    });
  }

  await db.update(shipments).set(patch).where(eq(shipments.id, shipmentId));
  const shipment = await getShipmentById(shipmentId);
  return Response.json({ shipment });
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const shipmentId = Number(id);
  await db.delete(shipments).where(eq(shipments.id, shipmentId));
  return Response.json({ ok: true });
}
