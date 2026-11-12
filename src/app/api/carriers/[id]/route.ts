import { eq } from "drizzle-orm";
import { db } from "@/db";
import { carriers } from "@/db/schema";
import { asOptionalString, asString, getApiUser, jsonError, notFound, unauthorized } from "@/lib/api";
import { CARRIER_TYPES, INTEGRATION_STATUSES } from "@/lib/constants";
import { listCarriers } from "@/lib/queries";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const carrierId = Number(id);
  const existing = await db.select({ id: carriers.id }).from(carriers).where(eq(carriers.id, carrierId)).limit(1);
  if (!existing.length) return notFound("شركة الشحن");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("بيانات غير صالحة.");
  }
  const payload = body as Record<string, unknown>;

  if ("name" in payload && !asString(payload.name)) return jsonError("اسم الشركة مطلوب.");
  const type = asString(payload.type);
  const integrationStatus = asString(payload.integrationStatus);

  await db
    .update(carriers)
    .set({
      ...(payload.name !== undefined ? { name: asString(payload.name) } : {}),
      ...(payload.nameEn !== undefined ? { nameEn: asOptionalString(payload.nameEn) } : {}),
      ...(payload.code !== undefined ? { code: asOptionalString(payload.code) } : {}),
      ...(type && (CARRIER_TYPES as readonly string[]).includes(type) ? { type } : {}),
      ...(payload.country !== undefined ? { country: asOptionalString(payload.country) } : {}),
      ...(payload.scac !== undefined ? { scac: asOptionalString(payload.scac) } : {}),
      ...(payload.apiEndpoint !== undefined ? { apiEndpoint: asOptionalString(payload.apiEndpoint) } : {}),
      ...(integrationStatus && (INTEGRATION_STATUSES as readonly string[]).includes(integrationStatus)
        ? { integrationStatus, lastSyncAt: integrationStatus === "connected" ? new Date() : null }
        : {}),
      ...(payload.color !== undefined ? { color: asString(payload.color, "#0b2545") } : {}),
      ...(payload.notes !== undefined ? { notes: asOptionalString(payload.notes) } : {}),
      ...(payload.trackingUrl !== undefined ? { trackingUrl: asOptionalString(payload.trackingUrl) } : {}),
      ...(payload.apiKey !== undefined ? { apiKey: asOptionalString(payload.apiKey) } : {}),
      ...(payload.apiSecret !== undefined ? { apiSecret: asOptionalString(payload.apiSecret) } : {}),
    })
    .where(eq(carriers.id, carrierId));

  const all = await listCarriers();
  return Response.json({ carrier: all.find((item) => item.id === carrierId) ?? null });
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  await db.delete(carriers).where(eq(carriers.id, Number(id)));
  return Response.json({ ok: true });
}
