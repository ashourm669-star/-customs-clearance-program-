import { listClients, listInvoices, listShipments } from "@/lib/queries";
import { InvoicesClient } from "./invoices-client";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const [invoices, clients, shipments] = await Promise.all([listInvoices(), listClients(), listShipments()]);

  return (
    <InvoicesClient
      initialInvoices={invoices}
      clients={clients.map((client) => ({ id: client.id, name: client.name }))}
      shipments={shipments.map((shipment) => ({
        id: shipment.id,
        reference: shipment.reference,
        clientId: shipment.clientId,
        fees: shipment.dutyAmount + shipment.vatAmount + shipment.serviceFees,
      }))}
    />
  );
}
