import { eq } from "drizzle-orm";
import { db } from "@/db";
import { documentBlobs } from "@/db/schema";
import { getApiUser, unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const user = await getApiUser();
  if (!user) return unauthorized();
  const { id } = await params;
  const documentId = Number(id);
  if (!Number.isInteger(documentId) || documentId <= 0) return Response.json({ error: "رقم مستند غير صالح" }, { status: 400 });
  const file = (await db.select().from(documentBlobs).where(eq(documentBlobs.documentId, documentId)).limit(1))[0];
  if (!file) return Response.json({ error: "لا يوجد ملف محفوظ لهذا السجل" }, { status: 404 });
  const bytes = Buffer.from(file.dataBase64, "base64");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="attachment-${documentId}.${file.mimeType === "application/pdf" ? "pdf" : file.mimeType === "image/png" ? "png" : file.mimeType === "image/webp" ? "webp" : "jpg"}"`,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
