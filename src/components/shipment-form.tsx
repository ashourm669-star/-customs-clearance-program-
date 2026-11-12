"use client";

import { useState } from "react";
import { Field, Modal, Spinner } from "@/components/ui";
import {
  CURRENCIES,
  DIRECTIONS,
  DIRECTION_META,
  EGYPT_PORTS,
  MODES,
  MODE_META,
  PRIORITIES,
  PRIORITY_META,
  SHIPMENT_STATUSES,
  SHIPMENT_STATUS_META,
} from "@/lib/constants";
import { todayInputValue } from "@/lib/format";
import type { ShipmentRow } from "@/lib/types";

export type Option = { id: number; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: Record<string, string>) => Promise<boolean>;
  clients: Option[];
  carriers: Option[];
  initial?: ShipmentRow | null;
  prefillBl?: string;
};

function toState(initial?: ShipmentRow | null, prefillBl?: string): Record<string, string> {
  return {
    reference: initial?.reference ?? "",
    clientId: initial?.clientId ? String(initial.clientId) : "",
    carrierId: initial?.carrierId ? String(initial.carrierId) : "",
    mode: initial?.mode ?? "sea",
    direction: initial?.direction ?? "import",
    status: initial?.status ?? "draft",
    priority: initial?.priority ?? "normal",
    port: initial?.port ?? "ميناء الإسكندرية",
    origin: initial?.origin ?? "",
    destination: initial?.destination ?? "",
    blNumber: initial?.blNumber ?? prefillBl ?? "",
    vesselFlight: initial?.vesselFlight ?? "",
    containerCount: String(initial?.containerCount ?? 0),
    packageCount: String(initial?.packageCount ?? 0),
    grossWeight: String(initial?.grossWeight ?? 0),
    goodsDescription: initial?.goodsDescription ?? "",
    hsCode: initial?.hsCode ?? "",
    invoiceValue: String(initial?.invoiceValue ?? 0),
    currency: initial?.currency ?? "USD",
    dutyAmount: String(initial?.dutyAmount ?? 0),
    vatAmount: String(initial?.vatAmount ?? 0),
    serviceFees: String(initial?.serviceFees ?? 0),
    eta: todayInputValue(initial?.eta),
    arrivedAt: todayInputValue(initial?.arrivedAt),
    brokerName: initial?.brokerName ?? "",
    notes: initial?.notes ?? "",
  };
}

