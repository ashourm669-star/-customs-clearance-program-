import { getApiUser, jsonError, unauthorized } from "@/lib/api";
import { getExportData, makeArabicPdf, makeExcel, type ExportResource } from "@/lib/export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESOURCES: ExportResource[] = ["shipments", "clients", "carriers", "invoices", "documents", "tariffs", "contracts", "banks", "commercial_invoices", "items"];
const PATHS: Record<string, ExportResource> = {
  "/shipments": "shipments", "/clients": "clients", "/carriers": "carriers", "/invoices": "invoices", "/documents": "documents",
  "/customs": "tariffs", "/tracking": "shipments", "/reports": "shipments",
};

export async function GET(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();
  const url = new URL(request.url);
  const path = url.pathname.startsWith("/shipments/") ? "shipments" : PATHS[url.pathname];
  const requested = url.searchParams.get("resource") ?? path;
  if (!requested || !RESOURCES.includes(requested as ExportResource)) return jsonError("نوع التصدير غير مدعوم.");
  const resource = requested as ExportResource;
  const shipmentId = resource === "items" || path === "shipments" ? Number(url.searchParams.get("shipmentId")) || undefined : undefined;
  const format = url.searchParams.get("format") ?? "xlsx";
  try {
    const data = await getExportData(resource, shipmentId);
    const filename = `al-araby-${resource}-${new Date().toISOString().slice(0, 10)}`;
    if (format === "pdf") {
      const bytes = await makeArabicPdf(data);
      return new Response(bytes as BodyInit, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}.pdf"`, "Cache-Control": "no-store" } });
    }
    if (format === "xlsx") {
      const bytes = makeExcel(data);
      return new Response(bytes as BodyInit, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${filename}.xlsx"`, "Cache-Control": "no-store" } });
    }
    return jsonError("صيغة غير مدعومة. اختر xlsx أو pdf.");
  } catch (error) {
    console.error("[export]", error);
    return jsonError("تعذّر إنشاء الملف. حاول مرة أخرى.", 500);
  }
}
