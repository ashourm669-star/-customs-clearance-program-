"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CreditCard,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { Avatar, Badge, EmptyState, Field, Modal, PageHeader, Spinner, StatCard, cx } from "@/components/ui";
import { useToast } from "@/components/toast";
import { formatMoney, formatNumber } from "@/lib/format";
import type { ClientRow } from "@/lib/types";

const EMPTY_FORM = {
  name: "",
  nameEn: "",
  contactName: "",
  email: "",
  phone: "",
  taxId: "",
  country: "مصر",
  city: "",
  industry: "",
  address: "",
  creditLimit: "0",
  notes: "",
};

export function ClientsClient({ initialClients }: { initialClients: ClientRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [clients, setClients] = useState(initialClients);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClientRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return clients;
    return clients.filter((client) =>
      [client.name, client.contactName, client.city, client.industry, client.email, client.taxId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search)),
    );
  }, [clients, query]);

  const totals = useMemo(
    () => ({
      count: clients.length,
      shipments: clients.reduce((sum, client) => sum + client.shipmentCount, 0),
      invoiced: clients.reduce((sum, client) => sum + client.invoiceTotal, 0),
      outstanding: clients.reduce((sum, client) => sum + client.outstanding, 0),
    }),
    [clients],
  );

  function autofillClient(value: string, byTaxId = false) {
    const match = clients.find((client) => byTaxId ? client.taxId === value.trim() : client.name.trim() === value.trim());
    if (!match) return;
    setForm((current) => ({
      ...current,
      name: match.name,
      nameEn: match.nameEn ?? "",
      contactName: match.contactName ?? "",
      email: match.email ?? "",
      phone: match.phone ?? "",
      taxId: match.taxId ?? "",
      country: match.country ?? "مصر",
      city: match.city ?? "",
      industry: match.industry ?? "",
      address: match.address ?? "",
      creditLimit: String(match.creditLimit ?? 0),
      notes: match.notes ?? "",
    }));
    toast({ title: "تم استكمال بيانات العميل من السجل المحفوظ", description: match.name, tone: "success" });
  }

  function startCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setError(null);
    setOpen(true);
  }

  function startEdit(client: ClientRow) {
    setEditing(client);
    setForm({
      name: client.name,
      nameEn: client.nameEn ?? "",
      contactName: client.contactName ?? "",
      email: client.email ?? "",
      phone: client.phone ?? "",
      taxId: client.taxId ?? "",
      country: client.country ?? "مصر",
      city: client.city ?? "",
      industry: client.industry ?? "",
      address: client.address ?? "",
      creditLimit: String(client.creditLimit ?? 0),
      notes: client.notes ?? "",
    });
    setError(null);
    setOpen(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (form.name.trim().length < 2) {
      setError("اسم العميل مطلوب.");
      return;
    }
    setSaving(true);
    setError(null);

    if (editing) {
      const previous = editing;
      const optimistic: ClientRow = {
        ...editing,
        ...form,
        creditLimit: Number(form.creditLimit || 0),
      };
      setClients((current) => current.map((item) => (item.id === editing.id ? optimistic : item)));
      try {
        const response = await fetch(`/api/clients/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!response.ok) throw new Error();
        const data = (await response.json()) as { client: ClientRow };
        setClients((current) => current.map((item) => (item.id === editing.id ? data.client : item)));
        toast({ title: "تم تحديث بيانات العميل", description: form.name, tone: "success" });
        setOpen(false);
        setEditing(null);
        router.refresh();
      } catch {
        setClients((current) => current.map((item) => (item.id === previous.id ? previous : item)));
        setError("تعذّر حفظ بيانات العميل.");
      } finally {
        setSaving(false);
      }
      return;
    }

    const tempId = -Date.now();
    const optimistic: ClientRow = {
      id: tempId,
      name: form.name,
      nameEn: form.nameEn || null,
      contactName: form.contactName || null,
      email: form.email || null,
      phone: form.phone || null,
      taxId: form.taxId || null,
      country: form.country || null,
      city: form.city || null,
      address: form.address || null,
      industry: form.industry || null,
      creditLimit: Number(form.creditLimit || 0),
      notes: form.notes || null,
      createdAt: new Date().toISOString(),
      shipmentCount: 0,
      invoiceTotal: 0,
      outstanding: 0,
    };
    setClients((current) => [optimistic, ...current]);
    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { client: ClientRow };
      setClients((current) => current.map((item) => (item.id === tempId ? data.client : item)));
      toast({ title: "تم إضافة العميل", description: form.name, tone: "success" });
      setOpen(false);
      setForm({ ...EMPTY_FORM });
      router.refresh();
    } catch {
      setClients((current) => current.filter((item) => item.id !== tempId));
      setError("تعذّر إضافة العميل، حاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    const snapshot = clients;
    setClients((current) => current.filter((item) => item.id !== target.id));
    try {
      const response = await fetch(`/api/clients/${target.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      toast({ title: "تم حذف العميل", description: target.name, tone: "success" });
      router.refresh();
    } catch {
      setClients(snapshot);
      toast({ title: "تعذّر حذف العميل", tone: "error" });
    }
  }

  return (
    <div>
      <PageHeader title="قاعدة العملاء" description="ملفات العملاء التجارية، حدود الائتمان، والمستحقات المالية.">
        <button type="button" onClick={startCreate} className="btn btn-primary">
          <Plus className="size-4" />
          عميل جديد
        </button>
      </PageHeader>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="إجمالي العملاء" value={formatNumber(totals.count)} icon={<Users className="size-5" />} accent="#0ea5e9" hint="نشط على المنصة" />
        <StatCard label="ملفات مرتبطة" value={formatNumber(totals.shipments)} icon={<Building2 className="size-5" />} accent="#0f9d8b" hint="كل ملفات التخليص" />
        <StatCard label="إجمالي الفواتير" value={formatMoney(totals.invoiced)} icon={<CreditCard className="size-5" />} accent="#c9a227" hint="قيمة الأعمال" />
        <StatCard label="مستحقات مفتوحة" value={formatMoney(totals.outstanding)} icon={<CreditCard className="size-5" />} accent="#f43f5e" hint="بحاجة تحصيل" />
      </div>

      <div className="card mb-4 flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input h-10 pr-9"
            placeholder="بحث بالاسم، جهة الاتصال، المدينة، النشاط…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <span className="rounded-lg bg-slate-100 px-2.5 py-2 text-[11px] font-bold text-slate-600">
          {formatNumber(filtered.length)} عميل
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            title={clients.length === 0 ? "لا يوجد عملاء بعد" : "لا توجد نتائج"}
            description="أضف أول عميل لتبدأ في إنشاء ملفات التخليص الجمركي وربط الشحنات به."
            icon={<Users className="size-7" />}
            action={
              <button type="button" className="btn btn-primary" onClick={startCreate}>
                <Plus className="size-4" /> إضافة عميل
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((client) => (
            <article key={client.id} className={cx("card flex flex-col p-4 transition hover:-translate-y-0.5 hover:shadow-md", client.id < 0 && "opacity-60")}>
              <div className="flex items-start gap-3">
                <Avatar name={client.name} color="#0f9d8b" size="lg" />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-extrabold text-slate-900">{client.name}</h3>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">
                    {client.industry ?? "نشاط عام"} · {client.city ?? "—"}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-500">
                    {client.taxId ?? "بدون رقم ضريبي"}
                  </p>
                </div>
                <div className="flex gap-0.5">
                  <button type="button" onClick={() => startEdit(client)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#0f9d8b]" aria-label="تعديل">
                    <Pencil className="size-3.5" />
                  </button>
                  <button type="button" onClick={() => setDeleteTarget(client)} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="حذف">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-3 space-y-1.5 text-[11px] text-slate-600">
                {client.contactName ? (
                  <p className="flex items-center gap-1.5">
                    <Users className="size-3.5 text-slate-400" /> {client.contactName}
                  </p>
                ) : null}
                {client.phone ? (
                  <p className="flex items-center gap-1.5" dir="ltr">
                    <Phone className="size-3.5 text-slate-400" /> {client.phone}
                  </p>
                ) : null}
                {client.email ? (
                  <p className="flex items-center gap-1.5 truncate">
                    <Mail className="size-3.5 shrink-0 text-slate-400" /> {client.email}
                  </p>
                ) : null}
                {client.address ? (
                  <p className="flex items-start gap-1.5 text-slate-500">
                    <MapPin className="mt-0.5 size-3.5 shrink-0 text-slate-400" /> {client.address}
                  </p>
                ) : null}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
                <div>
                  <p className="text-[9px] text-slate-400">ملفات</p>
                  <p className="text-xs font-extrabold text-slate-900">{formatNumber(client.shipmentCount)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400">فواتير</p>
                  <p className="text-xs font-extrabold text-slate-900">{formatMoney(client.invoiceTotal)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400">مستحق</p>
                  <Badge tone={client.outstanding > 0 ? "rose" : "emerald"}>{formatMoney(client.outstanding)}</Badge>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="lg"
        title={editing ? `تعديل بيانات ${editing.name}` : "إضافة عميل جديد"}
        description="بيانات العميل تُستخدم في ملفات التخليص والفواتير والإقرارات الجمركية."
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              إلغاء
            </button>
            <button type="submit" form="client-form" className="btn btn-primary" disabled={saving}>
              {saving ? <Spinner /> : <Plus className="size-4" />}
              {editing ? "حفظ التعديلات" : "إضافة العميل"}
            </button>
          </>
        }
      >
        <form id="client-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="اسم العميل / الشركة" required className="sm:col-span-2">
            <input className="input" list="saved-clients" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} onBlur={(e) => autofillClient(e.target.value)} placeholder="اكتب اسم الشركة — تُستكمل بياناتها إن كانت مسجلة" required />
            <datalist id="saved-clients">{clients.filter((client) => client.id > 0).map((client) => <option key={client.id} value={client.name} />)}</datalist>
          </Field>
          <Field label="الاسم بالإنجليزية" className="sm:col-span-2">
            <input className="input" dir="ltr" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} placeholder="Company English name" />
          </Field>
          <p className="rounded-lg bg-slate-50 p-2.5 text-[10px] leading-5 text-slate-500 sm:col-span-2">الاستكمال التلقائي من سجل عملائك المحفوظ فقط؛ لا يوجد ربط بقاعدة السجل الضريبي الحكومي. تُحفظ بيانات الشركة عند التأكيد.</p>
          <Field label="جهة الاتصال">
            <input className="input" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
          </Field>
          <Field label="النشاط التجاري">
            <input className="input" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="صناعات غذائية" />
          </Field>
          <Field label="البريد الإلكتروني">
            <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="رقم الهاتف">
            <input className="input" dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="الرقم الضريبي / السجل">
            <input className="input" value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} onBlur={(e) => autofillClient(e.target.value, true)} placeholder="الرقم الضريبي" />
          </Field>
          <Field label="حد الائتمان (ج.م)">
            <input type="number" min="0" className="input" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} />
          </Field>
          <Field label="المدينة">
            <input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </Field>
          <Field label="الدولة">
            <input className="input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </Field>
          <Field label="العنوان" className="sm:col-span-2">
            <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </Field>
          <Field label="ملاحظات" className="sm:col-span-2">
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
        title="حذف العميل"
        description="لن تُحذف ملفات التخليص المرتبطة، لكنها ستصبح بدون عميل."
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
        <p className="text-sm text-slate-600">هل تريد حذف العميل «{deleteTarget?.name}»؟</p>
      </Modal>
    </div>
  );
}
