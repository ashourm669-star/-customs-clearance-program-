import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  banks,
  carrierConnections,
  carriers,
  clients,
  documents,
  invoices,
  nafezaEvents,
  ports,
  shipmentItems,
  shipments,
  tariffItems,
  tasks,
  users,
} from "@/db/schema";
import { hashPassword } from "@/lib/password";

export type ResourceKey =
  | "clients"
  | "carriers"
  | "ports"
  | "carrierConnections"
  | "shipments"
  | "shipmentItems"
  | "tariffItems"
  | "banks"
  | "tasks"
  | "documents"
  | "invoices"
  | "nafezaEvents"
  | "users"
  | "activities";

export type ResourceConfig = {
  table: any;
  fields: string[];
  required: string[];
  labelField: string;
  numericFields?: string[];
  dateFields?: string[];
  booleanFields?: string[];
  auto?: { field: string; prefix: string };
  transform?: (payload: Record<string, any>, mode: "create" | "update") => Record<string, any>;
  cascade?: (id: number) => Promise<void>;
};

const autoNumber = (prefix: string) =>
  `${prefix}${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}${Math.floor(Math.random() * 90)}`;

export const resourceConfig: Record<ResourceKey, ResourceConfig> = {
  clients: {
    table: clients,
    fields: ["code", "name", "type", "taxNumber", "phone", "email", "city", "address", "creditLimit", "status", "notes"],
    required: ["name"],
    labelField: "name",
    numericFields: ["creditLimit"],
    auto: { field: "code", prefix: "CL-" },
  },
  carriers: {
    table: carriers,
    fields: ["code", "name", "englishName", "type", "country", "contactPerson", "contactPhone", "website", "apiEndpoint", "nafezaCode", "integration", "status"],
    required: ["name"],
    labelField: "name",
    auto: { field: "code", prefix: "CR-" },
  },
  carrierConnections: {
    table: carrierConnections,
    fields: ["carrierId", "provider", "providerCode", "apiUrl", "apiKey", "trackingUrlTemplate", "enabled", "notes"],
    required: ["carrierId"],
    labelField: "providerCode",
    numericFields: ["carrierId"],
    booleanFields: ["enabled"],
  },
  shipmentItems: {
    table: shipmentItems,
    fields: ["shipmentId", "tariffItemId", "hsCode", "nameAr", "nameEn", "quantity", "unit", "unitPrice", "invoiceValue", "currency", "origin", "weightKg", "dutyRate", "vatRate", "dutyAmount", "vatAmount", "feesTotal"],
    required: ["nameAr"],
    labelField: "nameAr",
    numericFields: ["shipmentId", "tariffItemId", "quantity", "unitPrice", "invoiceValue", "weightKg", "dutyRate", "vatRate", "dutyAmount", "vatAmount", "feesTotal"],
  },
  tariffItems: {
    table: tariffItems,
    fields: ["hsCode", "chapter", "nameAr", "nameEn", "dutyRate", "vatRate", "tableTaxRate", "developmentRate", "importStatus", "importConditions", "authorities", "unit", "notes"],
    required: ["hsCode", "nameAr"],
    labelField: "nameAr",
    numericFields: ["dutyRate", "vatRate", "tableTaxRate", "developmentRate"],
  },
  banks: {
    table: banks,
    fields: ["code", "swift", "nameAr", "nameEn", "paymentMethods", "status"],
    required: ["nameAr"],
    labelField: "nameAr",
    auto: { field: "code", prefix: "BNK-" },
  },
  ports: {
    table: ports,
    fields: ["code", "name", "type", "city", "customsOffice", "nafezaCode", "status"],
    required: ["name"],
    labelField: "name",
    auto: { field: "code", prefix: "PT-" },
  },
  shipments: {
    table: shipments,
    fields: ["refNo", "clientId", "carrierId", "portId", "direction", "mode", "cargoKind", "customsRegime", "subjectionSystem", "transportRef", "acidNumber", "declarationNumber", "commercialInvoiceNo", "commercialInvoiceDate", "contractType", "paymentMethod", "bankId", "goodsDescription", "origin", "destination", "packages", "weightKg", "containerCount", "cargoValue", "currency", "freightAmount", "insuranceAmount", "exchangeRate", "customsValueEgp", "acidIssuedAt", "acidExpiresAt", "etd", "eta", "status", "clearanceOfficer", "notes"],
    required: ["goodsDescription", "clientId"],
    labelField: "refNo",
    numericFields: ["clientId", "carrierId", "portId", "bankId", "packages", "weightKg", "containerCount", "cargoValue", "freightAmount", "insuranceAmount", "exchangeRate", "customsValueEgp"],
    dateFields: ["etd", "eta", "commercialInvoiceDate", "acidIssuedAt", "acidExpiresAt"],
    auto: { field: "refNo", prefix: "SHP-" },
    cascade: async (id) => {
      await db.delete(tasks).where(eq(tasks.shipmentId, id));
      await db.delete(documents).where(eq(documents.shipmentId, id));
      await db.delete(nafezaEvents).where(eq(nafezaEvents.shipmentId, id));
      await db.delete(shipmentItems).where(eq(shipmentItems.shipmentId, id));
    },
  },
  tasks: {
    table: tasks,
    fields: ["shipmentId", "title", "stage", "assignee", "priority", "status", "dueDate", "notes"],
    required: ["title"],
    labelField: "title",
    numericFields: ["shipmentId"],
    dateFields: ["dueDate"],
    auto: undefined,
  },
  documents: {
    table: documents,
    fields: ["shipmentId", "name", "type", "referenceNo", "fileName", "status", "notes"],
    required: ["name"],
    labelField: "name",
    numericFields: ["shipmentId"],
  },
  invoices: {
    table: invoices,
    fields: ["invoiceNo", "clientId", "shipmentId", "description", "amount", "tax", "currency", "status", "issueDate", "dueDate"],
    required: ["clientId", "amount"],
    labelField: "invoiceNo",
    numericFields: ["clientId", "shipmentId", "amount", "tax"],
    dateFields: ["issueDate", "dueDate"],
    auto: { field: "invoiceNo", prefix: "INV-" },
  },
  nafezaEvents: {
    table: nafezaEvents,
    fields: ["shipmentId", "eventType", "reference", "channel", "carrier", "status", "message", "payload"],
    required: ["eventType"],
    labelField: "reference",
    numericFields: ["shipmentId"],
  },
  users: {
    table: users,
    fields: ["name", "email", "role", "phone", "active", "password"],
    required: ["name", "email"],
    labelField: "name",
    booleanFields: ["active"],
    transform: (payload, mode) => {
      const next = { ...payload };
      if (next.password) {
        next.passwordHash = hashPassword(String(next.password));
        delete next.password;
      } else {
        delete next.password;
        if (mode === "create") next.passwordHash = hashPassword("Admin@123");
      }
      return next;
    },
  },
  activities: {
    table: activities,
    fields: ["action", "entity", "entityLabel", "description", "actor"],
    required: ["action", "entity"],
    labelField: "entityLabel",
  },
};

