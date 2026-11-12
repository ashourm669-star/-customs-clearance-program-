import { eq } from "drizzle-orm";
import { db } from "@/db";
import { banks, contracts, shipmentItems, shipments, tariffCodes, commercialInvoices } from "@/db/schema";
import { asDate, asNumber, asOptionalString, asString, getApiUser, jsonError, unauthorized } from "@/lib/api";
import { getCustomsData } from "@/lib/customs-queries";
import { normalizeImportedTariff, CONTRACT_TYPES, INCOTERMS, PAYMENT_METHODS } from "@/lib/customs";
import { getExchangeRates } from "@/lib/fx";
import { read, utils } from "xlsx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorized();
  const [data, rates] = await Promise.all([getCustomsData(), getExchangeRates()]);
  return Response.json({ ...data, rates });
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();
  const content = request.headers.get("content-type") ?? "";
  if (content.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("ارفع ملف تعريفة Excel أو CSV.");
    if (file.size > 8 * 1024 * 1024) return jsonError("الحد الأقصى 8 ميجابايت.");
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const book = read(buffer, { type: "buffer" });
      const rows = utils.sheet_to_json<Record<string, unknown>>(book.Sheets[book.SheetNames[0]], { defval: "" });
      if (!rows.length) return jsonError("الملف لا يحتوي بيانات.");
      if (rows.length > 20000) return jsonError("الحد الأقصى 20 ألف بند لكل استيراد.");
      let imported = 0;
      const errors: string[] = [];
      for (const [index, row] of rows.entries()) {
        try {
          const values = normalizeImportedTariff(row);
          await db.insert(tariffCodes).values(values).onConflictDoUpdate({ target: tariffCodes.code, set: values });
          imported++;
        } catch (error) {
          errors.push(`صف ${index + 2}: ${error instanceof Error ? error.message : "بيانات غير صالحة"}`);
        }
      }
      return Response.json({ imported, errors: errors.slice(0, 10), message: `تم استيراد ${imported} بند. النسب المستوردة تحتاج مراجعة معتمدة.` });
    } catch {
      return jsonError("تعذّرت قراءة ملف التعريفة. استخدم الأعمدة النموذجية في ملف القالب.");
    }
  }

  let body: unknown;
  try { body = await request.json(); } catch { return jsonError("بيانات غير صالحة."); }
  const p = body as Record<string, unknown>;
  const resource = asString(p.resource);
  const values = (p.values ?? {}) as Record<string, unknown>;

  if (resource === "contract") {
    const clientId = asNumber(values.clientId);
    if (!clientId || !asString(values.name)) return jsonError("اسم العقد والعميل مطلوبان.");
    const type = asString(values.type, "sale");
    const incoterm = asString(values.incoterm, "FOB");
    const paymentMethod = asString(values.paymentMethod, "bank_transfer");
    if (!(CONTRACT_TYPES as readonly string[]).includes(type) || !(INCOTERMS as readonly string[]).includes(incoterm) || !(PAYMENT_METHODS as readonly string[]).includes(paymentMethod)) return jsonError("نوع العقد أو شروط التجارة أو السداد غير صالح.");
    const number = asString(values.number) || `CT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const exists = await db.select({ id: contracts.id }).from(contracts).where(eq(contracts.number, number)).limit(1);
    if (exists.length) return jsonError("رقم العقد مستخدم بالفعل.", 409);
    const [created] = await db.insert(contracts).values({
      number, clientId, name: asString(values.name), type, incoterm, paymentMethod,
      bankId: asNumber(values.bankId) || null, currency: asString(values.currency, "USD") || "USD",
      amount: asNumber(values.amount), startDate: asDate(values.startDate), endDate: asDate(values.endDate),
      paymentTerms: asOptionalString(values.paymentTerms), notes: asOptionalString(values.notes),
    }).returning({ id: contracts.id });
    return Response.json({ id: created.id, message: "تم حفظ العقد" }, { status: 201 });
  }

  if (resource === "bank") {
    if (!asString(values.name)) return jsonError("اسم البنك مطلوب.");
    const [created] = await db.insert(banks).values({
      name: asString(values.name), nameEn: asOptionalString(values.nameEn), code: asOptionalString(values.code),
      swift: asOptionalString(values.swift), accountName: asOptionalString(values.accountName),
      accountNumber: asOptionalString(values.accountNumber), iban: asOptionalString(values.iban),
      currency: asString(values.currency, "EGP") || "EGP", branch: asOptionalString(values.branch),
      status: "manual", notes: asOptionalString(values.notes),
    }).returning({ id: banks.id });
    return Response.json({ id: created.id, message: "تم حفظ بيانات البنك" }, { status: 201 });
  }

  if (resource === "tariff") {
    try {
      const tariff = normalizeImportedTariff(values);
      const [created] = await db.insert(tariffCodes).values(tariff).onConflictDoUpdate({ target: tariffCodes.code, set: tariff }).returning({ id: tariffCodes.id });
      return Response.json({ id: created.id, message: "تم حفظ البند مع بيان حالة النسب والمصدر" }, { status: 201 });
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : "بيانات البند غير صالحة.");
    }
  }

  if (resource === "item") {
    const shipmentId = asNumber(values.shipmentId);
    if (!shipmentId || !asString(values.description)) return jsonError("اختر الملف وأدخل وصف الصنف.");
    const exists = await db.select({ id: shipments.id }).from(shipments).where(eq(shipments.id, shipmentId)).limit(1);
    if (!exists.length) return jsonError("ملف التخليص غير موجود.", 404);
    const tariffId = asNumber(values.tariffId) || null;
    const tariff = tariffId ? (await db.select().from(tariffCodes).where(eq(tariffCodes.id, tariffId)).limit(1))[0] : null;
    if (tariff && !tariff.verified) return jsonError("نسب هذا البند غير معتمدة. راجع نسب الجمارك أولاً من شاشة البند.");
    const [created] = await db.insert(shipmentItems).values({
      shipmentId, tariffId, description: asString(values.description), hsCode: asOptionalString(values.hsCode) ?? tariff?.code,
      originCountry: asOptionalString(values.originCountry), quantity: asNumber(values.quantity, 1), unit: asOptionalString(values.unit) ?? undefined,
      unitValue: asNumber(values.unitValue), currency: asString(values.currency, "USD") || "USD",
      invoiceValue: asNumber(values.invoiceValue), freight: asNumber(values.freight), insurance: asNumber(values.insurance),
      dutyBps: values.dutyBps !== null && values.dutyBps !== undefined && values.dutyBps !== "" ? asNumber(values.dutyBps) : tariff?.dutyBps ?? null,
      vatBps: values.vatBps !== null && values.vatBps !== undefined && values.vatBps !== "" ? asNumber(values.vatBps) : tariff?.vatBps ?? null,
    }).returning({ id: shipmentItems.id });
    return Response.json({ id: created.id, message: "تم حفظ بند الصنف" }, { status: 201 });
  }

  if (resource === "invoice") {
    if (!asString(values.number)) return jsonError("رقم الفاتورة التجارية مطلوب.");
    const total = asNumber(values.total);
    const [created] = await db.insert(commercialInvoices).values({
      shipmentId: asNumber(values.shipmentId) || null, clientId: asNumber(values.clientId) || null,
      contractId: asNumber(values.contractId) || null, number: asString(values.number), date: asDate(values.date),
      supplierName: asOptionalString(values.supplierName), originCountry: asOptionalString(values.originCountry),
      currency: asString(values.currency, "USD") || "USD", subtotal: asNumber(values.subtotal), freight: asNumber(values.freight),
      insurance: asNumber(values.insurance), total, incoterm: asOptionalString(values.incoterm),
      paymentMethod: asOptionalString(values.paymentMethod), bankName: asOptionalString(values.bankName),
      bankSwift: asOptionalString(values.bankSwift), bankAccount: asOptionalString(values.bankAccount), bankIban: asOptionalString(values.bankIban),
      acidNumber: asOptionalString(values.acidNumber), sourceText: asOptionalString(values.sourceText),
      sourceFilename: asOptionalString(values.sourceFilename), reviewStatus: "needs_review",
    }).returning({ id: commercialInvoices.id });
    return Response.json({ id: created.id, message: "تم حفظ الفاتورة للمراجعة" }, { status: 201 });
  }
  return jsonError("عملية غير معروفة.");
}

export async function PATCH(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError("بيانات غير صالحة."); }
  const p = body as Record<string, unknown>;
  const id = asNumber(p.id);
  const v = (p.values ?? {}) as Record<string, unknown>;
  if (!id) return jsonError("رقم العنصر مطلوب.");
  const resource = asString(p.resource);

  if (resource === "shipment") {
    const patch: Partial<typeof shipments.$inferInsert> = { updatedAt: new Date() };
    if (v.contractId !== undefined) patch.contractId = asNumber(v.contractId) || null;
    if (v.bankId !== undefined) patch.bankId = asNumber(v.bankId) || null;
    if (v.incoterm !== undefined) patch.incoterm = asOptionalString(v.incoterm);
    if (v.paymentMethod !== undefined) patch.paymentMethod = asOptionalString(v.paymentMethod);
    if (v.customsSystem !== undefined) patch.customsSystem = asString(v.customsSystem, "nafeza");
    if (v.manifestNumber !== undefined) patch.manifestNumber = asOptionalString(v.manifestNumber);
    if (v.manifestType !== undefined) patch.manifestType = asOptionalString(v.manifestType);
    if (v.commercialInvoiceNumber !== undefined) patch.commercialInvoiceNumber = asOptionalString(v.commercialInvoiceNumber);
    if (v.commercialInvoiceDate !== undefined) patch.commercialInvoiceDate = asDate(v.commercialInvoiceDate);
    if (v.originCountry !== undefined) patch.originCountry = asOptionalString(v.originCountry);
    if (v.acidNumber !== undefined) patch.acidNumber = asOptionalString(v.acidNumber);
    if (v.acidSubmittedAt !== undefined) patch.acidSubmittedAt = asDate(v.acidSubmittedAt);
    if (v.acidExpiresAt !== undefined) patch.acidExpiresAt = asDate(v.acidExpiresAt);
    if (v.acidStatus !== undefined) patch.acidStatus = asOptionalString(v.acidStatus);
    if (v.bankReference !== undefined) patch.bankReference = asOptionalString(v.bankReference);
    if (v.assessmentValue !== undefined) patch.assessmentValue = asNumber(v.assessmentValue);
    await db.update(shipments).set(patch).where(eq(shipments.id, id));
    return Response.json({ ok: true, message: "تم حفظ بيانات التخليص" });
  }

  if (resource === "contract") {
    const patch: Partial<typeof contracts.$inferInsert> = {};
    if (v.name !== undefined) patch.name = asString(v.name);
    if (v.clientId !== undefined) patch.clientId = asNumber(v.clientId) || null;
    if (v.type !== undefined && (CONTRACT_TYPES as readonly string[]).includes(asString(v.type))) patch.type = asString(v.type);
    if (v.incoterm !== undefined) patch.incoterm = asOptionalString(v.incoterm);
    if (v.paymentMethod !== undefined && (PAYMENT_METHODS as readonly string[]).includes(asString(v.paymentMethod))) patch.paymentMethod = asString(v.paymentMethod);
    if (v.bankId !== undefined) patch.bankId = asNumber(v.bankId) || null;
    if (v.currency !== undefined) patch.currency = asString(v.currency, "USD");
    if (v.amount !== undefined) patch.amount = asNumber(v.amount);
    if (v.startDate !== undefined) patch.startDate = asDate(v.startDate);
    if (v.endDate !== undefined) patch.endDate = asDate(v.endDate);
    if (v.paymentTerms !== undefined) patch.paymentTerms = asOptionalString(v.paymentTerms);
    if (v.status !== undefined) patch.status = asString(v.status, "active");
    if (v.notes !== undefined) patch.notes = asOptionalString(v.notes);
    await db.update(contracts).set(patch).where(eq(contracts.id, id));
    return Response.json({ ok: true });
  }

  if (resource === "bank") {
    const patch: Partial<typeof banks.$inferInsert> = {};
    for (const key of ["nameEn", "code", "swift", "accountName", "accountNumber", "iban", "branch", "notes"] as const) {
      if (v[key] !== undefined) patch[key] = asOptionalString(v[key]);
    }
    if (v.name !== undefined && asString(v.name)) patch.name = asString(v.name);
    if (v.currency !== undefined) patch.currency = asString(v.currency, "EGP");
    await db.update(banks).set(patch).where(eq(banks.id, id));
    return Response.json({ ok: true });
  }

  if (resource === "tariff") {
    try {
      const tariff = normalizeImportedTariff({ ...(v as Record<string, unknown>), code: asString(v.code) });
      await db.update(tariffCodes).set(tariff).where(eq(tariffCodes.id, id));
      return Response.json({ ok: true });
    } catch (error) { return jsonError(error instanceof Error ? error.message : "بيانات غير صالحة."); }
  }

  if (resource === "invoice") {
    await db.update(commercialInvoices).set({
      reviewStatus: "reviewed",
      ...(v.number !== undefined ? { number: asString(v.number) } : {}),
      ...(v.supplierName !== undefined ? { supplierName: asOptionalString(v.supplierName) } : {}),
      ...(v.originCountry !== undefined ? { originCountry: asOptionalString(v.originCountry) } : {}),
      ...(v.incoterm !== undefined ? { incoterm: asOptionalString(v.incoterm) } : {}),
      ...(v.paymentMethod !== undefined ? { paymentMethod: asOptionalString(v.paymentMethod) } : {}),
      ...(v.bankName !== undefined ? { bankName: asOptionalString(v.bankName) } : {}),
      ...(v.bankSwift !== undefined ? { bankSwift: asOptionalString(v.bankSwift) } : {}),
      ...(v.bankAccount !== undefined ? { bankAccount: asOptionalString(v.bankAccount) } : {}),
      ...(v.bankIban !== undefined ? { bankIban: asOptionalString(v.bankIban) } : {}),
      ...(v.acidNumber !== undefined ? { acidNumber: asOptionalString(v.acidNumber) } : {}),
      ...(v.currency !== undefined ? { currency: asString(v.currency, "USD") } : {}),
      ...(v.date !== undefined ? { date: asDate(v.date) } : {}),
      ...(v.subtotal !== undefined ? { subtotal: asNumber(v.subtotal) } : {}),
      ...(v.freight !== undefined ? { freight: asNumber(v.freight) } : {}),
      ...(v.insurance !== undefined ? { insurance: asNumber(v.insurance) } : {}),
      ...(v.total !== undefined ? { total: asNumber(v.total) } : {}),
    }).where(eq(commercialInvoices.id, id));
    return Response.json({ ok: true });
  }
  return jsonError("عملية غير معروفة.");
}

export async function DELETE(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();
  const url = new URL(request.url);
  const id = asNumber(url.searchParams.get("id"));
  const resource = url.searchParams.get("resource");
  if (!id) return jsonError("رقم العنصر مطلوب.");
  if (resource === "contract") await db.delete(contracts).where(eq(contracts.id, id));
  else if (resource === "bank") await db.delete(banks).where(eq(banks.id, id));
  else if (resource === "tariff") await db.delete(tariffCodes).where(eq(tariffCodes.id, id));
  else if (resource === "item") await db.delete(shipmentItems).where(eq(shipmentItems.id, id));
  else if (resource === "invoice") await db.delete(commercialInvoices).where(eq(commercialInvoices.id, id));
  else return jsonError("عملية غير معروفة.");
  return Response.json({ ok: true });
}
