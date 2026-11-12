"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ChevronLeft, ChevronRight, Download, Eye, Pencil, Plus, RefreshCw,
  Search, SlidersHorizontal, Trash2, X,
} from "lucide-react";
import { useData, type Row } from "@/components/data-provider";
import {
  Badge, ConfirmDialog, Drawer, EmptyState, FieldInput, PageHeader,
  SectionCard, TableSkeleton,
} from "@/components/ui";
import { ExportBar } from "@/components/export-bar";
import { formatDate, formatMoney, formatNumber, type Option } from "@/lib/constants";
import type { ColumnDef, FieldDef, PageConfig } from "@/lib/ui-config";

const PAGE_SIZE = 10;

function Cell({ col, row, find }: {
  col: ColumnDef;
  row: Row;
  find: (resource: any, id: any) => Row | undefined;
}) {
  const value = row[col.key];
  switch (col.kind) {
    case "mono":
      return <span dir="ltr" className="inline-block whitespace-nowrap rounded-md bg-slate-50 px-2 py-1 font-mono text-[11px] font-medium text-slate-600">{value || "—"}</span>;
    case "badge":
      return <Badge value={value} options={col.options} />;
    case "date":
      return <span className="whitespace-nowrap text-xs text-slate-600">{formatDate(value)}</span>;
    case "money":
      return <span className="whitespace-nowrap text-xs font-semibold text-slate-700">{formatMoney(value, row[col.currencyKey ?? "currency"] ?? "EGP")}</span>;
    case "number":
      return <span className="text-xs font-semibold text-slate-700">{formatNumber(value)}</span>;
    case "relation": {
      const related = col.relation ? find(col.relation, value) : undefined;
      return <span className="line-clamp-1 text-xs font-medium text-slate-700">{related?.[col.relationLabel ?? "name"] ?? "—"}</span>;
    }
    case "secret":
      return value
        ? <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">•••••••• <span className="text-emerald-500">مُدخل</span></span>
        : <span className="text-[10px] text-slate-400">غير مُدخل</span>;
    case "bool":
      return <Badge value={value ? "active" : "inactive"} options={[{ value: "active", label: "نشط" }, { value: "inactive", label: "معطل" }]} />;
    default:
      return <span className={`line-clamp-2 text-xs font-medium text-slate-700 ${col.wide ? "min-w-40" : ""}`}>{value || "—"}</span>;
  }
}

function resolveOptions(field: FieldDef, data: ReturnType<typeof useData>["data"]): Option[] | undefined {
  if (field.options) return field.options;
  if (field.relation && data) {
    const list = data[field.relation] ?? [];
    return list.map((row) => ({
      value: String(row.id),
      label: String(row[field.relationLabel ?? "name"] ?? `#${row.id}`),
    }));
  }
  return undefined;
}

