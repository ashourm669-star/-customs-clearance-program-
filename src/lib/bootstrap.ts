import { sql } from "drizzle-orm";
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
  sessions,
  shipmentItems,
  shipments,
  tariffItems,
  tasks,
  users,
} from "@/db/schema";
import { BANKS_SEED, TARIFF_SEED } from "@/lib/tariff-seed";
import { hashPassword } from "@/lib/password";

const ddl = `
CREATE TABLE IF NOT EXISTS users (
  id serial PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'operator',
  phone text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
  token text PRIMARY KEY,
  user_id integer NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS clients (
  id serial PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'company',
  tax_number text,
  phone text,
  email text,
  city text,
  address text,
  credit_limit double precision DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS carriers (
  id serial PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  english_name text,
  type text NOT NULL DEFAULT 'airline',
  country text,
  contact_person text,
  contact_phone text,
  website text,
  api_endpoint text,
  nafeza_code text,
  integration text NOT NULL DEFAULT 'connected',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS carrier_connections (
  id serial PRIMARY KEY,
  carrier_id integer,
  provider text NOT NULL DEFAULT 'official',
  provider_code text,
  api_url text,
  api_key text,
  tracking_url_template text,
  enabled boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ports (
  id serial PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'sea',
  city text,
  customs_office text,
  nafeza_code text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS shipments (
  id serial PRIMARY KEY,
  ref_no text NOT NULL UNIQUE,
  client_id integer,
  carrier_id integer,
  port_id integer,
  direction text NOT NULL DEFAULT 'import',
  mode text NOT NULL DEFAULT 'sea',
  transport_ref text,
  acid_number text,
  declaration_number text,
  goods_description text,
  origin text,
  destination text,
  packages integer,
  weight_kg double precision,
  container_count integer,
  cargo_value double precision,
  currency text NOT NULL DEFAULT 'EGP',
  cargo_kind text NOT NULL DEFAULT 'manifest',
  customs_regime text,
  subjection_system text,
  commercial_invoice_no text,
  commercial_invoice_date date,
  contract_type text,
  payment_method text,
  bank_id integer,
  freight_amount double precision,
  insurance_amount double precision,
  exchange_rate double precision,
  customs_value_egp double precision,
  acid_issued_at date,
  acid_expires_at date,
  etd date,
  eta date,
  status text NOT NULL DEFAULT 'new',
  clearance_officer text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS tasks (
  id serial PRIMARY KEY,
  shipment_id integer,
  title text NOT NULL,
  stage text NOT NULL DEFAULT 'documents',
  assignee text,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'pending',
  due_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS documents (
  id serial PRIMARY KEY,
  shipment_id integer,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'other',
  reference_no text,
  file_name text,
  status text NOT NULL DEFAULT 'required',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS invoices (
  id serial PRIMARY KEY,
  invoice_no text NOT NULL UNIQUE,
  client_id integer,
  shipment_id integer,
  description text,
  amount double precision NOT NULL DEFAULT 0,
  tax double precision NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EGP',
  status text NOT NULL DEFAULT 'pending',
  issue_date date,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS nafeza_events (
  id serial PRIMARY KEY,
  shipment_id integer,
  event_type text NOT NULL,
  reference text,
  channel text NOT NULL DEFAULT 'نافذة',
  carrier text,
  status text NOT NULL DEFAULT 'pending',
  message text,
  payload text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE nafeza_events ADD COLUMN IF NOT EXISTS payload text;
CREATE TABLE IF NOT EXISTS activities (
  id serial PRIMARY KEY,
  action text NOT NULL,
  entity text NOT NULL,
  entity_label text,
  description text,
  actor text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS cargo_kind text NOT NULL DEFAULT 'manifest';
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS customs_regime text;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS subjection_system text;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS commercial_invoice_no text;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS commercial_invoice_date date;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS contract_type text;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS bank_id integer;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS freight_amount double precision;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS insurance_amount double precision;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS exchange_rate double precision;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS customs_value_egp double precision;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS acid_issued_at date;
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS acid_expires_at date;
CREATE TABLE IF NOT EXISTS banks (
  id serial PRIMARY KEY,
  code text NOT NULL UNIQUE,
  swift text,
  name_ar text NOT NULL,
  name_en text,
  payment_methods text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS tariff_items (
  id serial PRIMARY KEY,
  hs_code text NOT NULL UNIQUE,
  chapter text,
  name_ar text NOT NULL,
  name_en text,
  duty_rate double precision NOT NULL DEFAULT 0,
  vat_rate double precision NOT NULL DEFAULT 14,
  table_tax_rate double precision NOT NULL DEFAULT 0,
  development_rate double precision NOT NULL DEFAULT 0,
  import_status text NOT NULL DEFAULT 'allowed',
  import_conditions text,
  authorities text,
  unit text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS shipment_items (
  id serial PRIMARY KEY,
  shipment_id integer,
  tariff_item_id integer,
  hs_code text,
  name_ar text NOT NULL,
  name_en text,
  quantity double precision NOT NULL DEFAULT 1,
  unit text,
  unit_price double precision NOT NULL DEFAULT 0,
  invoice_value double precision NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  origin text,
  weight_kg double precision,
  duty_rate double precision NOT NULL DEFAULT 0,
  vat_rate double precision NOT NULL DEFAULT 14,
  duty_amount double precision NOT NULL DEFAULT 0,
  vat_amount double precision NOT NULL DEFAULT 0,
  fees_total double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS exchange_rates (
  id serial PRIMARY KEY,
  currency text NOT NULL UNIQUE,
  rate_to_egp double precision NOT NULL,
  source text,
  fetched_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tariff_code ON tariff_items(hs_code);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_tasks_shipment ON tasks(shipment_id);
CREATE INDEX IF NOT EXISTS idx_documents_shipment ON documents(shipment_id);
CREATE INDEX IF NOT EXISTS idx_events_shipment ON nafeza_events(shipment_id);
`;

