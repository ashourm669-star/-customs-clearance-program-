import { listDocuments, listShipments } from "@/lib/queries";
import { DocumentsClient } from "./documents-client";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const [documents, shipments] = await Promise.all([listDocuments(), listShipments()]);
  return (
    <DocumentsClient
      initialDocuments={documents}
      shipments={shipments.map((shipment) => ({
        id: shipment.id,
        reference: shipment.reference,
        clientName: shipment.clientName,
      }))}
    />
  );
}
