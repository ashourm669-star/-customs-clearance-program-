import type { shipments } from "@/db/schema";
import { DIRECTIONS, MODES, PRIORITIES, SHIPMENT_STATUSES } from "@/lib/constants";
import { asDate, asNumber, asOptionalString, asString } from "@/lib/api";

export type ShipmentInsert = typeof shipments.$inferInsert;

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const text = asString(value);
  return (allowed as readonly string[]).includes(text) ? (text as T) : fallback;
}

export function shipmentCoreValues(p: Record<string, unknown>): Partial<ShipmentInsert> {
  const values: Partial<ShipmentInsert> = {};
  values.clientId = asNumber(p.clientId) > 0 ? asNumber(p.clientId) : null;
  values.carrierId = asNumber(p.carrierId) > 0 ? asNumber(p.carrierId) : null;
  values.mode = pick(p.mode, MODES, "sea");
  values.direction = pick(p.direction, DIRECTIONS, "import");
  values.status = pick(p.status, SHIPMENT_STATUSES, "draft");
  values.priority = pick(p.priority, PRIORITIES, "normal");
  values.port = asOptionalString(p.port);
  values.origin = asOptionalString(p.origin);
  values.destination = asOptionalString(p.destination);
  values.blNumber = asOptionalString(p.blNumber);
  values.vesselFlight = asOptionalString(p.vesselFlight);
  values.containerCount = asNumber(p.containerCount);
  values.packageCount = asNumber(p.packageCount);
  values.grossWeight = asNumber(p.grossWeight);
  values.goodsDescription = asOptionalString(p.goodsDescription);
  values.hsCode = asOptionalString(p.hsCode);
  values.invoiceValue = asNumber(p.invoiceValue);
  values.currency = asString(p.currency, "USD") || "USD";
  values.dutyAmount = asNumber(p.dutyAmount);
  values.vatAmount = asNumber(p.vatAmount);
  values.serviceFees = asNumber(p.serviceFees);
  values.eta = asDate(p.eta);
  values.arrivedAt = asDate(p.arrivedAt);
  values.notes = asOptionalString(p.notes);
  values.brokerName = asOptionalString(p.brokerName);
  return values;
}

export function shipmentPatchValues(p: Record<string, unknown>): Partial<ShipmentInsert> {
  const patch: Partial<ShipmentInsert> = { updatedAt: new Date() };

  if ("clientId" in p) patch.clientId = asNumber(p.clientId) > 0 ? asNumber(p.clientId) : null;
  if ("carrierId" in p) patch.carrierId = asNumber(p.carrierId) > 0 ? asNumber(p.carrierId) : null;
  if ("mode" in p) patch.mode = pick(p.mode, MODES, "sea");
  if ("direction" in p) patch.direction = pick(p.direction, DIRECTIONS, "import");
  if ("status" in p) patch.status = pick(p.status, SHIPMENT_STATUSES, "draft");
  if ("priority" in p) patch.priority = pick(p.priority, PRIORITIES, "normal");
  if ("port" in p) patch.port = asOptionalString(p.port);
  if ("origin" in p) patch.origin = asOptionalString(p.origin);
  if ("destination" in p) patch.destination = asOptionalString(p.destination);
  if ("blNumber" in p) patch.blNumber = asOptionalString(p.blNumber);
  if ("vesselFlight" in p) patch.vesselFlight = asOptionalString(p.vesselFlight);
  if ("containerCount" in p) patch.containerCount = asNumber(p.containerCount);
  if ("packageCount" in p) patch.packageCount = asNumber(p.packageCount);
  if ("grossWeight" in p) patch.grossWeight = asNumber(p.grossWeight);
  if ("goodsDescription" in p) patch.goodsDescription = asOptionalString(p.goodsDescription);
  if ("hsCode" in p) patch.hsCode = asOptionalString(p.hsCode);
  if ("invoiceValue" in p) patch.invoiceValue = asNumber(p.invoiceValue);
  if ("currency" in p) patch.currency = asString(p.currency, "USD") || "USD";
  if ("dutyAmount" in p) patch.dutyAmount = asNumber(p.dutyAmount);
  if ("vatAmount" in p) patch.vatAmount = asNumber(p.vatAmount);
  if ("serviceFees" in p) patch.serviceFees = asNumber(p.serviceFees);
  if ("eta" in p) patch.eta = asDate(p.eta);
  if ("arrivedAt" in p) patch.arrivedAt = asDate(p.arrivedAt);
  if ("releasedAt" in p) patch.releasedAt = asDate(p.releasedAt);
  if ("notes" in p) patch.notes = asOptionalString(p.notes);
  if ("brokerName" in p) patch.brokerName = asOptionalString(p.brokerName);
  if ("reference" in p && asString(p.reference)) patch.reference = asString(p.reference);
  return patch;
}
