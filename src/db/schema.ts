import { integer, jsonb, numeric, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("agent"),
  jobTitle: text("job_title").default("مخلص جمركي"),
  phone: text("phone"),
  avatarColor: text("avatar_color").notNull().default("#0f9d8b"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  taxId: text("tax_id"),
  country: text("country").default("مصر"),
  city: text("city"),
  address: text("address"),
  industry: text("industry"),
  creditLimit: integer("credit_limit").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const carriers = pgTable("carriers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  code: text("code"),
  type: text("type").notNull().default("airline"),
  country: text("country"),
  scac: text("scac"),
  apiEndpoint: text("api_endpoint"),
  integrationStatus: text("integration_status").notNull().default("connected"),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  shipmentsSynced: integer("shipments_synced").notNull().default(0),
  color: text("color").notNull().default("#0b2545"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const banks = pgTable("banks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameEn: text("name_en"),
  code: text("code"),
  swift: text("swift"),
  accountName: text("account_name"),
  accountNumber: text("account_number"),
  iban: text("iban"),
  currency: text("currency").default("EGP").notNull(),
  branch: text("branch"),
  status: text("status").notNull().default("manual"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const contracts = pgTable("contracts", {
  id: serial("id").primaryKey(),
  number: text("number").notNull().unique(),
  clientId: integer("client_id").references(() => clients.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  type: text("type").notNull().default("sale"),
  incoterm: text("incoterm").default("FOB"),
  paymentMethod: text("payment_method").notNull().default("bank_transfer"),
  bankId: integer("bank_id").references(() => banks.id, { onDelete: "set null" }),
  currency: text("currency").default("USD").notNull(),
  amount: numeric("amount", { precision: 18, scale: 2, mode: "number" }).default(0),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  paymentTerms: text("payment_terms"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const shipments = pgTable("shipments", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull().unique(),
  clientId: integer("client_id").references(() => clients.id, { onDelete: "set null" }),
  carrierId: integer("carrier_id").references(() => carriers.id, { onDelete: "set null" }),
  mode: text("mode").notNull().default("sea"),
  direction: text("direction").notNull().default("import"),
  status: text("status").notNull().default("draft"),
  priority: text("priority").notNull().default("normal"),
  port: text("port"),
  origin: text("origin"),
  destination: text("destination"),
  blNumber: text("bl_number"),
  vesselFlight: text("vessel_flight"),
  containerCount: integer("container_count").notNull().default(0),
  packageCount: integer("package_count").notNull().default(0),
  grossWeight: integer("gross_weight").notNull().default(0),
  goodsDescription: text("goods_description"),
  hsCode: text("hs_code"),
  invoiceValue: integer("invoice_value").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  dutyAmount: integer("duty_amount").notNull().default(0),
  vatAmount: integer("vat_amount").notNull().default(0),
  serviceFees: integer("service_fees").notNull().default(0),
  eta: timestamp("eta", { withTimezone: true }),
  arrivedAt: timestamp("arrived_at", { withTimezone: true }),
  releasedAt: timestamp("released_at", { withTimezone: true }),
  brokerName: text("broker_name"),
  notes: text("notes"),
  contractId: integer("contract_id").references(() => contracts.id, { onDelete: "set null" }),
  incoterm: text("incoterm"),
  paymentMethod: text("payment_method"),
  bankId: integer("bank_id").references(() => banks.id, { onDelete: "set null" }),
  bankReference: text("bank_reference"),
  commercialInvoiceNumber: text("commercial_invoice_number"),
  commercialInvoiceDate: timestamp("commercial_invoice_date", { withTimezone: true }),
  originCountry: text("origin_country"),
  customsSystem: text("customs_system").default("nafeza"),
  manifestNumber: text("manifest_number"),
  manifestType: text("manifest_type"),
  acidNumber: text("acid_number"),
  acidSubmittedAt: timestamp("acid_submitted_at", { withTimezone: true }),
  acidExpiresAt: timestamp("acid_expires_at", { withTimezone: true }),
  acidStatus: text("acid_status"),
  assessmentValue: numeric("assessment_value", { precision: 18, scale: 2, mode: "number" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const tariffCodes = pgTable("tariff_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  chapter: text("chapter"),
  category: text("category"),
  unit: text("unit"),
  dutyBps: integer("duty_bps"),
  vatBps: integer("vat_bps").default(1400),
  importStatus: text("import_status").notNull().default("verification_required"),
  authorities: jsonb("authorities").$type<string[]>().default([]),
  conditions: jsonb("conditions").$type<string[]>().default([]),
  sourceUrl: text("source_url"),
  sourceReference: text("source_reference"),
  legalUpdatedAt: timestamp("legal_updated_at", { withTimezone: true }),
  verified: integer("verified").notNull().default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const shipmentItems = pgTable("shipment_items", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id").notNull().references(() => shipments.id, { onDelete: "cascade" }),
  tariffId: integer("tariff_id").references(() => tariffCodes.id, { onDelete: "set null" }),
  description: text("description").notNull(),
  hsCode: text("hs_code"),
  originCountry: text("origin_country"),
  quantity: numeric("quantity", { precision: 18, scale: 2, mode: "number" }).default(1),
  unit: text("unit"),
  unitValue: numeric("unit_value", { precision: 18, scale: 2, mode: "number" }).default(0),
  currency: text("currency").default("USD").notNull(),
  invoiceValue: numeric("invoice_value", { precision: 18, scale: 2, mode: "number" }).default(0),
  freight: numeric("freight", { precision: 18, scale: 2, mode: "number" }).default(0),
  insurance: numeric("insurance", { precision: 18, scale: 2, mode: "number" }).default(0),
  dutyBps: integer("duty_bps"),
  vatBps: integer("vat_bps"),
  dutyAmount: numeric("duty_amount", { precision: 18, scale: 2, mode: "number" }).default(0),
  vatAmount: numeric("vat_amount", { precision: 18, scale: 2, mode: "number" }).default(0),
  assessmentValue: numeric("assessment_value", { precision: 18, scale: 2, mode: "number" }).default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const commercialInvoices = pgTable("commercial_invoices", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id").references(() => shipments.id, { onDelete: "cascade" }),
  clientId: integer("client_id").references(() => clients.id, { onDelete: "set null" }),
  contractId: integer("contract_id").references(() => contracts.id, { onDelete: "set null" }),
  number: text("number").notNull(),
  date: timestamp("date", { withTimezone: true }),
  supplierName: text("supplier_name"),
  originCountry: text("origin_country"),
  currency: text("currency").default("USD").notNull(),
  subtotal: numeric("subtotal", { precision: 18, scale: 2, mode: "number" }).default(0),
  freight: numeric("freight", { precision: 18, scale: 2, mode: "number" }).default(0),
  insurance: numeric("insurance", { precision: 18, scale: 2, mode: "number" }).default(0),
  total: numeric("total", { precision: 18, scale: 2, mode: "number" }).default(0),
  incoterm: text("incoterm"),
  paymentMethod: text("payment_method"),
  bankName: text("bank_name"),
  bankSwift: text("bank_swift"),
  bankAccount: text("bank_account"),
  bankIban: text("bank_iban"),
  acidNumber: text("acid_number"),
  sourceText: text("source_text"),
  sourceFilename: text("source_filename"),
  reviewStatus: text("review_status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const exchangeRates = pgTable("exchange_rates", {
  currency: text("currency").primaryKey(),
  rate: numeric("rate", { precision: 18, scale: 6, mode: "number" }).notNull(),
  previousRate: numeric("previous_rate", { precision: 18, scale: 6, mode: "number" }),
  source: text("source").notNull().default("manual"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const shipmentEvents = pgTable("shipment_events", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id").notNull().references(() => shipments.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull().default("note"),
  location: text("location"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  shipmentId: integer("shipment_id").notNull().references(() => shipments.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull().default("other"),
  status: text("status").notNull().default("pending"),
  sizeKb: integer("size_kb").notNull().default(0),
  uploadedBy: text("uploaded_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  number: text("number").notNull().unique(),
  shipmentId: integer("shipment_id").references(() => shipments.id, { onDelete: "set null" }),
  clientId: integer("client_id").references(() => clients.id, { onDelete: "set null" }),
  issueDate: timestamp("issue_date", { withTimezone: true }).defaultNow().notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }),
  subtotal: integer("subtotal").notNull().default(0),
  taxAmount: integer("tax_amount").notNull().default(0),
  total: integer("total").notNull().default(0),
  paidAmount: integer("paid_amount").notNull().default(0),
  status: text("status").notNull().default("draft"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const integrationLogs = pgTable("integration_logs", {
  id: serial("id").primaryKey(),
  carrierId: integer("carrier_id").references(() => carriers.id, { onDelete: "set null" }),
  kind: text("kind").notNull().default("carrier_sync"),
  reference: text("reference"),
  status: text("status").notNull().default("success"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Carrier = typeof carriers.$inferSelect;
export type Shipment = typeof shipments.$inferSelect;
export type ShipmentEvent = typeof shipmentEvents.$inferSelect;
export type DocumentRow = typeof documents.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type IntegrationLog = typeof integrationLogs.$inferSelect;
