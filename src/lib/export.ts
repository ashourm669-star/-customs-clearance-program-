import { db } from "@/db";
import { banks, carriers, clients, commercialInvoices, contracts, documents, invoices, shipmentItems, shipments, tariffCodes } from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import ArabicReshaper from "arabic-reshaper";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { utils, write } from "xlsx";
import { SHIPMENT_STATUS_META, type ShipmentStatus } from "@/lib/constants";
import { CONTRACT_TYPE_META, INCOTERM_META, PAYMENT_METHOD_META } from "@/lib/customs";

export type ExportResource = "shipments" | "clients" | "carriers" | "invoices" | "documents" | "tariffs" | "contracts" | "banks" | "commercial_invoices" | "items";
export type ExportRow = Record<string, string | number | null>;
export type ExportData = { title: string; rows: ExportRow[]; columns: { key: string; label: string; labelEn: string }[] };

const iso = (d: Date | string | null) => d ? new Date(d).toISOString().slice(0, 10) : null;

export async function getExportData(resource: ExportResource, shipmentId?: number): Promise<ExportData> {
  if (resource === "shipments") {
    const rows = await db.select({ shipment: shipments, clientName: clients.name, carrierName: carriers.name }).from(shipments).leftJoin(clients, eq(shipments.clientId, clients.id)).leftJoin(carriers, eq(shipments.carrierId, carriers.id)).where(shipmentId ? eq(shipments.id, shipmentId) : undefined).orderBy(desc(shipments.createdAt));
    return { title: "ملفات التخليص الجمركي", columns: [
      { key: "reference", label: "رقم الملف", labelEn: "File" }, { key: "clientName", label: "العميل", labelEn: "Client" },
      { key: "blNumber", label: "البوليصة / AWB", labelEn: "B/L or AWB" }, { key: "carrierName", label: "الشركة", labelEn: "Carrier" },
      { key: "status", label: "الحالة", labelEn: "Status" }, { key: "port", label: "الميناء", labelEn: "Port" },
      { key: "invoiceNumber", label: "الفاتورة التجارية", labelEn: "Commercial invoice" }, { key: "invoiceDate", label: "تاريخ الفاتورة", labelEn: "Invoice date" },
      { key: "incoterm", label: "شروط التجارة", labelEn: "Incoterm" }, { key: "paymentMethod", label: "أسلوب السداد", labelEn: "Payment method" },
      { key: "originCountry", label: "المنشأ", labelEn: "Origin" }, { key: "acidNumber", label: "ACID", labelEn: "ACID" },
      { key: "eta", label: "الوصول المتوقع", labelEn: "ETA" }, { key: "fees", label: "الرسوم (ج.م)", labelEn: "Fees (EGP)" },
    ], rows: rows.map(({ shipment: s, clientName, carrierName }) => ({
      reference: s.reference, clientName, blNumber: s.blNumber, carrierName,
      status: SHIPMENT_STATUS_META[s.status as ShipmentStatus]?.label ?? s.status,
      port: s.port, invoiceNumber: s.commercialInvoiceNumber, invoiceDate: iso(s.commercialInvoiceDate),
      incoterm: s.incoterm, paymentMethod: s.paymentMethod ? PAYMENT_METHOD_META[s.paymentMethod]?.label ?? s.paymentMethod : null,
      originCountry: s.originCountry, acidNumber: s.acidNumber, eta: iso(s.eta), fees: s.dutyAmount + s.vatAmount + s.serviceFees,
    })) };
  }
  if (resource === "clients") {
    const rows = await db.select().from(clients).orderBy(asc(clients.name));
    return { title: "قاعدة العملاء", columns: [
      { key: "name", label: "اسم العميل", labelEn: "Name" }, { key: "nameEn", label: "الاسم بالإنجليزية", labelEn: "English name" },
      { key: "taxId", label: "الرقم الضريبي", labelEn: "Tax ID" }, { key: "contactName", label: "جهة الاتصال", labelEn: "Contact" },
      { key: "phone", label: "الهاتف", labelEn: "Phone" }, { key: "email", label: "البريد", labelEn: "Email" },
      { key: "city", label: "المدينة", labelEn: "City" }, { key: "country", label: "الدولة", labelEn: "Country" },
    ], rows: rows.map((r) => ({ ...r, createdAt: null })) };
  }
  if (resource === "carriers") {
    const rows = await db.select().from(carriers).orderBy(asc(carriers.name));
    return { title: "شركات الطيران والملاحة", columns: [
      { key: "name", label: "الشركة", labelEn: "Carrier" }, { key: "nameEn", label: "الاسم الإنجليزي", labelEn: "English name" },
      { key: "code", label: "الكود", labelEn: "Code" }, { key: "type", label: "النوع", labelEn: "Type" },
      { key: "integrationStatus", label: "حالة الربط", labelEn: "Integration" }, { key: "apiEndpoint", label: "واجهة API", labelEn: "API endpoint" },
    ], rows: rows.map((r) => ({ ...r, createdAt: null, lastSyncAt: r.lastSyncAt ? r.lastSyncAt.toISOString() : null })) };
  }
  if (resource === "invoices") {
    const rows = await db.select({ invoice: invoices, clientName: clients.name }).from(invoices).leftJoin(clients, eq(invoices.clientId, clients.id)).orderBy(desc(invoices.createdAt));
    return { title: "الفواتير والتحصيل", columns: [
      { key: "number", label: "رقم الفاتورة", labelEn: "Invoice" }, { key: "clientName", label: "العميل", labelEn: "Client" },
      { key: "total", label: "الإجمالي", labelEn: "Total" }, { key: "paidAmount", label: "المدفوع", labelEn: "Paid" },
      { key: "remaining", label: "المتبقي", labelEn: "Outstanding" }, { key: "status", label: "الحالة", labelEn: "Status" },
      { key: "dueDate", label: "الاستحقاق", labelEn: "Due date" },
    ], rows: rows.map(({ invoice: i, clientName }) => ({ number: i.number, clientName, total: i.total, paidAmount: i.paidAmount, remaining: i.total - i.paidAmount, status: i.status, dueDate: iso(i.dueDate) })) };
  }
  if (resource === "documents") {
    const rows = await db.select({ document: documents, reference: shipments.reference }).from(documents).innerJoin(shipments, eq(documents.shipmentId, shipments.id)).orderBy(desc(documents.createdAt));
    return { title: "المستندات", columns: [
      { key: "name", label: "المستند", labelEn: "Document" }, { key: "reference", label: "الملف", labelEn: "File" },
      { key: "type", label: "النوع", labelEn: "Type" }, { key: "status", label: "الحالة", labelEn: "Status" }, { key: "sizeKb", label: "الحجم KB", labelEn: "Size KB" },
    ], rows: rows.map(({ document: d, reference }) => ({ name: d.name, reference, type: d.type, status: d.status, sizeKb: d.sizeKb })) };
  }
  if (resource === "tariffs") {
    const rows = await db.select().from(tariffCodes).orderBy(asc(tariffCodes.code));
    return { title: "البنود الجمركية", columns: [
      { key: "code", label: "البند", labelEn: "HS code" }, { key: "nameAr", label: "الصنف", labelEn: "Description" }, { key: "nameEn", label: "الاسم الإنجليزي", labelEn: "English name" },
      { key: "duty", label: "الجمارك %", labelEn: "Duty %" }, { key: "vat", label: "ض.ق.م %", labelEn: "VAT %" },
      { key: "importStatus", label: "حالة الاستيراد", labelEn: "Import status" }, { key: "authorities", label: "الجهات الرقابية", labelEn: "Authorities" },
      { key: "conditions", label: "الشروط", labelEn: "Conditions" }, { key: "sourceUrl", label: "المصدر", labelEn: "Source" }, { key: "verified", label: "معتمد", labelEn: "Verified" },
    ], rows: rows.map((r) => ({ code: r.code, nameAr: r.nameAr, nameEn: r.nameEn, duty: r.dutyBps === null ? "غير معتمد" : r.dutyBps / 100, vat: r.vatBps === null ? "غير معتمد" : r.vatBps / 100, importStatus: r.importStatus, authorities: r.authorities?.join(" | ") ?? null, conditions: r.conditions?.join(" | ") ?? null, sourceUrl: r.sourceUrl, verified: r.verified ? "نعم" : "لا" })) };
  }
  if (resource === "contracts") {
    const rows = await db.select({ contract: contracts, clientName: clients.name }).from(contracts).leftJoin(clients, eq(contracts.clientId, clients.id)).orderBy(desc(contracts.createdAt));
    return { title: "العقود", columns: [
      { key: "number", label: "رقم العقد", labelEn: "Contract" }, { key: "name", label: "الاسم", labelEn: "Name" }, { key: "clientName", label: "العميل", labelEn: "Client" },
      { key: "type", label: "النوع", labelEn: "Type" }, { key: "incoterm", label: "شروط التجارة", labelEn: "Incoterm" },
      { key: "paymentMethod", label: "السداد", labelEn: "Payment" }, { key: "amount", label: "القيمة", labelEn: "Amount" }, { key: "currency", label: "العملة", labelEn: "Currency" },
    ], rows: rows.map(({ contract: c, clientName }) => ({ number: c.number, name: c.name, clientName, type: CONTRACT_TYPE_META[c.type]?.label ?? c.type, incoterm: c.incoterm, paymentMethod: PAYMENT_METHOD_META[c.paymentMethod]?.label ?? c.paymentMethod, amount: Number(c.amount), currency: c.currency })) };
  }
  if (resource === "banks") {
    const rows = await db.select().from(banks).orderBy(asc(banks.name));
    return { title: "البنوك وبيانات التحصيل", columns: [
      { key: "name", label: "البنك", labelEn: "Bank" }, { key: "nameEn", label: "الاسم الإنجليزي", labelEn: "English name" },
      { key: "code", label: "الكود", labelEn: "Code" }, { key: "swift", label: "SWIFT", labelEn: "SWIFT" }, { key: "accountName", label: "اسم الحساب", labelEn: "Account name" },
      { key: "accountNumber", label: "رقم الحساب", labelEn: "Account number" }, { key: "iban", label: "IBAN", labelEn: "IBAN" }, { key: "currency", label: "العملة", labelEn: "Currency" },
    ], rows: rows.map((r) => ({ ...r, createdAt: null })) };
  }
  if (resource === "commercial_invoices") {
    const rows = await db.select().from(commercialInvoices).orderBy(desc(commercialInvoices.createdAt));
    return { title: "الفواتير التجارية", columns: [
      { key: "number", label: "رقم الفاتورة", labelEn: "Invoice" }, { key: "date", label: "التاريخ", labelEn: "Date" }, { key: "supplierName", label: "المورد", labelEn: "Supplier" },
      { key: "originCountry", label: "المنشأ", labelEn: "Origin" }, { key: "currency", label: "العملة", labelEn: "Currency" }, { key: "total", label: "القيمة", labelEn: "Total" },
      { key: "incoterm", label: "التعاقد", labelEn: "Incoterm" }, { key: "paymentMethod", label: "السداد", labelEn: "Payment" }, { key: "acidNumber", label: "ACID", labelEn: "ACID" }, { key: "reviewStatus", label: "المراجعة", labelEn: "Review" },
    ], rows: rows.map((r) => ({ number: r.number, date: iso(r.date), supplierName: r.supplierName, originCountry: r.originCountry, currency: r.currency, total: Number(r.total), incoterm: r.incoterm, paymentMethod: r.paymentMethod, acidNumber: r.acidNumber, reviewStatus: r.reviewStatus })) };
  }
  const rows = await db.select({ item: shipmentItems, tariff: tariffCodes }).from(shipmentItems).leftJoin(tariffCodes, eq(shipmentItems.tariffId, tariffCodes.id)).where(shipmentId ? eq(shipmentItems.shipmentId, shipmentId) : undefined).orderBy(asc(shipmentItems.id));
  return { title: "بنود الشحنات", columns: [
    { key: "description", label: "الصنف", labelEn: "Description" }, { key: "hsCode", label: "البند", labelEn: "HS code" }, { key: "originCountry", label: "المنشأ", labelEn: "Origin" },
    { key: "quantity", label: "الكمية", labelEn: "Quantity" }, { key: "currency", label: "العملة", labelEn: "Currency" }, { key: "invoiceValue", label: "قيمة البضاعة", labelEn: "Goods value" },
    { key: "freight", label: "الشحن", labelEn: "Freight" }, { key: "insurance", label: "التأمين", labelEn: "Insurance" }, { key: "dutyAmount", label: "الجمارك", labelEn: "Duty" }, { key: "vatAmount", label: "ض.ق.م", labelEn: "VAT" },
  ], rows: rows.map(({ item: i, tariff: t }) => ({ description: t?.nameAr ?? i.description, hsCode: i.hsCode, originCountry: i.originCountry, quantity: Number(i.quantity), currency: i.currency, invoiceValue: Number(i.invoiceValue), freight: Number(i.freight), insurance: Number(i.insurance), dutyAmount: i.dutyBps === null ? "نسبة غير معتمدة" : Number(i.dutyAmount), vatAmount: i.vatBps === null ? "نسبة غير معتمدة" : Number(i.vatAmount) })) };
}

