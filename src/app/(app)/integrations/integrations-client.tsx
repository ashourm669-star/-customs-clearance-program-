"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Globe2,
  History,
  Plane,
  PlugZap,
  RefreshCw,
  Send,
  Ship,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Badge, EmptyState, Field, PageHeader, Spinner, cx } from "@/components/ui";
import { useToast } from "@/components/toast";
import { SHIPMENT_STATUS_META, type ShipmentStatus } from "@/lib/constants";
import { formatDateTime, formatNumber, relativeTime } from "@/lib/format";
import type { CarrierRow, LogItem } from "@/lib/types";

type ShipmentOption = {
  id: number;
  reference: string;
  clientName: string | null;
  status: string;
  carrierName: string | null;
};

const KIND_META: Record<string, { label: string; tone: "sky" | "indigo" | "teal" | "slate" }> = {
  carrier_sync: { label: "مزامنة شركة شحن", tone: "sky" },
  nafeza_declaration: { label: "إقرار نافذة", tone: "indigo" },
  tracking: { label: "تتبع شحنة", tone: "teal" },
};

export function IntegrationsClient({
  initialCarriers,
  initialLogs,
  shipments,
  userName,
}: {
  initialCarriers: CarrierRow[];
  initialLogs: LogItem[];
  shipments: ShipmentOption[];
  userName: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [carriers, setCarriers] = useState(initialCarriers);
  const [logs, setLogs] = useState(initialLogs);
  const [busyAll, setBusyAll] = useState(false);
  const [busyCarrier, setBusyCarrier] = useState<number | null>(null);
  const [busyNafeza, setBusyNafeza] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<string>(shipments[0]?.id ? String(shipments[0].id) : "");
  const [statusFilter, setStatusFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");

  const nafeza = carriers.find((carrier) => carrier.type === "platform");
  const shippingCarriers = carriers.filter((carrier) => carrier.type !== "platform");
  const connected = shippingCarriers.filter((carrier) => carrier.integrationStatus === "connected").length;
  const errors = logs.filter((log) => log.status === "error").length;
  const successRate = logs.length ? Math.round((logs.filter((log) => log.status === "success").length / logs.length) * 100) : 100;

  const filteredLogs = useMemo(
    () =>
      logs.filter((log) => {
        const matchesStatus = statusFilter === "all" || log.status === statusFilter;
        const matchesKind = kindFilter === "all" || log.kind === kindFilter;
        return matchesStatus && matchesKind;
      }),
    [logs, statusFilter, kindFilter],
  );

  async function runAll() {
    setBusyAll(true);
    try {
      const response = await fetch("/api/integrations/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "all" }),
      });
      const data = (await response.json()) as {
        result?: { message: string; level: string };
        logs?: LogItem[];
        error?: string;
      };
      if (!response.ok || !data.result) throw new Error(data.error ?? "");
      if (data.logs) setLogs(data.logs);
      toast({
        title: data.result.level === "success" ? "تمت مزامنة كل الشركات" : "تمت المزامنة مع تحذيرات",
        description: data.result.message,
        tone: data.result.level === "success" ? "success" : "info",
      });
      router.refresh();
    } catch {
      toast({ title: "تعذّرت المزامنة الشاملة", tone: "error" });
    } finally {
      setBusyAll(false);
    }
  }

  async function runCarrier(carrier: CarrierRow) {
    setBusyCarrier(carrier.id);
    try {
      const response = await fetch("/api/integrations/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "carrier", carrierId: carrier.id }),
      });
      const data = (await response.json()) as { result?: { message: string; level: string }; logs?: LogItem[] };
      if (data.logs) setLogs(data.logs);
      if (!data.result) throw new Error();
      toast({
        title: data.result.level === "success" ? `تمت المزامنة — ${carrier.name}` : "المزامنة لم تكتمل",
        description: data.result.message,
        tone: data.result.level === "error" ? "error" : data.result.level === "warning" ? "info" : "success",
      });
      router.refresh();
    } catch {
      toast({ title: "تعذّرت المزامنة", description: carrier.name, tone: "error" });
    } finally {
      setBusyCarrier(null);
    }
  }

  async function submitDeclaration() {
    if (!selectedShipment) {
      toast({ title: "اختر ملف تخليص أولاً", tone: "error" });
      return;
    }
    setBusyNafeza(true);
    try {
      const response = await fetch("/api/integrations/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "nafeza", shipmentId: Number(selectedShipment) }),
      });
      const data = (await response.json()) as { result?: { message: string; level: string }; logs?: LogItem[]; error?: string };
      if (data.logs) setLogs(data.logs);
      if (!response.ok || !data.result) throw new Error(data.error ?? "");
      toast({ title: "نافذة: تم قبول الإقرار", description: data.result.message, tone: "success" });
      router.refresh();
    } catch {
      toast({ title: "تعذّر إرسال الإقرار إلى نافذة", tone: "error" });
    } finally {
      setBusyNafeza(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="الربط والتكامل — نافذة وشركات الشحن"
        description="مزامنة البوالص والإقرارات الجمركية ومتابعة الشحنات لحظياً من واجهات شركات الطيران والخطوط الملاحية."
      >
        <button type="button" onClick={runAll} disabled={busyAll} className="btn btn-primary">
          {busyAll ? <Spinner /> : <RefreshCw className="size-4" />}
          مزامنة كل الشركات
        </button>
      </PageHeader>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card flex items-center gap-3 p-4">
          <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <PlugZap className="size-5" />
          </span>
          <div>
            <p className="text-[10px] text-slate-500">شركات متصلة</p>
            <p className="text-lg font-extrabold text-slate-900">
              {formatNumber(connected)} <span className="text-xs font-semibold text-slate-400">/ {shippingCarriers.length}</span>
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Globe2 className="size-5" />
          </span>
          <div>
            <p className="text-[10px] text-slate-500">حالة منصة نافذة</p>
            <p className="text-sm font-extrabold text-slate-900">{nafeza?.integrationStatus === "connected" ? "متصل · API v2" : "غير متصل"}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <span className="flex size-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <Activity className="size-5" />
          </span>
          <div>
            <p className="text-[10px] text-slate-500">معدل نجاح العمليات</p>
            <p className="text-lg font-extrabold text-slate-900">{successRate}%</p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <span className="flex size-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <AlertTriangle className="size-5" />
          </span>
          <div>
            <p className="text-[10px] text-slate-500">أخطاء تحتاج مراجعة</p>
            <p className="text-lg font-extrabold text-slate-900">{formatNumber(errors)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className="relative overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#0a2239,#123c5e)] p-5 text-white xl:col-span-2">
          <div className="pointer-events-none absolute -left-10 -top-16 size-56 rounded-full bg-[#0f9d8b]/25 blur-2xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-bold text-emerald-300 ring-1 ring-inset ring-emerald-400/30">
                <ShieldCheck className="size-3.5" /> الشباك الواحد للتجارة الدولية
              </span>
              <h2 className="mt-2 text-xl font-extrabold">منصة نافذة — إقرارات ACID</h2>
              <p className="mt-1 max-w-lg text-[11px] leading-6 text-slate-200/90">
                إرسال الإقرارات الجمركية المبدئية، ربط بوليصة الشحن برقم ACID، ومتابعة منظومة ACI مباشرة من ملف التخليص.
              </p>
              <p className="mt-2 inline-block rounded-lg bg-white/10 px-2 py-1 font-mono text-[9px] text-slate-300" dir="ltr">
                {nafeza?.apiEndpoint ?? "https://api.nafeza.gov.eg/v2"}
              </p>
            </div>
            <Badge tone="emerald" dot="#34d399">
              {nafeza?.lastSyncAt ? `آخر مزامنة ${relativeTime(nafeza.lastSyncAt)}` : "متصل"}
            </Badge>
          </div>

          <div className="relative mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field label="اختر ملف التخليص لإرسال الإقرار">
              <select
                className="input bg-white/95 text-slate-900"
                value={selectedShipment}
                onChange={(event) => setSelectedShipment(event.target.value)}
              >
                <option value="">— اختر ملفاً —</option>
                {shipments.map((shipment) => (
                  <option key={shipment.id} value={shipment.id}>
                    {shipment.reference} — {shipment.clientName ?? "بدون عميل"}
                  </option>
                ))}
              </select>
            </Field>
            <button type="button" onClick={submitDeclaration} disabled={busyNafeza} className="btn btn-mint h-10">
              {busyNafeza ? <Spinner /> : <Send className="size-4" />}
              إرسال الإقرار
            </button>
          </div>
          <p className="relative mt-2 text-[10px] text-slate-300">
            يُسجَّل الإقرار في نافذة باسم {userName} ويُحدَّث حالة الملف إلى «قيد المراجعة» تلقائياً.
          </p>
        </section>

        <section className="card overflow-hidden">
          <header className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-bold text-slate-900">شركات الشحن المربوطة</h2>
            <p className="text-[11px] text-slate-500">اضغط مزامنة لجلب البوالص الجديدة</p>
          </header>
          <div className="scroll-thin max-h-[420px] divide-y divide-slate-100 overflow-y-auto">
            {shippingCarriers.map((carrier) => (
              <div key={carrier.id} className="flex items-center gap-2.5 px-4 py-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: carrier.color }}>
                  {carrier.type === "airline" ? <Plane className="size-3.5" /> : <Ship className="size-3.5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-bold text-slate-900">{carrier.name}</p>
                  <p className="text-[9px] text-slate-500">
                    {carrier.lastSyncAt ? relativeTime(carrier.lastSyncAt) : "لم تتم المزامنة"} · {formatNumber(carrier.shipmentsSynced)} بوليصة
                  </p>
                </div>
                <span
                  className={cx(
                    "size-2 shrink-0 rounded-full",
                    carrier.integrationStatus === "connected" ? "bg-emerald-500" : carrier.integrationStatus === "pending" ? "bg-amber-500" : "bg-rose-500",
                  )}
                />
                <button
                  type="button"
                  onClick={() => runCarrier(carrier)}
                  disabled={busyCarrier === carrier.id}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-[#0f9d8b]"
                  aria-label={`مزامنة ${carrier.name}`}
                >
                  {busyCarrier === carrier.id ? <Spinner /> : <RefreshCw className="size-3.5" />}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card mt-5 overflow-hidden">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
              <History className="size-4 text-slate-400" /> سجل عمليات التكامل
            </h2>
            <p className="text-[11px] text-slate-500">كل مزامنة وإقرار وتتبع مسجّل بالتفصيل</p>
          </div>
          <div className="flex flex-wrap gap-1">
            {[
              { key: "all", label: "الكل" },
              { key: "success", label: "ناجحة" },
              { key: "warning", label: "تحذير" },
              { key: "error", label: "أخطاء" },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setStatusFilter(option.key)}
                className={cx(
                  "rounded-full px-2.5 py-1 text-[10px] font-bold transition",
                  statusFilter === option.key ? "bg-[#0a2239] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                {option.label}
              </button>
            ))}
            <select
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600"
              value={kindFilter}
              onChange={(event) => setKindFilter(event.target.value)}
            >
              <option value="all">كل الأنواع</option>
              <option value="carrier_sync">مزامنة شركة</option>
              <option value="nafeza_declaration">إقرار نافذة</option>
              <option value="tracking">تتبع شحنة</option>
            </select>
          </div>
        </header>

        {filteredLogs.length === 0 ? (
          <EmptyState title="لا توجد عمليات مسجّلة" description="ابدأ بمزامنة إحدى الشركات أو إرسال إقرار إلى نافذة." icon={<PlugZap className="size-7" />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="th">النوع</th>
                  <th className="th">الجهة</th>
                  <th className="th">التفاصيل</th>
                  <th className="th">المرجع</th>
                  <th className="th">التوقيت</th>
                  <th className="th">النتيجة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const kind = KIND_META[log.kind] ?? { label: log.kind, tone: "slate" as const };
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60">
                      <td className="td">
                        <Badge tone={kind.tone}>{kind.label}</Badge>
                      </td>
                      <td className="td text-[11px] font-semibold text-slate-700">{log.carrierName ?? "منصة نافذة"}</td>
                      <td className="td max-w-sm text-[11px] leading-5 text-slate-600">{log.message}</td>
                      <td className="td font-mono text-[10px] text-slate-500" dir="ltr">
                        {log.reference ?? "—"}
                      </td>
                      <td className="td text-[10px] text-slate-500">
                        {relativeTime(log.createdAt)}
                        <span className="mt-0.5 block text-[9px] text-slate-400">{formatDateTime(log.createdAt)}</span>
                      </td>
                      <td className="td">
                        <span className="flex items-center gap-1 text-[11px] font-bold">
                          {log.status === "success" ? (
                            <CheckCircle2 className="size-3.5 text-emerald-500" />
                          ) : log.status === "warning" ? (
                            <AlertTriangle className="size-3.5 text-amber-500" />
                          ) : (
                            <XCircle className="size-3.5 text-rose-500" />
                          )}
                          <span className={log.status === "success" ? "text-emerald-600" : log.status === "warning" ? "text-amber-600" : "text-rose-600"}>
                            {log.status === "success" ? "ناجحة" : log.status === "warning" ? "تحذير" : "فشل"}
                          </span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-[11px] text-slate-500">
        <span>
          الملفات المرتبطة بحالات نشطة:{" "}
          <span className="font-bold text-slate-800">
            {formatNumber(shipments.filter((item) => !["delivered", "released"].includes(item.status)).length)}
          </span>
        </span>
        <Link href="/shipments" className="font-bold text-[#0f9d8b] hover:underline">
          إدارة ملفات التخليص ←
        </Link>
      </div>
    </div>
  );
}
