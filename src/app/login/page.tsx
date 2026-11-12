import { redirect } from "next/navigation";
import { AlertCircle, CheckCircle2, FileCheck2, Globe2, Plane, ShieldCheck, Ship } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

const highlights = [
  { icon: <Ship className="size-4" />, title: "الخطوط الملاحية", text: "ميرسك، MSC، CMA CGM، هاباج لويد، إيفرجرين" },
  { icon: <Plane className="size-4" />, title: "شركات الطيران", text: "مصر للطيران، الإمارات، القطرية، التركية، لوفتهانزا" },
  { icon: <Globe2 className="size-4" />, title: "منصة نافذة", text: "إقرارات ACID والتصاريح ومنظومة ACI في مكان واحد" },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mode?: string; expired?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const params = await searchParams;

  return (
    <main className="grid min-h-screen bg-[#0a2239] lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(15,157,139,0.35),transparent_45%),radial-gradient(circle_at_85%_80%,rgba(201,162,39,0.22),transparent_45%)]" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#c9a227,#ead07a)] text-[#0a2239] shadow-xl">
              <ShieldCheck className="size-7" />
            </div>
            <div>
              <p className="text-base font-extrabold">العربي للخدمات الجمركية واللوجستية</p>
              <p className="text-xs text-slate-300">Al-Araby Customs & Logistics Services</p>
            </div>
          </div>

          <h1 className="mt-14 max-w-lg text-4xl font-extrabold leading-[1.25]">
            ملف التخليص الجمركي
            <span className="mt-1 block bg-[linear-gradient(90deg,#7ee0cf,#ead07a)] bg-clip-text text-transparent">
              من البوليصة إلى الإفراج.
            </span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-slate-300">
            منصة واحدة لإدارة كل شحناتك الجوية والبحرية والبرية، متابعة الإقرارات الجمركية، المستندات، الفواتير، والربط
            المباشر مع شركات الشحن ومنصة نافذة.
          </p>

          <div className="mt-9 space-y-3">
            {highlights.map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur-sm"
              >
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#0f9d8b]/25 text-[#7ee0cf]">
                  {item.icon}
                </span>
                <div>
                  <p className="text-xs font-bold text-white">{item.title}</p>
                  <p className="text-[11px] text-slate-300">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-3">
          {[
            { value: "ملفات", label: "إدارة التخليص" },
            { value: "بوالص", label: "بحث وتتبّع" },
            { value: "ACID", label: "توثيق ومتابعة" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center">
              <p className="text-xl font-extrabold text-white">{stat.value}</p>
              <p className="text-[10px] text-slate-300">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex min-h-screen flex-col justify-center bg-[#f2f5f9] px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <div className="flex size-11 items-center justify-center rounded-xl bg-[#0a2239] text-[#ead07a]">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-900">العربي للخدمات الجمركية</p>
              <p className="text-[11px] text-slate-500">واللوجستية</p>
            </div>
          </div>

          <div className="card p-6 sm:p-8">
            <div className="mb-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                <CheckCircle2 className="size-3.5" />
                نظام سحابي آمن
              </span>
              <h2 className="mt-3 text-2xl font-extrabold text-slate-900">مرحباً بعودتك</h2>
              <p className="mt-1 text-sm text-slate-500">سجّل الدخول لإدارة ملفات التخليص الجمركي الخاصة بشركتك.</p>
            </div>

            {params.error ? (
              <div className="mb-4 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {params.error}
              </div>
            ) : null}

            {params.expired ? (
              <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs font-semibold leading-6 text-amber-800 ring-1 ring-inset ring-amber-200">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>انتهت جلسة الدخول. سجّل الدخول ببريدك وكلمة مرورك، وجرّب فتح الصفحة في نافذة جديدة إذا كان المتصفح يمنع الكوكيز.</span>
              </div>
            ) : null}

            <LoginForm initialMode="login" />
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <FileCheck2 className="size-3.5" />
              بياناتك محفوظة في قاعدة بيانات الشركة. الخدمة ليست تابعة رسمياً لمصلحة الجمارك أو منصة نافذة.
          </div>
        </div>
      </section>
    </main>
  );
}