export function makeExcel(data: ExportData): Uint8Array {
  const rows = data.rows.map((row) => Object.fromEntries(data.columns.map((column) => [column.label, row[column.key] ?? ""])));
  const sheet = utils.json_to_sheet(rows);
  sheet["!cols"] = data.columns.map(() => ({ wch: 24 }));
  sheet["!autofilter"] = { ref: sheet["!ref"] ?? "A1" };
  const book = utils.book_new();
  utils.book_append_sheet(book, sheet, "Al-Araby");
  return write(book, { type: "buffer", bookType: "xlsx" }) as Uint8Array;
}

export async function makeArabicPdf(data: ExportData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const fontBytes = await readFile(path.join(process.cwd(), "public/fonts/NotoSansArabic-Regular.ttf"));
  const font = await doc.embedFont(fontBytes, { subset: true });
  const width = 842;
  const height = 595;
  const margin = 28;
  const columnWidth = (width - margin * 2) / Math.min(data.columns.length, 6);
  const columns = data.columns.slice(0, 6);
  let page = doc.addPage([width, height]);
  let y = height - 60;
  let rowIndex = 0;
  const safe = (text: unknown) => String(text ?? "—").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/[•]/g, "-");
  const arabic = (text: string) => ArabicReshaper.convertArabic(text).split("").reverse().join("");
  const draw = (text: string, x: number, atY: number, size = 9, maxWidth = columnWidth - 8) => {
    let value = safe(text);
    while (value.length > 1 && font.widthOfTextAtSize(value, size) > maxWidth) value = value.slice(0, -2);
    if (value !== safe(text)) value += "…".replace("…", ".");
    page.drawText(value, { x, y: atY, size, font, color: rgb(0.1, 0.17, 0.24), maxWidth });
  };
  const header = () => {
    page.drawRectangle({ x: 0, y: height - 85, width, height: 85, color: rgb(0.04, 0.13, 0.22) });
    page.drawText(arabic("العربي للخدمات الجمركية واللوجستية"), { x: width - margin - font.widthOfTextAtSize(arabic("العربي للخدمات الجمركية واللوجستية"), 15), y: height - 40, size: 15, font, color: rgb(1, 1, 1) });
    page.drawText(data.title, { x: margin, y: height - 65, size: 10, font, color: rgb(0.8, 0.9, 0.95) });
    columns.forEach((column, index) => {
      const label = arabic(column.label);
      draw(label, margin + index * columnWidth + columnWidth - font.widthOfTextAtSize(label, 8) - 5, height - 109, 8);
    });
    y = height - 132;
  };
  header();
  for (const row of data.rows) {
    if (y < 62) {
      page = doc.addPage([width, height]);
      header();
    }
    if (rowIndex % 2 === 0) page.drawRectangle({ x: margin - 3, y: y - 10, width: width - margin * 2 + 6, height: 25, color: rgb(0.96, 0.97, 0.98) });
    columns.forEach((column, index) => draw(row[column.key] === null || row[column.key] === undefined ? "—" : String(row[column.key]), margin + index * columnWidth, y, 8));
    y -= 26;
    rowIndex++;
  }
  doc.getPages().forEach((p, index) => {
    p.drawText(`Al-Araby Customs | ${index + 1} / ${doc.getPageCount()} | ${new Date().toISOString().slice(0, 10)}`, { x: margin, y: 24, size: 7, font, color: rgb(0.5, 0.55, 0.6) });
    p.drawText(arabic("تقرير إداري — ليس إقراراً جمركياً أو شهادة رسمية"), { x: width - margin - font.widthOfTextAtSize(arabic("تقرير إداري — ليس إقراراً جمركياً أو شهادة رسمية"), 7), y: 24, size: 7, font, color: rgb(0.5, 0.55, 0.6) });
  });
  return doc.save();
}

void INCOTERM_META;
