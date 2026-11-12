import { eq } from "drizzle-orm";
import { db } from "@/db";
import { carriers, clients, nafezaEvents, ports, shipments } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { ensureDatabase } from "@/lib/bootstrap";
import { dispatch, integrationConfig, type IntegrationAction } from "@/lib/integrations";
import { logActivity } from "@/lib/resources";

export const dynamic = "force-dynamic";

const EVENT_TYPE: Record<IntegrationAction, string> = {
  acid: "acid_registration",
  declaration: "declaration",
  manifest: "manifest",
  carrier_test: "carrier_sync",
  sync_all: "carrier_sync",
};

const ACTIONS: IntegrationAction[] = ["acid", "declaration", "manifest", "carrier_test", "sync_all"];

export async function GET() {
  try {
    const user = await requireApiUser();
    if (!user) return Response.json({ error: "غير مصرح" }, { status: 401 });
    await ensureDatabase();
    const config = integrationConfig();
    const [carrierRows, eventRows, shipmentRows] = await Promise.all([
      db.select().from(carriers),
      db.select().from(nafezaEvents).orderBy(nafezaEvents.id),
      db.select().from(shipments),
    ]);
    return Response.json({
      ...config,
      connectedCarriers: carrierRows.filter((c) => c.integration === "connected").length,
      totalCarriers: carrierRows.length,
      shipmentsWithAcid: shipmentRows.filter((s) => Boolean(s.acidNumber)).length,
      totalEvents: eventRows.length,
      lastEvent: eventRows[eventRows.length - 1] ?? null,
      user: user.name,
    });
  } catch (error) {
    console.error("integration config error", error);
    return Response.json({ error: "تعذر تحميل حالة التكامل" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    if (!user) return Response.json({ error: "غير مصرح" }, { status: 401 });
    await ensureDatabase();
    const body = await request.json();
    const action = String(body.action ?? "") as IntegrationAction;
    if (!ACTIONS.includes(action)) return Response.json({ error: "نوع العملية غير مدعوم" }, { status: 400 });

    const allCarriers = await db.select().from(carriers);
    const shipmentId = Number(body.shipmentId) || null;
    const shipmentRows = shipmentId ? await db.select().from(shipments).where(eq(shipments.id, shipmentId)).limit(1) : [];
    const shipment = shipmentRows[0] as Record<string, any> | undefined;
    if (shipmentId && !shipment) return Response.json({ error: "الشحنة غير موجودة" }, { status: 404 });

    async function persist(carrier: Record<string, any> | undefined, targetShipment: Record<string, any> | undefined) {
      const port = targetShipment?.portId
        ? (await db.select().from(ports).where(eq(ports.id, targetShipment.portId)).limit(1))[0] as Record<string, any> | undefined
        : undefined;
      const client = targetShipment?.clientId
        ? (await db.select().from(clients).where(eq(clients.id, targetShipment.clientId)).limit(1))[0] as Record<string, any> | undefined
        : undefined;
      const result = await dispatch({ action, shipment: targetShipment, carrier, port, client, note: body.note ? String(body.note) : undefined });
      const inserted = (await db.insert(nafezaEvents).values({
        shipmentId: targetShipment?.id ?? null,
        eventType: EVENT_TYPE[action],
        reference: result.reference,
        channel: result.channel,
        carrier: carrier?.code ?? null,
        status: result.status,
        message: result.message,
        payload: JSON.stringify({ mode: result.mode, request: result.payload, response: result.response, issues: result.issues }),
      }).returning()) as Record<string, any>[];
      if (targetShipment && Object.keys(result.updates ?? {}).length) {
        await db.update(shipments).set({ ...result.updates, updatedAt: new Date() }).where(eq(shipments.id, targetShipment.id));
      }
      return { result, event: inserted[0] };
    }

    if (action === "sync_all") {
      const connected = allCarriers.filter((c) => c.integration === "connected").slice(0, 6);
      const results = [];
      for (const carrier of connected) results.push(await persist(carrier as Record<string, any>, undefined));
      await logActivity("update", "nafezaEvents", "SYNC-ALL", `مزامنة ${connected.length} ناقل مع منصة نافذة`, user.name);
      return Response.json({
        processed: connected.length,
        accepted: results.filter((r) => r.result.ok).length,
        rejected: results.filter((r) => !r.result.ok).length,
        mode: results[0]?.result.mode ?? integrationConfig().mode,
        events: results.map((r) => r.event),
      });
    }

    const carrierId = Number(body.carrierId) || shipment?.carrierId || null;
    const carrier = carrierId
      ? (allCarriers.find((c) => c.id === carrierId) as Record<string, any> | undefined)
      : undefined;
    const { result, event } = await persist(carrier, shipment);
    await logActivity("update", "nafezaEvents", result.reference, result.message, user.name);
    return Response.json({ result, event, config: integrationConfig() });
  } catch (error) {
    console.error("integration dispatch error", error);
    return Response.json({ error: "تعذر تنفيذ عملية الربط" }, { status: 500 });
  }
}
