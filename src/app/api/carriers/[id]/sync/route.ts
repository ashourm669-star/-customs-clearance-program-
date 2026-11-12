import { getApiUser, unauthorized } from "@/lib/api";
import { syncCarrier } from "@/lib/integrations";
import { listCarriers } from "@/lib/queries";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const result = await syncCarrier(Number(id), user.name);
  const carriers = await listCarriers();
  return Response.json({ result, carriers }, { status: result.level === "error" ? 400 : 200 });
}
