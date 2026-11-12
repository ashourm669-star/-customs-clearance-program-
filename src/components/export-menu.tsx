"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { useToast } from "@/components/toast";

export function ExportMenu({ resource: explicitResource, shipmentId }: { resource?: string; shipmentId?: number }) {
  const pathname = usePathname();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const paths: Record<string, string> = { "/shipments": "shipments", "/clients": "clients", "/carriers": "carriers", "/invoices": "invoices", "/documents": "documents", "/customs": "tariffs", "/tracking": "shipments", "/reports": "shipments", "/settings": "banks" };
  const resource = explicitResource ?? (pathname.startsWith("/shipments/") ? "shipments" : paths[pathname] ?? "shipments");

  async function download(format: "xlsx" | "pdf") {
    setOpen(false);
    setBusy(true);
    try {
      const params = new URLSearchParams({ resource, format });
      if (shipmentId) params.set("shipmentId", String(shipmentId));
      const response = await fetch(`/api/export?${params}`);
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `al-araby-${resource}.${format}`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast({ title: "تم تنزيل الملف", description: format === "xlsx" ? "Excel — بيانات الواجهة الحالية" : "PDF — تقرير عربي", tone: "success" });
    } catch {
      toast({ title: "تعذّر تنزيل الملف", description: "حاول مرة أخرى.", tone: "error" });
    } finally { setBusy(false); }
  }

  return (
    <div className="flex items-center gap-1 no-print">
      <button type="button" onClick={() => window.print()} className="btn btn-ghost h-9 px-2.5 text-[11px]" title="طباعة الواجهة الحالية">
        <Printer className="size-3.5" />
        <span className="hidden sm:inline">طباعة</span>
      </button>
      <div className="relative">
        <button type="button" onClick={() => setOpen(!open)} disabled={busy} className="btn btn-ghost h-9 px-2.5 text-[11px]" title="تنزيل Excel أو PDF">
          <Download className="size-3.5" />
          <span className="hidden sm:inline">تنزيل</span>
        </button>
        {open ? (
          <>
            <button type="button" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} aria-label="إغلاق" />
            <div className="absolute left-0 top-10 z-50 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-fade-up">
              <button type="button" onClick={() => download("xlsx")} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-bold text-slate-700 hover:bg-emerald-50">
                <FileSpreadsheet className="size-4 text-emerald-600" /> تنزيل Excel
              </button>
              <button type="button" onClick={() => download("pdf")} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-bold text-slate-700 hover:bg-rose-50">
                <FileText className="size-4 text-rose-500" /> تنزيل PDF
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
