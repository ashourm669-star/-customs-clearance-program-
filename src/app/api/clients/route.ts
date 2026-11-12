import { db } from "@/db";
import { clients } from "@/db/schema";
import { asNumber, asOptionalString, asString, getApiUser, jsonError, unauthorized } from "@/lib/api";
import { listClients } from "@/lib/queries";

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorized();
  return Response.json({ clients: await listClients() });
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
  if (name.length < 2) return jsonError("اسم العميل مطلوب (حرفان على الأقل).");

  const [created] = await db
    .insert(clients)
    .values({
      name,
      nameEn: asOptionalString(payload.nameEn),
      contactName: asOptionalString(payload.contactName),
      email: asOptionalString(payload.email),
      phone: asOptionalString(payload.phone),
      taxId: asOptionalString(payload.taxId),
      country: asString(payload.country, "مصر") || "مصر",
      city: asOptionalString(payload.city),
      address: asOptionalString(payload.address),
      industry: asOptionalString(payload.industry),
      creditLimit: asNumber(payload.creditLimit),
      notes: asOptionalString(payload.notes),
    })
    .returning({ id: clients.id });

  const all = await listClients();
  return Response.json({ client: all.find((item) => item.id === created.id) ?? null }, { status: 201 });
}
