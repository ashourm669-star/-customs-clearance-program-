"use client";

import { useEffect, useState } from "react";
import {
  Activity, ArrowLeftRight, CheckCircle2, CircleDot, Globe2, KeyRound,
  Plane, RefreshCw, Send, ShieldCheck, Ship,
} from "lucide-react";
import { authHeaders, useData, type Row } from "@/components/data-provider";
import { ResourcePage } from "@/components/resource-page";
import { Badge, EmptyState, PageHeader, SectionCard } from "@/components/ui";
import { pageConfigs } from "@/lib/ui-config";
import {
  carrierTypes, eventStatuses, formatDateTime, formatNumber, integrationStates, statusLabel,
} from "@/lib/constants";

const ACTIONS = [
  { value: "acid", label: "تسجيل / اعتماد رقم ACID" },
  { value: "declaration", label: "إرسال البيان الجمركي" },
  { value: "manifest", label: "استلام منيفست من الناقل" },
];

const EXCHANGED_FIELDS = [
  "رقم ACID ورقم البيان الجمركي",
  "رقم بوليصة الشحن B/L أو AWB وبيانات المنيفست",
  "كود الناقل (IATA / SCAC) وكود ربطه بنافذة",
  "كود المنفذ ومكتب الجمارك التابع له",
  "وصف البضاعة، الطرود، الوزن، القيمة والعملة",
  "بيانات المستورد والرقم الضريبي",
  "حالة الطلب والرد الخارجي (مرجع الرد / سبب الرفض)",
];

type IntegrationInfo = {
  mode: "live" | "sandbox";
  nafezaConfigured: boolean;
  carrierConfigured: boolean;
  nafezaUrl: string;
  carrierUrl: string;
  requiredEnv: string[];
  connectedCarriers: number;
  totalCarriers: number;
  shipmentsWithAcid: number;
  totalEvents: number;
  lastEvent: Row | null;
};