export function ShipmentForm({ open, onClose, onSubmit, clients, carriers, initial, prefillBl }: Props) {
  const [values, setValues] = useState(() => toState(initial, prefillBl));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"basic" | "cargo" | "fees">("basic");

  function set(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!values.clientId) {
      setError("اختر العميل صاحب الشحنة أولاً.");
      setTab("basic");
      return;
    }
    setSaving(true);
    const ok = await onSubmit(values);
    setSaving(false);
    if (ok) onClose();
    else setError("تعذّر حفظ الملف. راجع البيانات وحاول مرة أخرى.");
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={initial ? `تعديل الملف ${initial.reference}` : "ملف تخليص جمركي جديد"}
      description="سجّل بيانات الشحنة والمستندات والرسوم الجمركية — سيتم ربط الملف بشركة الشحن ونافذة تلقائياً."
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-ghost">
            إلغاء
          </button>
          <button type="submit" form="shipment-form" disabled={saving} className="btn btn-primary">
            {saving ? <Spinner /> : null}
            {initial ? "حفظ التعديلات" : "إنشاء ملف التخليص"}
          </button>
        </>
      }
    >
      <form id="shipment-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {[
            { key: "basic", label: "البيانات الأساسية" },
            { key: "cargo", label: "بيانات الشحنة" },
            { key: "fees", label: "الرسوم والملاحظات" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key as typeof tab)}
              className={`flex-1 rounded-lg px-3 py-2 text-[11px] font-bold transition ${
                tab === item.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "basic" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="رقم ملف التخليص" hint="يُترك فارغاً ليتم توليده تلقائياً">
              <input className="input" value={values.reference} onChange={(e) => set("reference", e.target.value)} placeholder="CLR-2026-1017" />
            </Field>
            <Field label="العميل" required>
              <select className="input" value={values.clientId} onChange={(e) => set("clientId", e.target.value)} required>
                <option value="">— اختر العميل —</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="شركة الشحن / الطيران / الخط الملاحي">
              <select className="input" value={values.carrierId} onChange={(e) => set("carrierId", e.target.value)}>
                <option value="">— بدون ربط —</option>
                {carriers.map((carrier) => (
                  <option key={carrier.id} value={carrier.id}>
                    {carrier.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="طريقة الشحن">
              <select className="input" value={values.mode} onChange={(e) => set("mode", e.target.value)}>
                {MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {MODE_META[mode].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="اتجاه الشحنة">
              <select className="input" value={values.direction} onChange={(e) => set("direction", e.target.value)}>
                {DIRECTIONS.map((direction) => (
                  <option key={direction} value={direction}>
                    {DIRECTION_META[direction].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="حالة الملف">
              <select className="input" value={values.status} onChange={(e) => set("status", e.target.value)}>
                {SHIPMENT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {SHIPMENT_STATUS_META[status].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="الأولوية">
              <select className="input" value={values.priority} onChange={(e) => set("priority", e.target.value)}>
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {PRIORITY_META[priority].label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="المخلص المسؤول">
              <input className="input" value={values.brokerName} onChange={(e) => set("brokerName", e.target.value)} placeholder="اسم المخلص" />
            </Field>
            <Field label="الميناء / المنفذ">
              <input className="input" list="ports-list" value={values.port} onChange={(e) => set("port", e.target.value)} />
              <datalist id="ports-list">
                {EGYPT_PORTS.map((port) => (
                  <option key={port} value={port} />
                ))}
              </datalist>
            </Field>
            <Field label="الوجهة النهائية">
              <input className="input" value={values.destination} onChange={(e) => set("destination", e.target.value)} placeholder="القاهرة" />
            </Field>
          </div>
        ) : null}

        {tab === "cargo" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="وصف البضاعة" className="sm:col-span-2">
              <input className="input" value={values.goodsDescription} onChange={(e) => set("goodsDescription", e.target.value)} placeholder="مثال: أجهزة تكييف سبليت" />
            </Field>
            <Field label="رقم البوليصة / AWB">
              <input className="input" value={values.blNumber} onChange={(e) => set("blNumber", e.target.value)} placeholder="MAEU-1234567" />
            </Field>
            <Field label="اسم السفينة / رقم الرحلة">
              <input className="input" value={values.vesselFlight} onChange={(e) => set("vesselFlight", e.target.value)} placeholder="MAERSK SEALAND V.442" />
            </Field>
            <Field label="بلد / ميناء المنشأ">
              <input className="input" value={values.origin} onChange={(e) => set("origin", e.target.value)} placeholder="نابولي، إيطاليا" />
            </Field>
            <Field label="الرقم الجمركي HS Code">
              <input className="input" value={values.hsCode} onChange={(e) => set("hsCode", e.target.value)} placeholder="1509.10" />
            </Field>
            <Field label="عدد الحاويات">
              <input type="number" min="0" className="input" value={values.containerCount} onChange={(e) => set("containerCount", e.target.value)} />
            </Field>
            <Field label="عدد الطرود">
              <input type="number" min="0" className="input" value={values.packageCount} onChange={(e) => set("packageCount", e.target.value)} />
            </Field>
            <Field label="الوزن الإجمالي (كجم)">
              <input type="number" min="0" className="input" value={values.grossWeight} onChange={(e) => set("grossWeight", e.target.value)} />
            </Field>
            <Field label="قيمة الشحنة">
              <div className="flex gap-2">
                <input type="number" min="0" className="input" value={values.invoiceValue} onChange={(e) => set("invoiceValue", e.target.value)} />
                <select className="input w-24" value={values.currency} onChange={(e) => set("currency", e.target.value)}>
                  {CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
            <Field label="الوصول المتوقع (ETA)">
              <input type="datetime-local" className="input" value={values.eta} onChange={(e) => set("eta", e.target.value)} />
            </Field>
            <Field label="تاريخ الوصول الفعلي">
              <input type="datetime-local" className="input" value={values.arrivedAt} onChange={(e) => set("arrivedAt", e.target.value)} />
            </Field>
          </div>
        ) : null}

        {tab === "fees" ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="الرسوم الجمركية (ج.م)">
                <input type="number" min="0" className="input" value={values.dutyAmount} onChange={(e) => set("dutyAmount", e.target.value)} />
              </Field>
              <Field label="ضريبة القيمة المضافة (ج.م)">
                <input type="number" min="0" className="input" value={values.vatAmount} onChange={(e) => set("vatAmount", e.target.value)} />
              </Field>
              <Field label="أتعاب التخليص (ج.م)">
                <input type="number" min="0" className="input" value={values.serviceFees} onChange={(e) => set("serviceFees", e.target.value)} />
              </Field>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">إجمالي الرسوم التقديرية</span>
                <span className="text-base font-extrabold text-slate-900">
                  {(
                    Number(values.dutyAmount || 0) +
                    Number(values.vatAmount || 0) +
                    Number(values.serviceFees || 0)
                  ).toLocaleString("en-US")}{" "}
                  ج.م
                </span>
              </div>
            </div>
            <Field label="ملاحظات التخليص">
              <textarea
                className="input min-h-24 resize-y"
                value={values.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="متطلبات خاصة، تصاريح، جهات رقابية…"
              />
            </Field>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">{error}</div>
        ) : null}
      </form>
    </Modal>
  );
}