const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
const ts = (daysAgo: number, hours = 9) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hours, 15, 0, 0);
  return d;
};

async function seed() {
  const existing = await db.execute(sql`select count(*)::int as count from users`);
  const count = Number((existing.rows[0] as { count: number })?.count ?? 0);
  if (count > 0) return;

  const password = hashPassword("Admin@123");
  const insertedUsers = await db
    .insert(users)
    .values([
      { name: "أحمد العربي", email: "admin@alarabi.com", passwordHash: password, role: "admin", phone: "+٢٠ ١٠٠ ٢٢٢ ٤٤٥٥" },
      { name: "محمود السيد", email: "ops@alarabi.com", passwordHash: password, role: "manager", phone: "+٢٠ ١٠٠ ١١١ ٨٨٧٧" },
      { name: "سارة عبد الرحمن", email: "clearance@alarabi.com", passwordHash: password, role: "operator", phone: "+٢٠ ١٠٦ ٥٥٥ ٢٢٣٣" },
      { name: "خالد منصور", email: "finance@alarabi.com", passwordHash: password, role: "accountant", phone: "+٢٠ ١٠٥ ٤٤٤ ٩٩٨٨" },
    ])
    .returning({ id: users.id });

  await db.insert(clients).values([
    { code: "CL-1001", name: "مجموعة السويدي إليكتريك", type: "company", taxNumber: "٢٠٤-٥٥١-٩٣٢", phone: "+٢٠ ٢ ٢٢٨١ ٤٥٠٠", email: "logistics@elsewedy.com", city: "القاهرة", address: "المنطقة الصناعية، مدينة السادس من أكتوبر", creditLimit: 2500000, status: "active", notes: "عميل استراتيجي - استيراد معدات كهربائية" },
    { code: "CL-1002", name: "الشركة المصرية لتجارة السيارات", type: "company", taxNumber: "١١٨-٧٧٢-٤٤٠", phone: "+٢٠ ٢ ٢٤١٨ ٩٠٠٠", email: "import@egycars.com", city: "الإسكندرية", address: "شارع الحرية، محرم بك", creditLimit: 1800000, status: "active" },
    { code: "CL-1003", name: "أوراسكوم للإنشاءات والصناعة", type: "company", taxNumber: "٣٣٩-١٠٨-٦٦٥", phone: "+٢٠ ٢ ٢٤٦١ ١١٠٠", email: "supply@orascom.com", city: "القاهرة", address: "البرج الشمالي، الزمالك", creditLimit: 3200000, status: "active" },
    { code: "CL-1004", name: "شركة النيل للأدوية", type: "company", taxNumber: "٥٥٧-٩٠٢-١٢٣", phone: "+٢٠ ٢ ٢٥٧٠ ٣٣٤٤", email: "procurement@nilepharma.com", city: "القاهرة", address: "مدينة العبور، المنطقة الصناعية الأولى", creditLimit: 950000, status: "active" },
    { code: "CL-1005", name: "مجموعة جهينة للصناعات الغذائية", type: "company", taxNumber: "٦٠٩-٢٢٤-٨٨١", phone: "+٢٠ ٢ ٢٨٢٤ ٧٧٧٧", email: "imports@juhayna.com", city: "الجيزة", address: "الصف، طريق الصعيد", creditLimit: 1400000, status: "active" },
    { code: "CL-1006", name: "الشرقية للدخان - إيسترن كومباني", type: "company", taxNumber: "١٠٢-٣٣٨-٧٧٤", phone: "+٢٠ ٢ ٢٥٥٠ ٦٢٢٢", email: "customs@easterncompany.com", city: "القاهرة", address: "شارع الجيش، الجمرك", creditLimit: 2200000, status: "active" },
    { code: "CL-1007", name: "التجاري الدولي للاستيراد والتصدير", type: "agent", taxNumber: "٤٤١-٧٧٦-٠٠٩", phone: "+٢٠ ٣ ٤٨٧ ٢٢١١", email: "trade@cibtrade.com", city: "الإسكندرية", address: "ميدان المنشية", creditLimit: 700000, status: "active" },
    { code: "CL-1008", name: "مصنع العاشر للمنسوجات", type: "company", taxNumber: "٨٨٢-٤٤١-٥٥٦", phone: "+٢٠ ٥٥ ٣٣٨ ٩٩٠٠", email: "sales@ashertextile.com", city: "العاشر من رمضان", address: "المنطقة الصناعية ب٢", creditLimit: 850000, status: "active" },
    { code: "CL-1009", name: "الهيئة العامة للسلع التموينية", type: "government", taxNumber: "٧٧٣-١١٩-٣٣٢", phone: "+٢٠ ٢ ٢٧٩٥ ١١٠٠", email: "info@gasc.gov.eg", city: "القاهرة", address: "شارع النيل، ماسبيرو", creditLimit: 5000000, status: "active" },
    { code: "CL-1010", name: "شركة البحار للتجارة البحرية", type: "company", taxNumber: "٩٠١-٦٦٣-٢٢٨", phone: "+٢٠ ٣ ٤٨٠ ٦٦٥٥", email: "ops@albehar.com", city: "بورسعيد", address: "شارع محمد علي، حي العرب", creditLimit: 600000, status: "inactive", notes: "حساب موقوف مؤقتاً" },
  ]);

  const carrierSeed: Array<[string, string, string, string, string, string, string]> = [
    ["MS", "مصر للطيران للشحن", "EgyptAir Cargo", "airline", "مصر", "مكتب الحجوزات", "+٢٠ ٢ ٢٢٦٧ ٧٨٠٠"],
    ["EK", "الإمارات للشحن الجوي", "Emirates SkyCargo", "airline", "الإمارات", "مركز الشحن", "+٩٧١ ٤ ٢١٨ ١١١١"],
    ["QR", "الخطوط الجوية القطرية للشحن", "Qatar Airways Cargo", "airline", "قطر", "إدارة الشحن", "+٩٧٤ ٤٤٦٢ ٢٩٩٩"],
    ["EY", "الاتحاد للشحن", "Etihad Cargo", "airline", "الإمارات", "مركز العمليات", "+٩٧١ ٢ ٥١١ ٠٠٠٠"],
    ["TK", "الخطوط التركية للشحن", "Turkish Cargo", "airline", "تركيا", "مكتب القاهرة", "+٩٠ ٢١٢ ٤٦٣ ٦٣٦٣"],
    ["LH", "لوفتهانزا للشحن", "Lufthansa Cargo", "airline", "ألمانيا", "إدارة الشحن", "+٤٩ ٦٩ ٦٩٦ ١"],
    ["AF", "إير فرانس / كي إل إم للشحن", "Air France-KLM Cargo", "airline", "فرنسا", "مكتب الشحن", "+٣٣ ١ ٤١ ٥٦ ٧٨ ٠٠"],
    ["SV", "الخطوط السعودية للشحن", "Saudia Cargo", "airline", "السعودية", "إدارة الشحن", "+٩٦٦ ١٢ ٦٨٦ ٠٠٠٠"],
    ["G9", "العربية للطيران", "Air Arabia", "airline", "الإمارات", "مركز الحجز", "+٩٧١ ٦ ٥٠٨ ٠٠٠٠"],
    ["RJ", "الملكية الأردنية", "Royal Jordanian Cargo", "airline", "الأردن", "إدارة الشحن", "+٩٦٢ ٦ ٥٢٠ ٢٠٠٠"],
    ["MAERSK", "ميرسك لاين", "Maersk Line", "shipping", "الدنمارك", "خدمة العملاء", "+٢٠ ٣ ٤٨٤ ٢٠٠٠"],
    ["MSC", "شركة البحر المتوسط للملاحة", "MSC Mediterranean Shipping", "shipping", "سويسرا", "إدارة الحجوزات", "+٢٠ ٣ ٤٨٥ ٧٧٠٠"],
    ["CMDU", "سي إم إيه سي جي إم", "CMA CGM", "shipping", "فرنسا", "مكتب الإسكندرية", "+٢٠ ٣ ٤٨٦ ٤٤١١"],
    ["HLCU", "هاباغ لويد", "Hapag-Lloyd", "shipping", "ألمانيا", "خدمة العملاء", "+٢٠ ٢ ٢٤٦١ ٩٩٠٠"],
    ["EGLV", "إيفرجرين لاين", "Evergreen Line", "shipping", "تايوان", "إدارة الوكلاء", "+٨٨٦ ٢ ٢٥٠٠ ٢٠٠٠"],
    ["COSU", "كوسكو شيبنج", "COSCO Shipping Lines", "shipping", "الصين", "مكتب بورسعيد", "+٨٦ ٢١ ٦٥٩٦ ٦٦٦٦"],
    ["ONEY", "أوشن نتورك إكسبريس", "Ocean Network Express (ONE)", "shipping", "اليابان", "مركز العمليات", "+٨١ ٣ ٦٨٦٥ ١١١١"],
    ["HMMU", "إتش إم إم", "HMM Co. Ltd", "shipping", "كوريا الجنوبية", "وكيل مصر", "+٨٢ ٢ ٣٧٠٦ ١١١٤"],
    ["ZIMU", "زيم للملاحة", "ZIM Integrated Shipping", "shipping", "إسرائيل", "إدارة الخطوط", "+٩٧٢ ٤ ٨٦٥ ٢٠٠٠"],
    ["YMLU", "يانغ مينغ", "Yang Ming Marine", "shipping", "تايوان", "خدمة الحاويات", "+٨٨٦ ٢ ٢٧١٩ ١١١١"],
    ["PABV", "النقل البري العربي", "Arab Land Transport", "land", "مصر", "إدارة الأسطول", "+٢٠ ٢ ٢٤٤٨ ٩٠١٢"],
  ];
  await db.insert(carriers).values(
    carrierSeed.map((c, i) => ({
      code: c[0],
      name: c[1],
      englishName: c[2],
      type: c[3],
      country: c[4],
      contactPerson: c[5],
      contactPhone: c[6],
      website: `https://www.${c[0].toLowerCase()}-cargo.example.com`,
      apiEndpoint: `https://api.nafeza.gov.eg/carriers/${c[0].toLowerCase()}/v2`,
      nafezaCode: `NFZ-${c[0]}-2026`,
      integration: i % 7 === 5 ? "pending" : i % 11 === 9 ? "manual" : "connected",
      status: "active",
    })),
  );

  await db.insert(ports).values([
    { code: "EGALY", name: "ميناء الإسكندرية", type: "sea", city: "الإسكندرية", customsOffice: "جمارك الإسكندرية", nafezaCode: "NFZ-PORT-001", status: "active" },
    { code: "EGDKH", name: "ميناء الدخيلة", type: "sea", city: "الإسكندرية", customsOffice: "جمارك الدخيلة", nafezaCode: "NFZ-PORT-002", status: "active" },
    { code: "EGDAM", name: "ميناء دمياط", type: "sea", city: "دمياط", customsOffice: "جمارك دمياط", nafezaCode: "NFZ-PORT-003", status: "active" },
    { code: "EGPSD", name: "ميناء بورسعيد", type: "sea", city: "بورسعيد", customsOffice: "جمارك بورسعيد", nafezaCode: "NFZ-PORT-004", status: "active" },
    { code: "EGSOK", name: "ميناء العين السخنة", type: "sea", city: "السويس", customsOffice: "جمارك السخنة", nafezaCode: "NFZ-PORT-005", status: "active" },
    { code: "EGSSH", name: "ميناء شرق بورسعيد", type: "sea", city: "بورسعيد", customsOffice: "جمارك شرق بورسعيد", nafezaCode: "NFZ-PORT-006", status: "active" },
    { code: "EGCAI", name: "مطار القاهرة الدولي - قرية البضائع", type: "air", city: "القاهرة", customsOffice: "جمارك مطار القاهرة", nafezaCode: "NFZ-AIR-001", status: "active" },
    { code: "EGBGN", name: "مطار برج العرب الدولي", type: "air", city: "الإسكندرية", customsOffice: "جمارك برج العرب", nafezaCode: "NFZ-AIR-002", status: "active" },
    { code: "EGHBE", name: "مطار الغردقة الدولي", type: "air", city: "الغردقة", customsOffice: "جمارك الغردقة", nafezaCode: "NFZ-AIR-003", status: "active" },
    { code: "EGSFA", name: "ميناء سفاجا", type: "sea", city: "البحر الأحمر", customsOffice: "جمارك سفاجا", nafezaCode: "NFZ-PORT-007", status: "active" },
    { code: "EGTAB", name: "منفذ طابا البري", type: "land", city: "طابا", customsOffice: "جمارك طابا", nafezaCode: "NFZ-LAND-001", status: "active" },
  ]);

  const shipmentSeed = [
    { clientId: 1, carrierId: 12, portId: 3, mode: "sea", direction: "import", goods: "معدات وكابلات كهربائية", origin: "شنغهاي - الصين", destination: "ميناء دمياط", acid: "ACID-2026-8841201", declaration: "٢٠٢٦/٤٤١٢٠", status: "inspection", value: 1850000, currency: "USD", packages: 420, weight: 24500, containers: 3, transportRef: "MSCU8821403" },
    { clientId: 2, carrierId: 11, portId: 1, mode: "sea", direction: "import", goods: "قطع غيار سيارات", origin: "هامبورج - ألمانيا", destination: "ميناء الإسكندرية", acid: "ACID-2026-8841202", declaration: "٢٠٢٦/٤٤١٢١", status: "released", value: 960000, currency: "EUR", packages: 180, weight: 12800, containers: 2, transportRef: "MRSKU4410278" },
    { clientId: 3, carrierId: 1, portId: 7, mode: "air", direction: "import", goods: "مستلزمات إنشائية عاجلة", origin: "دبي - الإمارات", destination: "مطار القاهرة", acid: "ACID-2026-8841203", declaration: "٢٠٢٦/٤٤١٢٢", status: "nafeza", value: 320000, currency: "USD", packages: 34, weight: 1850, containers: 0, transportRef: "077-88901425" },
    { clientId: 4, carrierId: 5, portId: 7, mode: "air", direction: "import", goods: "مواد خام صيدلانية", origin: "إسطنبول - تركيا", destination: "مطار القاهرة", acid: "ACID-2026-8841204", declaration: "٢٠٢٦/٤٤١٢٣", status: "documents", value: 540000, currency: "EUR", packages: 62, weight: 2400, containers: 0, transportRef: "235-77120936" },
    { clientId: 5, carrierId: 13, portId: 5, mode: "sea", direction: "import", goods: "خطوط تعبئة وتغليف", origin: "مرسيليا - فرنسا", destination: "ميناء السخنة", acid: "ACID-2026-8841205", declaration: "٢٠٢٦/٤٤١٢٤", status: "payment", value: 2240000, currency: "EUR", packages: 310, weight: 38000, containers: 5, transportRef: "CMAU6620198" },
    { clientId: 6, carrierId: 15, portId: 4, mode: "sea", direction: "import", goods: "أوراق تبغ ومواد تصنيع", origin: "كاوهسيونج - تايوان", destination: "ميناء بورسعيد", acid: "ACID-2026-8841206", declaration: "٢٠٢٦/٤٤١٢٥", status: "delivered", value: 1420000, currency: "USD", packages: 560, weight: 41000, containers: 4, transportRef: "EGHU3380915" },
    { clientId: 7, carrierId: 16, portId: 6, mode: "sea", direction: "transit", goods: "بضائع عامة - حاويات ترانزيت", origin: "نينغبو - الصين", destination: "ميناء شرق بورسعيد", acid: "ACID-2026-8841207", declaration: "٢٠٢٦/٤٤١٢٦", status: "new", value: 780000, currency: "USD", packages: 240, weight: 19600, containers: 2, transportRef: "CSNU5510284" },
    { clientId: 8, carrierId: 17, portId: 2, mode: "sea", direction: "import", goods: "ألياف نسيجية ومنسوجات", origin: "طوكيو - اليابان", destination: "ميناء الدخيلة", acid: "ACID-2026-8841208", declaration: "٢٠٢٦/٤٤١٢٧", status: "delayed", value: 690000, currency: "USD", packages: 195, weight: 15300, containers: 2, transportRef: "ONEU7714029" },
    { clientId: 9, carrierId: 14, portId: 3, mode: "sea", direction: "import", goods: "قمح وسلع تموينية", origin: "روتردام - هولندا", destination: "ميناء دمياط", acid: "ACID-2026-8841209", declaration: "٢٠٢٦/٤٤١٢٨", status: "inspection", value: 3100000, currency: "USD", packages: 1, weight: 55000000, containers: 0, transportRef: "HLXU2209834" },
    { clientId: 1, carrierId: 2, portId: 7, mode: "air", direction: "export", goods: "مكونات كهربائية للتصدير", origin: "مطار القاهرة", destination: "دبي - الإمارات", acid: "ACID-2026-8841210", declaration: "٢٠٢٦/٤٤١٢٩", status: "released", value: 420000, currency: "USD", packages: 48, weight: 3100, containers: 0, transportRef: "176-90228817" },
    { clientId: 3, carrierId: 18, portId: 5, mode: "sea", direction: "export", goods: "منتجات أسمنتية للتصدير", origin: "ميناء السخنة", destination: "جدة - السعودية", acid: "ACID-2026-8841211", declaration: "٢٠٢٦/٤٤١٣٠", status: "documents", value: 880000, currency: "USD", packages: 720, weight: 62000, containers: 6, transportRef: "HMMU4401723" },
    { clientId: 10, carrierId: 19, portId: 1, mode: "sea", direction: "import", goods: "معدات ميكانيكية", origin: "أشدود", destination: "ميناء الإسكندرية", acid: "ACID-2026-8841212", declaration: "٢٠٢٦/٤٤١٣١", status: "new", value: 350000, currency: "USD", packages: 88, weight: 9700, containers: 1, transportRef: "ZIMU3388210" },
    { clientId: 4, carrierId: 6, portId: 8, mode: "air", direction: "import", goods: "أجهزة معملية طبية", origin: "فرانكفورت - ألمانيا", destination: "مطار برج العرب", acid: "ACID-2026-8841213", declaration: "٢٠٢٦/٤٤١٣٢", status: "payment", value: 275000, currency: "EUR", packages: 22, weight: 940, containers: 0, transportRef: "020-66190034" },
    { clientId: 5, carrierId: 21, portId: 11, mode: "land", direction: "import", goods: "مواد غذائية مبردة", origin: "العقبة - الأردن", destination: "منفذ طابا", acid: "ACID-2026-8841214", declaration: "٢٠٢٦/٤٤١٣٣", status: "delivered", value: 160000, currency: "EGP", packages: 130, weight: 8200, containers: 1, transportRef: "TRK-2026-4491" },
  ];
  await db.insert(shipments).values(
    shipmentSeed.map((s, i) => ({
      refNo: `SHP-2026-${String(i + 1).padStart(4, "0")}`,
      clientId: s.clientId,
      carrierId: s.carrierId,
      portId: s.portId,
      mode: s.mode,
      direction: s.direction,
      goodsDescription: s.goods,
      origin: s.origin,
      destination: s.destination,
      acidNumber: s.acid,
      declarationNumber: s.declaration,
      status: s.status,
      cargoValue: s.value,
      currency: s.currency,
      packages: s.packages,
      weightKg: s.weight,
      containerCount: s.containers,
      transportRef: s.transportRef,
      etd: day(-18 + i),
      eta: day(-6 + i),
      clearanceOfficer: ["سارة عبد الرحمن", "محمود السيد", "خالد منصور", "أحمد العربي"][i % 4],
      notes: i === 7 ? "تأخير بسبب استكمال شهادة المنشأ من المورد" : "متابعة يومية مع الناقل ومنصة نافذة",
      createdAt: ts(28 - i * 2, 8 + (i % 6)),
    })),
  );

  const titles = [
    "استلام الفاتورة التجارية وبوليصة الشحن", "تسجيل ACID على منصة نافذة", "مراجعة شهادة المنشأ", "تقديم البيان الجمركي",
    "حجز موعد المعاينة", "سداد الرسوم الجمركية", "استلام إذن الإفراج", "تنسيق التسليم مع العميل",
    "مطابقة المنيفست مع الناقل", "تحديث بيانات الشحنة", "استكمال قائمة التعبئة", "متابعة اعتماد البيان",
    "تسليم أصل المستندات", "إصدار فاتورة الخدمات", "مراجعة قيمة البضاعة", "إغلاق ملف الشحنة",
  ];
  await db.insert(tasks).values(
    titles.map((title, i) => ({
      shipmentId: (i % 12) + 1,
      title,
      stage: ["documents", "nafeza", "customs", "inspection", "payment", "delivery"][i % 6],
      assignee: ["سارة عبد الرحمن", "محمود السيد", "أحمد العربي", "خالد منصور"][i % 4],
      priority: i % 5 === 0 ? "urgent" : i % 3 === 0 ? "high" : "normal",
      status: i % 4 === 0 ? "done" : i % 4 === 1 ? "in_progress" : i % 4 === 2 ? "pending" : "blocked",
      dueDate: day(-4 + (i % 14)),
      notes: i % 4 === 3 ? "في انتظار رد الجهة المختصة" : "يتم المتابعة مع الناقل والعميل",
      createdAt: ts(20 - i),
    })),
  );

  const docTypes = ["commercial_invoice", "bill_of_lading", "certificate_origin", "packing_list", "declaration", "release_order", "inspection"];
  const docNames: Record<string, string> = {
    commercial_invoice: "فاتورة تجارية", bill_of_lading: "بوليصة شحن / AWB", certificate_origin: "شهادة المنشأ",
    packing_list: "قائمة التعبئة", declaration: "البيان الجمركي", release_order: "إذن التسليم", inspection: "شهادة الفحص",
  };
  const docs: Array<{ shipmentId: number; name: string; type: string; referenceNo: string; fileName: string; status: string; notes: string }> = [];
  for (let s = 1; s <= 10; s++) {
    for (let d = 0; d < 3; d++) {
      const type = docTypes[(s + d) % docTypes.length];
      docs.push({
        shipmentId: s,
        name: `${docNames[type]} - ${String(s).padStart(4, "0")}`,
        type,
        referenceNo: `DOC-2026-${String(s * 10 + d).padStart(4, "0")}`,
        fileName: `${type}_${s}.pdf`,
        status: d === 0 ? "approved" : d === 1 ? "review" : s % 3 === 0 ? "rejected" : "required",
        notes: d === 2 ? "مطلوب استكمال التوقيع والختم" : "مرفق ومطابق للأصل",
      });
    }
  }
  await db.insert(documents).values(docs);

  await db.insert(invoices).values(
    Array.from({ length: 10 }, (_, i) => ({
      invoiceNo: `INV-2026-${String(i + 1).padStart(4, "0")}`,
      clientId: (i % 10) + 1,
      shipmentId: (i % 12) + 1,
      description: ["أتعاب تخليص جمركي", "رسوم تخزين ومناولة", "خدمات نافذة وتسجيل ACID", "نقل داخلي وتسليم", "مصاريف فحص ومعاينة"][i % 5],
      amount: [48500, 72000, 31500, 96000, 58000, 124000, 44000, 67500, 101000, 38500][i],
      tax: [6790, 10080, 4410, 13440, 8120, 17360, 6160, 9450, 14140, 5390][i],
      currency: "EGP",
      status: i % 4 === 0 ? "paid" : i % 4 === 1 ? "pending" : i % 4 === 2 ? "overdue" : "draft",
      issueDate: day(-25 + i * 2),
      dueDate: day(-10 + i * 2),
    })),
  );

  await db.insert(nafezaEvents).values([
    { shipmentId: 1, eventType: "acid_registration", reference: "ACID-2026-8841201", channel: "نافذة", carrier: "MSC", status: "accepted", message: "تم اعتماد رقم ACID وربطه بالبيان الجمركي", createdAt: ts(0, 10) },
    { shipmentId: 1, eventType: "manifest", reference: "MSCU8821403", channel: "API - MSC", carrier: "MSC", status: "accepted", message: "استلام منيفست الناقل ومطابقة عدد الحاويات", createdAt: ts(1, 11) },
    { shipmentId: 2, eventType: "release", reference: "٢٠٢٦/٤٤١٢١", channel: "نافذة", carrier: "MAERSK", status: "accepted", message: "صدور إذن الإفراج الجمركي للشحنة", createdAt: ts(1, 14) },
    { shipmentId: 3, eventType: "declaration", reference: "٢٠٢٦/٤٤١٢٢", channel: "نافذة", carrier: "MS", status: "pending", message: "البيان الجمركي قيد المراجعة لدى الجمارك", createdAt: ts(2, 9) },
    { shipmentId: 4, eventType: "carrier_sync", reference: "235-77120936", channel: "API - TK", carrier: "TK", status: "accepted", message: "مزامنة بيانات بوليصة الشحن الجوي بنجاح", createdAt: ts(2, 13) },
    { shipmentId: 5, eventType: "payment", reference: "٢٠٢٦/٤٤١٢٤", channel: "نافذة", carrier: "CMDU", status: "sent", message: "طلب سداد الرسوم الجمركية مرسل للعميل", createdAt: ts(3, 10) },
    { shipmentId: 8, eventType: "inspection", reference: "ACID-2026-8841208", channel: "نافذة", carrier: "ONEY", status: "rejected", message: "رفض شهادة المنشأ - مطلوب إعادة تقديمها", createdAt: ts(3, 16) },
    { shipmentId: 9, eventType: "manifest", reference: "HLXU2209834", channel: "API - HLCU", carrier: "HLCU", status: "accepted", message: "تحديث وزن البضاعة من بيانات الناقل", createdAt: ts(4, 8) },
    { shipmentId: 10, eventType: "release", reference: "ACID-2026-8841210", channel: "نافذة", carrier: "EK", status: "accepted", message: "إفراج عن شحنة التصدير", createdAt: ts(5, 12) },
    { shipmentId: 1, eventType: "inspection", reference: "٢٠٢٦/٤٤١٢٠", channel: "نافذة", carrier: "MSC", status: "pending", message: "حجز موعد معاينة بميناء دمياط", createdAt: ts(0, 8) },
    { shipmentId: 6, eventType: "declaration", reference: "٢٠٢٦/٤٤١٢ٵ", channel: "نافذة", carrier: "EGLV", status: "accepted", message: "اعتماد البيان الجمركي", createdAt: ts(6, 9) },
    { shipmentId: 12, eventType: "acid_registration", reference: "ACID-2026-8841212", channel: "نافذة", carrier: "ZIMU", status: "sent", message: "إرسال طلب تسجيل ACID جديدة", createdAt: ts(0, 7) },
  ]);

  await db.insert(activities).values([
    { action: "update", entity: "shipments", entityLabel: "SHP-2026-0001", description: "تحديث حالة الشحنة إلى الفحص والمعاينة", actor: "سارة عبد الرحمن", createdAt: ts(0, 11) },
    { action: "create", entity: "shipments", entityLabel: "SHP-2026-0012", description: "إنشاء ملف شحنة جديدة", actor: "محمود السيد", createdAt: ts(0, 9) },
    { action: "update", entity: "invoices", entityLabel: "INV-2026-0003", description: "تسجيل سداد الفاتورة", actor: "خالد منصور", createdAt: ts(1, 15) },
    { action: "create", entity: "clients", entityLabel: "CL-1008", description: "إضافة عميل جديد", actor: "أحمد العربي", createdAt: ts(2, 10) },
    { action: "update", entity: "nafezaEvents", entityLabel: "ACID-2026-8841201", description: "اعتماد تسجيل ACID عبر منصة نافذة", actor: "سارة عبد الرحمن", createdAt: ts(2, 8) },
    { action: "create", entity: "documents", entityLabel: "شهادة المنشأ", description: "رفع مستند جديد", actor: "محمود السيد", createdAt: ts(3, 12) },
    { action: "update", entity: "tasks", entityLabel: "تقديم البيان الجمركي", description: "إكمال المهمة", actor: "سارة عبد الرحمن", createdAt: ts(4, 13) },
    { action: "create", entity: "carriers", entityLabel: "ONEY", description: "ربط خط ملاحي جديد عبر API", actor: "أحمد العربي", createdAt: ts(6, 10) },
  ]);

  void insertedUsers;
}

