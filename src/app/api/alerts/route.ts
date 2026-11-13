import { getApiUser, jsonError, unauthorized } from "@/lib/api";
import { getNotificationFeed, markNotificationsRead } from "@/lib/notification-feed";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorized();
  const feed = await getNotificationFeed(user.id);
  return Response.json(feed, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();
  let payload: { ids?: unknown; all?: boolean };
  try { payload = await request.json(); }
  catch { return jsonError("بيانات غير صالحة.", 400); }
  if (payload.all === true) {
    await markNotificationsRead(user.id);
  } else if (Array.isArray(payload.ids)) {
    await markNotificationsRead(user.id, payload.ids.map(Number));
  } else {
    return jsonError("حدد إشعاراً أو اختر تحديد الكل كمقروء.", 400);
  }
  return Response.json(await getNotificationFeed(user.id), { headers: { "Cache-Control": "no-store" } });
}
