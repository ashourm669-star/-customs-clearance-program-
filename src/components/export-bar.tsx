"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, Printer } from "lucide-react";
import { useData } from "@/components/data-provider";

export function downloadExcel(filename: string, rows: Array<Record<string, unknown>>, sheet = "البيانات") {
  return import("xlsx").then((XLSX) => {
    const book = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ ملاحظة: "لا توجد بيانات" }]);
    XLSX.utils.book_append_sheet(book, worksheet, sheet.slice(0, 31));
    XLSX.writeFile(book, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
  });
}

export function ExportBar({
  filename, rows, title,
}: {
  filename: string;
  rows: Array<Record<string, unknown>>;
  title?: string;
}) {
  const { toast } = useData();
  const [busy, setBusy] = useState("");

  async function excel() {
    setBusy("excel");
    try {
      await downloadExcel(filename, rows);
      toast("تم تنزيل ملف Excel");
    } catch {
      toast("تعذر إنشاء ملف Excel", "error");
    } finally { setBusy(""); }
  }

  function pdf() {
    document.body.dataset.printTitle = title ?? filename;
    window.print();
  }

  return (
    <div className="no-print flex flex-wrap gap-2">
      <button className="btn-ghost" onClick={() => window.print()}><Printer size={15} /> طباعة</button>
      <button className="btn-ghost" onClick={() => void excel()} disabled={busy === "excel"}>
        <FileSpreadsheet size={15} /> {busy === "excel" ? "..." : "Excel"}
      </button>
      <button className="btn-ghost" onClick={pdf}><Download size={15} /> PDF</button>
    </div>
  );
}
