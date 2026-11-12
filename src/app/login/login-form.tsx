"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { Spinner } from "@/components/ui";
import { useToast } from "@/components/toast";

type Mode = "login" | "register";

export function LoginForm({ initialMode = "login" }: { initialMode?: Mode }) {
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("admin@alarabi.com");
  const [password, setPassword] = useState("123456");
  const [name, setName] = useState("");
  const [jobTitle, setJobTitle] = useState("مخلص جمركي");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event?: React.FormEvent) {
    event?.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload = mode === "login" ? { email, password } : { email, password, name, jobTitle };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "same-origin",
      });
      const data = (await response.json()) as { error?: string; user?: { name: string } };
      if (!response.ok) {
        setError(data.error ?? "تعذّر إكمال العملية. تحقق من البيانات.");
        return;
      }
      toast({ title: `أهلاً ${data.user?.name ?? ""}`, description: "تم تسجيل الدخول بنجاح.", tone: "success" });
      router.replace("/dashboard");
      router.refresh();
    } catch {
      // Network or cookie issues (e.g. embedded preview): fall back to a native form submit.
      setError("تعذّر الاتصال بالخادم — جرّب زر الدخول المباشر بالأعلى أو أعد تحميل الصفحة.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
        {(["login", "register"] as Mode[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              setMode(option);
              setError(null);
            }}
            className={`rounded-lg py-2 text-xs font-bold transition ${
              mode === option ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {option === "login" ? "تسجيل الدخول" : "حساب جديد"}
          </button>
        ))}
      </div>

      <form
        onSubmit={submit}
        action={mode === "login" ? "/api/auth/login" : "/api/auth/register"}
        method="post"
        className="space-y-4"
      >
        <input type="hidden" name="next" value="/dashboard" />
        {mode === "register" ? (
          <>
            <label className="block">
              <span className="label">الاسم الكامل</span>
              <div className="relative">
                <User className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="input pr-10"
                  name="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="مثال: كريم فؤاد"
                  autoComplete="name"
                  required
                />
              </div>
            </label>
            <label className="block">
              <span className="label">المسمى الوظيفي</span>
              <input
                className="input"
                name="jobTitle"
                value={jobTitle}
                onChange={(event) => setJobTitle(event.target.value)}
                placeholder="مخلص جمركي"
              />
            </label>
          </>
        ) : null}

        <label className="block">
          <span className="label">البريد الإلكتروني</span>
          <div className="relative">
            <Mail className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              className="input pr-10"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@alarabi.com"
              autoComplete="username"
              dir="ltr"
              required
            />
          </div>
        </label>

        <label className="block">
          <span className="label">كلمة المرور</span>
          <div className="relative">
            <Lock className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type={showPassword ? "text" : "password"}
              className="input px-10"
              name="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={6}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
              aria-label="إظهار كلمة المرور"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </label>

        {error ? (
          <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {error}
          </div>
        ) : null}

        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? <Spinner /> : null}
          {mode === "login" ? "دخول إلى المنصة" : "إنشاء الحساب والدخول"}
          {!loading ? <ArrowLeft className="size-4" /> : null}
        </button>
      </form>

      <div className="mt-4 rounded-xl bg-slate-50 p-3 text-[11px] leading-6 text-slate-500 ring-1 ring-inset ring-slate-200">
        <span className="font-bold text-slate-700">بيانات الدخول التجريبية:</span>
        <br />
        admin@alarabi.com · كلمة المرور 123456
        <br />
        <span className="text-slate-400">أو اضغط «دخول مباشر» بالأعلى للدخول دون كتابة أي بيانات.</span>
      </div>
    </div>
  );
}
