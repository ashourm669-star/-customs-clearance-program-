import { db } from "@/db";
import { carriers } from "@/db/schema";
import { asOptionalString, asString, getApiUser, jsonError, unauthorized } from "@/lib/api";
import { CARRIER_TYPES, INTEGRATION_STATUSES } from "@/lib/constants";
import { listCarriers } from "@/lib/queries";

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorized();
  return Response.json({ carriers: await listCarriers() });
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
  const name = asString(payload.name);
  if (!name) return jsonError("اسم الشركة مطلوب.");
  const type = (CARRIER_TYPES as readonly string[]).includes(asString(payload.type)) ? asString(payload.type) : "airline";
  const integrationStatus = (INTEGRATION_STATUSES as readonly string[]).includes(asString(payload.integrationStatus))
    ? asString(payload.integrationStatus)
    : "pending";

  const [created] = await db
    .insert(carriers)
    .values({
      name,
      nameEn: asOptionalString(payload.nameEn),
      code: asOptionalString(payload.code),
      type,
      country: asOptionalString(payload.country),
      scac: asOptionalString(payload.scac),
      apiEndpoint: asOptionalString(payload.apiEndpoint),
      integrationStatus,
      color: asString(payload.color, "#0b2545") || "#0b2545",
      notes: asOptionalString(payload.notes),
      lastSyncAt: integrationStatus === "connected" ? new Date() : null,
    })
    .returning({ id: carriers.id });

  const all = await listCarriers();
  return Response.json({ carrier: all.find((item) => item.id === created.id) ?? null }, { status: 201 });
}
