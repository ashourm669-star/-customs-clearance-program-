"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Cable,
  CheckCircle2,
  Globe2,
  Pencil,
  Plane,
  Plug,
  PlugZap,
  Plus,
  RefreshCw,
  Search,
  Ship,
  Trash2,
  Truck,
  Unplug,
} from "lucide-react";
import { Badge, EmptyState, Field, Modal, PageHeader, Spinner, StatCard, cx } from "@/components/ui";
import { useToast } from "@/components/toast";
import {
  CARRIER_TYPES,
  CARRIER_TYPE_META,
  INTEGRATION_META,
  INTEGRATION_STATUSES,
  type CarrierType,
} from "@/lib/constants";
import { formatNumber, relativeTime } from "@/lib/format";
import type { CarrierRow } from "@/lib/types";

const ICONS: Record<string, React.ReactNode> = {
  airline: <Plane className="size-5" />,
  shipping_line: <Ship className="size-5" />,
  land: <Truck className="size-5" />,
  platform: <Globe2 className="size-5" />,
};

const EMPTY_FORM = {
  name: "",
  nameEn: "",
  code: "",
  type: "airline",
  country: "",
  scac: "",
  apiEndpoint: "",
  integrationStatus: "pending",
  color: "#0b2545",
  notes: "",
  trackingUrl: "",
  apiKey: "",
  apiSecret: "",
};

