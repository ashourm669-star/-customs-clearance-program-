import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documentBlobs, documents, shipmentEvents, shipments } from "@/db/schema";
import { asNumber, asString, getApiUser, jsonError, unauthorized } from "@/lib/api";
import { listDocuments } from "@/lib/queries";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024;

function sniffMime(buffer: Buffer): string | null {
  if (buffer.subarray(0, 3).toString("hex") === "ffd8ff") return "image/jpeg";
  if (buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") return "image/png";
  if (buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP") return "image/webp";
  if (buffer.subarray(0, 5).toString() === "%PDF-") return "application/pdf";
  return null;
}

/** Stores the actual camera photo/PDF in PostgreSQL so it survives redeployments. */
export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("لم يتم اختيار صورة أو ملف.");
    if (!file.size || file.size > MAX_BYTES) return jsonError("اختر ملفاً بحجم لا يتجاوز 4 ميجابايت.");
    const shipmentId = asNumber(form.get("shipmentId"));
    if (!shipmentId) return jsonError("اختر ملف التخليص الذي سيُحفظ فيه المرفق.");
    const exists = await db.select({ reference: shipments.reference }).from(shipments).where(eq(shipments.id, shipmentId)).limit(1);
    if (!exists.length) return jsonError("ملف التخليص غير موجود.", 404);

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = sniffMime(buffer);
    if (!mimeType) return jsonError("صيغة الملف غير مدعومة. اختر صورة JPG/PNG/WebP أو ملف PDF.");
    const name = asString(form.get("name")) || file.name || "صورة مستند";
    let createdId: number | null = null;
    try {
      const [created] = await db.insert(documents).values({
        shipmentId, name: name.slice(0, 240),
        type: mimeType === "application/pdf" ? "other" : "other",
        status: "pending", sizeKb: Math.max(1, Math.round(file.size / 1024)), uploadedBy: user.name,
      }).returning({ id: documents.id });
      createdId = created.id;
      await db.insert(documentBlobs).values({ documentId: created.id, mimeType, dataBase64: buffer.toString("base64") });
    } catch (error) {
      if (createdId) await db.delete(documents).where(eq(documents.id, createdId)).catch(() => undefined);
      throw error;
    }
    await db.insert(shipmentEvents).values({
      shipmentId, title: `حفظ مرفق حقيقي: ${name.slice(0, 120)}`,
      description: `حُفظ الملف في قاعدة البيانات بواسطة ${user.name} — ${Math.round(file.size / 1024)} كيلوبايت.`,
      type: "document", occurredAt: new Date(),
    });
    const all = await listDocuments();
    return Response.json({ document: all.find((row) => row.id === createdId) ?? null }, { status: 201 });
  } catch (error) {
    console.error("[document-upload]", error);
    return jsonError("تعذّر حفظ المرفق. حاول مرة أخرى.", 422);
  }
}
