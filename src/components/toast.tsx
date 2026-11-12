"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";

type ToastTone = "success" | "error" | "info";
type ToastItem = { id: number; title: string; description?: string; tone: ToastTone };

type ToastFn = (toast: { title: string; description?: string; tone?: ToastTone }) => void;

const ToastContext = createContext<ToastFn>(() => {});

const toneStyles: Record<ToastTone, { border: string; icon: ReactNode; bg: string }> = {
  success: {
    border: "border-emerald-200",
    bg: "bg-emerald-50",
    icon: <CheckCircle2 className="size-5 text-emerald-600" />,
  },
  error: {
    border: "border-rose-200",
    bg: "bg-rose-50",
    icon: <XCircle className="size-5 text-rose-600" />,
  },
  info: {
    border: "border-sky-200",
    bg: "bg-sky-50",
    icon: <Info className="size-5 text-sky-600" />,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback<ToastFn>(({ title, description, tone = "success" }) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, title, description, tone }]);
    setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-2">
        {toasts.map((toast) => {
          const style = toneStyles[toast.tone];
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border ${style.border} ${style.bg} p-3 shadow-lg animate-fade-up`}
            >
              <div className="mt-0.5">{style.icon}</div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900">{toast.title}</p>
                {toast.description ? <p className="mt-0.5 text-xs text-slate-600">{toast.description}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
                className="rounded-md p-1 text-slate-400 transition hover:bg-white/70 hover:text-slate-700"
                aria-label="إغلاق"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
