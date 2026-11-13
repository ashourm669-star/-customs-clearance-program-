"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Database,
  DownloadCloud,
  FileQuestion,
  ExternalLink,
  Globe2,
  KeyRound,
  MapPin,
  Plane,
  Radar,
  Search,
  Ship,
  Truck,
} from "lucide-react";
import { Badge, EmptyState, Spinner, cx } from "@/components/ui";
import { useToast } from "@/components/toast";
import { MODE_META, SHIPMENT_STATUS_META, type ShipmentStatus } from "@/lib/constants";
import { formatDate, formatDateTime, relativeTime } from "@/lib/format";
import { TRACKING_PORTALS, detectTrackingNumber, type TrackingDetection } from "@/lib/carrier-directory";

type TrackingMatch = {
  id: number;
  reference: string;
  blNumber: string | null;
  clientName: string | null;
  carrierName: string | null;
  mode: string;
  status: string;
  origin: string | null;
  destination: string | null;
  port: string | null;
  vesselFlight: string | null;
  eta: string | null;
  arrivedAt: string | null;
  createdAt: string;
};

type LiveEvent = {
  title: string;
  description: string | null;
  location: string | null;
  occurredAt: string;
  source: "dcsa" | "provider";
};

type LiveResult = {
  status: "ok" | "unconfigured" | "unauthorized" | "not_found" | "error";
  provider: string | null;
  kind: string;
  httpStatus: number | null;
  message: string;
  events: LiveEvent[];
  raw: unknown;
  fetchedAt: string;
};

type Outcome = {
  query: string;
  local: TrackingMatch[];
  live: LiveResult;
  detection: TrackingDetection;
  importedShipmentId: number | null;
  providerStatus: { kind: string; ready: boolean; missing: string[]; provider: string | null; airCargoReady?: boolean; dhlReady?: boolean; maritimeReady?: boolean };
};

const EXAMPLES = ["MAEU-8841203", "EK-AWB-3329901", "CMDU-7733910", "CLR-2026-1001"];

const statusTone: Record<LiveResult["status"], { tone: "emerald" | "amber" | "rose" | "slate"; label: string }> = {
  ok: { tone: "emerald", label: "بيانات حقيقية" },
  unconfigured: { tone: "amber", label: "غير مربوط" },
  unauthorized: { tone: "rose", label: "صلاحية مرفوضة" },
  not_found: { tone: "slate", label: "لا يوجد لدى المزوّد" },
  error: { tone: "rose", label: "خطأ اتصال" },
};

