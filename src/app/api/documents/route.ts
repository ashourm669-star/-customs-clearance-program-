import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documents, shipmentEvents, shipments } from "@/db/schema";
import { asNumber, asOptionalString, asString, getApiUser, jsonError, unauthorized } from "@/lib/api";
import { DOC_STATUSES, DOC_TYPES } from "@/lib/constants";
import { listDocuments } from "@/lib/queries";

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorized();
  return Response.json({ documents: await listDocuments() });
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("بيانات غير صالحة.");
  }
  const payload = body as Record<string, unknown>;
  const shipmentId = asNumber(payload.shipmentId);
  const name = asString(payload.name);
  if (!shipmentId) return jsonError("يجب تحديد ملف التخليص.");
  if (!name) return jsonError("اسم المستند مطلوب.");

  const rows = await db.select({ reference: shipments.reference }).from(shipments).where(eq(shipments.id, shipmentId)).limit(1);
  if (!rows.length) return jsonError("ملف التخليص غير موجود.", 404);

  const type = (DOC_TYPES as readonly string[]).includes(asString(payload.type)) ? asString(payload.type) : "other";
  const status = (DOC_STATUSES as readonly string[]).includes(asString(payload.status)) ? asString(payload.status) : "pending";

  const [created] = await db
    .insert(documents)
    .values({
      shipmentId,
      name,
      type,
      status,
      sizeKb: asNumber(payload.sizeKb) > 0 ? asNumber(payload.sizeKb) : Math.floor(120 + Math.random() * 900),
      uploadedBy: user.name,
    })
    .returning({ id: documents.id });

  await db.insert(shipmentEvents).values({
    shipmentId,
    title: `إضافة مستند: ${name}`,
    description: `تم رفع المستند على الملف ${rows[0].reference} بواسطة ${user.name}.`,
    type: "document",
    location: null,
    occurredAt: new Date(),
  });

  void asOptionalString(payload.notes);
  const all = await listDocuments();
  return Response.json({ document: all.find((item) => item.id === created.id) ?? null }, { status: 201 });
}
