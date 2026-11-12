"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "طباعة التقرير" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-ghost no-print">
      <Printer className="size-4" />
      {label}
    </button>
  );
}