export function TrackingClient({
  providerConfigured,
  carriers,
}: {
  userName: string;
  providerConfigured: boolean;
  carriers: { id: number; name: string; status: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [carrierHint, setCarrierHint] = useState("");
  const lastAutoQuery = useRef("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function runSearch(term?: string) {
    const value = (term ?? query).trim();
    if (value.length < 3) {
      setError("أدخل ٣ أحرف على الأقل.");
      return;
    }
    setQuery(value);
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const response = await fetch(`/api/tracking?q=${encodeURIComponent(value)}${carrierHint ? `&carrier=${encodeURIComponent(carrierHint)}` : ""}`, { cache: "no-store" });
      const data = (await response.json()) as Outcome & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "تعذّر البحث.");
      setOutcome(data);
    } catch (caught) {
      setOutcome(null);
      setError(caught instanceof Error ? caught.message : "تعذّر البحث.");
    } finally {
      setLoading(false);
    }
  }

  async function importData() {
    if (!outcome) return;
    setImporting(true);
    try {
      const response = await fetch("/api/tracking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", query: outcome.query, carrier: carrierHint }),
      });
      const data = (await response.json()) as {
        result?: { ok: boolean; message: string; shipmentId: number | null; reference: string | null };
        error?: string;
      };
      if (!response.ok || !data.result) throw new Error(data.error ?? "تعذّر الاستيراد.");
      toast({ title: data.result.ok ? "تم الاستيراد إلى قاعدة البيانات" : "لم يتم الاستيراد", description: data.result.message, tone: data.result.ok ? "success" : "error" });
      if (data.result.shipmentId) {
        router.refresh();
        await runSearch(outcome.query);
      }
    } catch (caught) {
      toast({ title: "تعذّر الاستيراد", description: caught instanceof Error ? caught.message : undefined, tone: "error" });
    } finally {
      setImporting(false);
    }
  }

  const detection = detectTrackingNumber(query, carrierHint);
  const detectedPortal = detection.portal;

  useEffect(() => {
    const value = query.trim();
    const current = detectTrackingNumber(value, carrierHint);
    if (!current.ready || value.length < 8) return;
    const key = `${current.normalized}|${carrierHint}`;
    if (lastAutoQuery.current === key) return;
    const timer = window.setTimeout(() => {
      lastAutoQuery.current = key;
      void runSearch(value);
    }, 950);
    return () => window.clearTimeout(timer);
  }, [query, carrierHint]);

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl bg-[linear-gradient(120deg,#0a2239,#0f3d5c_55%,#0b6a63)] p-5 text-white sm:p-7">
        <div className="pointer-events-none absolute -left-14 -top-16 size-56 rounded-full bg-[#0f9d8b]/25 blur-2xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-emerald-200 ring-1 ring-inset ring-white/15">
            <Radar className="size-3.5" /> ملفاتك + بوابات التتبع الرسمية
          </span>
          <h1 className="mt-2 text-xl font-extrabold sm:text-2xl">استعلم برقم البوليصة / AWB</h1>
          <p className="mt-1 max-w-2xl text-[12px] leading-6 text-slate-200/90">
            يبحث في ملفات الشركة. الربط داخل النظام ببيانات الناقل الحقيقية يعمل فقط عند إضافة مفاتيح API مصرح بها.
            بدونها تظهر روابط بوابات التتبع الفعلية أدناه لتفتحها بنفسك؛ لن نعرض بيانات شحنة مختلقة.
          </p>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void runSearch();
            }}
            className="mt-4 flex flex-col gap-2 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => { setQuery(event.target.value); setSearched(false); setOutcome(null); }}
                placeholder="مثال: 020-12345678 أو MSCU1234567 أو 1Z..."
                className="input h-11 bg-white/95 pr-9 text-sm text-slate-900"
                dir="ltr"
              />
            </div>
            <select value={carrierHint} onChange={(event) => { setCarrierHint(event.target.value); setOutcome(null); }} className="input h-11 bg-white/95 text-xs text-slate-700 sm:w-40" aria-label="شركة الطرود إن كان رقمها لا يكشف الناقل">
              <option value="">تحديد تلقائي</option>
              <option value="DHL">DHL</option>
              <option value="FDX">FedEx</option>
              <option value="UPS">UPS</option>
              <option value="ARX">Aramex</option>
            </select>
            <button type="submit" disabled={loading} className="btn btn-mint h-11 px-5">
              {loading ? <Spinner /> : <Search className="size-4" />}
              استعلام
            </button>
          </form>
          {query.trim().length >= 3 && (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-[11px] text-white">
              <Radar className="size-4 shrink-0 text-emerald-200" />
              <span className="flex-1">{detection.message} {detection.ready ? (loading ? "جاري الاستعلام…" : "سيبدأ البحث تلقائياً عند توقف الكتابة.") : "أكمل الرقم أو اضغط استعلام."}</span>
              {detectedPortal && <a href={detectedPortal.url} target="_blank" rel="noopener noreferrer" className="font-bold text-emerald-200 underline">موقع الناقل ↗</a>}
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-slate-300">أرقام تجريبية مسجّلة في ملفاتك:</span>
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => void runSearch(example)}
                className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[9px] text-slate-200 ring-1 ring-inset ring-white/15 hover:bg-white/20"
                dir="ltr"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card flex items-center gap-3 p-4">
          <span className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Globe2 className="size-4" />
          </span>
          <div>
            <p className="text-[10px] text-slate-500">مزوّد التتبع الخارجي</p>
            <p className="text-sm font-extrabold text-slate-900">
              {providerConfigured ? "API مُعدّ — تحقق من الرد عند البحث" : "لا توجد مفاتيح API"}
            </p>
            <p className="text-[9px] text-slate-400">
              {providerConfigured ? "فقط نتيجة بحث ناجحة تثبت الاتصال" : "يمكن فتح مواقع الناقلين أدناه"}
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <span className="flex size-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <Database className="size-4" />
          </span>
          <div>
            <p className="text-[10px] text-slate-500">قاعدة بياناتك</p>
            <p className="text-sm font-extrabold text-slate-900">بحث مباشر وفوري</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Ship className="size-4" />
          </span>
          <div>
            <p className="text-[10px] text-slate-500">شركات مسجّلة</p>
            <p className="text-sm font-extrabold text-slate-900">
              {carriers.length} ناقلاً مسجلاً (ليس بالضرورة متصلاً)
            </p>
          </div>
        </div>
      </div>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">بوابات التتبع الأصلية للشركات</h2>
            <p className="text-[10px] text-slate-500">روابط تفتح موقع الناقل الحقيقي؛ لا تعني وجود اتصال API داخل البرنامج.</p>
          </div>
          {detectedPortal && <span className="rounded-full bg-teal-50 px-2 py-1 text-[10px] font-bold text-teal-800">البادئة تطابق: {detectedPortal.name}</span>}
        </div>
        <div className="grid max-h-72 gap-2 overflow-y-auto p-3 sm:grid-cols-2 xl:grid-cols-3">
          {TRACKING_PORTALS.map((portal) => (
            <a key={portal.code} href={portal.url} target="_blank" rel="noopener noreferrer"
              className={`flex items-start gap-2 rounded-xl border p-3 transition-colors hover:border-teal-300 hover:bg-teal-50/40 ${detectedPortal?.code === portal.code ? "border-teal-300 bg-teal-50" : "border-slate-100"}`}>
              <ExternalLink className="mt-0.5 size-4 shrink-0 text-teal-600" />
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-bold text-slate-800">{portal.name}</span>
                <span className="block text-[10px] text-slate-500">{portal.prefix ? `بادئة AWB: ${portal.prefix} · ` : ""}{portal.note ?? "يفتح صفحة الناقل للتتبع"}</span>
              </span>
            </a>
          ))}
        </div>
      </section>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="card divide-y divide-slate-100">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4 p-5">
              <div className="skeleton size-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3 w-1/3" />
                <div className="skeleton h-2.5 w-1/2" />
              </div>
              <div className="skeleton h-6 w-24 rounded-full" />
            </div>
          ))}
        </div>
      ) : null}

      {!loading && !searched ? (
        <div className="card">
          <EmptyState
            title="أدخل رقم البوليصة في الأعلى"
            description="سنبحث في ملفاتك أولاً، ثم نستعلم واجهة الشركة إن كانت مفاتيحها مضبوطة، ونعرض لك الحركات الحقيقية مع إمكانية استيرادها."
            icon={<Radar className="size-7" />}
          />
        </div>
      ) : null}

      {!loading && outcome ? (
        <>
          <section className="card overflow-hidden">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Globe2 className="size-4 text-indigo-500" />
                <h2 className="text-sm font-bold text-slate-900">نتيجة الاستعلام الخارجي</h2>
                <Badge tone={statusTone[outcome.live.status].tone}>{statusTone[outcome.live.status].label}</Badge>
                {outcome.live.httpStatus ? (
                  <span className="font-mono text-[10px] text-slate-400" dir="ltr">
                    HTTP {outcome.live.httpStatus}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {outcome.live.provider ? (
                  <span className="font-mono text-[10px] text-slate-500" dir="ltr">
                    {outcome.live.provider}
                  </span>
                ) : null}
                {outcome.live.status === "ok" && outcome.live.events.length ? (
                  <button type="button" onClick={importData} disabled={importing} className="btn btn-primary h-8 px-3 text-[10px]">
                    {importing ? <Spinner /> : <DownloadCloud className="size-3.5" />}
                    استيراد إلى قاعدة البيانات
                  </button>
                ) : null}
              </div>
            </header>

            <div className="p-5">
              <div
                className={cx(
                  "flex items-start gap-2 rounded-xl p-3 text-[11px] leading-6 ring-1 ring-inset",
                  outcome.live.status === "ok"
                    ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                    : outcome.live.status === "not_found"
                      ? "bg-slate-50 text-slate-700 ring-slate-200"
                      : "bg-amber-50 text-amber-800 ring-amber-200",
                )}
              >
                {outcome.live.status === "ok" ? (
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                ) : outcome.live.status === "not_found" ? (
                  <FileQuestion className="mt-0.5 size-4 shrink-0" />
                ) : (
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                )}
                <div>
                  <p className="font-bold">{outcome.live.message}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    وقت الاستعلام: {formatDateTime(outcome.live.fetchedAt)} · النوع: {outcome.live.kind.toUpperCase()}
                  </p>
                </div>
              </div>

              {outcome.live.events.length ? (
                <ol className="mt-4 space-y-3 border-r border-dashed border-slate-200 pr-5">
                  {outcome.live.events.map((event, index) => (
                    <li key={`${event.title}-${event.occurredAt}-${index}`} className="relative">
                      <span className="absolute -right-[27px] top-1.5 size-3 rounded-full bg-indigo-500 ring-4 ring-white" />
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-bold text-slate-900">{event.title}</p>
                        <Badge tone="indigo">{event.source === "dcsa" ? "DCSA" : "مزوّد"}</Badge>
                        <span className="text-[10px] text-slate-400">{relativeTime(event.occurredAt)}</span>
                      </div>
                      {event.description ? (
                        <p className="mt-0.5 text-[11px] leading-5 text-slate-600">{event.description}</p>
                      ) : null}
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                        {event.location ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3" /> {event.location}
                          </span>
                        ) : null}
                        <span dir="ltr">{formatDateTime(event.occurredAt)}</span>
                      </p>
                    </li>
                  ))}
                </ol>
              ) : null}

              {outcome.live.status === "unconfigured" ? (
                <div className="mt-3 rounded-xl bg-slate-50 p-3 text-[10px] leading-6 text-slate-600 ring-1 ring-inset ring-slate-200">
                  <p className="flex items-center gap-1.5 font-extrabold text-slate-800">
                    <KeyRound className="size-3.5" />
                    كيف تجعل الاستعلام حقيقياً (بدون تعديل كود)
                  </p>
                   <div className="mt-1.5 space-y-2">
                     <p>أضف المفاتيح في Vercel ← مشروعك ← Settings ← Environment Variables ثم أعد النشر. لا ترسل مفاتيحك داخل المحادثة.</p>
                     <div>
                       <p className="font-bold text-slate-700">AWB الجوي وشركات الطرود المدعومة:</p>
                       <pre className="mt-1 overflow-x-auto rounded-md bg-slate-900 p-2 text-[9px] leading-5 text-emerald-300" dir="ltr">TRACKINGMORE_API_KEY=your_licensed_key</pre>
                       <a href="https://www.trackingmore.com/docs/trackingmore" target="_blank" rel="noopener noreferrer" className="font-bold text-teal-700 underline">وثائق TrackingMore v4 ↗</a>
                       <p>استعلام AWB قد يخصم رصيداً من حساب المزوّد؛ البحث الآلي يبدأ فقط بعد اكتمال الرقم.</p>
                     </div>
                     <div>
                       <p className="font-bold text-slate-700">لوفتهانزا مباشرة من Open API الرسمي (بادئة 020):</p>
                       <pre className="mt-1 overflow-x-auto rounded-md bg-slate-900 p-2 text-[9px] leading-5 text-emerald-300" dir="ltr">LUFTHANSA_CLIENT_ID=your_approved_id{"\n"}LUFTHANSA_CLIENT_SECRET=your_approved_secret</pre>
                       <a href="https://developer.lufthansa.com/docs/read/api_basics/Getting_Started" target="_blank" rel="noopener noreferrer" className="font-bold text-teal-700 underline">وثائق OAuth الرسمية ↗</a>
                     </div>
                     <div>
                       <p className="font-bold text-slate-700">إير فرانس / KLM (057 / 074):</p>
                       <pre className="mt-1 overflow-x-auto rounded-md bg-slate-900 p-2 text-[9px] leading-5 text-emerald-300" dir="ltr">AFKL_CARGO_TOKEN=your_approved_cargo_token</pre>
                       <p>الوصول إلى Cargo Tracking API يتطلب موافقة من AFKL؛ مصر للطيران تحتاج مزوّد AWB معتمداً إن لم يتوفر API مباشر.</p>
                     </div>
                     <div>
                       <p className="font-bold text-slate-700">DHL Express مباشرة من واجهتها الرسمية:</p>
                       <pre className="mt-1 overflow-x-auto rounded-md bg-slate-900 p-2 text-[9px] leading-5 text-emerald-300" dir="ltr">DHL_API_KEY=your_DHL_subscription_key</pre>
                       <a href="https://developer.dhl.com/tracking" target="_blank" rel="noopener noreferrer" className="font-bold text-teal-700 underline">وثائق DHL Shipment Tracking ↗</a>
                     </div>
                     <div>
                       <p className="font-bold text-slate-700">البحرية عبر ناقل يمنحك DCSA OAuth أو مزوّد API مصرح:</p>
                       <p>أدخل DCSA_BASE_URL وDCSA_TOKEN_URL وDCSA_CLIENT_ID وDCSA_CLIENT_SECRET الصادرة لك رسمياً، أو TRACKING_API_URL وTRACKING_API_KEY لمزوّدك. لا تستخدم روابط تجريبية غير موثقة.</p>
                     </div>
                     <p>باقي الشركات لها بوابات تتبع حقيقية أدناه، لكن فتح الموقع لا يزوّد برنامجك تلقائياً ببيانات دون صلاحية API.</p>
                   </div>
                </div>
              ) : null}

              {outcome.live.raw && outcome.live.status === "ok" ? (
                <details className="mt-3">
                  <summary className="cursor-pointer text-[10px] font-bold text-slate-500">عرض الاستجابة الخام (JSON)</summary>
                  <pre className="scroll-thin mt-2 max-h-56 overflow-auto rounded-xl bg-slate-900 p-3 text-[9px] leading-5 text-emerald-300" dir="ltr">
                    {JSON.stringify(outcome.live.raw, null, 2)}
                  </pre>
                </details>
              ) : null}
            </div>
          </section>

          <section className="card overflow-hidden">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Database className="size-4 text-[#0f9d8b]" />
                <h2 className="text-sm font-bold text-slate-900">ملفاتك المرتبطة بالرقم</h2>
                <Badge tone={outcome.local.length ? "emerald" : "slate"}>{outcome.local.length} نتيجة</Badge>
              </div>
              <span className="font-mono text-[10px] text-slate-400" dir="ltr">
                q = {outcome.query}
              </span>
            </header>

            {outcome.local.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <FileQuestion className="mx-auto size-8 text-slate-300" />
                <p className="mt-2 text-sm font-bold text-slate-900">لا يوجد ملف محلي بهذا الرقم</p>
                <p className="mx-auto mt-1 max-w-md text-[11px] leading-5 text-slate-500">
                  {outcome.live.status === "ok"
                    ? "البيانات الحقيقية متاحة بالأعلى — اضغط «استيراد إلى قاعدة البيانات» ليُنشأ ملف تخليص تلقائياً."
                    : "إن لم يكن الرقم لدى المزوّد أيضاً، يمكنك إنشاء ملف يدوياً بهذا الرقم ومتابعته."}
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Link href={`/shipments?new=1&bl=${encodeURIComponent(outcome.query)}`} className="btn btn-primary">
                    إنشاء ملف تخليص بهذا الرقم
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard?.writeText(outcome.query);
                      toast({ title: "تم نسخ الرقم", tone: "success" });
                    }}
                    className="btn btn-ghost"
                  >
                    <Copy className="size-4" /> نسخ
                  </button>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {outcome.local.map((match) => {
                  const meta = SHIPMENT_STATUS_META[match.status as ShipmentStatus] ?? SHIPMENT_STATUS_META.draft;
                  return (
                    <li key={match.id}>
                      <Link href={`/shipments/${match.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3.5 transition hover:bg-slate-50">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                          {match.mode === "air" ? <Plane className="size-4" /> : match.mode === "land" ? <Truck className="size-4" /> : <Ship className="size-4" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-extrabold text-slate-900" dir="ltr">
                              {match.blNumber ?? match.reference}
                            </p>
                            <Badge tone={meta.tone} dot={meta.dot}>
                              {meta.label}
                            </Badge>
                          </div>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {match.reference} · {match.carrierName ?? "بدون شركة"} · {match.clientName ?? "بدون عميل"}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {match.vesselFlight ?? "—"} · {match.origin ?? "—"} ← {match.destination ?? "—"} ·{" "}
                            {MODE_META[match.mode as keyof typeof MODE_META]?.label}
                          </p>
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] text-slate-400">الوصول المتوقع</p>
                          <p className="text-[11px] font-bold text-slate-700">{formatDate(match.eta)}</p>
                        </div>
                        <ArrowLeft className="size-4 text-slate-300" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
