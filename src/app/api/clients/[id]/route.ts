import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { asNumber, asOptionalString, asString, getApiUser, jsonError, notFound, unauthorized } from "@/lib/api";
import { listClients } from "@/lib/queries";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const clientId = Number(id);
  const existing = await db.select({ id: clients.id }).from(clients).where(eq(clients.id, clientId)).limit(1);
  if (!existing.length) return notFound("العميل");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("بيانات غير صالحة.");
  }
  const payload = body as Record<string, unknown>;
  if ("name" in payload && asString(payload.name).length < 2) return jsonError("اسم العميل مطلوب.");

  await db
    .update(clients)
    .set({
      ...(payload.name !== undefined ? { name: asString(payload.name) } : {}),
      ...(payload.nameEn !== undefined ? { nameEn: asOptionalString(payload.nameEn) } : {}),
      ...(payload.contactName !== undefined ? { contactName: asOptionalString(payload.contactName) } : {}),
      ...(payload.email !== undefined ? { email: asOptionalString(payload.email) } : {}),
      ...(payload.phone !== undefined ? { phone: asOptionalString(payload.phone) } : {}),
      ...(payload.taxId !== undefined ? { taxId: asOptionalString(payload.taxId) } : {}),
      ...(payload.country !== undefined ? { country: asString(payload.country, "مصر") } : {}),
      ...(payload.city !== undefined ? { city: asOptionalString(payload.city) } : {}),
      ...(payload.address !== undefined ? { address: asOptionalString(payload.address) } : {}),
      ...(payload.industry !== undefined ? { industry: asOptionalString(payload.industry) } : {}),
      ...(payload.creditLimit !== undefined ? { creditLimit: asNumber(payload.creditLimit) } : {}),
      ...(payload.notes !== undefined ? { notes: asOptionalString(payload.notes) } : {}),
    })
    .where(eq(clients.id, clientId));

  const all = await listClients();
  return Response.json({ client: all.find((item) => item.id === clientId) ?? null });
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  await db.delete(clients).where(eq(clients.id, Number(id)));
  return Response.json({ ok: true });
}
