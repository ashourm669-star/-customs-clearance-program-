export type ShipmentRow = {
  id: number;
  reference: string;
  clientId: number | null;
  clientName: string | null;
  carrierId: number | null;
  carrierName: string | null;
  carrierType: string | null;
  mode: string;
  direction: string;
  status: string;
  priority: string;
  port: string | null;
  origin: string | null;
  destination: string | null;
  blNumber: string | null;
  vesselFlight: string | null;
  containerCount: number;
  packageCount: number;
  grossWeight: number;
  goodsDescription: string | null;
  hsCode: string | null;
  invoiceValue: number;
  currency: string;
  dutyAmount: number;
  vatAmount: number;
  serviceFees: number;
  eta: string | null;
  arrivedAt: string | null;
  releasedAt: string | null;
  brokerName: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  pendingDocs: number;
};

export type ClientRow = {
  id: number;
  name: string;
  nameEn: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  taxId: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  industry: string | null;
  creditLimit: number | null;
  notes: string | null;
  createdAt: string;
  shipmentCount: number;
  invoiceTotal: number;
  outstanding: number;
};

export type CarrierRow = {
  id: number;
  name: string;
  nameEn: string | null;
  code: string | null;
  type: string;
  country: string | null;
  scac: string | null;
  apiEndpoint: string | null;
  integrationStatus: string;
  lastSyncAt: string | null;
  shipmentsSynced: number;
  color: string;
  notes: string | null;
  trackingUrl: string | null;
  apiKey: string | null;
  apiSecret: string | null;
  createdAt: string;
  activeShipments: number;
  totalShipments: number;
};

export type InvoiceRow = {
  id: number;
  number: string;
  shipmentId: number | null;
  clientId: number | null;
  clientName: string | null;
  shipmentReference: string | null;
  issueDate: string;
  dueDate: string | null;
  subtotal: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  status: string;
  notes: string | null;
  createdAt: string;
};

export type DocumentItem = {
  id: number;
  shipmentId: number;
  shipmentReference: string;
  clientName: string | null;
  name: string;
  type: string;
  status: string;
  sizeKb: number;
  uploadedBy: string | null;
  fileUrl?: string | null;
  createdAt: string;
};

export type EventItem = {
  id: number;
  shipmentId: number;
  title: string;
  description: string | null;
  type: string;
  location: string | null;
  occurredAt: string;
  createdAt: string;
};

export type LogItem = {
  id: number;
  carrierId: number | null;
  carrierName: string | null;
  kind: string;
  reference: string | null;
  status: string;
  message: string;
  createdAt: string;
};

export type DashboardData = {
  shipments: ShipmentRow[];
  clientsCount: number;
  carriers: CarrierRow[];
  invoices: InvoiceRow[];
  documents: DocumentItem[];
  events: EventItem[];
  logs: LogItem[];
};

export type ReportsData = {
  shipments: ShipmentRow[];
  invoices: InvoiceRow[];
  clients: ClientRow[];
  carriers: CarrierRow[];
};
