import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, invoices } from "@/db/schema";
import { asDate, asNumber, asOptionalString, asString, getApiUser, jsonError, nextInvoiceNumber, unauthorized } from "@/lib/api";
import { INVOICE_STATUSES } from "@/lib/constants";
import { listInvoices } from "@/lib/queries";

function resolveStatus(status: string, paidAmount: number, total: number): string {
  if (status === "draft") return "draft";
  if (total > 0 && paidAmount >= total) return "paid";
  if (paidAmount > 0) return "partially_paid";
  if ((INVOICE_STATUSES as readonly string[]).includes(status)) return status;
  return "sent";
}

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorized();
  return Response.json({ invoices: await listInvoices() });
}

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("بيانات غير صالحة.");
  }
  const payload = body as Record<string, unknown>;
  const clientId = asNumber(payload.clientId);
  if (!clientId) return jsonError("يجب اختيار العميل.");
  const clientRows = await db.select({ id: clients.id }).from(clients).where(eq(clients.id, clientId)).limit(1);
  if (!clientRows.length) return jsonError("العميل غير موجود.", 404);

  const subtotal = asNumber(payload.subtotal);
  const taxAmount = asNumber(payload.taxAmount);
  const total = subtotal + taxAmount;
  if (total <= 0) return jsonError("إجمالي الفاتورة يجب أن يكون أكبر من صفر.");
  const paidAmount = Math.min(asNumber(payload.paidAmount), total);
  const requestedStatus = asString(payload.status, "sent");
  const number = asString(payload.number) || (await nextInvoiceNumber());

  const duplicate = await db.select({ id: invoices.id }).from(invoices).where(eq(invoices.number, number)).limit(1);
  if (duplicate.length) return jsonError("رقم الفاتورة مستخدم بالفعل.", 409);

  const [created] = await db
    .insert(invoices)
    .values({
      number,
      clientId,
      shipmentId: asNumber(payload.shipmentId) > 0 ? asNumber(payload.shipmentId) : null,
      issueDate: asDate(payload.issueDate) ?? new Date(),
      dueDate: asDate(payload.dueDate),
      subtotal,
      taxAmount,
      total,
      paidAmount,
      status: resolveStatus(requestedStatus, paidAmount, total),
      notes: asOptionalString(payload.notes),
    })
    .returning({ id: invoices.id });

  const all = await listInvoices();
  return Response.json({ invoice: all.find((item) => item.id === created.id) ?? null }, { status: 201 });
}
