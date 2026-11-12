import { getApiUser, jsonError, unauthorized } from "@/lib/api";
import { getAppSettings, setAppSettings } from "@/lib/queries";

const ALLOWED = ["company_name", "company_name_en", "commercial_register", "tax_id", "phone", "email", "address", "customs_license", "website"];

export async function GET() {
  const actor = await getApiUser();
  if (!actor) return unauthorized();
  return Response.json({ company: await getAppSettings() });
}

export async function POST(request: Request) {
  const actor = await getApiUser();
  if (!actor) return unauthorized();
  if (!["admin", "manager"].includes(actor.role)) return jsonError("تعديل بيانات المنشأة متاح للمدير فقط.", 403);
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError("بيانات غير صالحة."); }
  const p = body as Record<string, unknown>;
  const values: Record<string, string> = {};
  for (const key of ALLOWED) if (p[key] !== undefined) values[key] = String(p[key]).slice(0, 400);
  if (values.commercial_register !== undefined && values.commercial_register && !/^\d{2,15}$/.test(values.commercial_register)) return jsonError("رقم السجل التجاري يجب أن يكون أرقاماً فقط.");
  if (values.tax_id !== undefined && values.tax_id && !/^\d{6,15}$/.test(values.tax_id)) return jsonError("الرقم الضريبي يجب أن يكون 6–15 رقماً.");
  await setAppSettings(values, actor.name);
  return Response.json({ company: await getAppSettings() });
}
