"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle, CheckCircle2, Database, FileSearch, KeyRound, Plus,
  Search, Ship, ShieldCheck,
} from "lucide-react";
import { authHeaders, useData, type Row } from "@/components/data-provider";
import { Badge, EmptyState, PageHeader, SectionCard } from "@/components/ui";
import { formatDate, formatMoney, shipmentStatuses } from "@/lib/constants";

type LookupResult = {
  found: boolean;
  source: "local" | "carrier" | "official" | "none";
  mode: string;
  message: string;
  hint?: string;
  results?: Row[];
  carrierData?: Row;
  normalized?: Row;
  trackingUrl?: string | null;
  carrier?: { code: string; name: string; type: string } | null;
  provider?: string;
  error?: string;
};

export default function LookupPage() {
  const { data, create, refresh, toast } = useData();
  const [number, setNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [carrierConfigured, setCarrierConfigured] = useState<boolean | null>(null);
  const [clientId, setClientId] = useState("");
  const [goods, setGoods] = useState("");
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    fetch("/api/integrations", { headers: authHeaders(), cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((json) => { if (json) setCarrierConfigured(Boolean(json.carrierConfigured)); })
      .catch(() => null);
  }, []);

  async function lookup(value?: string) {
    const documentNumber = (value ?? number).trim();
    if (documentNumber.length < 3) { toast("أدخل رقم بوليصة أو AWB صحيح", "error"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/lookup", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ documentNumber }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "تعذر الاستعلام");
      setResult(json);
      await refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "تعذر الاستعلام", "error");
    } finally { setLoading(false); }
  }

  async function register() {
    if (!clientId || !goods.trim()) { toast("اختر العميل وأدخل وصف البضاعة", "error"); return; }
    setRegistering(true);
    const created = await create("shipments", {
      clientId: Number(clientId),
      goodsDescription: goods.trim(),
      transportRef: number.trim(),
      direction: "import",
      mode: "sea",
      status: "new",
      currency: "EGP",
      notes: "ملف مسجّل من شاشة الاستعلام برقم بوليصة لم يكن موجوداً بقاعدة البيانات",
    });
    setRegistering(false);
    if (created) {
      setClientId(""); setGoods("");
      toast("تم تسجيل ملف الشحنة برقم البوليصة، جاري إعادة الاستعلام");
      await lookup(number.trim());
    }
  }

  const lookupEvents = (data?.nafezaEvents ?? []).filter((e: Row) => e.channel === "استعلام بوليصة / AWB").slice(0, 6);

  return (
    <div className="space-y-5 fade-up">
      <PageHeader
        title="الاستعلام عن بوليصة شحن / AWB"
        subtitle="بحث حقيقي في ملفات الشركة المحفوظة، مع استعلام مباشر من الناقل عند تفعيل مفاتيح الربط"
        icon={<FileSearch size={21} />}
        badge={<span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700">بدون نتائج وهمية</span>}
        actions={<Link href="/shipments" className="btn-ghost"><Ship size={15} /> كل الشحنات</Link>}
      />

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <div className="card p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-teal-50 text-teal-600"><Search size={21} /></div>
            <div>
              <h2 className="text-sm font-bold text-[var(--navy)]">ابحث برقم المستند</h2>
              <p className="mt-0.5 text-[11px] text-slate-500">بوليصة شحن بحرية B/L، بوليصة جوية AWB، رقم ACID أو رقم البيان الجمركي</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              dir="ltr"
              className="field flex-1 text-left"
              placeholder="مثال: MSCU8821403 أو 077-88901425"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void lookup(); }}
            />
            <button className="btn-primary" onClick={() => void lookup()} disabled={loading}>
              {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Search size={16} />}
              {loading ? "جاري البحث..." : "استعلام"}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-[10px] text-slate-400">أرقام تجريبية جاهزة:</span>
            {["MSCU8821403", "077-88901425", "ACID-2026-8841201"].map((sample) => (
              <button key={sample} onClick={() => { setNumber(sample); void lookup(sample); }} dir="ltr" className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[10px] text-slate-600 hover:bg-teal-50 hover:text-teal-700">{sample}</button>
            ))}
          </div>

          {result && (
            <div className="mt-5 border-t border-slate-100 pt-5">
              {result.found && result.source === "local" ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] font-bold text-emerald-800">
                    <CheckCircle2 size={16} /> {result.message}
                  </div>
                  {result.results?.map((shipment) => (
                    <div key={shipment.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p dir="ltr" className="text-left font-mono text-xs font-bold text-teal-700">{shipment.refNo}</p>
                        <Badge value={shipment.status} options={shipmentStatuses} />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {[
                          { label: "رقم البوليصة / AWB", value: shipment.transportRef, mono: true },
                          { label: "العميل", value: shipment.clientName },
                          { label: "الناقل", value: shipment.carrierName },
                          { label: "المنفذ", value: shipment.portName },
                          { label: "وصف البضاعة", value: shipment.goodsDescription },
                          { label: "رقم ACID", value: shipment.acidNumber, mono: true },
                          { label: "البيان الجمركي", value: shipment.declarationNumber },
                          { label: "تاريخ الوصول", value: formatDate(shipment.eta) },
                          { label: "قيمة البضاعة", value: formatMoney(shipment.cargoValue, shipment.currency) },
                          { label: "المستندات / المهام", value: `${shipment.documentsCount} مستند · ${shipment.tasksCount} مهمة` },
                        ].map((item) => (
                          <div key={item.label} className="rounded-lg bg-slate-50 p-2.5">
                            <p className="text-[9px] text-slate-400">{item.label}</p>
                            <p dir={item.mono ? "ltr" : undefined} className={`mt-0.5 line-clamp-2 text-[11px] font-semibold text-slate-700 ${item.mono ? "text-left font-mono" : ""}`}>{item.value || "—"}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : result.found && result.source === "carrier" ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] font-bold text-emerald-800">
                    <span className="flex items-center gap-2"><CheckCircle2 size={16} /> {result.message}</span>
                    {result.trackingUrl && (
                      <a href={result.trackingUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100">صفحة الناقل الرسمية ↗</a>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {[
                      { label: "الناقل", value: result.carrier?.name },
                      { label: "نوع المستند", value: result.normalized?.documentType },
                      { label: "الحالة لدى الناقل", value: result.normalized?.status },
                      { label: "جهة الشحن", value: result.normalized?.origin },
                      { label: "جهة الوصول", value: result.normalized?.destination },
                      { label: "الوصول المتوقع", value: result.normalized?.eta },
                      { label: "السفينة / الرحلة", value: result.normalized?.vessel },
                      { label: "رقم الحاوية", value: result.normalized?.containerNumber },
                      { label: "عدد الأحداث", value: result.normalized?.eventsCount },
                    ].map((item) => (
                      <div key={item.label} className="rounded-lg bg-slate-50 p-2.5">
                        <p className="text-[9px] text-slate-400">{item.label}</p>
                        <p className="mt-0.5 line-clamp-2 text-[11px] font-semibold text-slate-700">{item.value ?? "—"}</p>
                      </div>
                    ))}
                  </div>
                  {result.normalized?.latestEvent && (
                    <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-3 text-[11px] text-teal-800">آخر حدث: {result.normalized.latestEvent}</div>
                  )}
                  <details className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <summary className="cursor-pointer text-[11px] font-bold text-slate-600">الرد الخام من API الناقل</summary>
                    <pre dir="ltr" className="mt-2 max-h-64 overflow-auto rounded-lg bg-slate-900 p-3 text-left text-[10px] leading-5 text-teal-200">{JSON.stringify(result.carrierData, null, 2)}</pre>
                  </details>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-600" />
                    <div>
                      <p className="text-[11px] font-bold text-amber-800">{result.message}</p>
                      <p className="mt-1 text-[10px] leading-5 text-amber-900/70">{result.hint ?? "لم يتم العثور على بيانات لدى الناقل."}</p>
                    </div>
                  </div>
                  {(result.trackingUrl || result.carrier) && (
                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-sky-800">{result.carrier ? `الناقل المُكتشف: ${result.carrier.name} (${result.carrier.code})` : "الاستعلام الخارجي"}</p>
                        <p className="mt-0.5 text-[10px] text-sky-900/70">البيانات الحقيقية موجودة على موقع الناقل، أو فعّل مفتاح API لجلبها داخل البرنامج.</p>
                      </div>
                      {result.trackingUrl && (
                        <a href={result.trackingUrl} target="_blank" rel="noreferrer" className="btn-ghost border-sky-200 bg-white text-sky-700">فتح تتبع الناقل ↗</a>
                      )}
                      <Link href="/connections" className="btn-primary">إعداد الربط</Link>
                    </div>
                  )}
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="mb-3 flex items-center gap-2 text-[11px] font-bold text-slate-700"><Plus size={14} className="text-teal-600" /> تسجيل ملف شحنة بهذا الرقم</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <select className="field" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                        <option value="">— اختر العميل —</option>
                        {(data?.clients ?? []).map((client: Row) => <option key={client.id} value={client.id}>{client.name}</option>)}
                      </select>
                      <input className="field" placeholder="وصف البضاعة" value={goods} onChange={(e) => setGoods(e.target.value)} />
                    </div>
                    <button className="btn-primary mt-3" onClick={() => void register()} disabled={registering}>
                      {registering ? "جاري التسجيل..." : "تسجيل الشحنة وربط البوليصة"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid gap-4">
          <SectionCard title="مصادر البحث" subtitle="إيه اللي البرنامج بيدوّر فيه فعلياً؟" action={<ShieldCheck size={16} className="text-teal-600" />}>
            <div className="space-y-2 p-4">
              {[
                { icon: Database, label: "قاعدة بيانات الشركة", detail: "بحث فوري في حقل transportRef وACID والبيان الجمركي ورقم الشحنة", state: "مفعّل", ok: true },
                { icon: KeyRound, label: "بوابة الناقلين / نافذة", detail: "استعلام HTTPS حقيقي عند توفير CARRIER_API_URL وCARRIER_API_KEY", state: carrierConfigured ? "مفعّل" : "غير مفعّل", ok: Boolean(carrierConfigured) },
                { icon: FileSearch, label: "بيانات مُولّدة عشوائياً", detail: "النظام لا يختلق أي بوليصة أو بيانات شحنة غير موجودة", state: "غير مستخدم", ok: false },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-600"><item.icon size={16} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-bold text-slate-700">{item.label}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${item.ok ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{item.state}</span>
                    </div>
                    <p className="mt-1 text-[10px] leading-5 text-slate-500">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="سجل الاستعلامات" subtitle="كل محاولة بحث تُسجّل في قاعدة البيانات" action={<span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">{lookupEvents.length}</span>}>
            {lookupEvents.length === 0 ? (
              <EmptyState title="لا توجد استعلامات بعد" description="ابحث برقم بوليصة وسيظهر السجل هنا" />
            ) : (
              <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
                {lookupEvents.map((event: Row) => (
                  <div key={event.id} className="flex items-start gap-2 px-4 py-3">
                    <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${event.status === "accepted" ? "bg-emerald-500" : "bg-amber-500"}`} />
                    <div className="min-w-0 flex-1">
                      <p dir="ltr" className="truncate text-left font-mono text-[10px] font-bold text-slate-600">{event.reference}</p>
                      <p className="mt-0.5 line-clamp-2 text-[10px] text-slate-500">{event.message}</p>
                      <p className="mt-0.5 text-[9px] text-slate-400">{formatDate(event.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
