import { and, asc, count, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  carriers,
  clients,
  documents,
  invoices,
  integrationLogs,
  shipmentEvents,
  shipments,
} from "@/db/schema";
import { iso } from "@/lib/format";
import type {
  CarrierRow,
  ClientRow,
  DashboardData,
  DocumentItem,
  EventItem,
  InvoiceRow,
  LogItem,
  ReportsData,
  ShipmentRow,
} from "@/lib/types";

const shipmentSelect = {
  id: shipments.id,
  reference: shipments.reference,
  clientId: shipments.clientId,
  clientName: clients.name,
  carrierId: shipments.carrierId,
  carrierName: carriers.name,
  carrierType: carriers.type,
  mode: shipments.mode,
  direction: shipments.direction,
  status: shipments.status,
  priority: shipments.priority,
  port: shipments.port,
  origin: shipments.origin,
  destination: shipments.destination,
  blNumber: shipments.blNumber,
  vesselFlight: shipments.vesselFlight,
  containerCount: shipments.containerCount,
  packageCount: shipments.packageCount,
  grossWeight: shipments.grossWeight,
  goodsDescription: shipments.goodsDescription,
  hsCode: shipments.hsCode,
  invoiceValue: shipments.invoiceValue,
  currency: shipments.currency,
  dutyAmount: shipments.dutyAmount,
  vatAmount: shipments.vatAmount,
  serviceFees: shipments.serviceFees,
  eta: shipments.eta,
  arrivedAt: shipments.arrivedAt,
  releasedAt: shipments.releasedAt,
  brokerName: shipments.brokerName,
  notes: shipments.notes,
  createdAt: shipments.createdAt,
  updatedAt: shipments.updatedAt,
};

async function pendingDocsMap(): Promise<Map<number, number>> {
  const rows = await db
    .select({ shipmentId: documents.shipmentId, total: count() })
    .from(documents)
    .where(eq(documents.status, "pending"))
    .groupBy(documents.shipmentId);
  return new Map(rows.map((row) => [row.shipmentId, Number(row.total)]));
}

function mapShipment(
  row: Omit<ShipmentRow, "createdAt" | "updatedAt" | "eta" | "arrivedAt" | "releasedAt" | "pendingDocs"> & {
    createdAt: Date;
    updatedAt: Date;
    eta: Date | null;
    arrivedAt: Date | null;
    releasedAt: Date | null;
  },
  pending: number,
): ShipmentRow {
  return {
    ...row,
    createdAt: iso(row.createdAt) as string,
    updatedAt: iso(row.updatedAt) as string,
    eta: iso(row.eta),
    arrivedAt: iso(row.arrivedAt),
    releasedAt: iso(row.releasedAt),
    pendingDocs: pending,
  };
}

export async function listShipments(): Promise<ShipmentRow[]> {
  const [rows, pending] = await Promise.all([
    db
      .select(shipmentSelect)
      .from(shipments)
      .leftJoin(clients, eq(shipments.clientId, clients.id))
      .leftJoin(carriers, eq(shipments.carrierId, carriers.id))
      .orderBy(desc(shipments.createdAt)),
    pendingDocsMap(),
  ]);
  return rows.map((row) => mapShipment(row, pending.get(row.id) ?? 0));
}

export async function getShipmentById(id: number): Promise<ShipmentRow | null> {
  const rows = await db
    .select(shipmentSelect)
    .from(shipments)
    .leftJoin(clients, eq(shipments.clientId, clients.id))
    .leftJoin(carriers, eq(shipments.carrierId, carriers.id))
    .where(eq(shipments.id, id))
    .limit(1);
  if (!rows[0]) return null;
  const pending = await pendingDocsMap();
  return mapShipment(rows[0], pending.get(id) ?? 0);
}

export async function listShipmentOptions() {
  return db
    .select({ id: shipments.id, reference: shipments.reference, clientId: shipments.clientId })
    .from(shipments)
    .orderBy(desc(shipments.createdAt));
}

export async function listClients(): Promise<ClientRow[]> {
  const [rows, shipmentCounts, invoiceTotals] = await Promise.all([
    db.select().from(clients).orderBy(asc(clients.name)),
    db
      .select({ clientId: shipments.clientId, total: count() })
      .from(shipments)
      .groupBy(shipments.clientId),
    db
      .select({
        clientId: invoices.clientId,
        total: sql<number>`coalesce(sum(${invoices.total}), 0)::int`,
        paid: sql<number>`coalesce(sum(${invoices.paidAmount}), 0)::int`,
      })
      .from(invoices)
      .groupBy(invoices.clientId),
  ]);

  const countMap = new Map(shipmentCounts.map((r) => [r.clientId, Number(r.total)]));
  const invoiceMap = new Map(invoiceTotals.map((r) => [r.clientId, r]));

  return rows.map((row) => {
    const inv = invoiceMap.get(row.id);
    return {
      ...row,
      createdAt: iso(row.createdAt) as string,
      shipmentCount: countMap.get(row.id) ?? 0,
      invoiceTotal: Number(inv?.total ?? 0),
      outstanding: Number(inv?.total ?? 0) - Number(inv?.paid ?? 0),
    };
  });
}

