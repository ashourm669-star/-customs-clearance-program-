// Demo admin access must never be enabled on a public production deployment.
// Account creation and role assignment belong to the authenticated admin UI.
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ error: "الدخول التجريبي المباشر غير متاح. استخدم بريدك وكلمة مرورك." }, { status: 403 });
}