export function ResourcePage({
  config, onRowClick, extraActions, hideAdd, initialFilter,
}: {
  config: PageConfig;
  onRowClick?: (row: Row) => void;
  extraActions?: ReactNode;
  hideAdd?: boolean;
  initialFilter?: Record<string, string>;
}) {
  const { data, loading, error, refresh, create, update, remove, find, toast } = useData();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>(initialFilter ?? {});
  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Row>({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);

  const rows: Row[] = data?.[config.resource] ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      for (const [key, value] of Object.entries(filters)) {
        if (value && String(row[key] ?? "") !== value) return false;
      }
      if (!term) return true;
      const haystack = config.searchKeys.map((key) => String(row[key] ?? "")).join(" ");
      const relations = (config.relationSearch ?? [])
        .map((rel) => {
          const related = find(rel.relation, row[rel.key]);
          return related ? String(related[rel.label] ?? "") : "";
        })
        .join(" ");
      return `${haystack} ${relations}`.toLowerCase().includes(term);
    });
  }, [rows, search, filters, config, find]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function openCreate() {
    setEditing(null);
    setForm({ ...(config.defaults ?? {}) });
    setDrawerOpen(true);
  }

  function openEdit(row: Row) {
    setEditing(row);
    const initial: Row = {};
    for (const field of config.fields) {
      let value = row[field.key] ?? "";
      if (typeof value === "boolean") value = value ? "true" : "false";
      initial[field.key] = value;
    }
    setForm(initial);
    setDrawerOpen(true);
  }

  async function submit() {
    for (const field of config.fields) {
      if (field.required && (form[field.key] === "" || form[field.key] === undefined || form[field.key] === null)) {
        toast(`يرجى إدخال ${field.label}`, "error");
        return;
      }
    }
    const payload: Row = {};
    for (const field of config.fields) payload[field.key] = form[field.key] ?? "";
    setSaving(true);
    const result = editing
      ? await update(config.resource, Number(editing.id), payload)
      : await create(config.resource, payload);
    setSaving(false);
    if (result) {
      setDrawerOpen(false);
      setEditing(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await remove(config.resource, Number(deleteTarget.id));
    setDeleting(false);
    setDeleteTarget(null);
  }

  function exportCsv() {
    const headers = config.columns.map((c) => c.label);
    const lines = filtered.map((row) =>
      config.columns.map((col) => {
        let value: any = row[col.key];
        if (col.kind === "relation" && col.relation) value = find(col.relation, value)?.[col.relationLabel ?? "name"] ?? value;
        if (col.options) value = col.options.find((o) => o.value === value)?.label ?? value;
        if (col.kind === "money") value = `${value ?? 0} ${row.currency ?? "EGP"}`;
        return `"${String(value ?? "").replace(/"/g, '""')}"`;
      }).join(","),
    );
    const blob = new Blob(["\uFEFF" + [headers.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${config.resource}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast("تم تصدير الملف بنجاح");
  }

  const summary = useMemo(() => {
    const doneValues = ["active", "released", "delivered", "paid", "approved", "accepted", "connected", "done"];
    const pendingValues = ["pending", "new", "documents", "in_progress", "required", "review"];
    return {
      total: rows.length,
      done: rows.filter((r) => doneValues.includes(String(r.status))).length,
      pending: rows.filter((r) => pendingValues.includes(String(r.status))).length,
    };
  }, [rows]);

  const Icon = config.icon;
  const hasFilters = Boolean(config.filters?.length);

  return (
    <div>
      <PageHeader
        title={config.title}
        subtitle={config.subtitle}
        icon={<Icon size={21} />}
        badge={<span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">{formatNumber(summary.total)} سجل</span>}
        actions={
          <>
            {extraActions}
            <button className="btn-ghost" onClick={() => void refresh()} title="تحديث البيانات"><RefreshCw size={15} /> تحديث</button>
            <ExportBar
              filename={config.resource}
              title={config.title}
              rows={filtered.map((row) => Object.fromEntries(config.columns.map((col) => {
                const related = col.kind === "relation" && col.relation ? find(col.relation, row[col.key]) : undefined;
                return [col.label, related?.[col.relationLabel ?? "name"] ?? row[col.key] ?? ""];
              })))}
            />
            <button className="btn-ghost" onClick={exportCsv} title="تصدير CSV"><Download size={15} /> CSV</button>
            {!hideAdd && <button className="btn-primary" onClick={openCreate}><Plus size={16} /> {config.addLabel}</button>}
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: `إجمالي ${config.title}`, value: summary.total, color: "text-teal-600 bg-teal-50" },
          { label: "مكتملة / نشطة", value: summary.done, color: "text-emerald-600 bg-emerald-50" },
          { label: "قيد المتابعة", value: summary.pending, color: "text-amber-600 bg-amber-50" },
          { label: "نتائج البحث الحالية", value: filtered.length, color: "text-sky-600 bg-sky-50" },
        ].map((item) => (
          <div key={item.label} className="card flex items-center gap-3 px-4 py-3">
            <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-bold ${item.color}`}>{formatNumber(item.value)}</div>
            <span className="text-[11px] font-semibold leading-5 text-slate-600">{item.label}</span>
          </div>
        ))}
      </div>

      <SectionCard
        title={`قائمة ${config.title}`}
        subtitle="يمكنك البحث والتصفية وتعديل أو حذف أي سجل مباشرة"
        bodyClassName=""
      >
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="field pe-10"
              placeholder={config.searchPlaceholder ?? "بحث..."}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          {hasFilters && (
            <div className="flex flex-wrap items-center gap-2">
              <SlidersHorizontal size={15} className="hidden text-slate-400 sm:block" />
              {config.filters?.map((filter) => (
                <select
                  key={filter.key}
                  className="field w-auto min-w-32 py-2 text-xs"
                  value={filters[filter.key] ?? ""}
                  onChange={(e) => { setFilters((prev) => ({ ...prev, [filter.key]: e.target.value })); setPage(1); }}
                >
                  <option value="">{filter.label}: الكل</option>
                  {filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              ))}
              {Object.values(filters).some(Boolean) && (
                <button className="text-slate-400 hover:text-rose-500" onClick={() => setFilters({})} title="مسح التصفية"><X size={16} /></button>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <TableSkeleton rows={6} cols={config.columns.length} />
        ) : error ? (
          <EmptyState title="تعذر تحميل البيانات" description={error} actionLabel="إعادة المحاولة" onAction={() => void refresh()} />
        ) : visible.length === 0 ? (
          <EmptyState
            title={search || Object.values(filters).some(Boolean) ? "لا توجد نتائج مطابقة" : `لا يوجد ${config.singular} حتى الآن`}
            description={search || Object.values(filters).some(Boolean) ? "جرّب تعديل كلمات البحث أو مسح عوامل التصفية." : `ابدأ بإضافة أول ${config.singular} لتظهر البيانات هنا.`}
            actionLabel={search || Object.values(filters).some(Boolean) ? undefined : config.addLabel}
            onAction={openCreate}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-right">
              <thead>
                <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500">
                  {config.columns.map((col) => <th key={col.key} className="whitespace-nowrap px-4 py-3">{col.label}</th>)}
                  <th className="whitespace-nowrap px-4 py-3">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick?.(row)}
                    className={`table-row-hover border-t border-slate-100 transition-colors ${onRowClick ? "cursor-pointer" : ""} ${row._pending ? "opacity-60" : ""}`}
                  >
                    {config.columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 align-middle"><Cell col={col} row={row} find={find} /></td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {onRowClick && (
                          <button onClick={(e) => { e.stopPropagation(); onRowClick(row); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-sky-50 hover:text-sky-600" title="فتح الملف"><Eye size={15} /></button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); openEdit(row); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-teal-50 hover:text-teal-600" title="تعديل"><Pencil size={15} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="حذف"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
          <p className="text-[11px] text-slate-500">
            عرض <span className="font-bold text-slate-700">{filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)}</span> من {formatNumber(filtered.length)} سجل
          </p>
          <div className="flex items-center gap-1.5">
            <button className="btn-ghost px-2.5 py-1.5" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronRight size={15} /></button>
            <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600">{currentPage} / {totalPages}</span>
            <button className="btn-ghost px-2.5 py-1.5" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}><ChevronLeft size={15} /></button>
          </div>
        </div>
      </SectionCard>

      <Drawer
        open={drawerOpen}
        title={editing ? `تعديل ${config.singular}` : config.addLabel}
        subtitle={editing ? `رقم السجل #${editing.id}` : "أدخل البيانات المطلوبة ثم اضغط حفظ"}
        onClose={() => { setDrawerOpen(false); setEditing(null); }}
        width={config.fields.length > 12 ? "max-w-3xl" : "max-w-xl"}
        footer={
          <div className="flex items-center justify-between gap-3">
            <p className="hidden text-[11px] text-slate-400 sm:block">الحقول المعلّمة بـ * إلزامية</p>
            <div className="flex flex-1 gap-2 sm:flex-none">
              <button className="btn-ghost flex-1 sm:flex-none" onClick={() => { setDrawerOpen(false); setEditing(null); }}>إلغاء</button>
              <button className="btn-primary flex-1 sm:flex-none" onClick={() => void submit()} disabled={saving}>
                {saving ? "جاري الحفظ..." : editing ? "حفظ التعديلات" : "إضافة وحفظ"}
              </button>
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {config.fields.map((field) => (
            <div key={field.key} className={field.wide ? "sm:col-span-2" : ""}>
              <FieldInput
                label={field.label}
                type={field.options || field.relation ? "select" : field.type ?? "text"}
                options={resolveOptions(field, data)}
                value={form[field.key]}
                onChange={(value) => setForm((prev) => ({ ...prev, [field.key]: value }))}
                placeholder={field.placeholder}
                required={field.required}
                hint={field.hint}
              />
            </div>
          ))}
        </div>
      </Drawer>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`حذف ${config.singular}؟`}
        description={`سيتم حذف «${deleteTarget?.[config.columns[0]?.key] ?? ""}» نهائياً من قاعدة البيانات. لا يمكن التراجع عن هذا الإجراء.`}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        loading={deleting}
      />
    </div>
  );
}
