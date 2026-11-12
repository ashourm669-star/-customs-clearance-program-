import { desc, like } from "drizzle-orm";
import { db } from "@/db";
import { invoices, shipments } from "@/db/schema";
import { getCurrentUser, type SessionUser } from "@/lib/auth";

export async function getApiUser(): Promise<SessionUser | null> {
  return getCurrentUser();
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export const unauthorized = () => jsonError("يجب تسجيل الدخول للمتابعة.", 401);
export const notFound = (entity = "العنصر") => jsonError(`${entity} غير موجود.`, 404);

export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

export function asOptionalString(value: unknown): string | null {
  const text = asString(value);
  return text.length ? text : null;
}

export function asNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function asDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function nextShipmentReference(): Promise<string> {
  const year = new Date().getFullYear();
  const rows = await db
    .select({ reference: shipments.reference })
    .from(shipments)
    .where(like(shipments.reference, `CLR-${year}-%`))
    .orderBy(desc(shipments.reference))
    .limit(1);
  const last = rows[0]?.reference;
  const lastNumber = last ? Number(last.split("-").pop()) : 1000;
  const next = Number.isFinite(lastNumber) ? lastNumber + 1 : 1001;
  return `CLR-${year}-${next}`;
}

export async function nextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const rows = await db.select({ number: invoices.number }).from(invoices).where(like(invoices.number, `INV-${year}-%`));
  const used = new Set(rows.map((row) => row.number));
  const max = rows.reduce((highest, row) => {
    const suffix = Number(row.number.split("-").pop());
    return Number.isFinite(suffix) && suffix > highest ? suffix : highest;
  }, 2000);
  let candidate = max + 1;
  while (used.has(`INV-${year}-${candidate}`)) candidate += 1;
  return `INV-${year}-${candidate}`;
}
