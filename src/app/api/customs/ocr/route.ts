import { readFile } from "node:fs/promises";
import path from "node:path";
import { getApiUser, jsonError, unauthorized } from "@/lib/api";
import { parseInvoiceText } from "@/lib/invoice-parser";
import { extractText, getDocumentProxy, renderPageAsImage } from "unpdf";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();
  const langPath = path.join(process.cwd(), ".tessdata");
  let hasLocalLangData = false;
  try {
    await readFile(path.join(langPath, "eng.traineddata.gz"));
    hasLocalLangData = true;
  } catch {
    hasLocalLangData = false;
  }
  const workerOptions = hasLocalLangData
    ? { langPath, cachePath: "/tmp/alarabi-ocr-cache", gzip: true }
    : { cachePath: "/tmp/alarabi-ocr-cache" };

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("ارفع ملف فاتورة PDF أو صورة.");
    if (file.size > 12 * 1024 * 1024) return jsonError("حجم الملف يجب ألا يتجاوز 12 ميجابايت.");
    const buffer = Buffer.from(await file.arrayBuffer());
    let text = "";
    let method = "text";
    if (file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf") {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      try {
        const extracted = await extractText(pdf, { mergePages: true });
        text = extracted.text;
        method = "pdf_text";
      } finally {
        await pdf.loadingTask.destroy();
      }
      if (text.trim().length < 10) {
        const { createWorker } = await import("tesseract.js");
        const worker = await createWorker(["eng", "ara"], 1, workerOptions);
        try {
          const pages: string[] = [];
          for (let page = 1; page <= Math.min(3, pdf.numPages); page++) {
            const image = await renderPageAsImage(pdf, page, { canvasImport: () => import("@napi-rs/canvas"), scale: 1.5 });
            const result = await worker.recognize(Buffer.from(image));
            pages.push(result.data.text);
          }
          text = pages.join("\n");
          method = "ocr_pdf";
        } finally {
          await worker.terminate();
        }
      }
    } else if (/image\/(png|jpeg|webp)/.test(file.type)) {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker(["eng", "ara"], 1, {
        ...workerOptions,
        errorHandler: (error) => console.error("[ocr]", error),
      });
      try {
        const result = await worker.recognize(buffer);
        text = result.data.text;
      } finally {
        await worker.terminate();
      }
      method = "ocr";
    } else {
      return jsonError("صيغة غير مدعومة. استخدم PDF أو JPG أو PNG أو WEBP.");
    }
    return Response.json({ method, text, filename: file.name, parsed: parseInvoiceText(text), needsReview: true });
  } catch (error) {
    console.error("[invoice-ocr]", error);
    return jsonError("تعذّرت قراءة الفاتورة. تأكد من الملف وحاول مرة أخرى أو أدخل البيانات يدوياً.", 422);
  }
}
