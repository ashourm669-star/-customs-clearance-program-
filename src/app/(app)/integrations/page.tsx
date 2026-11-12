import { listCarriers, listLogs, listShipments } from "@/lib/queries";
import { requireUser } from "@/lib/auth";
import { IntegrationsClient } from "./integrations-client";
import { IntegrationGuide } from "./integration-guide";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const user = await requireUser();
  const [carriers, logs, shipments] = await Promise.all([listCarriers(), listLogs(40), listShipments()]);

  return (
    <div>
      <IntegrationsClient
        initialCarriers={carriers}
        initialLogs={logs}
        shipments={shipments.map((shipment) => ({
          id: shipment.id,
          reference: shipment.reference,
          clientName: shipment.clientName,
          status: shipment.status,
          carrierName: shipment.carrierName,
        }))}
        userName={user.name}
      />
      <IntegrationGuide />
    </div>
  );
}
