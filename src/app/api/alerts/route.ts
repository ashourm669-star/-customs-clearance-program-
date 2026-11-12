import { getApiUser, unauthorized } from "@/lib/api";
import { getAlerts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorized();
  const alerts = await getAlerts();
  return Response.json({ alerts, count: alerts.length }, { headers: { "Cache-Control": "no-store" } });
}
