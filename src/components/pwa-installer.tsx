"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, Share2, Smartphone, X } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "alarabi_pwa_dismissed";

export function PwaInstaller() {
  const promptRef = useRef<InstallPromptEvent | null>(null);
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    const ua = navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(ua) || (ua.includes("mac") && "ontouchend" in document);
    const runningStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsIos(iosDevice);
    setStandalone(runningStandalone);
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");

    const onPrompt = (event: Event) => {
      event.preventDefault();
      const installEvent = event as InstallPromptEvent;
      promptRef.current = installEvent;
      setDeferred(installEvent);
    };
    const onRequest = () => {
      if (promptRef.current) {
        void promptRef.current.prompt();
      } else {
        setIsIos(true);
        setDismissed(false);
      }
    };
    const onInstalled = () => {
      setDone(true);
      setDeferred(null);
      promptRef.current = null;
      localStorage.setItem(DISMISS_KEY, "1");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("pwa-install-request", onRequest);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("pwa-install-request", onRequest);
    };
  }, []);

  async function install() {
    const event = deferred ?? promptRef.current;
    if (!event) { setIsIos(true); return; }
    try {
      await event.prompt();
      const choice = await event.userChoice;
      if (choice.outcome === "accepted") {
        setDone(true);
        localStorage.setItem(DISMISS_KEY, "1");
      } else {
        setDismissed(true);
        localStorage.setItem(DISMISS_KEY, "1");
      }
    } catch {
      setDismissed(true);
    }
    setDeferred(null);
    promptRef.current = null;
  }

  function hide() {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, "1");
  }

  if (standalone) return null;

  if (done) {
    return (
      <div className="fade-up fixed bottom-4 left-4 right-4 z-[70] mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-emerald-200 bg-white p-4 shadow-xl">
        <CheckCircle2 size={20} className="text-emerald-600" />
        <p className="flex-1 text-xs font-bold text-slate-700">تم تثبيت تطبيق العربي على جهازك 👏</p>
        <button onClick={() => setDone(false)} className="text-slate-400" aria-label="إغلاق"><X size={15} /></button>
      </div>
    );
  }

  if (dismissed || (!deferred && !isIos)) return null;

  return (
    <div className="fade-up fixed bottom-4 left-4 right-4 z-[70] mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/15" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
      <button onClick={hide} className="absolute left-3 top-3 text-slate-400 hover:text-slate-600" aria-label="إغلاق"><X size={15} /></button>
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--navy)] text-white"><Smartphone size={20} /></div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-[var(--navy)]">ثبّت تطبيق العربي على الموبايل</p>
          {isIos && !deferred ? (
            <p className="mt-1.5 text-[11px] leading-6 text-slate-500">في Safari اضغط زر المشاركة <Share2 size={12} className="inline text-slate-600" /> ثم «إضافة إلى الشاشة الرئيسية» ليفتح التطبيق ملء الشاشة.</p>
          ) : (
            <p className="mt-1.5 text-[11px] leading-6 text-slate-500">أيقونة على الشاشة الرئيسية، فتح ملء الشاشة بدون شريط المتصفح، ووصول أسرع للشحنات ونافذة.</p>
          )}
        </div>
      </div>
      {isIos && !deferred ? (
        <button onClick={hide} className="btn-ghost mt-3 w-full">فهمت</button>
      ) : (
        <button onClick={() => void install()} className="btn-primary mt-3 w-full"><Download size={15} /> تثبيت التطبيق</button>
      )}
    </div>
  );
}
