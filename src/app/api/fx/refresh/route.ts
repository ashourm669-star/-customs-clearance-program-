import { getApiUser, unauthorized } from "@/lib/api";
import { refreshExchangeRates, getExchangeRates } from "@/lib/fx";

export async function POST() {
  const user = await getApiUser();
  if (!user) return unauthorized();
  await refreshExchangeRates(true);
  return Response.json({ rates: await getExchangeRates() });
}
