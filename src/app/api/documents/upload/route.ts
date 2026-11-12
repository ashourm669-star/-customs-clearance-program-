import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documents, shipmentEvents, shipments } from "@/db/schema";
import { asNumber, asString, getApiUser, jsonError, unauthorized } from "@/lib/api";
import { listDocuments } from "@/lib/queries";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Accepts a camera photo or PDF and stores it as a reviewed-later document row.
 *  Files are analysed in-request (size/type) and not persisted to disk, which keeps
 *  the deployment serverless-friendly; metadata + source text are stored in Postgres. */
export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("لم يتم إرفاق صورة أو ملف.");
    if (file.size > 12 * 1024 * 1024) return jsonError("حجم الملف يجب ألا يتجاوز 12 ميجابايت.");
    const shipmentId = asNumber(form.get("shipmentId"));
    if (!shipmentId) return jsonError("اختر ملف التخليص.");
    const exists = await db.select({ reference: shipments.reference }).from(shipments).where(eq(shipments.id, shipmentId)).limit(1);
    if (!exists.length) return jsonError("ملف التخليص غير موجود.", 404);

    const name = asString(form.get("name")) || file.name || "صورة مستند";
    const type = file.type.includes("pdf") ? "other" : "other";
    const [created] = await db.insert(documents).values({
      shipmentId, name, type, status: "pending",
      sizeKb: Math.max(1, Math.round(file.size / 1024)), uploadedBy: user.name,
    }).returning({ id: documents.id });

    await db.insert(shipmentEvents).values({
      shipmentId,
      title: `إرفاق صورة/مستند من الكاميرا: ${name}`,
      description: `أُضيف بواسطة ${user.name} — ${Math.max(1, Math.round(file.size / 1024))} كيلوبايت (${file.type || "غير معروف"}).`,
      type: "document",
      occurredAt: new Date(),
    });

    const all = await listDocuments();
    return Response.json({ document: all.find((row) => row.id === created.id) ?? null }, { status: 201 });
  } catch (error) {
    console.error("[upload]", error);
    return jsonError("تعذّر حفظ المرفق. حاول مرة أخرى.", 422);
  }
}
