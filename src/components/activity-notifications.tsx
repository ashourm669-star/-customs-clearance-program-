"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BellDot, Check, CheckCheck, Clock3, Pencil, Plus, Trash2 } from "lucide-react";
import type { ActivityNotice } from "@/lib/notification-feed";

const entityNames: Record<string, string> = {
  shipments: "ملف تخليص", clients: "عميل", carriers: "ناقل", documents: "مستند",
  invoices: "فاتورة", users: "موظف", banks: "بنك", contracts: "عقد",
  shipment_items: "صنف شحنة", tariff_codes: "بند جمركي", commercial_invoices: "فاتورة تجارية",
  app_settings: "بيانات المنشأة", integration_logs: "عملية ربط", shipment_events: "حدث شحنة",
};
const fieldNames: Record<string, string> = {
  status: "الحالة", eta: "الوصول المتوقع", name: "الاسم", email: "البريد الإلكتروني",
  phone: "الهاتف", address: "العنوان", role: "الدور", permissions: "الصلاحيات",
  amount: "المبلغ", paid_amount: "المدفوع", bl_number: "البوليصة", tax_id: "الرقم الضريبي",
  commercial_register: "السجل التجاري", customs_license: "الترخيص", password_changed: "كلمة المرور",
  api_key_changed: "مفتاح الربط", goods_description: "البضاعة", duty_bps: "فئة البند",
  vat_bps: "القيمة المضافة", import_status: "حالة الاستيراد", read_at: "وقت القراءة",
};

function target(item: ActivityNotice) {
  const id = Number(item.entityRef);
  if (item.entity === "shipments" && Number.isInteger(id) && id > 0) return `/shipments/${id}`;
  if (item.entity === "app_settings") return "/settings";
  if (item.entity === "users") return "/users";
  if (["tariff_codes", "shipment_items", "banks", "contracts", "commercial_invoices"].includes(item.entity)) return "/customs";
  if (item.entity === "integration_logs") return "/integrations";
  if (item.entity === "shipment_events") return "/shipments";
  return `/${item.entity}`;
}

export function ActivityNotifications({ initial, initialUnread }: { initial: ActivityNotice[]; initialUnread: number }) {
  const [rows, setRows] = useState(initial);
  const [unread, setUnread] = useState(initialUnread);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const visible = useMemo(() => filter === "unread" ? rows.filter((row) => !row.read) : rows, [rows, filter]);

  async function mark(ids?: number[]) {
    if (busy) return;
    const before = rows;
    const previousUnread = unread;
    const set = new Set(ids);
    setRows((current) => current.map((row) => ids === undefined || set.has(row.id) ? { ...row, read: true } : row));
    setUnread((current) => ids === undefined ? 0 : Math.max(0, current - ids.length));
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/alerts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ids === undefined ? { all: true } : { ids }),
      });
      if (!response.ok) throw new Error("تعذّر حفظ حالة قراءة الإشعار.");
      const feed = await response.json();
      setRows(feed.activities ?? []);
      setUnread(feed.activityUnread ?? 0);
      window.dispatchEvent(new Event("alarabi:notifications-updated"));
    } catch (caught) {
      setRows(before);
      setUnread(previousUnread);
      setError(caught instanceof Error ? caught.message : "تعذّر تحديث الإشعارات.");
    } finally { setBusy(false); }
  }

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><BellDot className="size-4 text-[#0f9d8b]" /> الإضافات والتعديلات على البرنامج</h2>
          <p className="mt-1 text-[11px] text-slate-500">إشعارات محفوظة من قاعدة البيانات · {unread} غير مقروء · آخر {rows.length} عملية</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className={`btn btn-ghost h-8 text-[10px] ${filter === "unread" ? "bg-teal-50 text-teal-700" : ""}`} onClick={() => setFilter(filter === "all" ? "unread" : "all")}>{filter === "all" ? "غير المقروء" : "عرض الكل"}</button>
          <button type="button" className="btn btn-ghost h-8 text-[10px]" disabled={busy || unread === 0} onClick={() => void mark()}><CheckCheck className="size-3.5" /> تحديد الكل كمقروء</button>
        </div>
      </div>
      {error && <p className="px-5 py-2 text-xs text-rose-700">{error}</p>}
      {visible.length === 0 ? <p className="px-5 py-10 text-center text-xs text-slate-500">{filter === "unread" ? "لا توجد تعديلات جديدة غير مقروءة." : "لا توجد تغييرات مسجلة بعد."}</p> : (
        <ul className="max-h-[650px] divide-y divide-slate-100 overflow-y-auto">
          {visible.map((row) => {
            const action = row.operation === "INSERT" ? "إضافة" : row.operation === "DELETE" ? "حذف" : "تعديل";
            const icon = row.operation === "INSERT" ? <Plus className="size-4" /> : row.operation === "DELETE" ? <Trash2 className="size-4" /> : <Pencil className="size-4" />;
            const details = row.changedFields.filter((field) => field !== "created_at").slice(0, 5).map((field) => fieldNames[field] ?? field).join("، ");
            return (
              <li key={row.id} className={`flex items-start gap-3 px-5 py-3 ${row.read ? "bg-white" : "bg-teal-50/60"}`}>
                <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg ${row.operation === "DELETE" ? "bg-rose-50 text-rose-600" : "bg-teal-100 text-teal-700"}`}>{icon}</span>
                <Link href={target(row)} className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900">{action} {entityNames[row.entity] ?? row.entity} · {row.label}</p>
                  {details && <p className="mt-0.5 text-[11px] text-slate-600">تغيّر: {details}</p>}
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400"><Clock3 className="size-3" /> {new Date(row.createdAt).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" })}</p>
                </Link>
                {!row.read && <button type="button" onClick={() => void mark([row.id])} disabled={busy} className="rounded-lg p-2 text-teal-700 hover:bg-teal-100" title="تحديد كمقروء"><Check className="size-4" /></button>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