export async function listCarriers(): Promise<CarrierRow[]> {
  const rows = await db.select().from(carriers).orderBy(asc(carriers.type), asc(carriers.name));
  const activeStatuses = ["documents_pending", "under_review", "customs_clearance", "on_hold"];
  const [totals, active] = await Promise.all([
    db
      .select({ carrierId: shipments.carrierId, total: count() })
      .from(shipments)
      .groupBy(shipments.carrierId),
    db
      .select({ carrierId: shipments.carrierId, total: count() })
      .from(shipments)
      .where(sql`${shipments.status} in ('documents_pending','under_review','customs_clearance','on_hold')`)
      .groupBy(shipments.carrierId),
  ]);
  const totalMap = new Map(totals.map((r) => [r.carrierId, Number(r.total)]));
  const activeMap = new Map(active.map((r) => [r.carrierId, Number(r.total)]));
  void activeStatuses;

  return rows.map((row) => ({
    ...row,
    createdAt: iso(row.createdAt) as string,
    lastSyncAt: iso(row.lastSyncAt),
    totalShipments: totalMap.get(row.id) ?? 0,
    activeShipments: activeMap.get(row.id) ?? 0,
  }));
}

export async function listInvoices(): Promise<InvoiceRow[]> {
  const rows = await db
    .select({
      id: invoices.id,
      number: invoices.number,
      shipmentId: invoices.shipmentId,
      clientId: invoices.clientId,
      clientName: clients.name,
      shipmentReference: shipments.reference,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      subtotal: invoices.subtotal,
      taxAmount: invoices.taxAmount,
      total: invoices.total,
      paidAmount: invoices.paidAmount,
      status: invoices.status,
      notes: invoices.notes,
      createdAt: invoices.createdAt,
    })
    .from(invoices)
    .leftJoin(clients, eq(invoices.clientId, clients.id))
    .leftJoin(shipments, eq(invoices.shipmentId, shipments.id))
    .orderBy(desc(invoices.createdAt));

  return rows.map((row) => ({
    ...row,
    issueDate: iso(row.issueDate) as string,
    dueDate: iso(row.dueDate),
    createdAt: iso(row.createdAt) as string,
  }));
}

export async function listDocuments(): Promise<DocumentItem[]> {
  const rows = await db
    .select({
      id: documents.id,
      shipmentId: documents.shipmentId,
      shipmentReference: shipments.reference,
      clientName: clients.name,
      name: documents.name,
      type: documents.type,
      status: documents.status,
      sizeKb: documents.sizeKb,
      uploadedBy: documents.uploadedBy,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .innerJoin(shipments, eq(documents.shipmentId, shipments.id))
    .leftJoin(clients, eq(shipments.clientId, clients.id))
    .orderBy(desc(documents.createdAt));

  return rows.map((row) => ({ ...row, createdAt: iso(row.createdAt) as string }));
}

export async function listEventsForShipment(shipmentId: number): Promise<EventItem[]> {
  const rows = await db
    .select()
    .from(shipmentEvents)
    .where(eq(shipmentEvents.shipmentId, shipmentId))
    .orderBy(desc(shipmentEvents.occurredAt));
  return rows.map((row) => ({
    id: row.id,
    shipmentId: row.shipmentId,
    title: row.title,
    description: row.description,
    type: row.type,
    location: row.location,
    occurredAt: iso(row.occurredAt) as string,
    createdAt: iso(row.createdAt) as string,
  }));
}

export async function listRecentEvents(limit = 12): Promise<EventItem[]> {
  const rows = await db
    .select()
    .from(shipmentEvents)
    .orderBy(desc(shipmentEvents.occurredAt))
    .limit(limit);
  return rows.map((row) => ({
    id: row.id,
    shipmentId: row.shipmentId,
    title: row.title,
    description: row.description,
    type: row.type,
    location: row.location,
    occurredAt: iso(row.occurredAt) as string,
    createdAt: iso(row.createdAt) as string,
  }));
}

export async function listLogs(limit = 40): Promise<LogItem[]> {
  const rows = await db
    .select({
      id: integrationLogs.id,
      carrierId: integrationLogs.carrierId,
      carrierName: carriers.name,
      kind: integrationLogs.kind,
      reference: integrationLogs.reference,
      status: integrationLogs.status,
      message: integrationLogs.message,
      createdAt: integrationLogs.createdAt,
    })
    .from(integrationLogs)
    .leftJoin(carriers, eq(integrationLogs.carrierId, carriers.id))
    .orderBy(desc(integrationLogs.createdAt))
    .limit(limit);
  return rows.map((row) => ({ ...row, createdAt: iso(row.createdAt) as string }));
}

export async function getDashboardData(): Promise<DashboardData> {
  const [allShipments, clientsCountRows, carrierRows, invoiceRows, docRows, events, logs] = await Promise.all([
    listShipments(),
    db.select({ total: count() }).from(clients),
    listCarriers(),
    listInvoices(),
    listDocuments(),
    listRecentEvents(10),
    listLogs(8),
  ]);

  return {
    shipments: allShipments,
    clientsCount: Number(clientsCountRows[0]?.total ?? 0),
    carriers: carrierRows,
    invoices: invoiceRows,
    documents: docRows,
    events,
    logs,
  };
}

export async function getReportsData(): Promise<ReportsData> {
  const [shipmentRows, invoiceRows, clientRows, carrierRows] = await Promise.all([
    listShipments(),
    listInvoices(),
    listClients(),
    listCarriers(),
  ]);
  return { shipments: shipmentRows, invoices: invoiceRows, clients: clientRows, carriers: carrierRows };
}

export async function countShipmentsWithPendingDocs(): Promise<number> {
  const rows = await db
    .select({ shipmentId: documents.shipmentId })
    .from(documents)
    .where(and(eq(documents.status, "pending"), isNull(documents.uploadedBy)))
    .limit(1);
  return rows.length;
}

export async function shipmentsCreatedSince(date: Date): Promise<number> {
  const rows = await db.select({ id: shipments.id }).from(shipments).where(gte(shipments.createdAt, date));
  return rows.length;
}
