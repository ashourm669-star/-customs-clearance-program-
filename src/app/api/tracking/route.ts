import { asString, getApiUser, jsonError, unauthorized } from "@/lib/api";
import { providerStatus, searchByBillOfLading } from "@/lib/tracking";
import { sendNafezaDeclaration } from "@/lib/nafeza";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim();
  if (query.length < 3) return jsonError("أدخل رقم بوليصة أو AWB أو رقم ملف (٣ أحرف على الأقل).");

  const outcome = await searchByBillOfLading(query);
  return Response.json({ ...outcome, providerStatus: providerStatus() });
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
  const action = asString(payload.action, "import");
  const query = asString(payload.query);
  if (query.length < 3) return jsonError("أدخل رقم بوليصة صحيحاً.");

  if (action === "nafeza") {
    const result = await sendNafezaDeclaration(query, user.name);
    return Response.json({ result }, { status: result.ok ? 200 : 400 });
  }

  const { importLiveTracking } = await import("@/lib/tracking");
  const result = await importLiveTracking(query, user.name);
  return Response.json({ result }, { status: result.ok ? 200 : 400 });
}
