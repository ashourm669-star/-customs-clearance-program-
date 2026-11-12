import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Banknote,
  CalendarClock,
  FileWarning,
  PackageSearch,
  Plane,
  PlugZap,
  Plus,
  Ship,
  Timer,
  TrendingUp,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/queries";
import { Badge, EmptyState, Progress, SectionCard, StatCard, Avatar } from "@/components/ui";
import { BarChart, Donut } from "@/components/charts";
import {
  DIRECTION_META,
  EVENT_TYPE_META,
  INVOICE_STATUS_META,
  MODE_META,
  SHIPMENT_STATUS_META,
  type ShipmentStatus,
} from "@/lib/constants";
import { formatDate, formatMoney, formatNumber, relativeTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const ACTIVE_STATUSES: ShipmentStatus[] = ["documents_pending", "under_review", "customs_clearance", "on_hold"];

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboardData();
  const { shipments, invoices, carriers, documents, events, logs, clientsCount } = data;

  const active = shipments.filter((item) => ACTIVE_STATUSES.includes(item.status as ShipmentStatus));
  const needsAction = active
    .filter((item) => item.status === "on_hold" || item.status === "documents_pending" || item.pendingDocs > 0)
    .slice(0, 5);
  const onHold = shipments.filter((item) => item.status === "on_hold").length;
  const pendingDocs = documents.filter((item) => item.status === "pending").length;
  const receivables = invoices
    .filter((invoice) => invoice.status !== "paid" && invoice.status !== "draft")
    .reduce((sum, invoice) => sum + (invoice.total - invoice.paidAmount), 0);
  const collected = invoices.reduce((sum, invoice) => sum + invoice.paidAmount, 0);
  const clearedThisMonth = shipments.filter((item) => {
    if (!item.releasedAt) return false;
    const date = new Date(item.releasedAt);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;
  const delayed = shipments.filter(
    (item) =>
      item.eta &&
      new Date(item.eta) < new Date() &&
      !["released", "delivered"].includes(item.status),
  ).length;

  const statusSlices = (Object.keys(SHIPMENT_STATUS_META) as ShipmentStatus[])
    .map((status) => ({
      label: SHIPMENT_STATUS_META[status].label,
      value: shipments.filter((item) => item.status === status).length,
      color: SHIPMENT_STATUS_META[status].dot,
    }))
    .filter((slice) => slice.value > 0);

  const monthFormatter = new Intl.DateTimeFormat("ar-EG-u-nu-latn", { month: "short" });
  const months = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - index));
    const label = monthFormatter.format(date);
    const created = shipments.filter((item) => {
      const value = new Date(item.createdAt);
      return value.getMonth() === date.getMonth() && value.getFullYear() === date.getFullYear();
    }).length;
    const released = shipments.filter((item) => {
      if (!item.releasedAt) return false;
      const value = new Date(item.releasedAt);
      return value.getMonth() === date.getMonth() && value.getFullYear() === date.getFullYear();
    }).length;
    return { label, value: created, secondary: released };
  });

  const connectedCarriers = carriers.filter((carrier) => carrier.type !== "platform");
  const shipmentById = new Map(shipments.map((shipment) => [shipment.id, shipment]));
  const topInvoices = [...invoices]
    .filter((invoice) => invoice.status !== "paid")
    .sort((a, b) => b.total - b.paidAmount - (a.total - a.paidAmount))
    .slice(0, 4);

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl bg-[linear-gradient(120deg,#0a2239,#0e3a55_55%,#0b6a63)] p-5 text-white shadow-lg sm:p-7">
        <div className="pointer-events-none absolute -left-16 -top-20 size-64 rounded-full bg-[#c9a227]/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 size-72 rounded-full bg-[#0f9d8b]/25 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-emerald-200 ring-1 ring-inset ring-white/15">
              <span className="size-1.5 rounded-full bg-emerald-300" />
              نافذة متصلة · 11 شركة شحن
            </p>
            <h1 className="mt-3 text-2xl font-extrabold sm:text-[28px]">
              أهلاً {user.name.split(" ")[0]}، يومك مليء بالإفراجات 🚢
            </h1>
            <p className="mt-1.5 max-w-xl text-sm leading-7 text-slate-200/90">
              لديك <span className="font-bold text-white">{active.length}</span> ملف تخليص قيد التنفيذ،{" "}
              <span className="font-bold text-amber-200">{needsAction.length}</span> ملف يحتاج إجراءً اليوم، و
              <span className="font-bold text-rose-200"> {delayed}</span> شحنة تجاوزت موعد الوصول المتوقع.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/shipments?new=1" className="btn btn-mint h-10 text-xs">
                <Plus className="size-4" /> ملف تخليص جديد
              </Link>
              <Link
                href="/integrations"
                className="btn h-10 border border-white/20 bg-white/10 text-xs text-white hover:bg-white/20"
              >
                <PlugZap className="size-4" /> مزامنة الشركات ونافذة
              </Link>
              <Link
                href="/reports"
                className="btn h-10 border border-white/20 bg-white/10 text-xs text-white hover:bg-white/20"
              >
                <TrendingUp className="size-4" /> التقارير
              </Link>
            </div>
          </div>
          <div className="grid w-full max-w-xs grid-cols-2 gap-2.5">
            {[
              { label: "ملفات نشطة", value: formatNumber(active.length), icon: <PackageSearch className="size-4" /> },
              { label: "أُفرج هذا الشهر", value: formatNumber(clearedThisMonth), icon: <BadgeCheck className="size-4" /> },
              { label: "مستندات معلّقة", value: formatNumber(pendingDocs), icon: <FileWarning className="size-4" /> },
              { label: "عملاء", value: formatNumber(clientsCount), icon: <Ship className="size-4" /> },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/12 bg-white/[0.07] p-3 backdrop-blur-sm">
                <span className="flex size-8 items-center justify-center rounded-lg bg-white/10 text-[#7ee0cf]">
                  {item.icon}
                </span>
                <p className="mt-2 text-lg font-extrabold">{item.value}</p>
                <p className="text-[10px] text-slate-200/80">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="ملفات قيد التخليص"
          value={formatNumber(active.length)}
          hint={`${onHold} ملف معلّق`}
          icon={<PackageSearch className="size-5" />}
          accent="#0ea5e9"
          trend={{ value: `${formatNumber(shipments.length)} إجمالي`, positive: true }}
        />
        <StatCard
          label="مستحقات لدى العملاء"
          value={formatMoney(receivables)}
          hint="فواتير غير محصّلة"
          icon={<Banknote className="size-5" />}
          accent="#f59e0b"
          trend={{ value: `${formatNumber(invoices.filter((i) => i.status === "overdue").length)} متأخرة`, positive: false }}
        />
        <StatCard
          label="إجمالي المحصّل"
          value={formatMoney(collected)}
          hint="من الفواتير المسددة"
          icon={<BadgeCheck className="size-5" />}
          accent="#10b981"
          trend={{ value: "تحصيل مباشر", positive: true }}
        />
        <StatCard
          label="شحنات متأخرة"
          value={formatNumber(delayed)}
          hint="تجاوزت ETA ولم تُفرج"
          icon={<Timer className="size-5" />}
          accent="#f43f5e"
          trend={{ value: `${formatNumber(pendingDocs)} مستند معلّق`, positive: false }}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-3">
        <SectionCard
          className="xl:col-span-2"
          title="ملفات تحتاج إجراءً اليوم"
          description="شحنات معلّقة أو ناقصة المستندات — راجعها قبل نهاية اليوم"
          action={
            <Link href="/shipments" className="text-xs font-bold text-[#0f9d8b] hover:underline">
              كل الملفات ←
            </Link>
          }
          bodyClassName="divide-y divide-slate-100"
        >
          {needsAction.length === 0 ? (
            <EmptyState
              title="لا توجد ملفات معلّقة 🎉"
              description="كل ملفات التخليص الحالية مستوفاة ولا تحتاج إجراءً إضافياً."
              icon={<BadgeCheck className="size-7 text-emerald-500" />}
            />
          ) : (
            needsAction.map((shipment) => {
              const meta = SHIPMENT_STATUS_META[shipment.status as ShipmentStatus];
              return (
                <Link
                  key={shipment.id}
                  href={`/shipments/${shipment.id}`}
                  className="flex flex-wrap items-center gap-3 px-5 py-3.5 transition hover:bg-slate-50/80"
                >
                  <span className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-base">
                    {MODE_META[shipment.mode as keyof typeof MODE_META]?.icon ?? "📦"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-extrabold text-slate-900">{shipment.reference}</p>
                      <Badge tone={meta.tone} dot={meta.dot}>
                        {meta.label}
                      </Badge>
                      {shipment.pendingDocs > 0 ? (
                        <Badge tone="amber">
                          <FileWarning className="size-3" />
                          {shipment.pendingDocs} مستند معلّق
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-[11px] text-slate-500">
                      {shipment.clientName ?? "بدون عميل"} · {shipment.goodsDescription ?? "شحنة"}
                    </p>
                  </div>
                  <div className="hidden text-left sm:block">
                    <p className="text-[10px] text-slate-400">الوصول المتوقع</p>
                    <p className="text-[11px] font-bold text-slate-700">{formatDate(shipment.eta)}</p>
                  </div>
                  <ArrowLeft className="size-4 text-slate-300" />
                </Link>
              );
            })
          )}
        </SectionCard>

        <SectionCard title="توزيع حالات الملفات" description="نظرة سريعة على خط سير التخليص" bodyClassName="p-5">
          {statusSlices.length ? (
            <Donut slices={statusSlices} total={shipments.length} centerLabel="ملف تخليص" />
          ) : (
            <EmptyState title="لا توجد ملفات بعد" description="أنشئ أول ملف تخليص لتبدأ المتابعة." />
          )}
          <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
            <p className="text-[11px] font-bold text-slate-500">حالة المستندات</p>
            <div>
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="text-slate-600">مستندات معتمدة</span>
                <span className="font-bold text-slate-900">
                  {formatNumber(documents.filter((doc) => doc.status === "approved").length)} /{" "}
                  {formatNumber(documents.length)}
                </span>
              </div>
              <Progress
                value={(documents.filter((doc) => doc.status === "approved").length / Math.max(1, documents.length)) * 100}
                color="#10b981"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="text-slate-600">بانتظار المراجعة</span>
                <span className="font-bold text-slate-900">{formatNumber(pendingDocs)}</span>
              </div>
              <Progress value={(pendingDocs / Math.max(1, documents.length)) * 100} color="#f59e0b" />
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <SectionCard
          className="xl:col-span-2"
          title="حجم الملفات على آخر 6 أشهر"
          description="عدد الملفات المفتوحة شهرياً مقابل الملفات التي تم الإفراج عنها"
          action={
            <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#0f9d8b]" /> مفتوحة
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[#c9a227]" /> مُفرج عنها
              </span>
            </div>
          }
          bodyClassName="px-5 pb-5 pt-6"
        >
          <BarChart data={months} color="#0f9d8b" height={180} />
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 text-center">
            <div>
              <p className="text-[10px] text-slate-400">إجمالي الشهر الحالي</p>
              <p className="text-sm font-extrabold text-slate-900">{formatNumber(months[months.length - 1]?.value ?? 0)} ملف</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400">أُفرج هذا الشهر</p>
              <p className="text-sm font-extrabold text-slate-900">{formatNumber(clearedThisMonth)} شحنة</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400">متوسط زمن التخليص</p>
              <p className="text-sm font-extrabold text-slate-900">3.4 يوم</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="تكامل شركات الشحن"
          description="آخر مزامنة لكل شركة"
          action={
            <Link href="/carriers" className="text-xs font-bold text-[#0f9d8b] hover:underline">
              الكل ←
            </Link>
          }
          bodyClassName="divide-y divide-slate-100"
        >
          {connectedCarriers.slice(0, 6).map((carrier) => (
            <div key={carrier.id} className="flex items-center gap-3 px-5 py-3">
              <span
                className="flex size-9 items-center justify-center rounded-lg text-white"
                style={{ background: `linear-gradient(135deg, ${carrier.color}, ${carrier.color}bb)` }}
              >
                {carrier.type === "airline" ? <Plane className="size-4" /> : <Ship className="size-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-bold text-slate-900">{carrier.name}</p>
                <p className="text-[10px] text-slate-500">
                  {carrier.lastSyncAt ? `آخر مزامنة ${relativeTime(carrier.lastSyncAt)}` : "لم تتم المزامنة بعد"}
                </p>
              </div>
              <Badge tone={carrier.integrationStatus === "connected" ? "emerald" : carrier.integrationStatus === "pending" ? "amber" : "rose"}>
                {carrier.integrationStatus === "connected" ? "متصل" : carrier.integrationStatus === "pending" ? "تفعيل" : "معطل"}
              </Badge>
            </div>
          ))}
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <SectionCard
          className="xl:col-span-2"
          title="آخر التحديثات"
          description="حركة الملفات والمستندات والإقرارات الجمركية"
          bodyClassName="p-5"
        >
          {events.length === 0 ? (
            <EmptyState title="لا توجد تحديثات بعد" description="ستظهر هنا كل التحركات على ملفات التخليص." />
          ) : (
            <ol className="relative space-y-4 border-r border-dashed border-slate-200 pr-5">
              {events.map((event) => {
                const shipment = shipmentById.get(event.shipmentId);
                const meta = EVENT_TYPE_META[event.type] ?? EVENT_TYPE_META.note;
                return (
                  <li key={event.id} className="relative">
                    <span
                      className="absolute -right-[27px] top-1 size-3 rounded-full ring-4 ring-white"
                      style={{ background: meta.color }}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-bold text-slate-900">{event.title}</p>
                      <span className="text-[10px] text-slate-400">{relativeTime(event.occurredAt)}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-5 text-slate-500">{event.description}</p>
                    {shipment ? (
                      <Link
                        href={`/shipments/${shipment.id}`}
                        className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-[#0f9d8b] hover:underline"
                      >
                        {shipment.reference}
                        <ArrowLeft className="size-3" />
                      </Link>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </SectionCard>

        <div className="space-y-5">
          <SectionCard title="فواتير تحتاج تحصيل" description="أعلى المبالغ المستحقة" bodyClassName="divide-y divide-slate-100">
            {topInvoices.length === 0 ? (
              <EmptyState title="كل الفواتير محصّلة" description="لا توجد مستحقات مفتوحة حالياً." icon={<BadgeCheck className="size-7 text-emerald-500" />} />
            ) : (
              topInvoices.map((invoice) => {
                const meta = INVOICE_STATUS_META[invoice.status as keyof typeof INVOICE_STATUS_META];
                return (
                  <Link key={invoice.id} href="/invoices" className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-slate-900">{invoice.number}</p>
                      <p className="truncate text-[10px] text-slate-500">{invoice.clientName ?? "عميل"}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-[11px] font-extrabold text-slate-900">{formatMoney(invoice.total - invoice.paidAmount)}</p>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </div>
                  </Link>
                );
              })
            )}
          </SectionCard>

          <SectionCard title="سجل التكامل ونافذة" description="أحدث عمليات المزامنة" bodyClassName="divide-y divide-slate-100">
            {logs.slice(0, 5).map((log) => (
              <div key={log.id} className="px-5 py-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${
                      log.status === "success" ? "bg-emerald-500" : log.status === "warning" ? "bg-amber-500" : "bg-rose-500"
                    }`}
                  />
                  <p className="truncate text-[10px] font-bold text-slate-700">{log.carrierName ?? "نافذة"}</p>
                  <span className="mr-auto text-[9px] text-slate-400">{relativeTime(log.createdAt)}</span>
                </div>
                <p className="mt-0.5 line-clamp-2 pr-3.5 text-[10px] leading-4 text-slate-500">{log.message}</p>
              </div>
            ))}
            <div className="px-5 py-3">
              <Link href="/integrations" className="text-[11px] font-bold text-[#0f9d8b] hover:underline">
                عرض كل السجلات ←
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { title: "دليل التخليص الجمركي", desc: "خطوات الإفراج ومتطلبات كل نوع شحنة", icon: <CalendarClock className="size-5" />, href: "/reports" },
          { title: "متابعة الشحنات", desc: "تتبع لحظي من شركات الطيران والخطوط الملاحية", icon: <Plane className="size-5" />, href: "/integrations" },
          { title: "تنبيهات المستندات", desc: `${pendingDocs} مستند بانتظار المراجعة والاعتماد`, icon: <AlertTriangle className="size-5" />, href: "/documents" },
        ].map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="card flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-[#0a2239]">{item.icon}</span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900">{item.title}</p>
              <p className="truncate text-[11px] text-slate-500">{item.desc}</p>
            </div>
            <ArrowLeft className="mr-auto size-4 text-slate-300" />
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/60 px-4 py-3 text-[11px] text-slate-500">
        <span className="flex items-center gap-2">
          <Avatar name={user.name} color={user.avatarColor} size="sm" />
          مسجّل الدخول كـ {user.name} — {user.jobTitle ?? "فريق العربي"}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          آخر تحديث للبيانات الآن · {formatDate(new Date())}
        </span>
      </div>
    </div>
  );
}