const CONNECTION_TEMPLATES: Array<[string, string, string]> = [
  ["MAERSK", "maersk", "https://www.maersk.com/tracking/{number}"],
  ["MSC", "msc", "https://www.msc.com/en/track-a-shipment?shipmentNumber={number}"],
  ["CMDU", "cma-cgm", "https://www.cma-cgm.com/ebusiness/tracking/search?SearchText={number}"],
  ["HLCU", "hapag-lloyd", "https://www.hapag-lloyd.com/en/services-information/tracking-by-booking-or-b-l.html?blno={number}"],
  ["EGLV", "evergreen", "https://www.evergreen-line.com/Tracking/TrackingShipment?blno={number}"],
  ["COSU", "cosco", "https://elines.coscoshipping.com/ebtracking/public/bill/{number}"],
  ["ONEY", "one-line", "https://www.one-line.com/en/tracking?blno={number}"],
  ["HMMU", "hmm", "https://www.hmm21.com/cms/business/ebiz/tracking/tracking.jsp?blno={number}"],
  ["ZIMU", "zim", "https://www.zim.com/tools/track-a-shipment?consignmentNumber={number}"],
  ["YMLU", "yang-ming", "https://www.yangming.com/e-service/Track/TrackBol.aspx?blno={number}"],
  ["MS", "egyptair-cargo", "https://www.egyptair-cargo.com/en/track-and-trace?awb={number}"],
  ["EK", "emirates-skycargo", "https://www.emirates.com/skycargo/track-your-shipment/?awbNumber={number}"],
  ["QR", "qatar-airways-cargo", "https://www.qrcargo.com/en/track-and-trace?awb={number}"],
  ["EY", "etihad-cargo", "https://www.etihad.com/cargo/track-your-shipment?awb={number}"],
  ["TK", "turkish-cargo", "https://www.turkishcargo.com.tr/en/track-and-trace?awb={number}"],
  ["LH", "lufthansa-cargo", "https://www.lufthansa-cargo.com/en/track-and-trace?awb={number}"],
  ["AF", "afkl-cargo", "https://www.afklcargo.com/MyCargo/tracking?awb={number}"],
  ["SV", "saudia-cargo", "https://www.saudiacargo.com/tracking?awb={number}"],
  ["G9", "air-arabia", "https://www.airarabia.com/en/cargo/track-shipment?awb={number}"],
  ["RJ", "royal-jordanian-cargo", "https://www.rj-cargo.com/tracking?awb={number}"],
  ["PABV", "nafeza-land", "https://www.nafeza.gov.eg/ar/Pages/default.aspx"],
];

