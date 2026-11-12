"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { authHeaders } from "@/components/data-provider";
import type { RateMap } from "@/lib/customs";

export function useFx() {
  const [rates, setRates] = useState<RateMap>({ EGP: 1 });
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [warning, setWarning] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/fx${refresh ? "?refresh=1" : ""}`, { headers: authHeaders(), cache: "no-store" });
      const json = await res.json();
      if (json.rates) setRates({ EGP: 1, ...json.rates });
      setFetchedAt(json.fetchedAt ?? null);
      setSource(json.source ?? "");
      setWarning(json.warning ?? "");
    } catch {
      setWarning("تعذر تحديث أسعار الصرف");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(true); }, [load]);
  return { rates, fetchedAt, source, warning, loading, reload: () => load(true) };
}

export function FxStrip({ fx }: { fx: ReturnType<typeof useFx> }) {
  const codes = ["USD", "EUR", "GBP", "CNY", "SAR", "AED"];
  return (
    <div className="card flex flex-wrap items-center gap-2 px-3 py-2.5">
      <span className="text-[11px] font-bold text-slate-600">أسعار الصرف / EGP</span>
      {codes.map((code) => (
        <span key={code} className="rounded-lg bg-slate-50 px-2 py-1 font-mono text-[10px] text-slate-600">
          {code} <strong className="text-[var(--navy)]">{fx.rates[code] ? fx.rates[code].toLocaleString("en-US", { maximumFractionDigits: 3 }) : "—"}</strong>
        </span>
      ))}
      <button className="btn-ghost ms-auto px-2 py-1 text-[10px]" onClick={fx.reload} disabled={fx.loading}>
        <RefreshCw size={12} className={fx.loading ? "animate-spin" : ""} /> تحديث فوري
      </button>
      <span className="w-full text-[10px] text-slate-400">{fx.warning || `المصدر: ${fx.source || "—"} · ${fx.fetchedAt ? new Date(fx.fetchedAt).toLocaleString("ar-EG") : ""}`}</span>
    </div>
  );
}
