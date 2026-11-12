"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

export type Row = Record<string, any>;
export type DataKey =
  | "clients" | "carriers" | "ports" | "carrierConnections" | "shipments" | "shipmentItems"
  | "tariffItems" | "banks" | "exchangeRates" | "tasks"
  | "documents" | "invoices" | "nafezaEvents" | "users" | "activities";

export type Snapshot = Record<DataKey, Row[]> & {
  currentUser: Row;
  serverTime: string;
};

const DATA_KEYS: DataKey[] = [
  "clients", "carriers", "ports", "carrierConnections", "shipments", "shipmentItems",
  "tariffItems", "banks", "exchangeRates", "tasks",
  "documents", "invoices", "nafezaEvents", "users", "activities",
];

export const TOKEN_KEY = "alarabi_auth_token";

export function getStoredToken(): string | null {
  try { return window.localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function storeToken(token: string) {
  try { window.localStorage.setItem(TOKEN_KEY, token); } catch { /* storage blocked */ }
}

export function clearToken() {
  try { window.localStorage.removeItem(TOKEN_KEY); } catch { /* storage blocked */ }
}

/** Cookie sessions can be blocked in embedded previews; a bearer token always works. */
export function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getStoredToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

function redirectToLogin() {
  clearToken();
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.replace("/login");
  }
}

type ToastItem = { id: number; message: string; type: "success" | "error" | "info" };

type DataContextValue = {
  data: Snapshot | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (resource: DataKey, payload: Row) => Promise<Row | null>;
  update: (resource: DataKey, id: number, patch: Row) => Promise<Row | null>;
  remove: (resource: DataKey, id: number) => Promise<boolean>;
  toast: (message: string, type?: ToastItem["type"]) => void;
  toasts: ToastItem[];
  dismiss: (id: number) => void;
  find: (resource: DataKey, id?: number | string | null) => Row | undefined;
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastItem["type"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, message, type }]);
    setTimeout(() => dismiss(id), 4200);
  }, [dismiss]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/data", { cache: "no-store", headers: authHeaders() });
      if (res.status === 401) {
        setLoading(false);
        redirectToLogin();
        return;
      }
      if (!res.ok) throw new Error("تعذر تحميل البيانات");
      const json = (await res.json()) as Snapshot;
      setData((prev) => {
        if (!prev) return json;
        const merged = { ...json } as Snapshot;
        for (const key of DATA_KEYS) {
          const pending = (prev[key] ?? []).filter(
            (row) => row._pending && !(json[key] ?? []).some((server) => server.id === row.id),
          );
          if (pending.length) merged[key] = [...pending, ...(json[key] ?? [])];
        }
        return merged;
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 60000);
    return () => clearInterval(interval);
  }, [refresh]);

  const create = useCallback(async (resource: DataKey, payload: Row) => {
    const tempId = -Math.floor(Math.random() * 1_000_000_000) - 1;
    const optimistic: Row = {
      ...payload, id: tempId, createdAt: new Date().toISOString(), _pending: true,
    };
    setData((prev) => prev ? { ...prev, [resource]: [optimistic, ...(prev[resource] ?? [])] } : prev);
    try {
      const res = await fetch(`/api/${resource}`, {
        method: "POST", headers: authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.status === 401) { redirectToLogin(); throw new Error("انتهت الجلسة، يرجى تسجيل الدخول"); }
      if (!res.ok) throw new Error(json.error ?? "تعذر حفظ البيانات");
      setData((prev) => prev ? {
        ...prev,
        [resource]: (prev[resource] ?? []).map((row) => row.id === tempId ? json.item : row),
      } : prev);
      toast("تمت الإضافة بنجاح");
      void refresh();
      return json.item as Row;
    } catch (err) {
      setData((prev) => prev ? {
        ...prev, [resource]: (prev[resource] ?? []).filter((row) => row.id !== tempId),
      } : prev);
      toast(err instanceof Error ? err.message : "تعذر حفظ البيانات", "error");
      return null;
    }
  }, [refresh, toast]);

  const update = useCallback(async (resource: DataKey, id: number, patch: Row) => {
    let previous: Row | undefined;
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [resource]: (prev[resource] ?? []).map((row) => {
          if (row.id !== id) return row;
          previous = row;
          return { ...row, ...patch, _pending: true };
        }),
      };
    });
    try {
      const res = await fetch(`/api/${resource}`, {
        method: "PATCH", headers: authHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ id, ...patch }),
      });
      const json = await res.json();
      if (res.status === 401) { redirectToLogin(); throw new Error("انتهت الجلسة، يرجى تسجيل الدخول"); }
      if (!res.ok) throw new Error(json.error ?? "تعذر تحديث البيانات");
      setData((prev) => prev ? {
        ...prev,
        [resource]: (prev[resource] ?? []).map((row) => row.id === id ? json.item : row),
      } : prev);
      toast("تم حفظ التعديلات بنجاح");
      void refresh();
      return json.item as Row;
    } catch (err) {
      if (previous) {
        const backup = previous;
        setData((prev) => prev ? {
          ...prev,
          [resource]: (prev[resource] ?? []).map((row) => row.id === id ? backup : row),
        } : prev);
      }
      toast(err instanceof Error ? err.message : "تعذر تحديث البيانات", "error");
      return null;
    }
  }, [refresh, toast]);

  const remove = useCallback(async (resource: DataKey, id: number) => {
    let backup: { row: Row; index: number } | undefined;
    setData((prev) => {
      if (!prev) return prev;
      const list = prev[resource] ?? [];
      const index = list.findIndex((row) => row.id === id);
      if (index >= 0) backup = { row: list[index], index };
      return { ...prev, [resource]: list.filter((row) => row.id !== id) };
    });
    try {
      const res = await fetch(`/api/${resource}?id=${id}`, { method: "DELETE", headers: authHeaders() });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401) { redirectToLogin(); throw new Error("انتهت الجلسة، يرجى تسجيل الدخول"); }
      if (!res.ok) throw new Error(json.error ?? "تعذر حذف السجل");
      toast("تم حذف السجل بنجاح");
      void refresh();
      return true;
    } catch (err) {
      if (backup) {
        const saved = backup;
        setData((prev) => {
          if (!prev) return prev;
          const list = [...(prev[resource] ?? [])];
          list.splice(Math.min(saved.index, list.length), 0, saved.row);
          return { ...prev, [resource]: list };
        });
      }
      toast(err instanceof Error ? err.message : "تعذر حذف السجل", "error");
      return false;
    }
  }, [refresh, toast]);

  const find = useCallback((resource: DataKey, id?: number | string | null) => {
    if (id === null || id === undefined || id === "") return undefined;
    return data?.[resource]?.find((row) => String(row.id) === String(id));
  }, [data]);

  const value = useMemo<DataContextValue>(() => ({
    data, loading, error, refresh, create, update, remove, toast, toasts, dismiss, find,
  }), [data, loading, error, refresh, create, update, remove, toast, toasts, dismiss, find]);

  return (
    <DataContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-5 left-5 z-[100] flex w-[min(360px,calc(100vw-40px))] flex-col gap-2">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`fade-up pointer-events-auto flex items-start gap-3 rounded-xl border bg-white p-3.5 shadow-xl shadow-slate-900/10 ${
              item.type === "error" ? "border-rose-200" : item.type === "info" ? "border-sky-200" : "border-emerald-200"
            }`}
          >
            {item.type === "error" ? <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-500" />
              : item.type === "info" ? <AlertCircle size={18} className="mt-0.5 shrink-0 text-sky-500" />
                : <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-500" />}
            <p className="flex-1 text-xs font-semibold leading-6 text-slate-700">{item.message}</p>
            <button onClick={() => dismiss(item.id)} className="text-slate-400 hover:text-slate-700" aria-label="إغلاق"><X size={15} /></button>
          </div>
        ))}
      </div>
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used inside DataProvider");
  return context;
}
