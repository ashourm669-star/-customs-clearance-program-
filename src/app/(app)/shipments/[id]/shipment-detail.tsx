"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BadgeCheck, BookOpenCheck, CalendarClock, Check, CircleDollarSign, FileText, Globe2, MapPin, Package, Plane, Plus, RefreshCw, Send, Ship as ShipIcon, Trash2, Upload, Weight } from "lucide-react";
import { Badge, EmptyState, Field, Modal, Progress, Spinner, cx } from "@/components/ui";
import { useToast } from "@/components/toast";
import { DIRECTION_META, DOC_STATUSES, DOC_STATUS_META, DOC_TYPES, DOC_TYPE_META, EVENT_TYPES, EVENT_TYPE_META, INVOICE_STATUS_META, MODE_META, SHIPMENT_STATUSES, SHIPMENT_STATUS_META, type ShipmentStatus } from "@/lib/constants";
import { formatDate, formatDateTime, formatMoney, formatNumber, formatWeight, relativeTime } from "@/lib/format";
import type { CarrierRow, DocumentItem, EventItem, InvoiceRow, ShipmentRow } from "@/lib/types";

type Props = { shipment: ShipmentRow; initialEvents: EventItem[]; initialDocuments: DocumentItem[]; invoice: InvoiceRow | null; carrier: CarrierRow | null; userName: string };
const FLOW: ShipmentStatus[] = ["draft", "documents_pending", "under_review", "customs_clearance", "released", "delivered"];

