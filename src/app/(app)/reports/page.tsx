import Link from "next/link";
import { BadgeCheck, CircleDollarSign, Clock, PackageSearch, Percent, Plane, Scale, Ship, TrendingUp } from "lucide-react";
import { getReportsData } from "@/lib/queries";
import { Badge, EmptyState, Progress, SectionCard, StatCard } from "@/components/ui";
import { BarChart, Donut } from "@/components/charts";
import { PrintButton } from "@/components/print-button";
import {
  DIRECTION_META,
  MODE_META,
  SHIPMENT_STATUS_META,
  type ShipmentStatus,
} from "@/lib/constants";
import { formatMoney, formatNumber, formatWeight } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const { shipments, invoices, clients, carriers } = await getReportsData();

  const totalFees = shipments.reduce((sum, item) => sum + item.dutyAmount + item.vatAmount + item.serviceFees, 0);
  const totalDuty = shipments.reduce((sum, item) => sum + item.dutyAmount, 0);
  const totalVat = shipments.reduce((sum, item) => sum + item.vatAmount, 0);
  const cleared = shipments.filter((item) => ["released", "delivered"].includes(item.status)).length;
  const clearanceRate = shipments.length ? Math.round((cleared / shipments.length) * 100) : 0;
  const collected = invoices.reduce((sum, invoice) => sum + invoice.paidAmount, 0);
  const invoiced = invoices.reduce((sum, invoice) => sum + invoice.total, 0);

  const clearanceDays = shipments
    .filter((item) => item.releasedAt && item.arrivedAt)
    .map((item) => (new Date(item.releasedAt as string).getTime() - new Date(item.arrivedAt as string).getTime()) / 86_400_000)
    .filter((value) => value >= 0);
  const avgClearance = clearanceDays.length
    ? (clearanceDays.reduce((sum, value) => sum + value, 0) / clearanceDays.length).toFixed(1)
    : "—";

  const statusSlices = (Object.keys(SHIPMENT_STATUS_META) as ShipmentStatus[])
    .map((status) => ({
      label: SHIPMENT_STATUS_META[status].label,
      value: shipments.filter((item) => item.status === status).length,
      color: SHIPMENT_STATUS_META[status].dot,
    }))
    .filter((slice) => slice.value > 0);

  const modeData = (["sea", "air", "land"] as const).map((mode) => ({
    label: MODE_META[mode].label,
    value: shipments.filter((item) => item.mode === mode).length,
  }));

  const monthFormatter = new Intl.DateTimeFormat("ar-EG-u-nu-latn", { month: "short" });
  const months = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - index));
    return {
      label: monthFormatter.format(date),
      value: shipments.filter((item) => {
        const created = new Date(item.createdAt);
        return created.getMonth() === date.getMonth() && created.getFullYear() === date.getFullYear();
      }).length,
      secondary: shipments.filter((item) => {
        if (!item.releasedAt) return false;
        const released = new Date(item.releasedAt);
        return released.getMonth() === date.getMonth() && released.getFullYear() === date.getFullYear();
      }).length,
    };
  });

  const directionTotals = (["import", "export", "transit"] as const).map((direction) => ({
    direction,
    count: shipments.filter((item) => item.direction === direction).length,
    fees: shipments
      .filter((item) => item.direction === direction)
      .reduce((sum, item) => sum + item.dutyAmount + item.vatAmount + item.serviceFees, 0),
  }));

  const carrierPerformance = carriers
    .filter((carrier) => carrier.type !== "platform")
    .map((carrier) => {
      const relevant = shipments.filter((item) => item.carrierId === carrier.id);
      return {
        ...carrier,
        count: relevant.length,
        fees: relevant.reduce((sum, item) => sum + item.dutyAmount + item.vatAmount + item.serviceFees, 0),
        weight: relevant.reduce((sum, item) => sum + item.grossWeight, 0),
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const topClients = [...clients].sort((a, b) => b.invoiceTotal - a.invoiceTotal).slice(0, 6);
  const topShipments = [...shipments]
    .sort((a, b) => b.dutyAmount + b.vatAmount + b.serviceFees - (a.dutyAmount + a.vatAmount + a.serviceFees))
    .slice(0, 5);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">التقارير والتحليلات</h1>
          <p className="mt-1 text-sm text-slate-500">أداء التخليص الجمركي، الرسوم المحصلة، وأداء شركات الشحن.</p>
        </div>
        <PrintButton />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="إجمالي الرسوم والأتعاب" value={formatMoney(totalFees)} icon={<CircleDollarSign className="size-5" />} accent="#0f9d8b" hint={`جمارك ${formatMoney(totalDuty)}`} />
        <StatCard label="ضريبة القيمة المضافة" value={formatMoney(totalVat)} icon={<Percent className="size-5" />} accent="#6366f1" hint="محصلة لصالح المصلحة" />
        <StatCard label="نسبة الإفراج" value={`${clearanceRate}%`} icon={<BadgeCheck className="size-5" />} accent="#10b981" hint={`${formatNumber(cleared)} من ${formatNumber(shipments.length)} ملف`} trend={{ value: `تحصيل ${invoiced ? Math.round((collected / invoiced) * 100) : 0}%`, positive: true }} />
        <StatCard label="متوسط زمن الإفراج" value={`${avgClearance} يوم`} icon={<Clock className="size-5" />} accent="#f59e0b" hint="من الوصول حتى الإفراج" />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <SectionCard className="xl:col-span-2" title="حركة الملفات" description="الملفات المفتوحة شهرياً على آخر 6 أشهر" bodyClassName="px-5 pb-5 pt-6">
          <BarChart data={months} height={190} color="#0f9d8b" />
          <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
            {directionTotals.map((item) => (
              <div key={item.direction} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                <div className="flex items-center justify-between">
                  <Badge tone={DIRECTION_META[item.direction].tone}>{DIRECTION_META[item.direction].label}</Badge>
                  <span className="text-xs font-extrabold text-slate-900">{formatNumber(item.count)} ملف</span>
                </div>
                <p className="mt-2 text-[10px] text-slate-500">رسوم وأتعاب</p>
                <p className="text-xs font-bold text-slate-800">{formatMoney(item.fees)}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="توزيع الحالات" description="ملفات التخليص حسب الحالة" bodyClassName="p-5">
          {statusSlices.length ? (
            <Donut slices={statusSlices} total={shipments.length} centerLabel="ملف" />
          ) : (
            <EmptyState title="لا توجد بيانات" description="أنشئ ملفات تخليص لعرض التحليلات." />
          )}
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <SectionCard title="حسب طريقة الشحن" description="جوي / بحري / بري" bodyClassName="p-5">
          <div className="space-y-4">
            {modeData.map((item, index) => {
              const total = Math.max(1, shipments.length);
              return (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-700">{item.label}</span>
                    <span className="font-bold text-slate-900">
                      {formatNumber(item.value)} · {Math.round((item.value / total) * 100)}%
                    </span>
                  </div>
                  <Progress value={(item.value / total) * 100} color={["#0ea5e9", "#c9a227", "#0f9d8b"][index]} />
                </div>
              );
            })}
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                <Scale className="size-3.5" /> إجمالي الأوزان
              </p>
              <p className="mt-1 text-sm font-extrabold text-slate-900">
                {formatWeight(shipments.reduce((sum, item) => sum + item.grossWeight, 0))}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="flex items-center gap-1 text-[10px] text-slate-500">
                  <Ship className="size-3.5" /> حاويات
                </p>
                <p className="text-sm font-extrabold text-slate-900">
                  {formatNumber(shipments.reduce((sum, item) => sum + item.containerCount, 0))}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="flex items-center gap-1 text-[10px] text-slate-500">
                  <PackageSearch className="size-3.5" /> طرود
                </p>
                <p className="text-sm font-extrabold text-slate-900">
                  {formatNumber(shipments.reduce((sum, item) => sum + item.packageCount, 0))}
                </p>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard className="xl:col-span-2" title="أداء شركات الشحن" description="عدد الملفات والرسوم المرتبطة بكل شركة" bodyClassName="overflow-x-auto">
          {carrierPerformance.length === 0 ? (
            <EmptyState title="لا توجد شركات" description="أضف شركات الشحن لبدء التحليل." />
          ) : (
            <table className="w-full min-w-[560px]">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="th">الشركة</th>
                  <th className="th">النوع</th>
                  <th className="th">ملفات</th>
                  <th className="th">الرسوم</th>
                  <th className="th">الوزن</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {carrierPerformance.map((carrier) => (
                  <tr key={carrier.id} className="hover:bg-slate-50/60">
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-lg text-white" style={{ background: carrier.color }}>
                          {carrier.type === "airline" ? <Plane className="size-3.5" /> : <Ship className="size-3.5" />}
                        </span>
                        <span className="text-[11px] font-bold text-slate-800">{carrier.name}</span>
                      </div>
                    </td>
                    <td className="td text-[10px] text-slate-500">{carrier.type === "airline" ? "طيران" : "ملاحي"}</td>
                    <td className="td text-[11px] font-bold text-slate-900">{formatNumber(carrier.count)}</td>
                    <td className="td text-[11px] font-bold text-slate-900">{formatMoney(carrier.fees)}</td>
                    <td className="td text-[10px] text-slate-500">{formatWeight(carrier.weight)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard title="أعلى العملاء" description="حسب قيمة الفواتير" bodyClassName="divide-y divide-slate-100">
          {topClients.map((client) => (
            <div key={client.id} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-bold text-slate-900">{client.name}</p>
                <p className="text-[10px] text-slate-500">
                  {formatNumber(client.shipmentCount)} ملف · متبقي {formatMoney(client.outstanding)}
                </p>
              </div>
              <div className="text-left">
                <p className="text-[11px] font-extrabold text-slate-900">{formatMoney(client.invoiceTotal)}</p>
                <Badge tone={client.outstanding > 0 ? "amber" : "emerald"}>
                  {client.outstanding > 0 ? "مستحقات" : "مسدد"}
                </Badge>
              </div>
            </div>
          ))}
        </SectionCard>

        <SectionCard
          title="أعلى الملفات بالرسوم"
          description="ترتيب ملفات التخليص حسب القيمة"
          action={
            <Link href="/shipments" className="flex items-center gap-1 text-xs font-bold text-[#0f9d8b] hover:underline">
              <TrendingUp className="size-3.5" /> كل الملفات
            </Link>
          }
          bodyClassName="divide-y divide-slate-100"
        >
          {topShipments.map((shipment) => (
            <Link key={shipment.id} href={`/shipments/${shipment.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-slate-900">{shipment.reference}</p>
                <p className="truncate text-[10px] text-slate-500">{shipment.clientName ?? "—"}</p>
              </div>
              <div className="text-left">
                <p className="text-[11px] font-extrabold text-slate-900">
                  {formatMoney(shipment.dutyAmount + shipment.vatAmount + shipment.serviceFees)}
                </p>
                <p className="text-[10px] text-slate-400">{MODE_META[shipment.mode as keyof typeof MODE_META]?.label}</p>
              </div>
            </Link>
          ))}
        </SectionCard>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white/70 px-4 py-3 text-[10px] leading-6 text-slate-500">
        * جميع الأرقام محسوبة من قاعدة بيانات المنصة لحظياً. الرسوم بالجنيه المصري، وقيم الشحنات بعملة كل شحنة. آخر تحديث:{" "}
        {new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "full", timeStyle: "short" }).format(new Date())}.
      </div>
    </div>
  );
}
