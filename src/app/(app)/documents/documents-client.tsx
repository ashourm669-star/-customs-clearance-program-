"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  FileCheck2,
  FileStack,
  FileWarning,
  Plus,
  Search,
  ShieldAlert,
  Camera,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Badge, EmptyState, Field, Modal, PageHeader, Spinner, StatCard, cx } from "@/components/ui";
import { useToast } from "@/components/toast";
import { DOC_STATUSES, DOC_STATUS_META, DOC_TYPES, DOC_TYPE_META } from "@/lib/constants";
import { formatDate, formatNumber } from "@/lib/format";
import type { DocumentItem } from "@/lib/types";

type ShipmentOption = { id: number; reference: string; clientName: string | null };

export function DocumentsClient({
  initialDocuments,
  shipments,
}: {
  initialDocuments: DocumentItem[];
  shipments: ShipmentOption[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [documents, setDocuments] = useState(initialDocuments);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ shipmentId: "", name: "", type: "commercial_invoice", sizeKb: "280" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return documents.filter((doc) => {
      const matchesStatus = status === "all" || doc.status === status;
      const matchesType = type === "all" || doc.type === type;
      const matchesSearch =
        !search ||
        [doc.name, doc.shipmentReference, doc.clientName].filter(Boolean).some((value) => String(value).toLowerCase().includes(search));
      return matchesStatus && matchesType && matchesSearch;
    });
  }, [documents, query, status, type]);

  const counts = useMemo(
    () => ({
      total: documents.length,
      pending: documents.filter((doc) => doc.status === "pending").length,
      approved: documents.filter((doc) => doc.status === "approved").length,
      rejected: documents.filter((doc) => doc.status === "rejected").length,
    }),
    [documents],
  );

  async function captureDocument(file: File) {
    const activeShipment = shipments[0];
    if (!activeShipment) { toast({ title: "لا يوجد ملف تخليص لإضافة الصورة إليه", tone: "error" }); return; }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("shipmentId", String(activeShipment.id));
      formData.append("name", file.name || `صورة مستند ${new Date().toLocaleString("ar-EG")}`);
      const response = await fetch("/api/documents/upload", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "تعذّر رفع الصورة");
      setDocuments((current) => [data.document, ...current]);
      toast({ title: "تم رفع الصورة وتصنيفها كمستند", description: `${activeShipment.reference} — بانتظار المراجعة`, tone: "success" });
      router.refresh();
    } catch (caught) { toast({ title: "تعذّر رفع الصورة", description: caught instanceof Error ? caught.message : undefined, tone: "error" }); }
    finally { setSaving(false); }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.shipmentId) {
      setError("اختر ملف التخليص.");
      return;
    }
    if (!form.name.trim()) {
      setError("اسم المستند مطلوب.");
      return;
    }
    setSaving(true);
    setError(null);
    const shipment = shipments.find((item) => item.id === Number(form.shipmentId));
    const tempId = -Date.now();
    const optimistic: DocumentItem = {
      id: tempId,
      shipmentId: Number(form.shipmentId),
      shipmentReference: shipment?.reference ?? "—",
      clientName: shipment?.clientName ?? null,
      name: form.name,
      type: form.type,
      status: "pending",
      sizeKb: Number(form.sizeKb || 0),
      uploadedBy: "أنت",
      createdAt: new Date().toISOString(),
    };
    setDocuments((current) => [optimistic, ...current]);
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, sizeKb: Number(form.sizeKb || 0) }),
      });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { document: DocumentItem };
      setDocuments((current) => current.map((item) => (item.id === tempId ? data.document : item)));
      toast({ title: "تم تسجيل المستند", description: form.name, tone: "success" });
      setOpen(false);
      setForm({ shipmentId: "", name: "", type: "commercial_invoice", sizeKb: "280" });
      router.refresh();
    } catch {
      setDocuments((current) => current.filter((item) => item.id !== tempId));
      setError("تعذّر تسجيل المستند.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(doc: DocumentItem, nextStatus: string) {
    const snapshot = documents;
    setDocuments((current) => current.map((item) => (item.id === doc.id ? { ...item, status: nextStatus } : item)));
    try {
      const response = await fetch(`/api/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) throw new Error();
      toast({ title: `تم تحديث المستند إلى «${DOC_STATUS_META[nextStatus].label}»`, description: doc.name, tone: nextStatus === "rejected" ? "error" : "success" });
      router.refresh();
    } catch {
      setDocuments(snapshot);
      toast({ title: "تعذّر تحديث المستند", tone: "error" });
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    const snapshot = documents;
    setDocuments((current) => current.filter((item) => item.id !== target.id));
    try {
      const response = await fetch(`/api/documents/${target.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      toast({ title: "تم حذف المستند", description: target.name, tone: "success" });
      router.refresh();
    } catch {
      setDocuments(snapshot);
      toast({ title: "تعذّر حذف المستند", tone: "error" });
    }
  }

  return (
    <div>
      <PageHeader title="مركز المستندات" description="كل مستندات التخليص في مكان واحد: فواتير، بوالص، شهادات منشأ وتصاريح.">
        <label className="btn btn-ghost cursor-pointer">
          <Camera className="size-4" />
          تصوير مستند
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            await captureDocument(file);
          }} />
        </label>
        <button type="button" onClick={() => setOpen(true)} className="btn btn-primary">
          <Plus className="size-4" />
          تسجيل مستند
        </button>
      </PageHeader>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="إجمالي المستندات" value={formatNumber(counts.total)} icon={<FileStack className="size-5" />} accent="#0ea5e9" hint="كل الملفات" />
        <StatCard label="بانتظار المراجعة" value={formatNumber(counts.pending)} icon={<FileWarning className="size-5" />} accent="#f59e0b" hint="تحتاج إجراء" />
        <StatCard label="معتمدة" value={formatNumber(counts.approved)} icon={<FileCheck2 className="size-5" />} accent="#10b981" hint="جاهزة للتخليص" />
        <StatCard label="مرفوضة" value={formatNumber(counts.rejected)} icon={<ShieldAlert className="size-5" />} accent="#f43f5e" hint="تحتاج استبدال" />
      </div>

      <div className="card mb-4 flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input className="input h-10 pr-9" placeholder="بحث باسم المستند أو رقم الملف…" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <select className="input h-10 w-auto" value={type} onChange={(event) => setType(event.target.value)}>
          <option value="all">كل الأنواع</option>
          {DOC_TYPES.map((option) => (
            <option key={option} value={option}>
              {DOC_TYPE_META[option].label}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setStatus("all")}
            className={cx("rounded-full px-3 py-1.5 text-[11px] font-bold", status === "all" ? "bg-[#0a2239] text-white" : "bg-slate-100 text-slate-600")}
          >
            الكل
          </button>
          {DOC_STATUSES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setStatus(option)}
              className={cx("rounded-full px-3 py-1.5 text-[11px] font-bold", status === option ? "bg-[#0a2239] text-white" : "bg-slate-100 text-slate-600")}
            >
              {DOC_STATUS_META[option].label}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            title={documents.length === 0 ? "لا توجد مستندات" : "لا توجد مستندات مطابقة"}
            description="سجّل الفواتير والبوالص لتبدأ مراجعة المستندات واعتمادها."
            icon={<FileStack className="size-7" />}
            action={
              <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
                <Upload className="size-4" /> تسجيل مستند
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="th">المستند</th>
                  <th className="th">النوع</th>
                  <th className="th">ملف التخليص</th>
                  <th className="th">أُضيف بواسطة</th>
                  <th className="th">التاريخ</th>
                  <th className="th">الحالة</th>
                  <th className="th text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((doc) => {
                  const meta = DOC_STATUS_META[doc.status] ?? DOC_STATUS_META.pending;
                  return (
                    <tr key={doc.id} className={cx("hover:bg-slate-50/60", doc.id < 0 && "opacity-60")}>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <span className="flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                            <FileStack className="size-4" />
                          </span>
                          <div>
                            <p className="max-w-[240px] truncate text-[12px] font-bold text-slate-800">{doc.name}</p>
                            <p className="text-[10px] text-slate-400">{formatNumber(doc.sizeKb)} KB</p>
                          </div>
                        </div>
                      </td>
                      <td className="td">
                        <Badge tone="slate">{DOC_TYPE_META[doc.type as keyof typeof DOC_TYPE_META]?.label ?? doc.type}</Badge>
                      </td>
                      <td className="td">
                        <Link href={`/shipments/${doc.shipmentId}`} className="text-[11px] font-bold text-[#0f9d8b] hover:underline">
                          {doc.shipmentReference}
                        </Link>
                        <p className="text-[10px] text-slate-400">{doc.clientName ?? "—"}</p>
                      </td>
                      <td className="td text-[11px] text-slate-600">{doc.uploadedBy ?? "—"}</td>
                      <td className="td text-[10px] text-slate-500">{formatDate(doc.createdAt)}</td>
                      <td className="td">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </td>
                      <td className="td">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => changeStatus(doc, "approved")}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                            aria-label="اعتماد"
                          >
                            <Check className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => changeStatus(doc, "rejected")}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                            aria-label="رفض"
                          >
                            <X className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(doc)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
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
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="تسجيل مستند جديد"
        description="أضف المستند إلى ملف التخليص المناسب ليراجعه فريق التخليص."
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              إلغاء
            </button>
            <button type="submit" form="new-doc-form" className="btn btn-primary" disabled={saving}>
              {saving ? <Spinner /> : <Upload className="size-4" />}
              حفظ المستند
            </button>
          </>
        }
      >
        <form id="new-doc-form" onSubmit={submit} className="space-y-4">
          <Field label="ملف التخليص" required>
            <select className="input" value={form.shipmentId} onChange={(event) => setForm({ ...form, shipmentId: event.target.value })} required>
              <option value="">— اختر الملف —</option>
              {shipments.map((shipment) => (
                <option key={shipment.id} value={shipment.id}>
                  {shipment.reference} — {shipment.clientName ?? "بدون عميل"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="اختيار ملف من الجهاز" hint="سيتم تسجيل اسم الملف وحجمه بالسجل">
            <input
              type="file"
              className="input py-2 text-xs"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) setForm({ ...form, name: file.name, sizeKb: String(Math.max(1, Math.round(file.size / 1024))) });
              }}
            />
          </Field>
          <Field label="اسم المستند" required>
            <input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="فاتورة تجارية.pdf" required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="نوع المستند">
              <select className="input" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
                {DOC_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {DOC_TYPE_META[option].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="الحجم (KB)">
              <input type="number" min="1" className="input" value={form.sizeKb} onChange={(event) => setForm({ ...form, sizeKb: event.target.value })} />
            </Field>
          </div>
          {error ? <div className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">{error}</div> : null}
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="حذف المستند"
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>
              إلغاء
            </button>
            <button type="button" className="btn btn-danger" onClick={confirmDelete}>
              <Trash2 className="size-4" /> حذف
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">سيتم حذف المستند «{deleteTarget?.name}» نهائياً.</p>
      </Modal>
    </div>
  );
}
