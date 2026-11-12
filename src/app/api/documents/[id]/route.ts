import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documents, shipmentEvents } from "@/db/schema";
import { asOptionalString, asString, getApiUser, jsonError, notFound, unauthorized } from "@/lib/api";
import { DOC_STATUSES, DOC_STATUS_META, DOC_TYPES } from "@/lib/constants";
import { listDocuments } from "@/lib/queries";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const documentId = Number(id);
  const rows = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
  const existing = rows[0];
  if (!existing) return notFound("المستند");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("بيانات غير صالحة.");
  }
  const payload = body as Record<string, unknown>;
  const status = asString(payload.status);
  const type = asString(payload.type);
  const name = asString(payload.name);

  await db
    .update(documents)
    .set({
      ...(name ? { name } : {}),
      ...(type && (DOC_TYPES as readonly string[]).includes(type) ? { type } : {}),
      ...(status && (DOC_STATUSES as readonly string[]).includes(status) ? { status } : {}),
      ...(payload.notes !== undefined ? {} : {}),
    })
    .where(eq(documents.id, documentId));

  void asOptionalString(payload.notes);

  if (status && status !== existing.status) {
    await db.insert(shipmentEvents).values({
      shipmentId: existing.shipmentId,
      title: `تحديث حالة المستند «${existing.name}»`,
      description: `الحالة الجديدة: ${DOC_STATUS_META[status]?.label ?? status} — بواسطة ${user.name}.`,
      type: "document",
      occurredAt: new Date(),
    });
  }

  const all = await listDocuments();
  return Response.json({ document: all.find((item) => item.id === documentId) ?? null });
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  await db.delete(documents).where(eq(documents.id, Number(id)));
  return Response.json({ ok: true });
}
