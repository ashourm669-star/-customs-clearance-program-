import Link from "next/link";
import { CloudOff, RefreshCw } from "lucide-react";

export const metadata = { title: "لا يوجد اتصال — العربي للخدمات الجمركية" };

export default function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f2f5f9] px-5">
      <div className="card w-full max-w-md p-8 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <CloudOff className="size-7" />
        </div>
        <h1 className="mt-4 text-xl font-extrabold text-slate-900">لا يوجد اتصال بالإنترنت</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          التطبيق مثبّت ويعمل، لكن ملفات التخليص والبيانات الحقيقية تحتاج اتصالاً بقاعدة البيانات. أعد الاتصال ثم حاول
          مرة أخرى.
        </p>
        <Link href="/dashboard" className="btn btn-primary mt-6 w-full">
          <RefreshCw className="size-4" />
          إعادة المحاولة
        </Link>
        <p className="mt-3 text-[10px] text-slate-400">النظام يعمل كتطبيق مستقل عند تثبيته على الشاشة الرئيسية.</p>
      </div>
    </main>
  );
}