async function seedConnections() {
  const [allCarriers, existing] = await Promise.all([
    db.select().from(carriers),
    db.select().from(carrierConnections),
  ]);
  const known = new Set(existing.map((row) => row.carrierId));
  const missing = allCarriers
    .filter((carrier) => !known.has(carrier.id))
    .map((carrier) => {
      const template = CONNECTION_TEMPLATES.find((item) => item[0] === carrier.code);
      return {
        carrierId: carrier.id,
        provider: "official",
        providerCode: template?.[1] ?? carrier.code.toLowerCase(),
        apiUrl: null,
        apiKey: null,
        trackingUrlTemplate: template?.[2] ?? `https://www.nafeza.gov.eg/ar/Pages/default.aspx?tracking={number}`,
        enabled: true,
        notes: "رابط التتبع الرسمي للناقل — أضف مفتاح API لتفعيل جلب البيانات الحقيقية داخل النظام",
      };
    });
  if (missing.length) await db.insert(carrierConnections).values(missing);
}

const globalForBootstrap = globalThis as typeof globalThis & { __alarabiDbReady?: Promise<void> };

async function seedReference() {
  const bankCount = await db.execute(sql`select count(*)::int as count from banks`);
  if (Number((bankCount.rows[0] as { count: number })?.count ?? 0) === 0) {
    await db.insert(banks).values(BANKS_SEED.map((bank) => ({ ...bank, status: "active" })));
  }
  const tariffCount = await db.execute(sql`select count(*)::int as count from tariff_items`);
  if (Number((tariffCount.rows[0] as { count: number })?.count ?? 0) === 0) {
    await db.insert(tariffItems).values(TARIFF_SEED.map((item) => ({
      ...item,
      tableTaxRate: item.tableTaxRate ?? 0,
      developmentRate: item.developmentRate ?? 0,
      notes: "مرجع تشغيلي وفق النظام المنسق وقانون الجمارك ٢٠٧ لسنة ٢٠٢٠ — يُراجع مع كتاب التعريفة الرسمي",
    })));
  }
  const rateCount = await db.execute(sql`select count(*)::int as count from exchange_rates`);
  if (Number((rateCount.rows[0] as { count: number })?.count ?? 0) === 0) {
    await db.insert(exchangeRates).values([
      { currency: "USD", rateToEgp: 49.5, source: "fallback" },
      { currency: "EUR", rateToEgp: 54.2, source: "fallback" },
      { currency: "GBP", rateToEgp: 63.1, source: "fallback" },
      { currency: "CNY", rateToEgp: 6.9, source: "fallback" },
      { currency: "SAR", rateToEgp: 13.2, source: "fallback" },
      { currency: "AED", rateToEgp: 13.48, source: "fallback" },
      { currency: "EGP", rateToEgp: 1, source: "fixed" },
    ]);
  }
  await db.execute(sql`
    update shipments set
      cargo_kind = case when mode = 'air' and id % 5 = 0 then 'postal' else 'manifest' end,
      customs_regime = case direction when 'transit' then 'transit' when 'export' then 'export_final' else 'final_release' end,
      subjection_system = case when direction = 'export' then 'export_zero' else 'duty_vat' end,
      commercial_invoice_no = coalesce(commercial_invoice_no, 'CI-2026-' || lpad(id::text, 4, '0')),
      commercial_invoice_date = coalesce(commercial_invoice_date, etd),
      contract_type = coalesce(contract_type, case when mode = 'air' then 'CIP' else 'CIF' end),
      payment_method = coalesce(payment_method, case when id % 3 = 0 then 'LC' when id % 3 = 1 then 'TT' else 'CAD' end),
      bank_id = coalesce(bank_id, ((id - 1) % 12) + 1),
      freight_amount = coalesce(freight_amount, round((coalesce(cargo_value, 0) * 0.04)::numeric, 2)),
      insurance_amount = coalesce(insurance_amount, round((coalesce(cargo_value, 0) * 0.008)::numeric, 2)),
      acid_issued_at = coalesce(acid_issued_at, (current_date - ((id % 40) + 5))),
      acid_expires_at = coalesce(acid_expires_at, (current_date - ((id % 40) + 5)) + 180)
    where customs_regime is null
  `);
  const itemCount = await db.execute(sql`select count(*)::int as count from shipment_items`);
  if (Number((itemCount.rows[0] as { count: number })?.count ?? 0) === 0) {
    const codes = ["8544.42", "8708.29", "3004.90", "2106.90", "7208.51", "1001.99", "8471.30", "5208.12"];
    const shipRows = await db.select().from(shipments);
    const tariffRows = await db.select().from(tariffItems);
    const rows = shipRows.slice(0, 8).map((shipment, index) => {
      const tariff = tariffRows.find((item) => item.hsCode === codes[index % codes.length]) ?? tariffRows[0];
      const value = Number(shipment.cargoValue ?? 0);
      return {
        shipmentId: shipment.id,
        tariffItemId: tariff?.id,
        hsCode: tariff?.hsCode ?? codes[index],
        nameAr: tariff?.nameAr ?? shipment.goodsDescription ?? "صنف",
        nameEn: tariff?.nameEn ?? "",
        quantity: shipment.packages ?? 1,
        unit: tariff?.unit ?? "عدد",
        unitPrice: value,
        invoiceValue: value,
        currency: shipment.currency,
        origin: shipment.origin,
        weightKg: shipment.weightKg,
        dutyRate: tariff?.dutyRate ?? 5,
        vatRate: tariff?.vatRate ?? 14,
      };
    });
    if (rows.length) await db.insert(shipmentItems).values(rows);
  }
}

async function init() {
  await db.execute(sql.raw(ddl));
  await seed();
  await seedConnections();
  await seedReference();
}

export function ensureDatabase(): Promise<void> {
  if (!globalForBootstrap.__alarabiDbReady) {
    globalForBootstrap.__alarabiDbReady = init().catch((error) => {
      globalForBootstrap.__alarabiDbReady = undefined;
      throw error;
    });
  }
  return globalForBootstrap.__alarabiDbReady;
}