export default function NafezaPage() {
  const { data, loading, refresh, update, toast } = useData();
  const [shipmentId, setShipmentId] = useState("");
  const [action, setAction] = useState("declaration");
  const [note, setNote] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [testing, setTesting] = useState<number | null>(null);
  const [info, setInfo] = useState<IntegrationInfo | null>(null);
  const [sending, setSending] = useState(false);

  async function loadInfo() {
    try {
      const res = await fetch("/api/integrations", { headers: authHeaders(), cache: "no-store" });
      if (res.ok) setInfo(await res.json());
    } catch { /* keep previous status */ }
  }

  useEffect(() => { void loadInfo(); }, []);

  const carriers = data?.carriers ?? [];
  const shipments = data?.shipments ?? [];
  const ports = data?.ports ?? [];
  const events = data?.nafezaEvents ?? [];
  const connected = carriers.filter((c: Row) => c.integration === "connected").length;

  async function callIntegration(payload: Record<string, unknown>) {
    const res = await fetch("/api/integrations", {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "تعذر تنفيذ عملية الربط");
    await Promise.all([refresh(), loadInfo()]);
    return json;
  }

  async function syncAll() {
    setSyncing(true);
    try {
      const json = await callIntegration({ action: "sync_all" });
      toast(`تمت مزامنة ${json.processed} ناقل · ${json.accepted} مقبول · ${json.rejected} مرفوض (${json.mode === "live" ? "ربط فعلي" : "محاكاة"})`);
    } catch (error) {
      toast(error instanceof Error ? error.message : "تعذر المزامنة", "error");
    } finally { setSyncing(false); }
  }

  async function testCarrier(carrier: Row) {
    setTesting(Number(carrier.id));
    try {
      const json = await callIntegration({ action: "carrier_test", carrierId: carrier.id });
      toast(json.result.message, json.result.ok ? "success" : "error");
      if (carrier.integration !== "connected" && json.result.ok) {
        await update("carriers", Number(carrier.id), { integration: "connected" });
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : "تعذر اختبار الاتصال", "error");
    } finally { setTesting(null); }
  }

  async function submitEvent() {
    setSending(true);
    try {
      const json = await callIntegration({ action, shipmentId: shipmentId || null, note: note.trim() });
      toast(json.result.message, json.result.ok ? "success" : "error");
      if (json.result.ok) { setNote(""); setShipmentId(""); }
    } catch (error) {
      toast(error instanceof Error ? error.message : "تعذر إرسال الطلب", "error");
    } finally { setSending(false); }
  }

  const lastPayload = info?.lastEvent?.payload ? (() => {
    try { return JSON.parse(info.lastEvent!.payload); } catch { return null; }
  })() : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="مركز التكامل مع منصة نافذة"
        subtitle="ربط النافذة الموحدة لتجارة القاهرة والإسكندرية مع شركات الطيران والخطوط الملاحية والموانئ"
        icon={<Activity size={21} />}
        badge={
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${info?.mode === "live" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
            <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${info?.mode === "live" ? "bg-emerald-500" : "bg-amber-500"}`} />
            {info?.mode === "live" ? "ربط فعلي عبر API" : "وضع المحاكاة المعتمدة"}
          </span>
        }
        actions={<button className="btn-primary" onClick={() => void syncAll()} disabled={syncing}><RefreshCw size={15} className={syncing ? "animate-spin" : ""} /> {syncing ? "جاري المزامنة..." : "مزامنة الناقلين"}</button>}
      />

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(120deg,#071426,#0d3550)] p-6 text-white shadow-lg">
          <div className="pointer-events-none absolute -left-10 -top-16 h-56 w-56 rounded-full bg-teal-400/10 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-teal-300"><ShieldCheck size={16} /> <span className="text-[11px] font-bold">NAFEZA SINGLE WINDOW · CONNECTOR v2.4</span></div>
              <h2 className="mt-3 text-xl font-bold">بوابة التخليص الجمركي الموحدة</h2>
              <p className="mt-2 max-w-lg text-[11px] leading-6 text-white/60">تسجيل أرقام ACID، إرسال البيانات الجمركية، استلام المنيفست من الناقلين ومتابعة الإفراج إلكترونياً، مع حفظ الطلب والرد لكل عملية.</p>
            </div>
            <div className="hidden h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/15 bg-white/5 sm:grid"><Globe2 size={26} className="text-teal-300" /></div>
          </div>
          <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "ناقل متصل", value: connected, icon: Plane },
              { label: "منفذ مرتبط", value: ports.length, icon: Ship },
              { label: "أحداث مسجلة", value: events.length, icon: Activity },
              { label: "شحنات بـ ACID", value: shipments.filter((s: Row) => s.acidNumber).length, icon: CheckCircle2 },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <item.icon size={15} className="text-teal-300" />
                <p className="mt-2 text-xl font-bold">{formatNumber(item.value)}</p>
                <p className="text-[10px] text-white/50">{item.label}</p>
              </div>
            ))}
          </div>
          <p className="relative mt-4 text-[10px] text-white/40">آخر تحديث: {data?.serverTime ? formatDateTime(data.serverTime) : "—"} · {info?.mode === "live" ? "بيئة الإنتاج" : "بيئة تجريبية بدون مفاتيح رسمية"}</p>
        </div>

        <SectionCard title="إرسال عملية إلى نافذة" subtitle="يتم بناء الحمولة والتحقق منها ثم تسجيل الطلب والرد" action={<CircleDot size={16} className="text-teal-500" />}>
          <div className="space-y-3 p-4">
            <label className="block">
              <span className="field-label">نوع العملية</span>
              <select className="field" value={action} onChange={(e) => setAction(e.target.value)}>
                {ACTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="field-label">الشحنة المرتبطة</span>
              <select className="field" value={shipmentId} onChange={(e) => setShipmentId(e.target.value)}>
                <option value="">— اختر شحنة —</option>
                {shipments.map((s: Row) => <option key={s.id} value={s.id}>{s.refNo} · {s.goodsDescription}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="field-label">ملاحظة مُرفقة بالطلب</span>
              <textarea className="field" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="وصف مختصر لما تم إرساله..." />
            </label>
            <button className="btn-primary w-full" onClick={() => void submitEvent()} disabled={sending}><Send size={15} /> {sending ? "جاري الإرسال..." : "إرسال وتسجيل العملية"}</button>
            <p className="text-center text-[10px] text-slate-400">الطلب والرد يُحفظان في جدول nafeza_events داخل قاعدة البيانات</p>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <SectionCard title="إيه اللي بيتبادل بين النظام ونافذة؟" subtitle="محتوى رسالة الربط (Payload) لكل عملية" action={<ArrowLeftRight size={16} className="text-teal-600" />}>
          <div className="grid gap-2 p-4 sm:grid-cols-2">
            {EXCHANGED_FIELDS.map((field, i) => (
              <div key={field} className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-teal-100 text-[10px] font-bold text-teal-700">{i + 1}</span>
                <p className="text-[11px] leading-5 text-slate-600">{field}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 px-4 py-3 text-[10px] leading-6 text-slate-500">
            المسار: النظام ← تحقق من ACID والبوليصة وكود الناقل والمنفذ ← إرسال ← استلام الرد ← تحديث حالة الشحنة ← تسجيل حدث بطلب ورد كاملين.
          </div>
        </SectionCard>

        <SectionCard title="حالة الاتصال والربط" subtitle="التبديل للربط الفعلي يتم تلقائياً عند توفير مفاتيح API" action={<KeyRound size={16} className="text-slate-400" />}>
          <div className="space-y-2 p-4">
            {[
              { label: "منصة نافذة", ok: info?.nafezaConfigured, url: info?.nafezaUrl },
              { label: "بوابة الناقلين", ok: info?.carrierConfigured, url: info?.carrierUrl },
            ].map((item) => (
              <div key={item.label} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-slate-700">{item.label}</p>
                  <p dir="ltr" className="mt-0.5 truncate text-left text-[9px] text-slate-400">{item.url ?? "—"}</p>
                </div>
                <Badge value={item.ok ? "connected" : "manual"} options={[{ value: "connected", label: "مفتاح مُعد" }, { value: "manual", label: "محاكاة" }]} />
              </div>
            ))}
            <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50/60 p-3">
              <p className="text-[11px] font-bold text-amber-800">لتفعيل الربط الحقيقي</p>
              <p className="mt-1 text-[10px] leading-5 text-amber-900/70">أضف متغيرات البيئة على السيرفر: NAFEZA_API_URL وNAFEZA_API_KEY وCARRIER_API_URL وCARRIER_API_KEY. بدونها يعمل النظام في وضع محاكاة معتمدة ويحفظ كل شيء في قاعدة البيانات.</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {["NAFEZA_API_URL", "NAFEZA_API_KEY", "CARRIER_API_URL", "CARRIER_API_KEY"].map((key) => (
                  <span key={key} dir="ltr" className="rounded-md bg-white/70 px-1.5 py-0.5 font-mono text-[9px] text-amber-800">{key}</span>
                ))}
              </div>
            </div>
            {lastPayload && (
              <details className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <summary className="cursor-pointer text-[11px] font-bold text-slate-600">آخر طلب / رد مسجّل ({lastPayload.mode === "live" ? "فعلي" : "محاكاة"})</summary>
                <pre dir="ltr" className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-all text-left text-[9px] leading-4 text-slate-500">{JSON.stringify(lastPayload, null, 2)}</pre>
              </details>
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="حالة ربط الناقلين مع نافذة"
        subtitle="شركات الطيران والخطوط الملاحية — اضغط «اختبار» لإرسال طلب اتصال فعلي/محاكى وتسجيل رده"
        action={<span className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-bold text-teal-700">{formatNumber(connected)} / {formatNumber(carriers.length)} متصل</span>}
      >
        {loading ? (
          <div className="grid gap-2 p-4 sm:grid-cols-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
        ) : carriers.length === 0 ? (
          <EmptyState title="لا يوجد ناقلون مسجلون" description="أضف شركات الطيران والخطوط الملاحية من صفحة الناقلين" />
        ) : (
          <div className="grid max-h-[420px] gap-2 overflow-y-auto p-4 sm:grid-cols-2">
            {carriers.map((carrier: Row) => (
              <div key={carrier.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${carrier.type === "airline" ? "bg-sky-50 text-sky-600" : "bg-indigo-50 text-indigo-600"}`}>
                  {carrier.type === "airline" ? <Plane size={16} /> : <Ship size={16} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-[11px] font-bold text-slate-700">{carrier.name}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">{carrier.code} · {statusLabel(carrierTypes, carrier.type)} · {carrier.nafezaCode || "بدون كود"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge value={carrier.integration} options={integrationStates} />
                  <button className="btn-ghost px-2.5 py-1 text-[10px]" disabled={testing === carrier.id} onClick={() => void testCarrier(carrier)}>
                    {testing === carrier.id ? "..." : "اختبار"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <div className="grid gap-3 sm:grid-cols-3">
        {eventStatuses.slice(0, 3).map((status) => (
          <div key={status.value} className="card flex items-center gap-3 p-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600"><Activity size={18} /></div>
            <div>
              <p className="text-lg font-bold text-[var(--navy)]">{formatNumber(events.filter((e: Row) => e.status === status.value).length)}</p>
              <p className="text-[11px] text-slate-500">أحداث {status.label}</p>
            </div>
          </div>
        ))}
      </div>

      <ResourcePage config={pageConfigs.nafezaEvents} />
    </div>
  );
}
