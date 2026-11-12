import { listClients } from "@/lib/queries";
import { ClientsClient } from "./clients-client";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await listClients();
  return <ClientsClient initialClients={clients} />;
}
