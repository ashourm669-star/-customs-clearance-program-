"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  Download,
  Eye,
  FileWarning,
  Filter,
  PackageSearch,
  Pencil,
  Plus,
  Search,
  Ship,
  Trash2,
  User,
} from "lucide-react";
import { Badge, EmptyState, Modal, PageHeader, Spinner, cx } from "@/components/ui";
import { useToast } from "@/components/toast";
import { ShipmentForm, type Option } from "@/components/shipment-form";
import {
  DIRECTIONS,
  DIRECTION_META,
  MODES,
  MODE_META,
  PRIORITY_META,
  SHIPMENT_STATUSES,
  SHIPMENT_STATUS_META,
  type ShipmentStatus,
} from "@/lib/constants";
import { formatDate, formatMoney, formatNumber, formatWeight } from "@/lib/format";
import type { ShipmentRow } from "@/lib/types";

type Props = {
  initialShipments: ShipmentRow[];
  clients: Option[];
  carriers: Option[];
  initialQuery: string;
  initialStatus: string;
  openCreate: boolean;
  prefillBl?: string;
  userName: string;
};

type SortKey = "newest" | "eta" | "fees";

export function ShipmentsClient({
  initialShipments,
  clients,
  carriers,
  initialQuery,
  initialStatus,
  openCreate,
  prefillBl,
  userName,
}: Props) {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState<ShipmentRow[]>(initialShipments);
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState(initialStatus);
  const [mode, setMode] = useState("all");
  const [direction, setDirection] = useState("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [formOpen, setFormOpen] = useState(openCreate);
  const [editing, setEditing] = useState<ShipmentRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShipmentRow | null>(null);
  const [pendingIds, setPendingIds] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setItems(initialShipments);
  }, [initialShipments]);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  function markPending(id: number, pending: boolean) {
    setPendingIds((current) => (pending ? [...current, id] : current.filter((value) => value !== id)));
  }

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    const rows = items.filter((item) => {
      const matchesQuery =
        !search ||
        [item.reference, item.clientName, item.blNumber, item.goodsDescription, item.port, item.carrierName]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
      const matchesStatus = status === "all" || item.status === status;
      const matchesMode = mode === "all" || item.mode === mode;
      const matchesDirection = direction === "all" || item.direction === direction;
      return matchesQuery && matchesStatus && matchesMode && matchesDirection;
    });
    return rows.sort((a, b) => {
      if (sort === "fees") {
        return b.dutyAmount + b.vatAmount + b.serviceFees - (a.dutyAmount + a.vatAmount + a.serviceFees);
      }
      if (sort === "eta") {
        return new Date(a.eta ?? "2999-01-01").getTime() - new Date(b.eta ?? "2999-01-01").getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [items, query, status, mode, direction, sort]);

  const statusCounts = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((item) => map.set(item.status, (map.get(item.status) ?? 0) + 1));
    return map;
  }, [items]);

  async function handleSubmit(values: Record<string, string>) {
    const clientName = clients.find((client) => client.id === Number(values.clientId))?.name ?? null;
    const carrierName = carriers.find((carrier) => carrier.id === Number(values.carrierId))?.name ?? null;
    const numeric = (key: string) => Number(values[key] || 0);

    if (editing) {
      const previous = items.find((item) => item.id === editing.id);
      const optimistic: ShipmentRow = {
        ...editing,
        reference: values.reference || editing.reference,
        clientId: Number(values.clientId) || null,
        clientName,
        carrierId: Number(values.carrierId) || null,
        carrierName,
        mode: values.mode,
        direction: values.direction,
        status: values.status,
        priority: values.priority,
        port: values.port || null,
        origin: values.origin || null,
        destination: values.destination || null,
        blNumber: values.blNumber || null,
        vesselFlight: values.vesselFlight || null,
        containerCount: numeric("containerCount"),
        packageCount: numeric("packageCount"),
        grossWeight: numeric("grossWeight"),
        goodsDescription: values.goodsDescription || null,
        hsCode: values.hsCode || null,
        invoiceValue: numeric("invoiceValue"),
        currency: values.currency,
        dutyAmount: numeric("dutyAmount"),
        vatAmount: numeric("vatAmount"),
        serviceFees: numeric("serviceFees"),
        eta: values.eta ? new Date(values.eta).toISOString() : null,
        arrivedAt: values.arrivedAt ? new Date(values.arrivedAt).toISOString() : null,
        brokerName: values.brokerName || null,
        notes: values.notes || null,
        updatedAt: new Date().toISOString(),
      };
      setItems((current) => current.map((item) => (item.id === editing.id ? optimistic : item)));
      markPending(editing.id, true);
      try {
        const response = await fetch(`/api/shipments/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        if (!response.ok) throw new Error();
        const data = (await response.json()) as { shipment: ShipmentRow };
        setItems((current) => current.map((item) => (item.id === editing.id ? data.shipment : item)));
        toast({ title: "تم تحديث الملف", description: optimistic.reference, tone: "success" });
        setEditing(null);
        router.refresh();
        return true;
      } catch {
        if (previous) setItems((current) => current.map((item) => (item.id === previous.id ? previous : item)));
        toast({ title: "تعذّر تحديث الملف", description: "حدث خطأ أثناء الحفظ، تم التراجع.", tone: "error" });
        return false;
      } finally {
        markPending(editing.id, false);
      }
    }

    const tempId = -Date.now();
    const optimistic: ShipmentRow = {
      id: tempId,
      reference: values.reference || `CLR-${new Date().getFullYear()}-جديد`,
      clientId: Number(values.clientId) || null,
      clientName,
      carrierId: Number(values.carrierId) || null,
      carrierName,
      carrierType: null,
      mode: values.mode,
      direction: values.direction,
      status: values.status,
      priority: values.priority,
      port: values.port || null,
      origin: values.origin || null,
      destination: values.destination || null,
      blNumber: values.blNumber || null,
      vesselFlight: values.vesselFlight || null,
      containerCount: numeric("containerCount"),
      packageCount: numeric("packageCount"),
      grossWeight: numeric("grossWeight"),
      goodsDescription: values.goodsDescription || null,
      hsCode: values.hsCode || null,
      invoiceValue: numeric("invoiceValue"),
      currency: values.currency,
      dutyAmount: numeric("dutyAmount"),
      vatAmount: numeric("vatAmount"),
      serviceFees: numeric("serviceFees"),
      eta: values.eta ? new Date(values.eta).toISOString() : null,
      arrivedAt: values.arrivedAt ? new Date(values.arrivedAt).toISOString() : null,
      releasedAt: null,
      brokerName: values.brokerName || userName,
      notes: values.notes || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pendingDocs: 0,
    };
    setItems((current) => [optimistic, ...current]);
    setFormOpen(false);
    try {
      const response = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await response.json()) as { shipment?: ShipmentRow; error?: string };
      if (!response.ok || !data.shipment) throw new Error(data.error ?? "");
      setItems((current) => current.map((item) => (item.id === tempId ? data.shipment! : item)));
      toast({ title: "تم إنشاء ملف التخليص", description: data.shipment.reference, tone: "success" });
      router.refresh();
      return true;
    } catch {
      setItems((current) => current.filter((item) => item.id !== tempId));
      toast({ title: "تعذّر إنشاء الملف", description: "تحقق من رقم الملف والعميل.", tone: "error" });
      return false;
    }
  }

  async function changeStatus(shipment: ShipmentRow, nextStatus: string) {
    const previous = shipment.status;
    setItems((current) => current.map((item) => (item.id === shipment.id ? { ...item, status: nextStatus } : item)));
    markPending(shipment.id, true);
    try {
      const response = await fetch(`/api/shipments/${shipment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { shipment: ShipmentRow };
      setItems((current) => current.map((item) => (item.id === shipment.id ? data.shipment : item)));
      toast({
        title: "تم تحديث الحالة",
        description: `${shipment.reference} → ${SHIPMENT_STATUS_META[nextStatus as ShipmentStatus].label}`,
        tone: "success",
      });
      router.refresh();
    } catch {
      setItems((current) => current.map((item) => (item.id === shipment.id ? { ...item, status: previous } : item)));
      toast({ title: "فشل تحديث الحالة", tone: "error" });
    } finally {
      markPending(shipment.id, false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setItems((current) => current.filter((item) => item.id !== target.id));
    setBusy(true);
    try {
      const response = await fetch(`/api/shipments/${target.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      toast({ title: "تم حذف الملف", description: target.reference, tone: "success" });
      router.refresh();
    } catch {
      setItems((current) => [target, ...current]);
      toast({ title: "تعذّر حذف الملف", tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const header = ["رقم الملف", "العميل", "شركة الشحن", "النوع", "الاتجاه", "الحالة", "الميناء", "الوصول المتوقع", "الرسوم الجمركية", "ض.ق.م", "الأتعاب"];
    const rows = filtered.map((item) => [
      item.reference,
      item.clientName ?? "",
      item.carrierName ?? "",
      MODE_META[item.mode as keyof typeof MODE_META]?.label ?? item.mode,
      DIRECTION_META[item.direction as keyof typeof DIRECTION_META]?.label ?? item.direction,
      SHIPMENT_STATUS_META[item.status as ShipmentStatus]?.label ?? item.status,
      item.port ?? "",
      item.eta ? formatDate(item.eta) : "",
      item.dutyAmount,
      item.vatAmount,
      item.serviceFees,
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `al-arabi-shipments-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "تم تصدير الملف", description: `${filtered.length} ملف تخليص`, tone: "success" });
  }

  return (
    <div>
      <PageHeader title="ملفات التخليص الجمركي" description="إدارة كاملة لكل ملفات الوارد والصادر والعبور مع متابعة الرسوم والمستندات.">
        <button type="button" onClick={exportCsv} className="btn btn-ghost">
          <Download className="size-4" />
          تصدير CSV
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="btn btn-primary"
        >
          <Plus className="size-4" />
          ملف تخليص جديد
        </button>
      </PageHeader>

      <div className="card mb-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input h-10 pr-9"
              placeholder="بحث برقم الملف، العميل، البوليصة، البضاعة…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <select className="input h-10 w-auto" value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="all">كل طرق الشحن</option>
            {MODES.map((option) => (
              <option key={option} value={option}>
                {MODE_META[option].label}
              </option>
            ))}
          </select>
          <select className="input h-10 w-auto" value={direction} onChange={(event) => setDirection(event.target.value)}>
            <option value="all">كل الاتجاهات</option>
            {DIRECTIONS.map((option) => (
              <option key={option} value={option}>
                {DIRECTION_META[option].label}
              </option>
            ))}
          </select>
          <select className="input h-10 w-auto" value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
            <option value="newest">الأحدث أولاً</option>
            <option value="eta">الأقرب وصولاً</option>
            <option value="fees">الأعلى رسوماً</option>
          </select>
          <span className="hidden items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-2 text-[11px] font-bold text-slate-600 sm:flex">
            <Filter className="size-3.5" />
            {formatNumber(filtered.length)} ملف
          </span>
        </div>

        <div className="scroll-thin mt-3 flex gap-1.5 overflow-x-auto border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setStatus("all")}
            className={cx(
              "rounded-full px-3 py-1.5 text-[11px] font-bold whitespace-nowrap transition",
              status === "all" ? "bg-[#0a2239] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
            )}
          >
            الكل ({items.length})
          </button>
          {SHIPMENT_STATUSES.map((option) => {
            const meta = SHIPMENT_STATUS_META[option];
            const count = statusCounts.get(option) ?? 0;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setStatus(option)}
                className={cx(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold whitespace-nowrap transition",
                  status === option ? "bg-[#0a2239] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                <span className="size-1.5 rounded-full" style={{ background: meta.dot }} />
                {meta.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            title={items.length === 0 ? "لا توجد ملفات تخليص بعد" : "لا توجد نتائج مطابقة"}
            description={
              items.length === 0
                ? "ابدأ بإنشاء أول ملف تخليص جمركي، وسيتم ربطه تلقائياً بشركة الشحن ومنصة نافذة."
                : "جرّب تعديل كلمات البحث أو إلغاء الفلاتر لعرض ملفات أكثر."
            }
            icon={<PackageSearch className="size-7" />}
            action={
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="size-4" />
                إنشاء ملف تخليص
              </button>
            }
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[980px] border-collapse">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="th">الملف</th>
                    <th className="th">العميل والبضاعة</th>
                    <th className="th">الشحن</th>
                    <th className="th">المحطة</th>
                    <th className="th">الحالة</th>
                    <th className="th">
                      <span className="inline-flex items-center gap-1">
                        الرسوم <ArrowUpDown className="size-3" />
                      </span>
                    </th>
                    <th className="th text-left">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((item) => {
                    const meta = SHIPMENT_STATUS_META[item.status as ShipmentStatus] ?? SHIPMENT_STATUS_META.draft;
                    const fees = item.dutyAmount + item.vatAmount + item.serviceFees;
                    const pending = pendingIds.includes(item.id);
                    return (
                      <tr key={item.id} className={cx("transition hover:bg-slate-50/70", pending && "opacity-60")}>
                        <td className="td">
                          <Link href={`/shipments/${item.id}`} className="font-extrabold text-[#0a2239] hover:text-[#0f9d8b]">
                            {item.reference}
                          </Link>
                          <p className="mt-0.5 text-[10px] text-slate-400">أُنشئ {formatDate(item.createdAt)}</p>
                        </td>
                        <td className="td">
                          <p className="flex items-center gap-1 text-[12px] font-semibold text-slate-800">
                            <User className="size-3 text-slate-400" />
                            {item.clientName ?? "بدون عميل"}
                          </p>
                          <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-500">{item.goodsDescription ?? "—"}</p>
                        </td>
                        <td className="td">
                          <p className="text-[12px] font-semibold text-slate-800">
                            {MODE_META[item.mode as keyof typeof MODE_META]?.icon} {item.carrierName ?? "بدون ربط"}
                          </p>
                          <p className="mt-0.5 text-[10px] text-slate-500">{item.blNumber ?? "—"}</p>
                        </td>
                        <td className="td">
                          <p className="text-[12px] font-semibold text-slate-800">{item.port ?? "—"}</p>
                          <p className="mt-0.5 text-[10px] text-slate-500">ETA {formatDate(item.eta)}</p>
                        </td>
                        <td className="td">
                          <div className="flex flex-col gap-1">
                            <Badge tone={meta.tone} dot={meta.dot}>
                              {meta.label}
                            </Badge>
                            <select
                              value={item.status}
                              onChange={(event) => changeStatus(item, event.target.value)}
                              disabled={pending}
                              className="w-32 rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-[10px] font-semibold text-slate-600"
                              aria-label="تغيير الحالة"
                            >
                              {SHIPMENT_STATUSES.map((option) => (
                                <option key={option} value={option}>
                                  {SHIPMENT_STATUS_META[option].label}
                                </option>
                              ))}
                            </select>
                          </div>
                          {item.pendingDocs > 0 ? (
                            <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-amber-600">
                              <FileWarning className="size-3" /> {item.pendingDocs} مستند
                            </span>
                          ) : null}
                        </td>
                        <td className="td">
                          <p className="text-[12px] font-extrabold text-slate-900">{formatMoney(fees)}</p>
                          <p className="mt-0.5 text-[10px] text-slate-500">
                            {formatMoney(item.invoiceValue, item.currency)} قيمة
                          </p>
                          <span
                            className={cx(
                              "mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold",
                              item.priority === "urgent"
                                ? "bg-rose-50 text-rose-600"
                                : item.priority === "high"
                                  ? "bg-amber-50 text-amber-600"
                                  : "bg-slate-100 text-slate-500",
                            )}
                          >
                            {PRIORITY_META[item.priority as keyof typeof PRIORITY_META]?.label ?? item.priority}
                          </span>
                        </td>
                        <td className="td">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditing(item);
                                setFormOpen(true);
                              }}
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-[#0f9d8b]"
                              aria-label="تعديل"
                            >
                              <Pencil className="size-4" />
                            </button>
                            <Link
                              href={`/shipments/${item.id}`}
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-sky-600"
                              aria-label="عرض الملف"
                            >
                              <Eye className="size-4" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                              aria-label="حذف"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 lg:hidden">
              {filtered.map((item) => {
                const meta = SHIPMENT_STATUS_META[item.status as ShipmentStatus] ?? SHIPMENT_STATUS_META.draft;
                const fees = item.dutyAmount + item.vatAmount + item.serviceFees;
                return (
                  <div key={item.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link href={`/shipments/${item.id}`} className="text-sm font-extrabold text-[#0a2239]">
                          {item.reference}
                        </Link>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {MODE_META[item.mode as keyof typeof MODE_META]?.icon} {item.clientName ?? "بدون عميل"}
                        </p>
                      </div>
                      <Badge tone={meta.tone} dot={meta.dot}>
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="mt-2 line-clamp-1 text-[11px] text-slate-600">{item.goodsDescription ?? "—"}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <p className="text-slate-400">الميناء</p>
                        <p className="font-semibold text-slate-700">{item.port ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">الرسوم</p>
                        <p className="font-bold text-slate-900">{formatMoney(fees)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">الوصول المتوقع</p>
                        <p className="font-semibold text-slate-700">{formatDate(item.eta)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">الوزن</p>
                        <p className="font-semibold text-slate-700">{formatWeight(item.grossWeight)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <select
                        value={item.status}
                        onChange={(event) => changeStatus(item, event.target.value)}
                        className="input h-9 flex-1 text-[11px]"
                        aria-label="تغيير الحالة"
                      >
                        {SHIPMENT_STATUSES.map((option) => (
                          <option key={option} value={option}>
                            {SHIPMENT_STATUS_META[option].label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(item);
                          setFormOpen(true);
                        }}
                        className="btn btn-ghost h-9 px-2"
                        aria-label="تعديل"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        className="btn btn-danger h-9 px-2"
                        aria-label="حذف"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
        <Ship className="size-3.5" />
        التحديثات تُحفظ فوراً وتظهر بشكل متفائل قبل تأكيد الخادم.
      </p>

      {formOpen ? (
        <ShipmentForm
          key={editing?.id ?? "new"}
          open={formOpen}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSubmit={handleSubmit}
          clients={clients}
          carriers={carriers}
          initial={editing}
          prefillBl={prefillBl}
        />
      ) : null}

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="حذف ملف التخليص"
        description="سيتم حذف الملف وكل أحداثه ومستنداته. لا يمكن التراجع عن هذه العملية."
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>
              إلغاء
            </button>
            <button type="button" className="btn btn-danger" onClick={confirmDelete} disabled={busy}>
              {busy ? <Spinner /> : <Trash2 className="size-4" />}
              تأكيد الحذف
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          هل أنت متأكد من حذف الملف <span className="font-extrabold text-slate-900">{deleteTarget?.reference}</span> الخاص
          بالعميل {deleteTarget?.clientName ?? "—"}؟
        </p>
      </Modal>
    </div>
  );
}
