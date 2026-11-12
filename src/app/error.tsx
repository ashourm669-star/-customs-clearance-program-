"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f2f5f9] px-5">
      <div className="card w-full max-w-md p-8 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
          <AlertTriangle className="size-7" />
        </div>
        <h1 className="mt-4 text-xl font-extrabold text-slate-900">حدث خطأ غير متوقع</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          تعذّر تحميل هذه الشاشة. يمكنك إعادة المحاولة، وإذا استمرت المشكلة أعد تحميل الصفحة الرئيسية.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button type="button" onClick={reset} className="btn btn-primary w-full">
            <RefreshCw className="size-4" />
            إعادة المحاولة
          </button>
          <a href="/api/auth/demo" className="btn btn-ghost w-full">
            الدخول بالحساب التجريبي
          </a>
        </div>
      </div>
    </main>
  );
}
