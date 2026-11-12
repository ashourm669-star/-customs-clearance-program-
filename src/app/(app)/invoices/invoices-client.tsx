"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Pencil,
  Plus,
  Printer,
  Receipt,
  Search,
  Trash2,
  Wallet,
} from "lucide-react";
import { Badge, EmptyState, Field, Modal, PageHeader, Progress, Spinner, StatCard, cx } from "@/components/ui";
import { useToast } from "@/components/toast";
import { INVOICE_STATUSES, INVOICE_STATUS_META, type InvoiceStatus } from "@/lib/constants";
import { formatDate, formatMoney, formatNumber, todayInputValue } from "@/lib/format";
import type { InvoiceRow } from "@/lib/types";

type Option = { id: number; name: string };
type ShipmentOption = { id: number; reference: string; clientId: number | null; fees: number };

function emptyForm() {
  return {
    number: "",
    clientId: "",
    shipmentId: "",
    issueDate: todayInputValue(new Date()).slice(0, 10),
    dueDate: "",
    subtotal: "0",
    taxAmount: "0",
    paidAmount: "0",
    status: "sent",
    notes: "",
  };
}

export function InvoicesClient({
  initialInvoices,
  clients,
  shipments,
}: {
  initialInvoices: InvoiceRow[];
  clients: Option[];
  shipments: ShipmentOption[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [invoices, setInvoices] = useState(initialInvoices);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InvoiceRow | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<InvoiceRow | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("0");
  const [deleteTarget, setDeleteTarget] = useState<InvoiceRow | null>(null);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const matchesStatus = status === "all" || invoice.status === status;
      const matchesSearch =
        !search ||
        [invoice.number, invoice.clientName, invoice.shipmentReference]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search));
      return matchesStatus && matchesSearch;
    });
  }, [invoices, query, status]);

  const stats = useMemo(() => {
    const total = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
    const paid = invoices.reduce((sum, invoice) => sum + invoice.paidAmount, 0);
    const overdue = invoices
      .filter((invoice) => invoice.status === "overdue")
      .reduce((sum, invoice) => sum + (invoice.total - invoice.paidAmount), 0);
    return { total, paid, outstanding: total - paid, overdue, count: invoices.length };
  }, [invoices]);

  function startCreate() {
    setEditing(null);
    setForm(emptyForm());
    setError(null);
    setOpen(true);
  }

  function startEdit(invoice: InvoiceRow) {
    setEditing(invoice);
    setForm({
      number: invoice.number,
      clientId: invoice.clientId ? String(invoice.clientId) : "",
      shipmentId: invoice.shipmentId ? String(invoice.shipmentId) : "",
      issueDate: invoice.issueDate.slice(0, 10),
      dueDate: invoice.dueDate ? invoice.dueDate.slice(0, 10) : "",
      subtotal: String(invoice.subtotal),
      taxAmount: String(invoice.taxAmount),
      paidAmount: String(invoice.paidAmount),
      status: invoice.status,
      notes: invoice.notes ?? "",
    });
    setError(null);
    setOpen(true);
  }

  function pickShipment(shipmentId: string) {
    const shipment = shipments.find((item) => item.id === Number(shipmentId));
    setForm((current) => ({
      ...current,
      shipmentId,
      clientId: shipment?.clientId ? String(shipment.clientId) : current.clientId,
      subtotal: shipment ? String(shipment.fees) : current.subtotal,
      taxAmount: shipment ? String(Math.round(shipment.fees * 0.14)) : current.taxAmount,
    }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.clientId) {
      setError("اختر العميل.");
      return;
    }
    const subtotal = Number(form.subtotal || 0);
    const taxAmount = Number(form.taxAmount || 0);
    if (subtotal + taxAmount <= 0) {
      setError("أدخل قيمة للفاتورة قبل الحفظ.");
      return;
    }
    setSaving(true);
    setError(null);

    const clientName = clients.find((client) => client.id === Number(form.clientId))?.name ?? null;
    const shipmentReference = shipments.find((shipment) => shipment.id === Number(form.shipmentId))?.reference ?? null;
    const total = subtotal + taxAmount;
    const paidAmount = Math.min(Number(form.paidAmount || 0), total);

    if (editing) {
      const previous = editing;
      const optimistic: InvoiceRow = {
        ...editing,
        ...form,
        clientId: Number(form.clientId),
        clientName,
        shipmentId: Number(form.shipmentId) || null,
        shipmentReference,
        subtotal,
        taxAmount,
        total,
        paidAmount,
        issueDate: new Date(form.issueDate).toISOString(),
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      };
      setInvoices((current) => current.map((item) => (item.id === editing.id ? optimistic : item)));
      try {
        const response = await fetch(`/api/invoices/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!response.ok) throw new Error();
        const data = (await response.json()) as { invoice: InvoiceRow };
        setInvoices((current) => current.map((item) => (item.id === editing.id ? data.invoice : item)));
        toast({ title: "تم تحديث الفاتورة", description: optimistic.number, tone: "success" });
        setOpen(false);
        setEditing(null);
        router.refresh();
      } catch {
        setInvoices((current) => current.map((item) => (item.id === previous.id ? previous : item)));
        setError("تعذّر تحديث الفاتورة.");
      } finally {
        setSaving(false);
      }
      return;
    }

    const tempId = -Date.now();
    const optimistic: InvoiceRow = {
      id: tempId,
      number: form.number || `INV-جديد`,
      shipmentId: Number(form.shipmentId) || null,
      clientId: Number(form.clientId),
      clientName,
      shipmentReference,
      issueDate: new Date(form.issueDate || Date.now()).toISOString(),
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      subtotal,
      taxAmount,
      total,
      paidAmount,
      status: form.status,
      notes: form.notes || null,
      createdAt: new Date().toISOString(),
    };
    setInvoices((current) => [optimistic, ...current]);
    try {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, subtotal, taxAmount, paidAmount }),
      });
      const data = (await response.json()) as { invoice?: InvoiceRow; error?: string };
      if (!response.ok || !data.invoice) throw new Error(data.error ?? "");
      setInvoices((current) => current.map((item) => (item.id === tempId ? data.invoice! : item)));
      toast({ title: "تم إصدار الفاتورة", description: data.invoice.number, tone: "success" });
      setOpen(false);
      setForm(emptyForm());
      router.refresh();
    } catch {
      setInvoices((current) => current.filter((item) => item.id !== tempId));
      setError("تعذّر إصدار الفاتورة، تحقق من البيانات.");
    } finally {
      setSaving(false);
    }
  }

  async function applyPayment(full: boolean) {
    if (!paymentTarget) return;
    const target = paymentTarget;
    const newPaid = full ? target.total : Math.min(target.total, target.paidAmount + Number(paymentAmount || 0));
    if (newPaid <= target.paidAmount) {
      toast({ title: "أدخل مبلغاً صحيحاً", tone: "error" });
      return;
    }
    setInvoices((current) =>
      current.map((item) =>
        item.id === target.id
          ? { ...item, paidAmount: newPaid, status: newPaid >= item.total ? "paid" : "partially_paid" }
          : item,
      ),
    );
    setPaymentTarget(null);
    setPaymentAmount("0");
    try {
      const response = await fetch(`/api/invoices/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paidAmount: newPaid }),
      });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { invoice: InvoiceRow };
      setInvoices((current) => current.map((item) => (item.id === target.id ? data.invoice : item)));
      toast({ title: "تم تسجيل الدفعة", description: `${target.number} — ${formatMoney(newPaid - target.paidAmount)}`, tone: "success" });
      router.refresh();
    } catch {
      setInvoices((current) => current.map((item) => (item.id === target.id ? target : item)));
      toast({ title: "تعذّر تسجيل الدفعة", tone: "error" });
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    const snapshot = invoices;
    setInvoices((current) => current.filter((item) => item.id !== target.id));
    try {
      const response = await fetch(`/api/invoices/${target.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      toast({ title: "تم حذف الفاتورة", description: target.number, tone: "success" });
      router.refresh();
    } catch {
      setInvoices(snapshot);
      toast({ title: "تعذّر حذف الفاتورة", tone: "error" });
    }
  }

  const previewTotal = Number(form.subtotal || 0) + Number(form.taxAmount || 0);

  return (
    <div>
      <PageHeader title="الفواتير والتحصيل" description="إصدار فواتير الرسوم الجمركية والأتعاب ومتابعة التحصيل والمستحقات.">
        <button type="button" onClick={startCreate} className="btn btn-primary no-print">
          <Plus className="size-4" />
          فاتورة جديدة
        </button>
      </PageHeader>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="إجمالي الفواتير" value={formatMoney(stats.total)} icon={<Receipt className="size-5" />} accent="#0ea5e9" hint={`${formatNumber(stats.count)} فاتورة`} />
        <StatCard label="المحصّل" value={formatMoney(stats.paid)} icon={<Banknote className="size-5" />} accent="#10b981" hint="مدفوعات مؤكدة" />
        <StatCard label="قيد التحصيل" value={formatMoney(stats.outstanding)} icon={<Clock className="size-5" />} accent="#f59e0b" hint="مستحقات مفتوحة" />
        <StatCard label="متأخرة" value={formatMoney(stats.overdue)} icon={<Wallet className="size-5" />} accent="#f43f5e" hint="تجاوزت تاريخ الاستحقاق" />
      </div>

      <div className="card mb-4 flex flex-wrap items-center gap-2 p-3 no-print">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input className="input h-10 pr-9" placeholder="بحث برقم الفاتورة أو العميل…" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setStatus("all")}
            className={cx("rounded-full px-3 py-1.5 text-[11px] font-bold", status === "all" ? "bg-[#0a2239] text-white" : "bg-slate-100 text-slate-600")}
          >
            الكل
          </button>
          {INVOICE_STATUSES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setStatus(option)}
              className={cx("rounded-full px-3 py-1.5 text-[11px] font-bold", status === option ? "bg-[#0a2239] text-white" : "bg-slate-100 text-slate-600")}
            >
              {INVOICE_STATUS_META[option].label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => window.print()} className="btn btn-ghost h-10 px-3 text-[11px]">
          <Printer className="size-4" /> طباعة
        </button>
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            title={invoices.length === 0 ? "لا توجد فواتير بعد" : "لا توجد فواتير مطابقة"}
            description="أنشئ فاتورة لملف تخليص وستُحسب الرسوم والأتعاب تلقائياً."
            icon={<Receipt className="size-7" />}
            action={
              <button type="button" className="btn btn-primary" onClick={startCreate}>
                <Plus className="size-4" /> إصدار فاتورة
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="th">الفاتورة</th>
                  <th className="th">العميل / الملف</th>
                  <th className="th">التواريخ</th>
                  <th className="th">القيمة</th>
                  <th className="th">التحصيل</th>
                  <th className="th">الحالة</th>
                  <th className="th text-left no-print">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((invoice) => {
                  const meta = INVOICE_STATUS_META[invoice.status as InvoiceStatus] ?? INVOICE_STATUS_META.draft;
                  const remaining = invoice.total - invoice.paidAmount;
                  return (
                    <tr key={invoice.id} className={cx("hover:bg-slate-50/60", invoice.id < 0 && "opacity-60")}>
                      <td className="td">
                        <p className="font-extrabold text-[#0a2239]">{invoice.number}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">أُصدرت {formatDate(invoice.issueDate)}</p>
                      </td>
                      <td className="td">
                        <p className="text-[12px] font-semibold text-slate-800">{invoice.clientName ?? "—"}</p>
                        {invoice.shipmentId ? (
                          <Link href={`/shipments/${invoice.shipmentId}`} className="text-[10px] font-bold text-[#0f9d8b] hover:underline">
                            {invoice.shipmentReference}
                          </Link>
                        ) : (
                          <span className="text-[10px] text-slate-400">بدون ملف</span>
                        )}
                      </td>
                      <td className="td text-[11px]">
                        <p className="text-slate-600">إصدار: {formatDate(invoice.issueDate)}</p>
                        <p className="text-slate-400">استحقاق: {formatDate(invoice.dueDate)}</p>
                      </td>
                      <td className="td">
                        <p className="text-[12px] font-extrabold text-slate-900">{formatMoney(invoice.total)}</p>
                        <p className="text-[10px] text-slate-400">
                          رسوم {formatMoney(invoice.subtotal)} + ض {formatMoney(invoice.taxAmount)}
                        </p>
                      </td>
                      <td className="td">
                        <div className="min-w-[110px]">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-emerald-600">{formatMoney(invoice.paidAmount)}</span>
                            <span className="text-slate-400">متبقي {formatMoney(remaining)}</span>
                          </div>
                          <div className="mt-1">
                            <Progress value={(invoice.paidAmount / Math.max(1, invoice.total)) * 100} color="#10b981" />
                          </div>
                        </div>
                      </td>
                      <td className="td">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </td>
                      <td className="td no-print">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentTarget(invoice);
                              setPaymentAmount(String(invoice.total - invoice.paidAmount));
                            }}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-emerald-50 hover:text-emerald-600"
                            aria-label="تسجيل دفعة"
                          >
                            <CircleDollarSign className="size-4" />
                          </button>
                          <button type="button" onClick={() => startEdit(invoice)} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-[#0f9d8b]" aria-label="تعديل">
                            <Pencil className="size-4" />
                          </button>
                          <button type="button" onClick={() => setDeleteTarget(invoice)} className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" aria-label="حذف">
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
        size="lg"
        title={editing ? `تعديل الفاتورة ${editing.number}` : "إصدار فاتورة جديدة"}
        description="اختر ملف التخليص لتُحسب الرسوم تلقائياً، أو أدخل القيم يدوياً."
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              إلغاء
            </button>
            <button type="submit" form="invoice-form" className="btn btn-primary" disabled={saving}>
              {saving ? <Spinner /> : <Plus className="size-4" />}
              {editing ? "حفظ التعديلات" : "إصدار الفاتورة"}
            </button>
          </>
        }
      >
        <form id="invoice-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="رقم الفاتورة" hint="يُولَّد تلقائياً إذا تُرك فارغاً">
            <input className="input" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} placeholder="INV-2026-2000" />
          </Field>
          <Field label="ملف التخليص">
            <select className="input" value={form.shipmentId} onChange={(e) => pickShipment(e.target.value)}>
              <option value="">— بدون ملف —</option>
              {shipments.map((shipment) => (
                <option key={shipment.id} value={shipment.id}>
                  {shipment.reference}
                </option>
              ))}
            </select>
          </Field>
          <Field label="العميل" required>
            <select className="input" value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} required>
              <option value="">— اختر العميل —</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="حالة الفاتورة">
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {INVOICE_STATUSES.map((option) => (
                <option key={option} value={option}>
                  {INVOICE_STATUS_META[option].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="تاريخ الإصدار">
            <input type="date" className="input" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
          </Field>
          <Field label="تاريخ الاستحقاق">
            <input type="date" className="input" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </Field>
          <Field label="قيمة الرسوم والأتعاب (ج.م)">
            <input type="number" min="0" className="input" value={form.subtotal} onChange={(e) => setForm({ ...form, subtotal: e.target.value })} />
          </Field>
          <Field label="ضريبة القيمة المضافة (ج.م)">
            <input type="number" min="0" className="input" value={form.taxAmount} onChange={(e) => setForm({ ...form, taxAmount: e.target.value })} />
          </Field>
          <Field label="المدفوع مقدماً (ج.م)">
            <input type="number" min="0" className="input" value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: e.target.value })} />
          </Field>
          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
            <p className="text-[10px] text-slate-500">إجمالي الفاتورة</p>
            <p className="text-lg font-extrabold text-slate-900">{formatMoney(previewTotal)}</p>
          </div>
          <Field label="ملاحظات" className="sm:col-span-2">
            <textarea className="input min-h-16 resize-y" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </Field>
          {error ? (
            <div className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200 sm:col-span-2">{error}</div>
          ) : null}
        </form>
      </Modal>

      <Modal
        open={Boolean(paymentTarget)}
        onClose={() => setPaymentTarget(null)}
        title={`تسجيل دفعة — ${paymentTarget?.number ?? ""}`}
        description={`المتبقي على الفاتورة ${formatMoney((paymentTarget?.total ?? 0) - (paymentTarget?.paidAmount ?? 0))}`}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setPaymentTarget(null)}>
              إلغاء
            </button>
            <button type="button" className="btn btn-mint" onClick={() => applyPayment(true)}>
              <CheckCircle2 className="size-4" /> سداد كامل
            </button>
            <button type="button" className="btn btn-primary" onClick={() => applyPayment(false)}>
              تسجيل الدفعة
            </button>
          </>
        }
      >
        <Field label="قيمة الدفعة (ج.م)">
          <input type="number" min="0" className="input" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} />
        </Field>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="حذف الفاتورة"
        description="سيتم حذف الفاتورة نهائياً من سجل التحصيل."
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>
              إلغاء
            </button>
            <button type="button" className="btn btn-danger" onClick={confirmDelete}>
              <Trash2 className="size-4" /> تأكيد الحذف
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-600">هل تريد حذف الفاتورة {deleteTarget?.number}؟</p>
      </Modal>
    </div>
  );
}
