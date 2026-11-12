"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Download, MoreVertical, Share, Smartphone, X } from "lucide-react";
import { Badge } from "@/components/ui";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Platform = "android" | "ios" | "desktop";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const agent = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(agent)) return "ios";
  if (/android/.test(agent)) return "android";
  return "desktop";
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
        console.warn("[pwa] service worker registration failed", error);
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}

export function InstallAppCard({ compact = false }: { compact?: boolean }) {
  const [platform, setPlatform] = useState<Platform>(() => detectPlatform());
  const [installed, setInstalled] = useState<boolean>(() => isStandalone());
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    const onInstalled = () => setInstalled(true);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (promptEvent) {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setPromptEvent(null);
      return;
    }
    setOpen(true);
  }, [promptEvent]);

  const steps =
    platform === "ios"
      ? [
          { icon: <Share className="size-3.5" />, text: "افتح الموقع في متصفح Safari على الآيفون." },
          { icon: <Share className="size-3.5" />, text: "اضغط زر المشاركة (مربع يخرج منه سهم) في أسفل الشاشة." },
          { icon: <Smartphone className="size-3.5" />, text: "اختر «إضافة إلى الشاشة الرئيسية» Add to Home Screen." },
          { icon: <Check className="size-3.5" />, text: "اضغط «إضافة» — ستظهر أيقونة العربي جمرك كتطبيق." },
        ]
      : platform === "android"
        ? [
            { icon: <MoreVertical className="size-3.5" />, text: "افتح الموقع في Chrome على الأندرويد." },
            { icon: <MoreVertical className="size-3.5" />, text: "اضغط قائمة النقاط الثلاث أعلى يسار المتصفح." },
            { icon: <Download className="size-3.5" />, text: "اختر «تثبيت التطبيق» أو Install app." },
            { icon: <Check className="size-3.5" />, text: "أكّد التثبيت — ستجد التطبيق في درج التطبيقات." },
          ]
        : [
            { icon: <Download className="size-3.5" />, text: "افتح الموقع في Chrome أو Edge على الكمبيوتر." },
            { icon: <Download className="size-3.5" />, text: "اضغط أيقونة التثبيت في شريط العنوان، أو القائمة ← Install." },
            { icon: <Check className="size-3.5" />, text: "اختر «تثبيت» ليُضاف كتطبيق مستقل بنافذته الخاصة." },
            { icon: <Smartphone className="size-3.5" />, text: "على الآيفون والماك: مشاركة ← إضافة إلى Dock." },
          ];

  if (compact) {
    return (
      <button
        type="button"
        onClick={install}
        className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-[11px] font-bold text-white transition hover:bg-white/[0.12]"
      >
        {installed ? <Check className="size-3.5 text-emerald-300" /> : <Download className="size-3.5 text-[#7ee0cf]" />}
        {installed ? "التطبيق مثبّت على جهازك" : "تثبيت التطبيق على الموبايل"}
        <InstallSheet open={open} onClose={() => setOpen(false)} steps={steps} />
      </button>
    );
  }

  return (
    <>
      <div className="card p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#0a2239] text-[#ead07a]">
            <Smartphone className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
              ثبّت التطبيق على الموبايل
              <Badge tone={installed ? "emerald" : "amber"}>{installed ? "مثبّت" : "متاح للتثبيت"}</Badge>
            </p>
            <p className="mt-1 text-[11px] leading-5 text-slate-500">
              يعمل كتطبيق مستقل بأيقونة على الشاشة الرئيسية، بملء الشاشة وبدون شريط المتصفح — على أندرويد وآيفون
              والكمبيوتر. لا يحتاج متجر تطبيقات ولا تنزيل من روابط خارجية.
            </p>
            <ul className="mt-2 space-y-1 text-[10px] text-slate-500">
              <li className="flex items-center gap-1.5">
                <Check className="size-3 text-emerald-500" /> أيقونة باسم «العربي جمرك» على جهازك
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="size-3 text-emerald-500" /> شاشة تحميل عربية بدل صفحة بيضاء
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="size-3 text-emerald-500" /> صفحة «لا يوجد اتصال» بدل رسالة خطأ المتصفح
              </li>
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={install} className="btn btn-primary h-9 text-[11px]">
                <Download className="size-3.5" />
                {installed ? "طريقة التثبيت" : "تثبيت الآن"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="btn btn-ghost h-9 text-[11px]"
              >
                خطوات يدوية
              </button>
            </div>
          </div>
        </div>
      </div>
      <InstallSheet open={open} onClose={() => setOpen(false)} steps={steps} />
    </>
  );
}

function InstallSheet({
  open,
  onClose,
  steps,
}: {
  open: boolean;
  onClose: () => void;
  steps: { icon: React.ReactNode; text: string }[];
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="w-full max-w-md overflow-hidden rounded-t-2xl bg-white shadow-2xl animate-fade-up sm:rounded-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">تثبيت التطبيق على جهازك</h2>
            <p className="text-[11px] text-slate-500">خطوات بسيطة حسب نوع جهازك</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="إغلاق">
            <X className="size-5" />
          </button>
        </header>
        <ol className="divide-y divide-slate-100">
          {steps.map((step, index) => (
            <li key={index} className="flex items-start gap-3 px-5 py-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#0a2239] text-[10px] font-bold text-white">
                {index + 1}
              </span>
              <span className="flex flex-1 items-start gap-2 text-[11px] leading-5 text-slate-700">
                <span className="mt-0.5 text-[#0f9d8b]">{step.icon}</span>
                {step.text}
              </span>
            </li>
          ))}
        </ol>
        <footer className="bg-slate-50 px-5 py-3">
          <p className="text-[10px] leading-5 text-slate-500">
            بعد التثبيت يعمل التطبيق بنفس بياناتك المحفوظة في قاعدة البيانات، ويحتفظ بجلسة الدخول. لفتحه: من أيقونة
            «العربي جمرك» على الشاشة الرئيسية.
          </p>
        </footer>
      </div>
    </div>
  );
}