export const isResourceKey = (key: string): key is ResourceKey =>
  Object.prototype.hasOwnProperty.call(resourceConfig, key);

export function sanitize(
  config: ResourceConfig,
  body: Record<string, any>,
  mode: "create" | "update",
): Record<string, any> {
  const out: Record<string, any> = {};
  for (const key of config.fields) {
    if (!(key in body)) continue;
    let value = body[key];
    if (value === "" || value === undefined) {
      if (config.numericFields?.includes(key) || config.dateFields?.includes(key)) value = null;
      else if (key === "password") continue;
      else value = null;
    }
    if (value !== null && config.numericFields?.includes(key)) {
      const parsed = Number(value);
      value = Number.isFinite(parsed) ? parsed : null;
    }
    if (value !== null && config.booleanFields?.includes(key)) {
      value = value === true || value === "true" || value === 1 || value === "1";
    }
    out[key] = value;
  }
  if (mode === "create" && config.auto && !out[config.auto.field]) {
    out[config.auto.field] = autoNumber(config.auto.prefix);
  }
  // The browser only ever sees a masked API key; keep the stored one on update.
  if (out.apiKey === "********") delete out.apiKey;
  return config.transform ? config.transform(out, mode) : out;
}

export async function logActivity(
  action: string,
  entity: string,
  entityLabel: string,
  description: string,
  actor: string,
) {
  try {
    await db.insert(activities).values({ action, entity, entityLabel, description, actor });
  } catch {
    // activity logging should never break a mutation
  }
}
