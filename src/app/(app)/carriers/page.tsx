import { listCarriers } from "@/lib/queries";
import { CarriersClient } from "./carriers-client";

export const dynamic = "force-dynamic";

export default async function CarriersPage() {
  const carriers = await listCarriers();
  return <CarriersClient initialCarriers={carriers} />;
}
