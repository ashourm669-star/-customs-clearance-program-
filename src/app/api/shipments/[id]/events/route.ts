import { db } from "@/db";
import { shipmentEvents } from "@/db/schema";
import { asOptionalString, asString, getApiUser, jsonError, unauthorized } from "@/lib/api";
import { EVENT_TYPES } from "@/lib/constants";
import { listEventsForShipment } from "@/lib/queries";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const shipmentId = Number(id);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("بيانات غير صالحة.");
  }
  const payload = body as Record<string, unknown>;
  const title = asString(payload.title);
  if (!title) return jsonError("عنوان التحديث مطلوب.");

  const type = (EVENT_TYPES as readonly string[]).includes(asString(payload.type)) ? asString(payload.type) : "note";

  await db.insert(shipmentEvents).values({
    shipmentId,
    title,
    description: asOptionalString(payload.description),
    type,
    location: asOptionalString(payload.location),
    occurredAt: new Date(),
  });

  return Response.json({ events: await listEventsForShipment(shipmentId) }, { status: 201 });
}

export async function GET(_request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  return Response.json({ events: await listEventsForShipment(Number(id)) });
}
