import { eq } from "drizzle-orm";
import { db } from "@/db";
import { invoices } from "@/db/schema";
import { asDate, asNumber, asOptionalString, asString, getApiUser, jsonError, notFound, unauthorized } from "@/lib/api";
import { INVOICE_STATUSES } from "@/lib/constants";
import { listInvoices } from "@/lib/queries";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const invoiceId = Number(id);
  const rows = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  const existing = rows[0];
  if (!existing) return notFound("الفاتورة");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("بيانات غير صالحة.");
  }
  const payload = body as Record<string, unknown>;

  const subtotal = payload.subtotal !== undefined ? asNumber(payload.subtotal) : existing.subtotal;
  const taxAmount = payload.taxAmount !== undefined ? asNumber(payload.taxAmount) : existing.taxAmount;
  const total = subtotal + taxAmount;
  let paidAmount = payload.paidAmount !== undefined ? asNumber(payload.paidAmount) : existing.paidAmount;
  paidAmount = Math.max(0, Math.min(paidAmount, total));

  const requestedStatus = asString(payload.status, existing.status);
  let status = existing.status;
  if (requestedStatus === "draft") status = "draft";
  else if (total > 0 && paidAmount >= total) status = "paid";
  else if (paidAmount > 0) status = "partially_paid";
  else status = (INVOICE_STATUSES as readonly string[]).includes(requestedStatus) ? requestedStatus : existing.status;

  if (requestedStatus === "paid") {
    paidAmount = total;
    status = "paid";
  }

  await db
    .update(invoices)
    .set({
      clientId: payload.clientId !== undefined ? asNumber(payload.clientId) || null : existing.clientId,
      shipmentId: payload.shipmentId !== undefined ? asNumber(payload.shipmentId) || null : existing.shipmentId,
      issueDate: payload.issueDate !== undefined ? asDate(payload.issueDate) ?? existing.issueDate : existing.issueDate,
      dueDate: payload.dueDate !== undefined ? asDate(payload.dueDate) : existing.dueDate,
      subtotal,
      taxAmount,
      total,
      paidAmount,
      status,
      notes: payload.notes !== undefined ? asOptionalString(payload.notes) : existing.notes,
      ...(asString(payload.number) ? { number: asString(payload.number) } : {}),
    })
    .where(eq(invoices.id, invoiceId));

  const all = await listInvoices();
  return Response.json({ invoice: all.find((item) => item.id === invoiceId) ?? null });
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getApiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  await db.delete(invoices).where(eq(invoices.id, Number(id)));
  return Response.json({ ok: true });
}
