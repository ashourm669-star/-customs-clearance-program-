import { db } from "@/db";
import { shipments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { listClients, listShipments, getShipmentById } from "@/lib/queries";
import { getCustomsData } from "@/lib/customs-queries";
import { getExchangeRates } from "@/lib/fx";
import { CustomsClient, type CustomsShipment } from "./customs-client";

export const dynamic = "force-dynamic";

export default async function CustomsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const requestedId = Number(params.id);
  const id = Number.isFinite(requestedId) && requestedId > 0 ? requestedId : (await db.select({ id: shipments.id }).from(shipments).orderBy(shipments.id).limit(1))[0]?.id;
  const [data, clients, allShipments, shipment] = await Promise.all([
    getCustomsData(id), listClients(), listShipments(), id ? getShipmentById(id) : Promise.resolve(null),
  ]);
  const rates = await getExchangeRates();
  const fullShipment = id ? (await db.select().from(shipments).where(eq(shipments.id, id)).limit(1))[0] : null;
  return (
    <CustomsClient
      initialData={{ ...data, rates }}
      clients={clients.map((client) => ({ id: client.id, name: client.name }))}
      shipments={allShipments.map((item) => ({ id: item.id, reference: item.reference, clientId: item.clientId }))}
      initialShipment={fullShipment ? JSON.parse(JSON.stringify(fullShipment)) as CustomsShipment : null}
      shipmentSummary={shipment}
      userName={user.name}
    />
  );
}
