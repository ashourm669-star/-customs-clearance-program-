import {
  boolean,
  date,
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("operator"),
  phone: text("phone"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: integer("user_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull().default("company"),
  taxNumber: text("tax_number"),
  phone: text("phone"),
  email: text("email"),
  city: text("city"),
  address: text("address"),
  creditLimit: doublePrecision("credit_limit").default(0),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const carriers = pgTable("carriers", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  englishName: text("english_name"),
  type: text("type").notNull().default("airline"), // airline | shipping | land
  country: text("country"),
  contactPerson: text("contact_person"),
  contactPhone: text("contact_phone"),
  website: text("website"),
  apiEndpoint: text("api_endpoint"),
  nafezaCode: text("nafeza_code"),
  integration: text("integration").notNull().default("connected"), // connected | pending | manual
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const carrierConnections = pgTable("carrier_connections", {
  id: serial("id").primaryKey(),
  carrierId: integer("carrier_id"),
  provider: text("provider").notNull().default("official"), // trackingmore | custom | official
  providerCode: text("provider_code"),
  apiUrl: text("api_url"),
  apiKey: text("api_key"),
  trackingUrlTemplate: text("tracking_url_template"),
  enabled: boolean("enabled").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ports = pgTable("ports", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull().default("sea"), // sea | air | land
  city: text("city"),
  customsOffice: text("customs_office"),
  nafezaCode: text("nafeza_code"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shipments = pgTable("shipments", {
  id: serial("id").primaryKey(),
  refNo: text("ref_no").notNull().unique(),
  clientId: integer("client_id"),
  carrierId: integer("carrier_id"),
  portId: integer("port_id"),
  direction: text("direction").notNull().default("import"), // import | export | transit
  mode: text("mode").notNull().default("sea"), // air | sea | land
  transportRef: text("transport_ref"), // AWB / B/L / manifest
  acidNumber: text("acid_number"),
  declarationNumber: text("declaration_number"),
  goodsDescription: text("goods_description"),
  origin: text("origin"),
  destination: text("destination"),
  packages: integer("packages"),
  weightKg: doublePrecision("weight_kg"),
  containerCount: integer("container_count"),
  cargoValue: doublePrecision("cargo_value"),
  currency: text("currency").notNull().default("EGP"),
  cargoKind: text("cargo_kind").notNull().default("manifest"),
  customsRegime: text("customs_regime"),
  subjectionSystem: text("subjection_system"),
  commercialInvoiceNo: text("commercial_invoice_no"),
  commercialInvoiceDate: date("commercial_invoice_date"),
  contractType: text("contract_type"),
  paymentMethod: text("payment_method"),
  bankId: integer("bank_id"),
  freightAmount: doublePrecision("freight_amount"),
  insuranceAmount: doublePrecision("insurance_amount"),
  exchangeRate: doublePrecision("exchange_rate"),
  customsValueEgp: doublePrecision("customs_value_egp"),
  acidIssuedAt: date("acid_issued_at"),
  acidExpiresAt: date("acid_expires_at"),
  etd: date("etd"),
  eta: date("eta"),
  status: text("status").notNull().default("new"),
  clearanceOfficer: text("clearance_officer"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const banks = pgTable("banks", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  swift: text("swift"),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  paymentMethods: text("payment_methods"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tariffItems = pgTable("tariff_items", {
  id: serial("id").primaryKey(),
  hsCode: text("hs_code").notNull().unique(),
  chapter: text("chapter"),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  dutyRate: doublePrecision("duty_rate").notNull().default(0),
  vatRate: doublePrecision("vat_rate").notNull().default(14),
  tableTaxRate: doublePrecision("table_tax_rate").notNull().default(0),
  developmentRate: doublePrecision("development_rate").notNull().default(0),
  importStatus: text("import_status").notNull().default("allowed"),
  importConditions: text("import_conditions"),
  authorities: text("authorities"),
  unit: text("unit"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const shipmentItems = pgTable("shipment_items", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id"),
  tariffItemId: integer("tariff_item_id"),
  hsCode: text("hs_code"),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  quantity: doublePrecision("quantity").notNull().default(1),
  unit: text("unit"),
  unitPrice: doublePrecision("unit_price").notNull().default(0),
  invoiceValue: doublePrecision("invoice_value").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  origin: text("origin"),
  weightKg: doublePrecision("weight_kg"),
  dutyRate: doublePrecision("duty_rate").notNull().default(0),
  vatRate: doublePrecision("vat_rate").notNull().default(14),
  dutyAmount: doublePrecision("duty_amount").notNull().default(0),
  vatAmount: doublePrecision("vat_amount").notNull().default(0),
  feesTotal: doublePrecision("fees_total").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const exchangeRates = pgTable("exchange_rates", {
  id: serial("id").primaryKey(),
  currency: text("currency").notNull().unique(),
  rateToEgp: doublePrecision("rate_to_egp").notNull(),
  source: text("source"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id"),
  title: text("title").notNull(),
  stage: text("stage").notNull().default("documents"),
  assignee: text("assignee"),
  priority: text("priority").notNull().default("normal"),
  status: text("status").notNull().default("pending"),
  dueDate: date("due_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id"),
  name: text("name").notNull(),
  type: text("type").notNull().default("other"),
  referenceNo: text("reference_no"),
  fileName: text("file_name"),
  status: text("status").notNull().default("required"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNo: text("invoice_no").notNull().unique(),
  clientId: integer("client_id"),
  shipmentId: integer("shipment_id"),
  description: text("description"),
  amount: doublePrecision("amount").notNull().default(0),
  tax: doublePrecision("tax").notNull().default(0),
  currency: text("currency").notNull().default("EGP"),
  status: text("status").notNull().default("pending"),
  issueDate: date("issue_date"),
  dueDate: date("due_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const nafezaEvents = pgTable("nafeza_events", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id"),
  eventType: text("event_type").notNull(),
  reference: text("reference"),
  channel: text("channel").notNull().default("نافذة"),
  carrier: text("carrier"),
  status: text("status").notNull().default("pending"),
  message: text("message"),
  payload: text("payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityLabel: text("entity_label"),
  description: text("description"),
  actor: text("actor"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = InferSelectModel<typeof users>;
export type Client = InferSelectModel<typeof clients>;
export type Carrier = InferSelectModel<typeof carriers>;
export type Port = InferSelectModel<typeof ports>;
export type CarrierConnection = InferSelectModel<typeof carrierConnections>;
export type Bank = InferSelectModel<typeof banks>;
export type TariffItem = InferSelectModel<typeof tariffItems>;
export type ShipmentItem = InferSelectModel<typeof shipmentItems>;
export type ExchangeRate = InferSelectModel<typeof exchangeRates>;
export type Shipment = InferSelectModel<typeof shipments>;
export type Task = InferSelectModel<typeof tasks>;
export type Document = InferSelectModel<typeof documents>;
export type Invoice = InferSelectModel<typeof invoices>;
export type NafezaEvent = InferSelectModel<typeof nafezaEvents>;
export type Activity = InferSelectModel<typeof activities>;
