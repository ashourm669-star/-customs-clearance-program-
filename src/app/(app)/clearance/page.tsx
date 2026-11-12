"use client";

import { Suspense } from "react";
import { ClearanceWorkspace } from "@/components/clearance-workspace";

export default function ClearancePage() {
  return (
    <Suspense fallback={<div className="card p-8 text-center text-sm text-slate-500">جاري فتح ملف التخليص...</div>}>
      <ClearanceWorkspace />
    </Suspense>
  );
}
