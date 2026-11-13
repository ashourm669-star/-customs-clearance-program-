import { and, asc, count, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  appSettings,
  auditLogs,
  carriers,
  clients,
  documents,
  documentBlobs,
  invoices,
  integrationLogs,
  shipmentEvents,
  shipments,
  users,
} from "@/db/schema";
import { iso } from "@/lib/format";
import { LOCKED_COMPANY_FIELDS, LOCKED_COMPANY_KEYS } from "@/lib/company-identity";
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
    trackingUrl: row.trackingUrl,
    apiKey: row.apiKey,
    apiSecret: row.apiSecret,
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
      storedFileId: documentBlobs.documentId,
    })
    .from(documents)
    .innerJoin(shipments, eq(documents.shipmentId, shipments.id))
    .leftJoin(clients, eq(shipments.clientId, clients.id))
    .leftJoin(documentBlobs, eq(documents.id, documentBlobs.documentId))
    .orderBy(desc(documents.createdAt));

  return rows.map((row) => ({
    ...row,
    fileUrl: row.storedFileId ? `/api/documents/${row.id}/file` : null,
    createdAt: iso(row.createdAt) as string,
  }));
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

export type Alert = { id: string; title: string; body: string; tone: "rose" | "amber" | "sky"; href: string };

export async function getAlerts(): Promise<Alert[]> {
  const [allShipments, invoiceRows, docRows] = await Promise.all([listShipments(), listInvoices(), listDocuments()]);
  const alerts: Alert[] = [];
  const now = Date.now();

  for (const shipment of allShipments) {
    if (shipment.pendingDocs > 0) {
      alerts.push({
        id: `docs-${shipment.id}`,
        title: `${shipment.pendingDocs} مستند بانتظار المراجعة`,
        body: `${shipment.reference} — ${shipment.clientName ?? "بدون عميل"}`,
        tone: "amber",
        href: `/shipments/${shipment.id}`,
      });
    }
    if (shipment.status === "on_hold") {
      alerts.push({ id: `hold-${shipment.id}`, title: "ملف معلّق يحتاج إجراءً", body: shipment.reference, tone: "rose", href: `/shipments/${shipment.id}` });
    }
    if (shipment.eta && new Date(shipment.eta).getTime() < now && !["released", "delivered"].includes(shipment.status)) {
      alerts.push({ id: `late-${shipment.id}`, title: "تجاوز موعد الوصول المتوقع", body: `${shipment.reference} — ${shipment.port ?? ""}`, tone: "rose", href: `/customs?id=${shipment.id}` });
    }
  }
  for (const invoice of invoiceRows) {
    const remaining = invoice.total - invoice.paidAmount;
    if (invoice.status === "overdue" || (remaining > 0 && invoice.dueDate && new Date(invoice.dueDate).getTime() < now)) {
      alerts.push({ id: `inv-${invoice.id}`, title: "فاتورة متأخرة تحتاج تحصيلاً", body: `${invoice.number} — ${invoice.clientName ?? ""} (${remaining.toLocaleString("en-US")} ج.م)`, tone: "rose", href: "/invoices" });
    }
  }
  for (const doc of docRows.filter((row) => row.status === "pending").slice(0, 5)) {
    alerts.push({ id: `doc-${doc.id}`, title: "مستند جديد بانتظار الاعتماد", body: doc.name, tone: "sky", href: `/shipments/${doc.shipmentId}` });
  }
  return alerts.slice(0, 30);
}

export async function getAppSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(appSettings);
  return { ...Object.fromEntries(rows.map((row) => [row.key, row.value])), ...LOCKED_COMPANY_FIELDS };
}

export async function setAppSettings(values: Record<string, string>, actor: string) {
  const mutable = Object.entries(values).filter(([key]) => !LOCKED_COMPANY_KEYS.has(key));
  for (const [key, value] of mutable) {
    await db.insert(appSettings).values({ key, value, updatedAt: new Date() }).onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
  }
  if (mutable.length) await db.insert(auditLogs).values({ actorName: actor, action: "تحديث بيانات المنشأة", entity: "app_settings", details: mutable.map(([key]) => key).join(", ") });
}

export async function listUsers() {
  const rows = await db.select().from(users).orderBy(asc(users.id));
  return rows.map((row) => ({
    id: row.id, name: row.name, email: row.email, role: row.role, jobTitle: row.jobTitle,
    phone: row.phone, avatarColor: row.avatarColor, permissions: row.permissions ?? [], active: row.active,
    createdAt: iso(row.createdAt) as string,
  }));
}
