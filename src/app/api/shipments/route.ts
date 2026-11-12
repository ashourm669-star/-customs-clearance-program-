import { eq } from "drizzle-orm";
import { db } from "@/db";
import { carriers, clients, shipmentEvents, shipments } from "@/db/schema";
import { asNumber, asString, getApiUser, jsonError, nextShipmentReference, unauthorized } from "@/lib/api";
import { shipmentCoreValues } from "@/lib/payloads";
import { getShipmentById, listShipments } from "@/lib/queries";

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorized();
  return Response.json({ shipments: await listShipments() });
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("بيانات الملف غير صالحة.");
  }
  const payload = body as Record<string, unknown>;
  const core = shipmentCoreValues(payload);

  const reference = asString(payload.reference) || (await nextShipmentReference());
  const duplicate = await db.select({ id: shipments.id }).from(shipments).where(eq(shipments.reference, reference)).limit(1);
  if (duplicate.length) return jsonError("رقم الملف مستخدم بالفعل. اختر رقماً آخر.", 409);

  if (!core.clientId) return jsonError("يجب اختيار العميل صاحب الشحنة.");
  const clientExists = await db.select({ id: clients.id }).from(clients).where(eq(clients.id, core.clientId)).limit(1);
  if (!clientExists.length) return jsonError("العميل المختار غير موجود.");
  if (core.carrierId) {
    const carrierExists = await db.select({ id: carriers.id }).from(carriers).where(eq(carriers.id, core.carrierId)).limit(1);
    if (!carrierExists.length) return jsonError("شركة الشحن المختارة غير موجودة.");
  }

  const [created] = await db
    .insert(shipments)
    .values({
      ...core,
      reference,
      brokerName: core.brokerName ?? user.name,
      releasedAt: null,
    })
    .returning({ id: shipments.id });

  await db.insert(shipmentEvents).values({
    shipmentId: created.id,
    title: "فتح ملف التخليص الجمركي",
    description: `تم إنشاء الملف ${reference} بواسطة ${user.name}.`,
    type: "status",
    location: core.port ?? null,
    occurredAt: new Date(),
  });

  const shipment = await getShipmentById(created.id);
  return Response.json({ shipment }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();
  const url = new URL(request.url);
  const ids = (url.searchParams.get("ids") ?? "")
    .split(",")
    .map((value) => asNumber(value))
    .filter((value) => value > 0);
  if (!ids.length) return jsonError("لم يتم تحديد ملفات للحذف.");
  for (const id of ids) {
    await db.delete(shipments).where(eq(shipments.id, id));
  }
  return Response.json({ ok: true, deleted: ids.length });
}
