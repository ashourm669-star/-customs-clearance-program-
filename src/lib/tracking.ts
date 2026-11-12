import { desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { carriers, clients, shipmentEvents, shipments } from "@/db/schema";
import { iso } from "@/lib/format";
import { lookupLive, readProviderConfig } from "@/lib/dcsa";
import { nextShipmentReference } from "@/lib/api";
import type { LiveResult } from "@/lib/dcsa";

export type TrackingMatch = {
  id: number;
  reference: string;
  blNumber: string | null;
  clientName: string | null;
  carrierName: string | null;
  mode: string;
  status: string;
  origin: string | null;
  destination: string | null;
  port: string | null;
  vesselFlight: string | null;
  eta: string | null;
  arrivedAt: string | null;
  createdAt: string;
};

export type SearchOutcome = {
  query: string;
  local: TrackingMatch[];
  live: LiveResult;
  importedShipmentId: number | null;
};

export function providerStatus() {
  const config = readProviderConfig();
  return {
    kind: config.kind,
    ready: config.kind !== "unconfigured",
    missing: config.kind === "unconfigured" ? config.missing : [],
    provider: config.kind === "unconfigured" ? null : config.kind === "dcsa" ? new URL(config.baseUrl).host : new URL(config.url).host,
  };
}

export async function searchLocalShipments(query: string): Promise<TrackingMatch[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const pattern = `%${q.replace(/[%_]/g, "")}%`;

  const rows = await db
    .select({
      id: shipments.id,
      reference: shipments.reference,
      blNumber: shipments.blNumber,
      clientName: clients.name,
      carrierName: carriers.name,
      mode: shipments.mode,
      status: shipments.status,
      origin: shipments.origin,
      destination: shipments.destination,
      port: shipments.port,
      vesselFlight: shipments.vesselFlight,
      eta: shipments.eta,
      arrivedAt: shipments.arrivedAt,
      createdAt: shipments.createdAt,
    })
    .from(shipments)
    .leftJoin(clients, eq(shipments.clientId, clients.id))
    .leftJoin(carriers, eq(shipments.carrierId, carriers.id))
    .where(
      or(
        ilike(shipments.blNumber, pattern),
        ilike(shipments.reference, pattern),
        ilike(shipments.vesselFlight, pattern),
        ilike(shipments.hsCode, pattern),
      ),
    )
    .orderBy(desc(shipments.createdAt))
    .limit(12);

  return rows.map((row) => ({
    ...row,
    eta: iso(row.eta),
    arrivedAt: iso(row.arrivedAt),
    createdAt: iso(row.createdAt) as string,
  }));
}

async function saveLiveEvents(shipmentId: number, events: LiveResult["events"], provider: string | null) {
  if (!events.length) return 0;
  const existing = await db
    .select({ title: shipmentEvents.title, occurredAt: shipmentEvents.occurredAt })
    .from(shipmentEvents)
    .where(eq(shipmentEvents.shipmentId, shipmentId));
  const seen = new Set(existing.map((row) => `${row.title}|${new Date(row.occurredAt).toISOString()}`));

  const fresh = events.filter((event) => {
    const date = new Date(event.occurredAt);
    const key = `${event.title}|${(Number.isNaN(date.getTime()) ? new Date() : date).toISOString()}`;
    return !seen.has(key);
  });

  if (fresh.length) {
    const sourceLabel = provider ?? (fresh[0]?.source === "dcsa" ? "DCSA" : "مزوّد التتبع");
    await db.insert(shipmentEvents).values(
      fresh.map((event) => ({
        shipmentId,
        title: event.title,
        description: `${event.description ? `${event.description} · ` : ""}مصدر: ${sourceLabel}`,
        type: event.type,
        location: event.location,
        occurredAt: Number.isNaN(new Date(event.occurredAt).getTime()) ? new Date() : new Date(event.occurredAt),
      })),
    );
  }

  await db.update(shipments).set({ updatedAt: new Date() }).where(eq(shipments.id, shipmentId));
  return fresh.length;
}

export async function searchByBillOfLading(query: string): Promise<SearchOutcome> {
  const [local, live] = await Promise.all([searchLocalShipments(query), lookupLive(query)]);
  const normalized = query.trim().toLowerCase();

  let importedShipmentId: number | null = null;
  if (live.status === "ok" && local.length) {
    const exact = local.find((row) => (row.blNumber ?? "").trim().toLowerCase() === normalized) ?? local[0];
    await saveLiveEvents(exact.id, live.events, live.provider);
    importedShipmentId = exact.id;
  }

  return { query, local, live, importedShipmentId };
}

export type ImportResult = {
  ok: boolean;
  shipmentId: number | null;
  reference: string | null;
  eventsSaved: number;
  message: string;
};

/** Pull a real tracking response and persist it as a clearance file (or attach to an existing one). */
export async function importLiveTracking(query: string, actor: string): Promise<ImportResult> {
  const live = await lookupLive(query);
  if (live.status !== "ok" || live.events.length === 0) {
    return {
      ok: false,
      shipmentId: null,
      reference: null,
      eventsSaved: 0,
      message: `لا توجد بيانات حقيقية للاستيراد: ${live.message}`,
    };
  }

  const normalized = query.trim().toLowerCase();
  const existing = await db
    .select({ id: shipments.id, reference: shipments.reference, blNumber: shipments.blNumber })
    .from(shipments)
    .where(ilike(shipments.blNumber, query.trim()))
    .limit(5);

  if (existing.length) {
    const target = existing.find((row) => (row.blNumber ?? "").toLowerCase() === normalized) ?? existing[0];
    const saved = await saveLiveEvents(target.id, live.events, live.provider);
    return {
      ok: true,
      shipmentId: target.id,
      reference: target.reference,
      eventsSaved: saved,
      message: `تم تحديث الملف ${target.reference} بـ ${saved} حركة حقيقية من ${live.provider ?? "المزوّد"}.`,
    };
  }

  const reference = await nextShipmentReference();

  const firstLocation = live.events.find((event) => event.location)?.location ?? null;
  const latestEvent = live.events[0];

  const [created] = await db
    .insert(shipments)
    .values({
      reference,
      mode: "sea",
      direction: "import",
      status: "under_review",
      priority: "normal",
      port: firstLocation,
      destination: null,
      blNumber: query.trim().toUpperCase(),
      vesselFlight: null,
      goodsDescription: `بيانات مستوردة من ${live.provider ?? "مزوّد التتبع"}`,
      brokerName: actor,
      notes: `تم الاستيراد آلياً من ${live.provider ?? "مزوّد التتبع"} بتاريخ ${new Date().toLocaleString("ar-EG")} بناءً على البوليصة ${query.trim()}.`,
      eta: Number.isNaN(new Date(latestEvent.occurredAt).getTime()) ? null : new Date(latestEvent.occurredAt),
    })
    .returning({ id: shipments.id });

  const saved = await saveLiveEvents(created.id, live.events, live.provider);

  return {
    ok: true,
    shipmentId: created.id,
    reference,
    eventsSaved: saved,
    message: `تم إنشاء الملف ${reference} وإضافة ${saved} حركة حقيقية من ${live.provider ?? "المزوّد"}.`,
  };
}

export const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  documents_pending: "بانتظار المستندات",
  under_review: "قيد المراجعة",
  customs_clearance: "قيد التخليص",
  released: "تم الإفراج",
  delivered: "تم التسليم",
  on_hold: "معلّق",
};

export function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}