export function ShipmentDetail({ shipment: initialShipment, initialEvents, initialDocuments, invoice, carrier, userName }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [shipment, setShipment] = useState(initialShipment);
  const [events, setEvents] = useState(initialEvents);
  const [documents, setDocuments] = useState(initialDocuments);
  const [savingStatus, setSavingStatus] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [eventOpen, setEventOpen] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState<DocumentItem | null>(null);
  const [eventForm, setEventForm] = useState({ title: "", type: "note", description: "", location: "" });
  const [docForm, setDocForm] = useState({ name: "", type: "commercial_invoice", sizeKb: "320" });
  const [savingEvent, setSavingEvent] = useState(false);
  const [savingDoc, setSavingDoc] = useState(false);
  const meta = SHIPMENT_STATUS_META[shipment.status as ShipmentStatus] ?? SHIPMENT_STATUS_META.draft;
  const currentStep = FLOW.indexOf(shipment.status as ShipmentStatus);
  const fees = shipment.dutyAmount + shipment.vatAmount + shipment.serviceFees;

  async function updateStatus(nextStatus: string) {
    const previous = shipment;
    setSavingStatus(true);
    setShipment((current) => ({ ...current, status: nextStatus }));
    try {
      const response = await fetch(`/api/shipments/${shipment.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
      if (!response.ok) throw new Error();
      const data = await response.json() as { shipment: ShipmentRow };
      setShipment(data.shipment);
      toast({ title: "تم تحديث الحالة", tone: "success" });
      router.refresh();
    } catch { setShipment(previous); toast({ title: "تعذّر تحديث الحالة", tone: "error" }); }
    finally { setSavingStatus(false); }
  }

  async function runIntegration(target: "nafeza" | "tracking") {
    setSyncing(target);
    try {
      const response = await fetch("/api/integrations/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target, shipmentId: shipment.id }) });
      const data = await response.json() as { result?: { message: string; level: string } };
      if (!response.ok || !data.result) throw new Error();
      toast({ title: target === "nafeza" ? "نتيجة إرسال نافذة" : "نتيجة التتبع", description: data.result.message, tone: data.result.level === "error" ? "error" : "success" });
      const refreshed = await fetch(`/api/shipments/${shipment.id}/events`);
      if (refreshed.ok) setEvents(((await refreshed.json()) as { events: EventItem[] }).events);
      router.refresh();
    } catch { toast({ title: "فشلت العملية", tone: "error" }); }
    finally { setSyncing(null); }
  }

  async function addEvent(event: React.FormEvent) {
    event.preventDefault();
    if (!eventForm.title.trim()) return;
    setSavingEvent(true);
    const optimistic: EventItem = { id: -Date.now(), shipmentId: shipment.id, ...eventForm, description: eventForm.description || null, location: eventForm.location || null, occurredAt: new Date().toISOString(), createdAt: new Date().toISOString() };
    setEvents((current) => [optimistic, ...current]);
    try {
      const response = await fetch(`/api/shipments/${shipment.id}/events`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(eventForm) });
      if (!response.ok) throw new Error();
      setEvents(((await response.json()) as { events: EventItem[] }).events);
      setEventOpen(false); setEventForm({ title: "", type: "note", description: "", location: "" });
      toast({ title: "تم إضافة التحديث", tone: "success" }); router.refresh();
    } catch { setEvents((current) => current.filter((item) => item.id !== optimistic.id)); toast({ title: "تعذّر الحفظ", tone: "error" }); }
    finally { setSavingEvent(false); }
  }

  async function addDocument(event: React.FormEvent) {
    event.preventDefault();
    if (!docForm.name.trim()) return;
    setSavingDoc(true);
    const optimistic: DocumentItem = { id: -Date.now(), shipmentId: shipment.id, shipmentReference: shipment.reference, clientName: shipment.clientName, ...docForm, sizeKb: Number(docForm.sizeKb || 0), status: "pending", uploadedBy: userName, createdAt: new Date().toISOString() };
    setDocuments((current) => [optimistic, ...current]);
    try {
      const response = await fetch("/api/documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...docForm, shipmentId: shipment.id, sizeKb: Number(docForm.sizeKb || 0) }) });
      if (!response.ok) throw new Error();
      const data = await response.json() as { document: DocumentItem };
      setDocuments((current) => current.map((item) => item.id === optimistic.id ? data.document : item));
      setDocOpen(false); setDocForm({ name: "", type: "commercial_invoice", sizeKb: "320" });
      toast({ title: "تم تسجيل المستند", tone: "success" }); router.refresh();
    } catch { setDocuments((current) => current.filter((item) => item.id !== optimistic.id)); toast({ title: "تعذّر الحفظ", tone: "error" }); }
    finally { setSavingDoc(false); }
  }

  async function changeDocStatus(doc: DocumentItem, status: string) {
    const snapshot = documents;
    setDocuments((current) => current.map((item) => item.id === doc.id ? { ...item, status } : item));
    try {
      const response = await fetch(`/api/documents/${doc.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      if (!response.ok) throw new Error();
      toast({ title: "تم تحديث المستند", tone: status === "rejected" ? "error" : "success" }); router.refresh();
    } catch { setDocuments(snapshot); toast({ title: "تعذّر التحديث", tone: "error" }); }
  }

  async function confirmDeleteDoc() {
    if (!deleteDoc) return;
    const target = deleteDoc; const snapshot = documents; setDeleteDoc(null);
    setDocuments((current) => current.filter((item) => item.id !== target.id));
    try {
      const response = await fetch(`/api/documents/${target.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      toast({ title: "تم حذف المستند", tone: "success" }); router.refresh();
    } catch { setDocuments(snapshot); toast({ title: "تعذّر الحذف", tone: "error" }); }
  }

  return (
    <div className="space-y-5">
      <Link href="/shipments" className="mb-3 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#0f9d8b]"><ArrowLeft className="size-4" /> رجوع إلى ملفات التخليص</Link>
      <Link href={`/customs?id=${shipment.id}`} className="card mb-4 flex items-center justify-between gap-3 p-3.5 transition hover:bg-slate-50"><span className="flex items-center gap-2 text-xs font-bold text-slate-900"><BookOpenCheck className="size-4 text-[#0f9d8b]" /> فتح المنظومة الجمركية — العقد والمنشأ وشروط الاستيراد وACID</span><ArrowLeft className="size-4 text-slate-400" /></Link>
      <div className="card overflow-hidden">
        <div className="bg-[linear-gradient(120deg,#0a2239,#103a58_60%,#0b6a63)] px-5 py-5 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2"><span className="rounded-lg bg-white/10 px-2 py-1 text-[10px] font-bold ring-1 ring-inset ring-white/15">{MODE_META[shipment.mode as keyof typeof MODE_META]?.icon} {MODE_META[shipment.mode as keyof typeof MODE_META]?.label}</span><Badge tone={DIRECTION_META[shipment.direction as keyof typeof DIRECTION_META]?.tone ?? "sky"}>{DIRECTION_META[shipment.direction as keyof typeof DIRECTION_META]?.label}</Badge><Badge tone={meta.tone} dot={meta.dot}>{meta.label}</Badge></div>
              <h1 className="mt-2 text-2xl font-extrabold">{shipment.reference}</h1>
              <p className="mt-1 text-sm text-slate-200/90">{shipment.clientName ?? "بدون عميل"} · {shipment.goodsDescription ?? "شحنة"}</p>
              <p className="mt-1 text-[11px] text-slate-300">{shipment.origin ?? "—"} ← {shipment.destination ?? "—"} · {shipment.port ?? "بدون ميناء"}</p>
            </div>
            <div className="flex flex-wrap gap-2"><button type="button" onClick={() => runIntegration("nafeza")} disabled={syncing !== null} className="btn h-10 border border-white/20 bg-white/10 text-xs text-white">{syncing === "nafeza" ? <Spinner /> : <Send className="size-4" />} إرسال إلى نافذة</button><button type="button" onClick={() => runIntegration("tracking")} disabled={syncing !== null} className="btn btn-mint h-10 text-xs">{syncing === "tracking" ? <Spinner /> : <RefreshCw className="size-4" />} تحديث التتبع</button></div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">{FLOW.map((step, index) => <div key={step} className="flex items-center gap-2"><div className={cx("flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold", shipment.status !== "on_hold" && index <= currentStep ? "bg-emerald-400/20 text-emerald-100" : "bg-white/5 text-slate-300")}>{index <= currentStep ? <Check className="size-3" /> : <span className="size-1.5 rounded-full bg-current opacity-60" />}{SHIPMENT_STATUS_META[step].label}</div>{index < FLOW.length - 1 ? <span className="h-px w-3 bg-white/20" /> : null}</div>)}</div>
        </div>
        <div className="grid grid-cols-2 divide-slate-100 border-b border-slate-100 sm:grid-cols-4 sm:divide-x sm:divide-x-reverse">{[{ label: "الرسوم الجمركية", value: formatMoney(shipment.dutyAmount) }, { label: "ضريبة القيمة المضافة", value: formatMoney(shipment.vatAmount) }, { label: "أتعاب التخليص", value: formatMoney(shipment.serviceFees) }, { label: "الوصول المتوقع", value: formatDate(shipment.eta) }].map((item) => <div key={item.label} className="border-b border-slate-100 p-4 last:border-0 sm:border-b-0"><p className="text-[10px] font-semibold text-slate-400">{item.label}</p><p className="mt-1 text-sm font-extrabold text-slate-900">{item.value}</p></div>)}</div>
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <section className="card p-5"><h2 className="mb-4 text-sm font-bold text-slate-900">بيانات الشحنة</h2><dl className="grid gap-3 sm:grid-cols-2">{[
            { label: "شركة الشحن / الطيران", value: carrier?.name ?? shipment.carrierName ?? "بدون ربط" }, { label: "بوليصة الشحن / AWB", value: shipment.blNumber ?? "—" },
            { label: "السفينة / الرحلة", value: shipment.vesselFlight ?? "—" }, { label: "الرقم الجمركي HS", value: shipment.hsCode ?? "—" },
            { label: "عدد الحاويات", value: formatNumber(shipment.containerCount) }, { label: "عدد الطرود", value: formatNumber(shipment.packageCount) },
            { label: "الوزن الإجمالي", value: formatWeight(shipment.grossWeight) }, { label: "قيمة الشحنة", value: formatMoney(shipment.invoiceValue, shipment.currency) },
            { label: "المخلص المسؤول", value: shipment.brokerName ?? "—" }, { label: "الوصول الفعلي", value: shipment.arrivedAt ? formatDateTime(shipment.arrivedAt) : "لم تصل بعد" },
          ].map((item) => <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3"><dt className="text-[10px] font-semibold text-slate-500">{item.label}</dt><dd className="mt-1 text-xs font-bold text-slate-900">{item.value}</dd></div>)}</dl>{shipment.notes ? <div className="mt-4 rounded-xl bg-amber-50 p-3 text-[11px] leading-6 text-amber-800 ring-1 ring-inset ring-amber-200"><span className="font-bold">ملاحظات التخليص: </span>{shipment.notes}</div> : null}</section>
          <section className="card overflow-hidden"><header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-bold text-slate-900">سجل التتبع والتحركات</h2><p className="text-[11px] text-slate-500">كل إجراء جمركي أو تحديث من الشركة يظهر هنا</p></div><button type="button" onClick={() => setEventOpen(true)} className="btn btn-ghost h-9 text-[11px]"><Plus className="size-4" /> إضافة تحديث</button></header>{events.length ? <ol className="scroll-thin max-h-[520px] space-y-4 overflow-y-auto p-5 pr-7">{events.map((event) => <li key={event.id} className="relative border-r border-dashed border-slate-200 pr-4 last:border-0"><span className="absolute -right-[7px] top-1.5 size-3 rounded-full ring-4 ring-white" style={{ background: EVENT_TYPE_META[event.type]?.color ?? "#64748b" }} /><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-bold text-slate-900">{event.title}</p><span className="text-[10px] text-slate-400">{relativeTime(event.occurredAt)}</span></div>{event.description ? <p className="mt-1 text-[11px] leading-5 text-slate-500">{event.description}</p> : null}{event.location ? <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400"><MapPin className="size-3" /> {event.location}</p> : null}</li>)}</ol> : <EmptyState title="لا توجد تحركات بعد" description="أضف أول تحديث لمتابعة سير الملف." />}</section>
        </div>
        <div className="space-y-5">
          <section className="card p-5"><h2 className="text-sm font-bold text-slate-900">حالة الملف والإجراء</h2><p className="mt-1 text-[11px] text-slate-500">تحديث الحالة ينعكس فوراً على لوحة التحكم والتقارير.</p><div className="mt-4 space-y-2"><select value={shipment.status} onChange={(e) => updateStatus(e.target.value)} disabled={savingStatus} className="input font-bold">{SHIPMENT_STATUSES.map((status) => <option key={status} value={status}>{SHIPMENT_STATUS_META[status].label}</option>)}</select><div className="flex items-center justify-between text-[10px] text-slate-400"><span>تقدم الملف</span><span>{Math.max(0, Math.round(((currentStep + 1) / FLOW.length) * 100))}%</span></div><Progress value={((currentStep + 1) / FLOW.length) * 100} color={meta.dot} /></div><div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-[11px]"><div className="flex justify-between"><span className="text-slate-500">تاريخ فتح الملف</span><span className="font-bold text-slate-800">{formatDate(shipment.createdAt)}</span></div><div className="flex justify-between"><span className="text-slate-500">تاريخ الإفراج</span><span className="font-bold text-slate-800">{shipment.releasedAt ? formatDate(shipment.releasedAt) : "لم يتم"}</span></div></div></section>
          <section className="card overflow-hidden"><header className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-bold text-slate-900">المستندات</h2><p className="text-[11px] text-slate-500">{documents.length} مستند مرتبط بالملف</p></div><button type="button" onClick={() => setDocOpen(true)} className="btn btn-ghost h-8 px-2 text-[10px]"><Upload className="size-3.5" /> إضافة</button></header>{documents.length ? <ul className="divide-y divide-slate-100">{documents.map((doc) => <li key={doc.id} className="px-4 py-3"><div className="flex items-start gap-2"><span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><FileText className="size-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-bold text-slate-900">{doc.name}</p><p className="text-[10px] text-slate-400">{DOC_TYPE_META[doc.type as keyof typeof DOC_TYPE_META]?.label} · {formatNumber(doc.sizeKb)} KB</p></div><Badge tone={DOC_STATUS_META[doc.status]?.tone ?? "slate"}>{DOC_STATUS_META[doc.status]?.label}</Badge></div><div className="mt-2 flex items-center gap-1">{DOC_STATUSES.filter((status) => status !== "pending").map((status) => <button type="button" key={status} onClick={() => changeDocStatus(doc, status)} className={cx("rounded-md px-2 py-1 text-[10px] font-bold", status === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")}>{status === "approved" ? "اعتماد" : "رفض"}</button>)}<button type="button" onClick={() => setDeleteDoc(doc)} className="mr-auto rounded-md p-1.5 text-slate-400 hover:text-rose-600" aria-label="حذف المستند"><Trash2 className="size-3.5" /></button></div></li>)}</ul> : <EmptyState title="لا توجد مستندات" description="أضف الفاتورة التجارية وقائمة التعبئة وبوليصة الشحن." />}</section>
          <section className="card p-5"><div className="flex items-center justify-between"><h2 className="text-sm font-bold text-slate-900">الفاتورة</h2><Link href="/invoices" className="text-[10px] font-bold text-[#0f9d8b]">إدارة الفواتير ←</Link></div>{invoice ? <div className="mt-3"><div className="flex items-center justify-between"><p className="text-xs font-extrabold text-slate-900">{invoice.number}</p><Badge tone={INVOICE_STATUS_META[invoice.status as keyof typeof INVOICE_STATUS_META]?.tone ?? "slate"}>{INVOICE_STATUS_META[invoice.status as keyof typeof INVOICE_STATUS_META]?.label}</Badge></div><div className="mt-3 space-y-1.5 text-[11px]"><div className="flex justify-between"><span className="text-slate-500">الإجمالي</span><span className="font-bold">{formatMoney(invoice.total)}</span></div><div className="flex justify-between"><span className="text-slate-500">المدفوع</span><span className="font-bold text-emerald-600">{formatMoney(invoice.paidAmount)}</span></div><div className="flex justify-between"><span className="text-slate-500">المتبقي</span><span className="font-bold text-rose-600">{formatMoney(invoice.total - invoice.paidAmount)}</span></div></div><Progress value={invoice.paidAmount / Math.max(1, invoice.total) * 100} color="#10b981" /><p className="mt-2 text-[10px] text-slate-400">الاستحقاق {formatDate(invoice.dueDate)}</p></div> : <p className="mt-3 rounded-xl bg-slate-50 p-3 text-center text-[11px] text-slate-500">لم تُصدر فاتورة لهذا الملف بعد.</p>}</section>
          {carrier ? <section className="card p-5"><h2 className="text-sm font-bold text-slate-900">قناة الشحن المربوطة</h2><div className="mt-3 flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl text-white" style={{ background: carrier.color }}>{carrier.type === "airline" ? <Plane className="size-5" /> : <ShipIcon className="size-5" />}</span><div><p className="text-xs font-bold text-slate-900">{carrier.name}</p><p className="text-[10px] text-slate-500">{carrier.nameEn}</p></div></div><p className="mt-2 text-[10px] text-slate-500">آخر مزامنة: {relativeTime(carrier.lastSyncAt)} · {formatNumber(carrier.totalShipments)} شحنة</p><p className="mt-1 break-all rounded-lg bg-slate-50 p-2 text-[9px] text-slate-500">{carrier.apiEndpoint}</p></section> : null}
        </div>
      </div>
      <Modal open={eventOpen} onClose={() => setEventOpen(false)} title="إضافة تحديث للملف" footer={<><button type="button" className="btn btn-ghost" onClick={() => setEventOpen(false)}>إلغاء</button><button type="submit" form="event-form" className="btn btn-primary" disabled={savingEvent}>{savingEvent ? <Spinner /> : <Plus className="size-4" />} إضافة</button></>}><form id="event-form" onSubmit={addEvent} className="space-y-4"><Field label="عنوان التحديث" required><input className="input" value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} required /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="النوع"><select className="input" value={eventForm.type} onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}>{EVENT_TYPES.map((type) => <option key={type} value={type}>{EVENT_TYPE_META[type].label}</option>)}</select></Field><Field label="الموقع / الجهة"><input className="input" value={eventForm.location} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })} /></Field></div><Field label="التفاصيل"><textarea className="input min-h-20" value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} /></Field></form></Modal>
      <Modal open={docOpen} onClose={() => setDocOpen(false)} title="إضافة مستند للملف" footer={<><button type="button" className="btn btn-ghost" onClick={() => setDocOpen(false)}>إلغاء</button><button type="submit" form="doc-form" className="btn btn-primary" disabled={savingDoc}>{savingDoc ? <Spinner /> : <Upload className="size-4" />} حفظ</button></>}><form id="doc-form" onSubmit={addDocument} className="space-y-4"><Field label="اختيار ملف (اختياري)"><input type="file" className="input text-xs" onChange={(e) => { const file = e.target.files?.[0]; if (file) setDocForm({ ...docForm, name: file.name, sizeKb: String(Math.max(1, Math.round(file.size / 1024))) }); }} /></Field><Field label="اسم المستند" required><input className="input" value={docForm.name} onChange={(e) => setDocForm({ ...docForm, name: e.target.value })} required /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="النوع"><select className="input" value={docForm.type} onChange={(e) => setDocForm({ ...docForm, type: e.target.value })}>{DOC_TYPES.map((type) => <option key={type} value={type}>{DOC_TYPE_META[type].label}</option>)}</select></Field><Field label="الحجم KB"><input type="number" min="1" className="input" value={docForm.sizeKb} onChange={(e) => setDocForm({ ...docForm, sizeKb: e.target.value })} /></Field></div></form></Modal>
      <Modal open={Boolean(deleteDoc)} onClose={() => setDeleteDoc(null)} title="حذف المستند" footer={<><button type="button" className="btn btn-ghost" onClick={() => setDeleteDoc(null)}>إلغاء</button><button type="button" className="btn btn-danger" onClick={confirmDeleteDoc}><Trash2 className="size-4" /> حذف</button></>}><p className="text-sm text-slate-600">سيتم حذف «{deleteDoc?.name}» نهائياً.</p></Modal>
    </div>
  );
}
