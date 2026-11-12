import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  banks,
  carrierConnections,
  carriers,
  clients,
  documents,
  exchangeRates,
  invoices,
  nafezaEvents,
  ports,
  shipmentItems,
  shipments,
  tariffItems,
  tasks,
  users,
} from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { ensureDatabase } from "@/lib/bootstrap";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireApiUser();
    if (!user) return Response.json({ error: "غير مصرح" }, { status: 401 });
    await ensureDatabase();

    const [
      clientsRows,
      carriersRows,
      portsRows,
      connectionsRows,
      shipmentsRows,
      shipmentItemsRows,
      tariffRows,
      banksRows,
      ratesRows,
      tasksRows,
      documentsRows,
      invoicesRows,
      eventsRows,
      usersRows,
      activitiesRows,
    ] = await Promise.all([
      db.select().from(clients).orderBy(clients.id),
      db.select().from(carriers).orderBy(carriers.id),
      db.select().from(ports).orderBy(ports.id),
      db.select({
        id: carrierConnections.id,
        carrierId: carrierConnections.carrierId,
        provider: carrierConnections.provider,
        providerCode: carrierConnections.providerCode,
        apiUrl: carrierConnections.apiUrl,
        apiKey: sql<string | null>`case when ${carrierConnections.apiKey} is null or ${carrierConnections.apiKey} = '' then null else '********' end`,
        trackingUrlTemplate: carrierConnections.trackingUrlTemplate,
        enabled: carrierConnections.enabled,
        notes: carrierConnections.notes,
        createdAt: carrierConnections.createdAt,
        updatedAt: carrierConnections.updatedAt,
      }).from(carrierConnections).orderBy(carrierConnections.id),
      db.select().from(shipments).orderBy(desc(shipments.id)),
      db.select().from(shipmentItems).orderBy(desc(shipmentItems.id)),
      db.select().from(tariffItems).orderBy(tariffItems.hsCode),
      db.select().from(banks).orderBy(banks.id),
      db.select().from(exchangeRates),
      db.select().from(tasks).orderBy(desc(tasks.id)),
      db.select().from(documents).orderBy(desc(documents.id)),
      db.select().from(invoices).orderBy(desc(invoices.id)),
      db.select().from(nafezaEvents).orderBy(desc(nafezaEvents.id)).limit(120),
      db.select({
        id: users.id, name: users.name, email: users.email, role: users.role,
        phone: users.phone, active: users.active, createdAt: users.createdAt,
      }).from(users).orderBy(users.id),
      db.select().from(activities).orderBy(desc(activities.id)).limit(60),
    ]);

    return Response.json(
      {
        clients: clientsRows,
        carriers: carriersRows,
        ports: portsRows,
        carrierConnections: connectionsRows,
        shipments: shipmentsRows,
        shipmentItems: shipmentItemsRows,
        tariffItems: tariffRows,
        banks: banksRows,
        exchangeRates: ratesRows,
        tasks: tasksRows,
        documents: documentsRows,
        invoices: invoicesRows,
        nafezaEvents: eventsRows,
        users: usersRows,
        activities: activitiesRows,
        currentUser: user,
        serverTime: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("data error", error);
    return Response.json({ error: "تعذر تحميل البيانات" }, { status: 500 });
  }
}
