"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Activity, ArrowLeft, CheckCircle2, CircleAlert, ClipboardList, Clock3,
  FileCheck2, Globe2, Plane, Plus, Ship, TrendingUp, Wallet,
} from "lucide-react";
import { useData, type Row } from "@/components/data-provider";
import { FxStrip, useFx } from "@/components/fx-strip";
import { Badge, EmptyState, PageHeader, SectionCard, StatCard, TableSkeleton } from "@/components/ui";
import {
  eventStatuses, formatDate, formatMoney, formatNumber, shipmentStatuses,
  statusLabel, taskStatuses, transportModes,
} from "@/lib/constants";

const monthLabels = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

export default function DashboardPage() {
  const { data, loading, update, toast } = useData();
  const fx = useFx();
  const shipments = data?.shipments ?? [];
  const clients = data?.clients ?? [];
  const carriers = data?.carriers ?? [];
  const ports = data?.ports ?? [];
  const tasks = data?.tasks ?? [];
  const invoices = data?.invoices ?? [];
  const events = data?.nafezaEvents ?? [];
  const activities = data?.activities ?? [];

  const stats = useMemo(() => {
    const active = shipments.filter((s: Row) => !["released", "delivered"].includes(String(s.status)));
    const released = shipments.filter((s: Row) => ["released", "delivered"].includes(String(s.status)));
    const due = invoices.filter((i: Row) => ["pending", "overdue"].includes(String(i.status)));
    return {
      total: shipments.length,
      active: active.length,
      released: released.length,
      dueCount: due.length,
      dueValue: due.reduce((sum: number, i: Row) => sum + Number(i.amount ?? 0) + Number(i.tax ?? 0), 0),
      connected: carriers.filter((c: Row) => c.integration === "connected").length,
    };
  }, [shipments, invoices, carriers]);

  const statusDistribution = useMemo(() =>
    shipmentStatuses.map((option) => ({
      ...option,
      count: shipments.filter((s: Row) => s.status === option.value).length,
    })).sort((a, b) => b.count - a.count),
  [shipments]);

  const monthly = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const count = shipments.filter((s: Row) => {
        const created = new Date(s.createdAt);
        return created.getFullYear() === d.getFullYear() && created.getMonth() === d.getMonth();
      }).length;
      return { label: monthLabels[d.getMonth()], count };
    });
  }, [shipments]);

  const modes = useMemo(() => transportModes.map((mode) => ({
    ...mode, count: shipments.filter((s: Row) => s.mode === mode.value).length,
  })), [shipments]);

  const greeting = new Date().getHours() < 12 ? "صباح الخير" : new Date().getHours() < 18 ? "مساء الخير" : "مساء الخير";

  if (loading) {
    return (
      <div>
        <div className="skeleton mb-6 h-9 w-64" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-32 rounded-2xl" />)}
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="skeleton h-72 rounded-2xl" /><div className="skeleton h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="fade-up">
      <PageHeader
        title={`${greeting}، ${data?.currentUser?.name?.split(" ")[0] ?? "أهلاً بك"}`}
        subtitle={`ملخص عمليات التخليص الجمركي اليوم ${new Date().toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`}
        icon={<TrendingUp size={21} />}
        badge={<span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> النظام متصل بنافذة</span>}
        actions={
          <>
            <Link href="/reports" className="btn-ghost"><TrendingUp size={15} /> التقارير</Link>
            <Link href="/shipments" className="btn-primary"><Plus size={16} /> شحنة جديدة</Link>
          </>
        }
      />

      <div className="mb-4"><FxStrip fx={fx} /></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="إجمالي الشحنات" value={formatNumber(stats.total)} hint={`${formatNumber(clients.length)} عميل · ${formatNumber(ports.length)} منفذ`} icon={<Ship size={19} />} color="blue" />
        <StatCard label="شحنات قيد التخليص" value={formatNumber(stats.active)} hint="تتطلب متابعة يومية" icon={<Clock3 size={19} />} color="amber" progress={stats.total ? Math.round(stats.active / stats.total * 100) : 0} />
        <StatCard label="تم الإفراج والتسليم" value={formatNumber(stats.released)} hint="خلال الدورة الحالية" icon={<FileCheck2 size={19} />} color="teal" progress={stats.total ? Math.round(stats.released / stats.total * 100) : 0} />
        <StatCard label="فواتير مستحقة" value={formatMoney(stats.dueValue)} hint={`${formatNumber(stats.dueCount)} فاتورة قيد التحصيل`} icon={<Wallet size={19} />} color="violet" />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <SectionCard title="توزيع الشحنات حسب الحالة" subtitle="نظرة سريعة على مراحل التخليص الجاري" action={<Link href="/shipments" className="text-[11px] font-bold text-teal-700 hover:underline">عرض الكل <ArrowLeft size={12} className="inline" /></Link>}>
          <div className="space-y-3.5 p-5">
            {statusDistribution.map((item) => {
              const percent = stats.total ? Math.round(item.count / stats.total * 100) : 0;
              return (
                <div key={item.value}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-600">{item.label}</span>
                    <span className="text-[11px] font-bold text-slate-500">{formatNumber(item.count)} <span className="text-slate-300">· {percent}٪</span></span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${item.value === "delayed" ? "bg-rose-500" : item.value === "released" || item.value === "delivered" ? "bg-emerald-500" : "bg-gradient-to-l from-teal-500 to-sky-500"}`} style={{ width: `${Math.max(percent, item.count ? 4 : 0)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <div className="grid gap-4">
          <SectionCard title="حركة الشحنات" subtitle="آخر ٦ أشهر">
            <div className="flex h-40 items-end justify-between gap-2 px-5 pb-5 pt-4">
              {monthly.map((item, index) => {
                const max = Math.max(1, ...monthly.map((m) => m.count));
                return (
                  <div key={index} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500">{formatNumber(item.count)}</span>
                    <div className="w-full rounded-t-lg bg-gradient-to-t from-teal-600 to-teal-300 transition-all" style={{ height: `${Math.max(8, item.count / max * 95)}px` }} />
                    <span className="text-[9px] text-slate-400">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </SectionCard>
          <SectionCard title="وسائل النقل" subtitle={`${formatNumber(stats.connected)} ناقل متصل عبر API`}>
            <div className="grid grid-cols-3 gap-2 p-4">
              {modes.map((mode) => (
                <div key={mode.value} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-center">
                  <p className="text-lg font-bold text-[var(--navy)]">{formatNumber(mode.count)}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">{mode.label}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        <SectionCard title="أحدث الشحنات" subtitle="آخر الملفات المسجلة في النظام" action={<Link href="/shipments" className="text-[11px] font-bold text-teal-700 hover:underline">كل الشحنات <ArrowLeft size={12} className="inline" /></Link>}>
          {shipments.length === 0 ? (
            <EmptyState title="لا توجد شحنات بعد" description="ابدأ بإضافة أول شحنة لتظهر هنا" actionLabel="إضافة شحنة" onAction={() => { window.location.href = "/shipments"; }} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-right">
                <thead><tr className="bg-slate-50/80 text-[10px] font-bold text-slate-500">
                  <th className="px-4 py-2.5">رقم الشحنة</th><th className="px-4 py-2.5">العميل</th>
                  <th className="px-4 py-2.5">البضاعة</th><th className="px-4 py-2.5">الوصول</th><th className="px-4 py-2.5">الحالة</th>
                </tr></thead>
                <tbody>
                  {shipments.slice(0, 6).map((s: Row) => (
                    <tr key={s.id} className="table-row-hover border-t border-slate-100">
                      <td className="px-4 py-3 font-mono text-[11px] font-semibold text-teal-700">{s.refNo}</td>
                      <td className="px-4 py-3 text-[11px] text-slate-600">{clients.find((c: Row) => c.id === s.clientId)?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-[11px] text-slate-600">{s.goodsDescription}</td>
                      <td className="px-4 py-3 text-[11px] text-slate-500">{formatDate(s.eta)}</td>
                      <td className="px-4 py-3"><Badge value={s.status} options={shipmentStatuses} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard title="مهام تحتاج متابعة" subtitle="اضغط على الدائرة لإكمال المهمة" action={<Link href="/tasks" className="text-[11px] font-bold text-teal-700 hover:underline">كل المهام <ArrowLeft size={12} className="inline" /></Link>}>
          {tasks.filter((t: Row) => t.status !== "done").length === 0 ? (
            <EmptyState title="رائع! لا توجد مهام معلقة" description="تم إنجاز كل المهام الحالية" />
          ) : (
            <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {tasks.filter((t: Row) => t.status !== "done").slice(0, 6).map((task: Row) => (
                <div key={task.id} className="flex items-start gap-3 px-4 py-3">
                  <button
                    onClick={async () => {
                      const result = await update("tasks", Number(task.id), { status: "done" });
                      if (result) toast("تم إنجاز المهمة");
                    }}
                    className="mt-0.5 text-slate-300 transition-colors hover:text-emerald-500" title="إكمال المهمة"
                  ><CheckCircle2 size={17} /></button>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-[11px] font-semibold text-slate-700">{task.title}</p>
                    <p className="mt-1 text-[10px] text-slate-400">{statusLabel(taskStatuses, task.status)} · {task.assignee || "غير محدد"} · {formatDate(task.dueDate)}</p>
                  </div>
                  {task.priority === "urgent" && <CircleAlert size={14} className="shrink-0 text-rose-500" />}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SectionCard title="آخر أحداث منصة نافذة" subtitle="التكامل مع النافذة الموحدة والناقلين" action={<Link href="/nafeza" className="text-[11px] font-bold text-teal-700 hover:underline">مركز التكامل <ArrowLeft size={12} className="inline" /></Link>}>
          {events.length === 0 ? <EmptyState title="لا توجد أحداث" /> : (
            <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
              {events.slice(0, 6).map((event: Row) => (
                <div key={event.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-600"><Activity size={15} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-[11px] font-semibold text-slate-700">{event.message}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">{event.channel} · {event.reference} · {formatDate(event.createdAt)}</p>
                  </div>
                  <Badge value={event.status} options={eventStatuses} />
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="سجل النشاط" subtitle="آخر التعديلات التي أجراها الفريق" action={<span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">{formatNumber(activities.length)} حدث</span>}>
          {activities.length === 0 ? <EmptyState title="لا يوجد نشاط بعد" /> : (
            <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
              {activities.slice(0, 6).map((activity: Row) => (
                <div key={activity.id} className="flex items-start gap-3 px-4 py-3">
                  <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${activity.action === "delete" ? "bg-rose-400" : activity.action === "create" ? "bg-emerald-400" : "bg-sky-400"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-slate-700">{activity.description}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">{activity.actor} · {formatDate(activity.createdAt)}</p>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">{activity.entityLabel}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {[
          { icon: Plane, label: "شركات الطيران والخطوط", value: carriers.length, hint: "مرتبطة بمنصة نافذة", href: "/carriers" },
          { icon: Globe2, label: "الموانئ والمنافذ", value: ports.length, hint: "تغطية جمركية كاملة", href: "/ports" },
          { icon: ClipboardList, label: "ملفات التخليص النشطة", value: stats.active, hint: "بما فيها الفحص والسداد", href: "/shipments" },
        ].map((item) => (
          <Link key={item.label} href={item.href} className="card flex items-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-600"><item.icon size={18} /></div>
            <div className="flex-1">
              <p className="text-lg font-bold text-[var(--navy)]">{formatNumber(item.value)}</p>
              <p className="text-[11px] font-semibold text-slate-600">{item.label}</p>
              <p className="text-[10px] text-slate-400">{item.hint}</p>
            </div>
            <ArrowLeft size={15} className="text-slate-300" />
          </Link>
        ))}
      </div>

      {shipments.length === 0 && <div className="mt-4"><TableSkeleton rows={2} /></div>}
    </div>
  );
}
