import { getApiUser, unauthorized } from "@/lib/api";
import { getStorageStats } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorized();
  return Response.json({ storage: await getStorageStats() });
}
