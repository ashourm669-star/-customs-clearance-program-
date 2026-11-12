"use client";

import { useMemo } from "react";
import {
  BarChart3, Building2, Download, FileCheck2, Ship, TrendingUp, Wallet,
} from "lucide-react";
import { useData, type Row } from "@/components/data-provider";
import { Badge, EmptyState, PageHeader, SectionCard, StatCard } from "@/components/ui";
import {
  directions, formatMoney, formatNumber, invoiceStatuses, shipmentStatuses,
  statusLabel, transportModes,
} from "@/lib/constants";

export default function ReportsPage() {
  const { data, loading, toast } = useData();
  const shipments = data?.shipments ?? [];
  const clients = data?.clients ?? [];
  const invoices = data?.invoices ?? [];
  const tasks = data?.tasks ?? [];

  const clientReport = useMemo<Row[]>(() => clients.map((client: Row): Row => {
    const related = shipments.filter((s: Row) => String(s.clientId) === String(client.id));
    return {
      ...client,
      shipmentCount: related.length,
      activeCount: related.filter((s: Row) => !["released", "delivered"].includes(s.status)).length,
      value: related.reduce((sum: number, s: Row) => sum + Number(s.cargoValue ?? 0), 0),
    };
  }).sort((a, b) => b.shipmentCount - a.shipmentCount), [clients, shipments]);

  const modeReport = useMemo(() => transportModes.map((mode) => ({
    ...mode,
    count: shipments.filter((s: Row) => s.mode === mode.value).length,
    value: shipments.filter((s: Row) => s.mode === mode.value).reduce((sum: number, s: Row) => sum + Number(s.cargoValue ?? 0), 0),
  })), [shipments]);

  const directionReport = useMemo(() => directions.map((direction) => ({
    ...direction, count: shipments.filter((s: Row) => s.direction === direction.value).length,
  })), [shipments]);

  const revenue = useMemo(() => ({
    total: invoices.reduce((sum: number, i: Row) => sum + Number(i.amount ?? 0) + Number(i.tax ?? 0), 0),
    paid: invoices.filter((i: Row) => i.status === "paid").reduce((sum: number, i: Row) => sum + Number(i.amount ?? 0) + Number(i.tax ?? 0), 0),
    due: invoices.filter((i: Row) => ["pending", "overdue"].includes(i.status)).reduce((sum: number, i: Row) => sum + Number(i.amount ?? 0) + Number(i.tax ?? 0), 0),
  }), [invoices]);

  function exportReport() {
    const header = "العميل,عدد الشحنات,الشحنات النشطة,إجمالي قيمة البضائع";
    const lines = clientReport.map((c) => `"${c.name}",${c.shipmentCount},${c.activeCount},${c.value}`);
    const blob = new Blob(["\uFEFF" + [header, ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `تقرير-العملاء-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast("تم تصدير التقرير بنجاح");
  }

  if (loading) {
    return <div className="space-y-4"><div className="skeleton h-9 w-56" /><div className="grid gap-3 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}</div><div className="skeleton h-80 rounded-2xl" /></div>;
  }

  return (
    <div className="fade-up">
      <PageHeader
        title="التقارير والإحصاءات"
        subtitle="تحليل أداء عمليات التخليص والعملاء والإيرادات بناءً على بيانات النظام الفعلية"
        icon={<BarChart3 size={21} />}
        badge={<span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700">بيانات مباشرة</span>}
        actions={<button className="btn-ghost" onClick={exportReport}><Download size={15} /> تصدير التقرير</button>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="إجمالي قيمة الفواتير" value={formatMoney(revenue.total)} hint={`${formatNumber(invoices.length)} فاتورة`} icon={<Wallet size={19} />} color="violet" />
        <StatCard label="المبالغ المحصلة" value={formatMoney(revenue.paid)} hint="فواتير مدفوعة" icon={<FileCheck2 size={19} />} color="teal" />
        <StatCard label="المبالغ المستحقة" value={formatMoney(revenue.due)} hint="قيد التحصيل" icon={<TrendingUp size={19} />} color="amber" />
        <StatCard label="نسبة إنجاز المهام" value={`${tasks.length ? Math.round(tasks.filter((t: Row) => t.status === "done").length / tasks.length * 100) : 0}٪`} hint={`${formatNumber(tasks.filter((t: Row) => t.status === "done").length)} من ${formatNumber(tasks.length)} مهمة`} icon={<Ship size={19} />} color="blue" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SectionCard title="توزيع الشحنات حسب وسيلة النقل" subtitle="عدد الشحنات وقيمة البضائع لكل وسيلة">
          <div className="space-y-4 p-5">
            {modeReport.map((mode) => {
              const percent = shipments.length ? mode.count / shipments.length * 100 : 0;
              return (
                <div key={mode.value}>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-700">{mode.label}</span>
                    <span className="text-slate-500">{formatNumber(mode.count)} شحنة · {formatMoney(mode.value, "EGP")}</span>
                  </div>
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-l from-teal-500 to-sky-500" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="حالات الشحنات" subtitle="عدد الملفات في كل مرحلة من مراحل التخليص">
          <div className="grid grid-cols-2 gap-2 p-4">
            {shipmentStatuses.map((status) => {
              const count = shipments.filter((s: Row) => s.status === status.value).length;
              return (
                <div key={status.value} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <span className="text-[11px] font-semibold text-slate-600">{status.label}</span>
                  <span className="text-sm font-bold text-[var(--navy)]">{formatNumber(count)}</span>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <SectionCard title="أداء العملاء" subtitle="ترتيب العملاء حسب عدد الشحنات وحجم الأعمال">
          {clientReport.length === 0 ? <EmptyState title="لا توجد بيانات عملاء" /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-right">
                <thead><tr className="bg-slate-50/80 text-[10px] font-bold text-slate-500">
                  <th className="px-4 py-3">العميل</th><th className="px-4 py-3">الشحنات</th>
                  <th className="px-4 py-3">النشطة</th><th className="px-4 py-3">قيمة البضائع</th><th className="px-4 py-3">الحالة</th>
                </tr></thead>
                <tbody>
                  {clientReport.map((client) => (
                    <tr key={client.id} className="table-row-hover border-t border-slate-100">
                      <td className="px-4 py-3"><div className="flex items-center gap-2"><Building2 size={14} className="text-slate-400" /><span className="text-[11px] font-semibold text-slate-700">{client.name}</span></div></td>
                      <td className="px-4 py-3 text-[11px] font-bold text-slate-700">{formatNumber(client.shipmentCount)}</td>
                      <td className="px-4 py-3 text-[11px] text-amber-600">{formatNumber(client.activeCount)}</td>
                      <td className="px-4 py-3 text-[11px] text-slate-600">{formatMoney(client.value)}</td>
                      <td className="px-4 py-3"><Badge value={client.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <div className="grid gap-4">
          <SectionCard title="حركة الاستيراد والتصدير" subtitle="توزيع الاتجاهات">
            <div className="space-y-3 p-4">
              {directionReport.map((item) => (
                <div key={item.value} className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
                  <span className="text-[11px] font-semibold text-slate-600">{statusLabel(directions, item.value)}</span>
                  <span className="rounded-lg bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">{formatNumber(item.count)}</span>
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="حالة الفواتير" subtitle="ملخص التحصيل المالي">
            <div className="space-y-3 p-4">
              {invoiceStatuses.map((status) => {
                const count = invoices.filter((i: Row) => i.status === status.value).length;
                return (
                  <div key={status.value} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 p-3">
                    <Badge value={status.value} options={invoiceStatuses} />
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">{formatMoney(invoices.filter((i: Row) => i.status === status.value).reduce((sum: number, i: Row) => sum + Number(i.amount ?? 0), 0))}</span>
                      <span className="text-[10px] text-slate-400">({formatNumber(count)})</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
