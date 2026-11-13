import { getApiUser, jsonError, unauthorized } from "@/lib/api";
import { getAppSettings, setAppSettings } from "@/lib/queries";
import { LOCKED_COMPANY_FIELDS } from "@/lib/company-identity";

const ALLOWED = ["company_name", "company_name_en", "phone", "email", "address", "website"];

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
  for (const [key, fixed] of Object.entries(LOCKED_COMPANY_FIELDS)) {
    if (p[key] !== undefined && String(p[key]).trim() !== fixed) {
      return jsonError("السجل التجاري والرقم الضريبي وبيان الترخيص حقول ثابتة لا يمكن تعديلها.", 403);
    }
  }
  const values: Record<string, string> = {};
  for (const key of ALLOWED) if (p[key] !== undefined) values[key] = String(p[key]).slice(0, 400);
  await setAppSettings(values, actor.name);
  return Response.json({ company: await getAppSettings() });
}
