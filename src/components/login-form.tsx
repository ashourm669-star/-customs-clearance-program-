"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft, Building2, Check, ExternalLink, Eye, EyeOff, Globe2, LockKeyhole,
  Plane, Ship, ShieldCheck, Sparkles,
} from "lucide-react";
import { COMPANY } from "@/lib/constants";
import { getStoredToken, storeToken } from "@/components/data-provider";
import { PwaInstaller } from "@/components/pwa-installer";

export function LoginForm() {
  const [email, setEmail] = useState("admin@alarabi.com");
  const [password, setPassword] = useState("Admin@123");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [embedded, setEmbedded] = useState(false);

  useEffect(() => {
    setEmbedded(window.self !== window.top);
    if (getStoredToken()) window.location.replace("/dashboard");
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "تعذر تسجيل الدخول");
        setLoading(false);
        return;
      }
      if (json.token) storeToken(json.token);
      window.location.replace("/dashboard");
    } catch {
      setError("تعذر الاتصال بالخادم، حاول مرة أخرى");
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]" dir="rtl">
      <section className="relative hidden overflow-hidden bg-[linear-gradient(150deg,#071426_0%,#0b1d36_55%,#0d3550_100%)] px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 shadow-lg shadow-teal-900/40">
            <Building2 size={22} />
          </div>
          <div>
            <p className="text-lg font-bold leading-tight">العربي</p>
            <p className="text-[11px] text-white/55">{COMPANY.englishName}</p>
          </div>
        </div>

        <div className="relative max-w-lg">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-teal-200">
            <Sparkles size={13} /> منصة التخليص الجمركي المتكاملة
          </span>
          <h1 className="mt-6 text-[2.7rem] font-bold leading-[1.3]">
            كل شحنة، كل مستند،<br />
            <span className="bg-gradient-to-l from-teal-300 to-amber-300 bg-clip-text text-transparent">في مكان واحد.</span>
          </h1>
          <p className="mt-4 text-sm leading-7 text-white/65">
            إدارة عمليات الاستيراد والتصدير، متابعة بيانات ACID عبر منصة نافذة، وربط مباشر مع شركات الطيران والخطوط الملاحية والموانئ المصرية.
          </p>
          <div className="mt-9 grid grid-cols-3 gap-3">
            {[
              { icon: Plane, label: "شركات الطيران", value: "١٠+" },
              { icon: Ship, label: "خطوط ملاحية", value: "١٠+" },
              { icon: Globe2, label: "منافذ مرتبطة", value: "١١" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                <item.icon size={18} className="text-teal-300" />
                <p className="mt-3 text-xl font-bold">{item.value}</p>
                <p className="text-[11px] text-white/55">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-2 text-[11px] text-white/45">
          <ShieldCheck size={14} /> {COMPANY.license} · © ٢٠٢٦ جميع الحقوق محفوظة
        </div>
      </section>

      <section className="flex items-center justify-center bg-[#f7f9fc] px-5 py-10 sm:px-10">
        <div className="w-full max-w-md fade-up">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--navy)] text-white"><Building2 size={22} /></div>
            <div>
              <p className="font-bold">{COMPANY.name}</p>
              <p className="text-[11px] text-slate-500">منصة التخليص الجمركي</p>
            </div>
          </div>

          {embedded && (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[11px] leading-5 text-amber-800">
              <span className="flex-1">التطبيق يعمل داخل إطار المعاينة. إن لم يفتح بشكل صحيح، افتحه في تبويب جديد.</span>
              <button
                type="button"
                onClick={() => window.open(window.location.origin + "/login", "_blank", "noopener")}
                className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-amber-700"
              >
                <ExternalLink size={12} /> فتح في تبويب جديد
              </button>
            </div>
          )}

          <div className="card p-7 sm:p-9">
            <p className="text-xs font-semibold text-teal-700">مرحباً بعودتك 👋</p>
            <h2 className="mt-2 text-2xl font-bold text-[var(--navy)]">تسجيل الدخول إلى النظام</h2>
            <p className="mt-1.5 text-sm text-slate-500">أدخل بيانات حسابك للوصول إلى لوحة التحكم</p>

            <form onSubmit={submit} className="mt-7 space-y-4">
              <div>
                <label className="field-label" htmlFor="email">البريد الإلكتروني</label>
                <div className="relative">
                  <input
                    id="email" type="email" dir="ltr" className="field pl-10 text-left"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@alarabi.com" required autoComplete="username"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">@</span>
                </div>
              </div>
              <div>
                <label className="field-label" htmlFor="password">كلمة المرور</label>
                <div className="relative">
                  <LockKeyhole size={15} className="absolute left-9 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password" type={showPassword ? "text" : "password"} dir="ltr" className="field pl-10 text-left"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" required autoComplete="current-password"
                  />
                  <button
                    type="button" onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label="إظهار كلمة المرور"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">{error}</div>
              )}

              <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
                {loading ? (
                  <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> جاري الدخول...</>
                ) : (
                  <>دخول إلى لوحة التحكم <ArrowLeft size={16} /></>
                )}
              </button>
            </form>

            <div className="mt-6 rounded-xl border border-dashed border-teal-200 bg-teal-50/60 p-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-teal-800"><Check size={14} /> حساب تجريبي جاهز</div>
              <p className="mt-1.5 text-[11px] leading-5 text-teal-900/70">
                admin@alarabi.com · كلمة المرور Admin@123
              </p>
              <p className="mt-1 text-[11px] text-teal-900/60">كما يمكنك الدخول بـ ops@alarabi.com أو finance@alarabi.com بنفس كلمة المرور.</p>
            </div>
          </div>
          <p className="mt-6 text-center text-[11px] text-slate-400">نظام مبني على قاعدة بيانات مؤمنة · جلسات مشفرة · نسخ احتياطي دوري</p>
        </div>
      </section>
      <PwaInstaller />
    </main>
  );
}
