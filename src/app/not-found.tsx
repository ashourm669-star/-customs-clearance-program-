import Link from "next/link";
import { Compass, Home } from "lucide-react";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f2f5f9] px-5">
      <div className="card w-full max-w-md p-8 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <Compass className="size-7" />
        </div>
        <h1 className="mt-4 text-2xl font-extrabold text-slate-900">الصفحة غير موجودة</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          الرابط الذي تحاول الوصول إليه غير متاح، أو تم حذف ملف التخليص المرتبط به.
        </p>
        <Link href="/dashboard" className="btn btn-primary mt-6 w-full">
          <Home className="size-4" />
          العودة إلى لوحة التحكم
        </Link>
      </div>
    </main>
  );
}
