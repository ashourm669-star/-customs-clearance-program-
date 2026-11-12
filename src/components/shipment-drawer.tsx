"use client";

import { useEffect, useState } from "react";
import {
  Activity, CheckCircle2, FileText, ListChecks, Plus, Send, Ship,
  Weight, Package, CalendarDays, MapPin, Building2, Plane,
} from "lucide-react";
import { authHeaders, useData, type Row } from "@/components/data-provider";
import { Badge, Drawer } from "@/components/ui";
import {
  documentStatuses, documentTypes, formatDate, formatMoney, formatNumber,
  shipmentStatuses, statusLabel, taskStatuses,
} from "@/lib/constants";

const stages = ["new", "documents", "nafeza", "inspection", "payment", "released", "delivered"];

export function ShipmentDrawer({ shipment, onClose }: { shipment: Row | null; onClose: () => void }) {
  const { data, find, update, create, refresh, toast } = useData();
  const [tab, setTab] = useState<"details" | "documents" | "tasks" | "nafeza">("details");
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState("commercial_invoice");
  const [taskTitle, setTaskTitle] = useState("");
  const [syncing, setSyncing] = useState(false);

  useEffect(() => { setTab("details"); }, [shipment?.id]);

  const live: Row = ((shipment ? find("shipments", shipment.id) : undefined) ?? shipment) as Row;
  if (!live) return null;

  const client = find("clients", live.clientId);
  const carrier = find("carriers", live.carrierId);
  const port = find("ports", live.portId);
  const docs = (data?.documents ?? []).filter((d: Row) => String(d.shipmentId) === String(live.id));
  const tasks = (data?.tasks ?? []).filter((t: Row) => String(t.shipmentId) === String(live.id));
  const events = (data?.nafezaEvents ?? []).filter((e: Row) => String(e.shipmentId) === String(live.id));
  const stageIndex = Math.max(0, stages.indexOf(String(live.status)));

  async function addDocument() {
    if (!docName.trim()) { toast("أدخل اسم المستند", "error"); return; }
    const result = await create("documents", {
      shipmentId: live.id, name: docName.trim(), type: docType, status: "required",
      referenceNo: `DOC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    });
    if (result) setDocName("");
  }

  async function addTask() {
    if (!taskTitle.trim()) { toast("أدخل عنوان المهمة", "error"); return; }
    const result = await create("tasks", {
      shipmentId: live.id, title: taskTitle.trim(), stage: "documents", status: "pending", priority: "normal",
      assignee: data?.currentUser?.name ?? "", dueDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    });
    if (result) setTaskTitle("");
  }

  async function syncNafeza() {
    setSyncing(true);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ action: "declaration", shipmentId: live.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "تعذر إرسال البيانات");
      toast(json.result.message, json.result.ok ? "success" : "error");
      await refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : "تعذر إرسال البيانات", "error");
    } finally {
      setSyncing(false);
    }
  }

  const tabs = [
    { key: "details", label: "التفاصيل", icon: Ship },
    { key: "documents", label: `المستندات (${docs.length})`, icon: FileText },
    { key: "tasks", label: `المهام (${tasks.length})`, icon: ListChecks },
    { key: "nafeza", label: `نافذة (${events.length})`, icon: Activity },
  ] as const;

  const facts = [
    { icon: Building2, label: "العميل", value: client?.name ?? "—" },
    { icon: Plane, label: "الناقل", value: carrier?.name ?? "—" },
    { icon: MapPin, label: "منفذ الدخول", value: port?.name ?? "—" },
    { icon: Package, label: "وصف البضاعة", value: live.goodsDescription ?? "—" },
    { icon: Weight, label: "الوزن / الطرود", value: `${formatNumber(live.weightKg)} كجم · ${formatNumber(live.packages)} طرد` },
    { icon: CalendarDays, label: "الوصول المتوقع", value: formatDate(live.eta) },
  ];

  return (
    <Drawer
      open
      width="max-w-2xl"
      onClose={onClose}
      title={`ملف الشحنة ${live.refNo}`}
      subtitle={`${statusLabel(shipmentStatuses, live.status)} · أنشئت في ${formatDate(live.createdAt)}`}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-semibold text-slate-500">تحديث الحالة:</label>
            <select
              className="field w-auto py-1.5 text-xs"
              value={live.status ?? "new"}
              onChange={(e) => void update("shipments", Number(live.id), { status: e.target.value })}
            >
              {shipmentStatuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <button className="btn-primary" onClick={() => void syncNafeza()} disabled={syncing}>
            <Send size={14} /> {syncing ? "جاري الإرسال..." : "إرسال إلى نافذة"}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "قيمة البضاعة", value: formatMoney(live.cargoValue, live.currency) },
            { label: "رقم ACID", value: live.acidNumber ?? "—" },
            { label: "البيان الجمركي", value: live.declarationNumber ?? "—" },
            { label: "بوليصة الشحن", value: live.transportRef ?? "—" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
              <p className="text-[10px] text-slate-500">{item.label}</p>
              <p dir="auto" className="mt-1 truncate text-[11px] font-bold text-[var(--navy)]">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-100 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold text-[var(--navy)]">مراحل التخليص الجمركي</p>
            <Badge value={live.status} options={shipmentStatuses} />
          </div>
          <div className="flex items-center gap-1">
            {stages.map((stage, index) => (
              <div key={stage} className="flex-1">
                <div className={`h-2 rounded-full ${index <= stageIndex ? "bg-teal-500" : "bg-slate-100"}`} />
                <p className={`mt-1.5 text-center text-[8px] font-semibold ${index <= stageIndex ? "text-teal-700" : "text-slate-400"}`}>
                  {statusLabel(shipmentStatuses, stage).split(" ")[0]}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-slate-100">
          {tabs.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[11px] font-bold transition-colors ${
                tab === item.key ? "border-teal-600 text-teal-700" : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <item.icon size={14} /> {item.label}
            </button>
          ))}
        </div>

        {tab === "details" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {facts.map((fact) => (
              <div key={fact.label} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-600"><fact.icon size={15} /></div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400">{fact.label}</p>
                  <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-700">{fact.value}</p>
                </div>
              </div>
            ))}
            <div className="sm:col-span-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <p className="text-[10px] text-slate-400">ملاحظات الملف</p>
              <p className="mt-1 text-xs leading-6 text-slate-600">{live.notes || "لا توجد ملاحظات"}</p>
            </div>
          </div>
        )}

        {tab === "documents" && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <input className="field flex-1 min-w-40" placeholder="اسم المستند الجديد" value={docName} onChange={(e) => setDocName(e.target.value)} />
              <select className="field w-auto" value={docType} onChange={(e) => setDocType(e.target.value)}>
                {documentTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <button className="btn-primary" onClick={() => void addDocument()}><Plus size={15} /> إضافة</button>
            </div>
            {docs.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">لا توجد مستندات لهذه الشحنة بعد</p>
            ) : docs.map((doc: Row) => (
              <div key={doc.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 p-3">
                <FileText size={16} className="text-teal-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-700">{doc.name}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">{statusLabel(documentTypes, doc.type)} · {doc.referenceNo || "بدون مرجع"}</p>
                </div>
                <select
                  className="field w-auto py-1 text-[11px]"
                  value={doc.status ?? "required"}
                  onChange={(e) => void update("documents", Number(doc.id), { status: e.target.value })}
                >
                  {documentStatuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}

        {tab === "tasks" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input className="field flex-1" placeholder="عنوان المهمة الجديدة" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
              <button className="btn-primary" onClick={() => void addTask()}><Plus size={15} /> إضافة</button>
            </div>
            {tasks.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">لا توجد مهام مرتبطة بهذه الشحنة</p>
            ) : tasks.map((task: Row) => (
              <div key={task.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 p-3">
                <button
                  onClick={() => void update("tasks", Number(task.id), { status: task.status === "done" ? "pending" : "done" })}
                  className={task.status === "done" ? "text-emerald-500" : "text-slate-300 hover:text-teal-600"}
                  title="تغيير الحالة"
                ><CheckCircle2 size={18} /></button>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold ${task.status === "done" ? "text-slate-400 line-through" : "text-slate-700"}`}>{task.title}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">{task.assignee || "غير محدد"} · {formatDate(task.dueDate)}</p>
                </div>
                <Badge value={task.status} options={taskStatuses} />
              </div>
            ))}
          </div>
        )}

        {tab === "nafeza" && (
          <div className="space-y-3">
            <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-3 text-[11px] leading-6 text-teal-900">
              الشحنة مرتبطة بمنصة نافذة عبر كود الناقل <strong>{carrier?.nafezaCode ?? "NFZ-DIRECT"}</strong> ورقم ACID <strong>{live.acidNumber ?? "قيد التسجيل"}</strong>.
            </div>
            {events.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">لا توجد أحداث مسجلة لهذه الشحنة بعد</p>
            ) : events.map((event: Row) => (
              <div key={event.id} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
                <Activity size={16} className="mt-0.5 shrink-0 text-violet-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-700">{event.message}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{event.channel} · {formatDate(event.createdAt)} · {event.reference}</p>
                </div>
                <Badge value={event.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );
}
