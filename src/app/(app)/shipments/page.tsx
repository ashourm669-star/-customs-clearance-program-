import { listCarriers, listClients, listShipments } from "@/lib/queries";
import { requireUser } from "@/lib/auth";
import { ShipmentsClient } from "./shipments-client";

export const dynamic = "force-dynamic";

export default async function ShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; new?: string; bl?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUser();
  const [shipments, clients, carriers] = await Promise.all([listShipments(), listClients(), listCarriers()]);

  return (
    <ShipmentsClient
      initialShipments={shipments}
      clients={clients.map((client) => ({ id: client.id, name: client.name }))}
      carriers={carriers.map((carrier) => ({ id: carrier.id, name: carrier.name }))}
      initialQuery={params.q ?? ""}
      initialStatus={params.status ?? "all"}
      openCreate={params.new === "1" || Boolean(params.bl)}
      prefillBl={params.bl ?? ""}
      userName={user.name}
    />
  );
}