export function CarriersClient({ initialCarriers }: { initialCarriers: CarrierRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [carriers, setCarriers] = useState(initialCarriers);
  const [query, setQuery] = useState("");
  const [type, setType] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CarrierRow | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CarrierRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return carriers.filter((carrier) => {
      const matchesType = type === "all" || carrier.type === type;
      const matchesSearch =
        !search ||
        [carrier.name, carrier.nameEn, carrier.code, carrier.country, carrier.scac]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
      return matchesType && matchesSearch;
    });
  }, [carriers, query, type]);

  const stats = useMemo(
    () => ({
      total: carriers.length,
      connected: carriers.filter((carrier) => carrier.integrationStatus === "connected").length,
      pending: carriers.filter((carrier) => carrier.integrationStatus === "pending").length,
      failed: carriers.filter((carrier) => carrier.integrationStatus === "disconnected").length,
      synced: carriers.reduce((sum, carrier) => sum + carrier.shipmentsSynced, 0),
    }),
    [carriers],
  );

  function startCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setError(null);
    setOpen(true);
  }

  function startEdit(carrier: CarrierRow) {
    setEditing(carrier);
    setForm({
      name: carrier.name,
      nameEn: carrier.nameEn ?? "",
      code: carrier.code ?? "",
      type: carrier.type,
      country: carrier.country ?? "",
      scac: carrier.scac ?? "",
      apiEndpoint: carrier.apiEndpoint ?? "",
      integrationStatus: carrier.integrationStatus,
      color: carrier.color,
      notes: carrier.notes ?? "",
      trackingUrl: carrier.trackingUrl ?? "",
      apiKey: carrier.apiKey ?? "",
      apiSecret: carrier.apiSecret ?? "",
    });
    setError(null);
    setOpen(true);
  }

  async function syncCarrier(carrier: CarrierRow) {
    setSyncing(carrier.id);
    const previous = carriers;
    setCarriers((current) =>
      current.map((item) =>
        item.id === carrier.id
          ? { ...item, lastSyncAt: new Date().toISOString(), shipmentsSynced: item.shipmentsSynced + 3 }
          : item,
      ),
    );
    try {
      const response = await fetch(`/api/carriers/${carrier.id}/sync`, { method: "POST" });
      const data = (await response.json()) as {
        result?: { message: string; level: string };
        carriers?: CarrierRow[];
        error?: string;
      };
      if (data.carriers) setCarriers(data.carriers);
      if (!response.ok || !data.result) throw new Error(data.error ?? "");
      toast({
        title: data.result.level === "error" ? "فشلت المزامنة" : data.result.level === "warning" ? "المزامنة معلّقة" : "تمت المزامنة",
        description: data.result.message,
        tone: data.result.level === "error" ? "error" : data.result.level === "warning" ? "info" : "success",
      });
      router.refresh();
    } catch {
      setCarriers(previous);
      toast({ title: "تعذّرت المزامنة", description: carrier.name, tone: "error" });
    } finally {
      setSyncing(null);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("اسم الشركة مطلوب.");
      return;
    }
    setSaving(true);
    setError(null);

    if (editing) {
      const previous = editing;
      const optimistic: CarrierRow = { ...editing, ...form, integrationStatus: form.integrationStatus };
      setCarriers((current) => current.map((item) => (item.id === editing.id ? optimistic : item)));
      try {
        const response = await fetch(`/api/carriers/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!response.ok) throw new Error();
        const data = (await response.json()) as { carrier: CarrierRow };
        setCarriers((current) => current.map((item) => (item.id === editing.id ? data.carrier : item)));
        toast({ title: "تم تحديث بيانات الشركة", description: form.name, tone: "success" });
        setOpen(false);
        setEditing(null);
        router.refresh();
      } catch {
        setCarriers((current) => current.map((item) => (item.id === previous.id ? previous : item)));
        setError("تعذّر حفظ البيانات.");
      } finally {
        setSaving(false);
      }
      return;
    }

    const tempId = -Date.now();
    const optimistic: CarrierRow = {
      id: tempId,
      name: form.name,
      nameEn: form.nameEn || null,
      code: form.code || null,
      type: form.type,
      country: form.country || null,
      scac: form.scac || null,
      apiEndpoint: form.apiEndpoint || null,
      trackingUrl: form.trackingUrl || null,
      apiKey: form.apiKey || null,
      apiSecret: form.apiSecret || null,
      integrationStatus: form.integrationStatus,
      lastSyncAt: form.integrationStatus === "connected" ? new Date().toISOString() : null,
      shipmentsSynced: 0,
      color: form.color,
      notes: form.notes || null,
      createdAt: new Date().toISOString(),
      activeShipments: 0,
      totalShipments: 0,
    };
    setCarriers((current) => [optimistic, ...current]);
    try {
      const response = await fetch("/api/carriers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { carrier: CarrierRow };
      setCarriers((current) => current.map((item) => (item.id === tempId ? data.carrier : item)));
      toast({ title: "تمت إضافة الشركة", description: form.name, tone: "success" });
      setOpen(false);
      setForm({ ...EMPTY_FORM });
      router.refresh();
    } catch {
      setCarriers((current) => current.filter((item) => item.id !== tempId));
      setError("تعذّرت إضافة الشركة.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    const snapshot = carriers;
    setCarriers((current) => current.filter((item) => item.id !== target.id));
    try {
      const response = await fetch(`/api/carriers/${target.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      toast({ title: "تم حذف الشركة", description: target.name, tone: "success" });
      router.refresh();
    } catch {
      setCarriers(snapshot);
      toast({ title: "تعذّر الحذف", tone: "error" });
    }
  }

  return (
    <div>
      <PageHeader
        title="شركات الطيران والخطوط الملاحية"
        description="إدارة الربط التقني مع كل شركات الشحن الجوي والبحري والبري ومنصة نافذة."
      >
        <button type="button" onClick={startCreate} className="btn btn-primary">
          <Plus className="size-4" />
          إضافة شركة / ربط جديد
        </button>
      </PageHeader>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="إجمالي الشركات" value={formatNumber(stats.total)} icon={<Building2 className="size-5" />} accent="#0ea5e9" hint="طيران + ملاحة + منصات" />
        <StatCard label="ربط نشط" value={formatNumber(stats.connected)} icon={<CheckCircle2 className="size-5" />} accent="#10b981" hint="مزامنة تلقائية" />
        <StatCard label="قيد التفعيل" value={formatNumber(stats.pending)} icon={<PlugZap className="size-5" />} accent="#f59e0b" hint="بانتظار مفاتيح API" />
        <StatCard label="بوالص تمت مزامنتها" value={formatNumber(stats.synced)} icon={<Cable className="size-5" />} accent="#6366f1" hint={`${stats.failed} شركة غير متصلة`} />
      </div>

      <div className="card mb-4 flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input className="input h-10 pr-9" placeholder="بحث بالاسم أو الكود أو الدولة…" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1">
          {[{ key: "all", label: "الكل" }, ...CARRIER_TYPES.map((item) => ({ key: item, label: CARRIER_TYPE_META[item].label }))].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setType(tab.key)}
              className={cx(
                "rounded-full px-3 py-1.5 text-[11px] font-bold transition",
                type === tab.key ? "bg-[#0a2239] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            title="لا توجد شركات مطابقة"
            description="أضف شركة شحن جديدة وحدد طريقة الربط (API) ومفاتيح الوصول."
            icon={<Ship className="size-7" />}
            action={
              <button type="button" className="btn btn-primary" onClick={startCreate}>
                <Plus className="size-4" /> إضافة شركة
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((carrier) => {
            const statusMeta = INTEGRATION_META[carrier.integrationStatus] ?? INTEGRATION_META.pending;
            const busy = syncing === carrier.id;
            return (
              <article key={carrier.id} className={cx("card flex flex-col p-4", carrier.id < 0 && "opacity-60")}>
                <div className="flex items-start gap-3">
                  <span
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${carrier.color}, ${carrier.color}bb)` }}
                  >
                    {ICONS[carrier.type] ?? <Ship className="size-5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-extrabold text-slate-900">{carrier.name}</h3>
                    <p className="truncate text-[10px] text-slate-400">{carrier.nameEn ?? "—"}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <Badge tone="slate">{CARRIER_TYPE_META[carrier.type as CarrierType]?.label ?? carrier.type}</Badge>
                      {carrier.code ? <Badge tone="sky">{carrier.code}</Badge> : null}
                    </div>
                  </div>
                  <Badge tone={statusMeta.tone} dot={carrier.integrationStatus === "connected" ? "#10b981" : carrier.integrationStatus === "pending" ? "#f59e0b" : "#f43f5e"}>
                    {statusMeta.label}
                  </Badge>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-center">
                  <div>
                    <p className="text-[9px] text-slate-400">شحنات مرتبطة</p>
                    <p className="text-xs font-extrabold text-slate-900">{formatNumber(carrier.totalShipments)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400">نشطة</p>
                    <p className="text-xs font-extrabold text-slate-900">{formatNumber(carrier.activeShipments)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400">بوالص مزامنة</p>
                    <p className="text-xs font-extrabold text-slate-900">{formatNumber(carrier.shipmentsSynced)}</p>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-[10px] text-slate-500">
                  <p className="flex items-center justify-between">
                    <span>آخر مزامنة</span>
                    <span className="font-bold text-slate-700">{carrier.lastSyncAt ? relativeTime(carrier.lastSyncAt) : "لم تتم"}</span>
                  </p>
                  <p className="flex items-center justify-between">
                    <span>الدولة / SCAC</span>
                    <span className="font-bold text-slate-700">{carrier.country ?? "—"} · {carrier.scac ?? "—"}</span>
                  </p>
                  <p className="truncate rounded-md bg-slate-50 px-2 py-1 font-mono text-[9px] text-slate-500" dir="ltr">
                    {carrier.apiEndpoint ?? "بدون واجهة API"}
                  </p>
                </div>

                {carrier.notes ? <p className="mt-2 line-clamp-2 text-[10px] leading-5 text-slate-500">{carrier.notes}</p> : null}

                <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => syncCarrier(carrier)}
                    disabled={busy}
                    className="btn btn-ghost h-8 flex-1 px-2 text-[10px]"
                  >
                    {busy ? <Spinner /> : carrier.integrationStatus === "connected" ? <RefreshCw className="size-3.5" /> : <Plug className="size-3.5" />}
                    مزامنة الآن
                  </button>
                  <button type="button" onClick={() => startEdit(carrier)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#0f9d8b]" aria-label="تعديل">
                    <Pencil className="size-3.5" />
                  </button>
                  <button type="button" onClick={() => setDeleteTarget(carrier)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="حذف">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="lg"
        title={editing ? `تعديل ${editing.name}` : "إضافة شركة شحن / ربط جديد"}
        description="حدد نوع الشركة وواجهة الربط وحالة التكامل — تُستخدم بيانات الربط في المزامنة مع نافذة."
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              إلغاء
            </button>
            <button type="submit" form="carrier-form" className="btn btn-primary" disabled={saving}>
              {saving ? <Spinner /> : <Plus className="size-4" />}
              {editing ? "حفظ التعديلات" : "إضافة الشركة"}
            </button>
          </>
        }
      >
        <form id="carrier-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="اسم الشركة (عربي)" required>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="الاسم بالإنجليزية">
            <input className="input" dir="ltr" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} />
          </Field>
          <Field label="نوع الشركة">
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {CARRIER_TYPES.map((option) => (
                <option key={option} value={option}>
                  {CARRIER_TYPE_META[option].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="الكود / البادئة">
            <input className="input" dir="ltr" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="MS / MAEU" />
          </Field>
          <Field label="الدولة">
            <input className="input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </Field>
          <Field label="كود SCAC / IATA">
            <input className="input" dir="ltr" value={form.scac} onChange={(e) => setForm({ ...form, scac: e.target.value })} />
          </Field>
          <Field label="واجهة الربط (API Endpoint)" className="sm:col-span-2">
            <input className="input" dir="ltr" value={form.apiEndpoint} onChange={(e) => setForm({ ...form, apiEndpoint: e.target.value })} placeholder="https://api.carrier.com/v2" />
          </Field>
          <Field label="حالة التكامل">
            <select className="input" value={form.integrationStatus} onChange={(e) => setForm({ ...form, integrationStatus: e.target.value })}>
              {INTEGRATION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {INTEGRATION_META[status].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="لون الهوية">
            <input type="color" className="input h-10 p-1" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          </Field>
          <Field label="رابط بوابة التتبع" hint="مثال: https://portal.cargolinx.com أو بوابة الشركة" className="sm:col-span-2">
            <input className="input" dir="ltr" value={form.trackingUrl} onChange={(e) => setForm({ ...form, trackingUrl: e.target.value })} placeholder="https://portal.cargolinx.com/track" />
          </Field>
          <Field label="API Key / Client ID" hint="من حسابك لدى الشركة — يُخزَّن في قاعدة بياناتك">
            <input className="input" dir="ltr" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} />
          </Field>
          <Field label="API Secret">
            <input className="input" dir="ltr" type="password" value={form.apiSecret} onChange={(e) => setForm({ ...form, apiSecret: e.target.value })} />
          </Field>
          <Field label="ملاحظات الربط" className="sm:col-span-2">
            <textarea className="input min-h-20 resize-y" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          {error ? (
            <div className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200 sm:col-span-2">{error}</div>
          ) : null}
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="حذف شركة الشحن"
        description="سيتم فصل ربط الشركة عن المنصة، وستبقى ملفات التخليص بدون شركة."
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>
              إلغاء
            </button>
            <button type="button" className="btn btn-danger" onClick={confirmDelete}>
              <Unplug className="size-4" /> فصل وحذف
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">هل تريد حذف «{deleteTarget?.name}» من قائمة الشركات المربوطة؟</p>
      </Modal>
    </div>
  );
}
