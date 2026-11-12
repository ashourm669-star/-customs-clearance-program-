"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, FileScan, Plus, Save, ShieldAlert, Timer } from "lucide-react";
import { useData, type Row } from "@/components/data-provider";
import { ExportBar } from "@/components/export-bar";
import { FxStrip, useFx } from "@/components/fx-strip";
import { Badge, PageHeader } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/constants";
import {
  ACID_VALIDITY_DAYS, acidTimeline, assessableValue, cargoKinds, customsRegimes,
  importStatuses, incoterms, lineFees, paymentMethods, subjectionSystems,
} from "@/lib/customs";
import { parseInvoiceRows, parseInvoiceText, type ParsedInvoice } from "@/lib/invoice-parse";

type Line = {
  id?: number;
  hsCode: string;
  nameAr: string;
  nameEn?: string;
  quantity: number;
  invoiceValue: number;
  origin: string;
  dutyRate: number;
  vatRate: number;
  tableTaxRate: number;
  developmentRate: number;
  importStatus?: string;
  authorities?: string;
  tariffItemId?: number;
};

const emptyForm = {
  clientId: "", clientName: "", taxNumber: "", phone: "", email: "", city: "",
  cargoKind: "manifest", direction: "import", mode: "sea", customsRegime: "final_release",
  subjectionSystem: "duty_vat", commercialInvoiceNo: "", commercialInvoiceDate: "",
  contractType: "CIF", paymentMethod: "LC", bankId: "", currency: "USD", cargoValue: "",
  freightAmount: "", insuranceAmount: "", acidNumber: "", acidIssuedAt: "", eta: "",
  transportRef: "", goodsDescription: "", origin: "", carrierId: "", portId: "", notes: "",
};

export function ClearanceWorkspace() {
  const router = useRouter();
  const params = useSearchParams();
  const editingId = Number(params.get("id") || 0);
  const { data, create, update, toast } = useData();
  const fx = useFx();
  const [form, setForm] = useState(emptyForm);
  const [lines, setLines] = useState<Line[]>([]);
  const [tariffQuery, setTariffQuery] = useState("");
  const [companyQuery, setCompanyQuery] = useState("");
  const [showCompanies, setShowCompanies] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const clients = data?.clients ?? [];
  const banks = data?.banks ?? [];
  const tariff = data?.tariffItems ?? [];
  const set = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!editingId || !data || loaded) return;
    const shipment = data.shipments.find((row: Row) => row.id === editingId);
    if (!shipment) return;
    const client = clients.find((row: Row) => row.id === shipment.clientId);
    setForm({
      ...emptyForm,
      ...Object.fromEntries(Object.entries(shipment).map(([key, value]) => [key, value ?? ""])),
      clientName: client?.name ?? "",
      taxNumber: client?.taxNumber ?? "",
      phone: client?.phone ?? "",
      email: client?.email ?? "",
      city: client?.city ?? "",
    });
    setCompanyQuery(client?.name ?? "");
    setLines((data.shipmentItems ?? []).filter((row: Row) => row.shipmentId === editingId).map((row: Row) => ({
      id: row.id, hsCode: row.hsCode ?? "", nameAr: row.nameAr, nameEn: row.nameEn, quantity: Number(row.quantity ?? 1),
      invoiceValue: Number(row.invoiceValue ?? 0), origin: row.origin ?? "", dutyRate: Number(row.dutyRate ?? 0),
      vatRate: Number(row.vatRate ?? 14), tableTaxRate: 0, developmentRate: 0, tariffItemId: row.tariffItemId,
    })));
    setLoaded(true);
  }, [editingId, data, loaded, clients]);

  const companyMatches = clients.filter((client: Row) => {
    const q = companyQuery.trim();
    if (q.length < 1) return false;
    return `${client.name} ${client.taxNumber ?? ""}`.includes(q);
  }).slice(0, 6);

  function chooseClient(client: Row) {
    setForm((prev) => ({
      ...prev, clientId: String(client.id), clientName: client.name, taxNumber: client.taxNumber ?? "",
      phone: client.phone ?? "", email: client.email ?? "", city: client.city ?? "",
    }));
    setCompanyQuery(client.name);
    setShowCompanies(false);
  }

  async function saveCompany() {
    if (!companyQuery.trim()) { toast("اكتب اسم الشركة", "error"); return; }
    const created = await create("clients", {
      name: companyQuery.trim(), taxNumber: form.taxNumber, phone: form.phone, email: form.email,
      city: form.city, type: "company", status: "active",
    });
    if (created) {
      chooseClient(created);
      toast("تم حفظ الشركة وستظهر بياناتها تلقائياً عند كتابة اسمها");
    }
  }

  const assessment = assessableValue({
    invoiceValue: Number(form.cargoValue) || lines.reduce((sum, line) => sum + Number(line.invoiceValue || 0), 0),
    currency: form.currency,
    freight: Number(form.freightAmount) || 0,
    insurance: Number(form.insuranceAmount) || 0,
    contractType: form.contractType,
    rates: fx.rates,
  });
  const lineTotal = lines.reduce((sum, line) => sum + Number(line.invoiceValue || 0), 0) || Number(form.cargoValue) || 0;
  const feeTotals = lines.reduce((sum, line) => {
    const share = lineTotal ? assessment.cifEgp * (Number(line.invoiceValue) / lineTotal) : assessment.cifEgp;
    const fees = lineFees(share, line.dutyRate, line.vatRate, line.tableTaxRate, line.developmentRate);
    return { duty: sum.duty + fees.duty, vat: sum.vat + fees.vat, total: sum.total + fees.total };
  }, { duty: 0, vat: 0, total: 0 });
  const acid = acidTimeline(form.acidIssuedAt, form.eta);
  const tariffMatches = useMemo(() => {
    const q = tariffQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return tariff.filter((item: Row) => `${item.hsCode} ${item.nameAr} ${item.nameEn}`.toLowerCase().includes(q)).slice(0, 6);
  }, [tariff, tariffQuery]);

  function addTariff(item: Row) {
    setLines((prev) => [...prev, {
      hsCode: item.hsCode, nameAr: item.nameAr, nameEn: item.nameEn, quantity: 1, invoiceValue: 0, origin: form.origin,
      dutyRate: Number(item.dutyRate ?? 0), vatRate: Number(item.vatRate ?? 14), tableTaxRate: Number(item.tableTaxRate ?? 0),
      developmentRate: Number(item.developmentRate ?? 0), importStatus: item.importStatus, authorities: item.authorities, tariffItemId: item.id,
    }]);
    setTariffQuery("");
    if (!form.goodsDescription) set("goodsDescription", item.nameAr);
  }

  async function readInvoice(file: File) {
    let parsed: ParsedInvoice;
    if (/\.(xlsx|xls|csv)$/i.test(file.name)) {
      const XLSX = await import("xlsx");
      const book = XLSX.read(await file.arrayBuffer());
      parsed = parseInvoiceRows(XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]]));
    } else {
      const buffer = await file.arrayBuffer();
      const latin = new TextDecoder("latin1").decode(buffer);
      const pdfText = [...latin.matchAll(/\(([^()\\]{3,120})\)/g)].map((m) => m[1]).join("\n");
      parsed = parseInvoiceText(pdfText.length > 40 ? pdfText : await file.text());
    }
    applyParsed(parsed);
  }

  function applyParsed(parsed: ParsedInvoice) {
    setForm((prev) => ({
      ...prev,
      commercialInvoiceNo: parsed.invoiceNo || prev.commercialInvoiceNo,
      commercialInvoiceDate: parsed.invoiceDate.includes("-") ? parsed.invoiceDate : prev.commercialInvoiceDate,
      currency: parsed.currency || prev.currency,
      cargoValue: parsed.amount ? String(parsed.amount) : prev.cargoValue,
      contractType: parsed.contractType || prev.contractType,
      paymentMethod: parsed.paymentMethod || prev.paymentMethod,
      origin: parsed.origin || prev.origin,
      goodsDescription: parsed.goods || prev.goodsDescription,
      taxNumber: parsed.taxNumber || prev.taxNumber,
    }));
    if (parsed.companyName) {
      setCompanyQuery(parsed.companyName);
      const existing = clients.find((client: Row) => client.name.includes(parsed.companyName) || (parsed.taxNumber && client.taxNumber === parsed.taxNumber));
      if (existing) chooseClient(existing);
    }
    const matched = parsed.lines.map((line) => {
      const item = tariff.find((row: Row) => String(row.hsCode).replace(/\./g, "") === line.hsCode.replace(/\./g, "") || String(row.hsCode) === line.hsCode);
      return item ? {
        hsCode: item.hsCode, nameAr: item.nameAr, nameEn: item.nameEn, quantity: 1, invoiceValue: line.amount, origin: line.origin || parsed.origin,
        dutyRate: Number(item.dutyRate), vatRate: Number(item.vatRate), tableTaxRate: Number(item.tableTaxRate ?? 0),
        developmentRate: Number(item.developmentRate ?? 0), importStatus: item.importStatus, authorities: item.authorities, tariffItemId: item.id,
      } : { hsCode: line.hsCode, nameAr: line.name || "صنف من الفاتورة", quantity: 1, invoiceValue: line.amount, origin: line.origin, dutyRate: 0, vatRate: 14, tableTaxRate: 0, developmentRate: 0 };
    }).filter((line) => line.hsCode || line.nameAr);
    if (matched.length) setLines(matched);
    toast(parsed.notes[0] || "تمت قراءة الفاتورة");
  }

  async function save() {
    let clientId = Number(form.clientId);
    if (!clientId && companyQuery.trim()) {
      const created = await create("clients", { name: companyQuery.trim(), taxNumber: form.taxNumber, phone: form.phone, email: form.email, city: form.city, type: "company", status: "active" });
      if (!created) return;
      clientId = Number(created.id);
    }
    if (!clientId) { toast("اختر الشركة أو اكتب اسمها ورقمه الضريبي", "error"); return; }
    if (!form.goodsDescription && !lines[0]) { toast("أدخل وصف البضاعة أو بنداً جمركياً", "error"); return; }
    const expires = form.acidIssuedAt ? new Date(new Date(form.acidIssuedAt).getTime() + ACID_VALIDITY_DAYS * 86400000).toISOString().slice(0, 10) : "";
    const payload = {
      clientId, cargoKind: form.cargoKind, direction: form.direction, mode: form.mode, customsRegime: form.customsRegime,
      subjectionSystem: form.subjectionSystem, commercialInvoiceNo: form.commercialInvoiceNo, commercialInvoiceDate: form.commercialInvoiceDate,
      contractType: form.contractType, paymentMethod: form.paymentMethod, bankId: form.bankId, currency: form.currency,
      cargoValue: form.cargoValue || lineTotal, freightAmount: form.freightAmount, insuranceAmount: form.insuranceAmount,
      exchangeRate: assessment.rate, customsValueEgp: assessment.cifEgp, acidNumber: form.acidNumber, acidIssuedAt: form.acidIssuedAt,
      acidExpiresAt: expires, eta: form.eta, transportRef: form.transportRef, goodsDescription: form.goodsDescription || lines[0]?.nameAr,
      origin: form.origin, carrierId: form.carrierId, portId: form.portId, notes: form.notes, status: "documents",
    };
    setSaving(true);
    const saved = editingId ? await update("shipments", editingId, payload) : await create("shipments", payload);
    if (saved) {
      for (const line of lines) {
        const share = lineTotal ? assessment.cifEgp * (Number(line.invoiceValue) / lineTotal) : 0;
        const fees = lineFees(share, line.dutyRate, line.vatRate, line.tableTaxRate, line.developmentRate);
        const itemPayload = { shipmentId: saved.id, tariffItemId: line.tariffItemId, hsCode: line.hsCode, nameAr: line.nameAr, nameEn: line.nameEn, quantity: line.quantity, invoiceValue: line.invoiceValue, currency: form.currency, origin: line.origin, dutyRate: line.dutyRate, vatRate: line.vatRate, dutyAmount: fees.duty, vatAmount: fees.vat, feesTotal: fees.total };
        if (line.id) await update("shipmentItems", line.id, itemPayload);
        else await create("shipmentItems", itemPayload);
      }
      toast("تم حفظ ملف التخليص والرسوم");
      if (!editingId) router.replace(`/clearance?id=${saved.id}`);
    }
    setSaving(false);
  }

  const bank = banks.find((row: Row) => String(row.id) === String(form.bankId));

  return (
    <div className="space-y-4" id="print-root">
      <PageHeader
        title="ملف التخليص الجمركي"
        subtitle="نوع الشحنة، النظام الجمركي، الفاتورة، التعاقد، البنود، الرسوم، ACID والبنك — بالعربية والإنجليزية"
        icon={<ScaleIcon />}
        actions={<><ExportBar filename="ملف-تخليص" title="ملف التخليص الجمركي" rows={[{ ...form, القيمة_المقر: assessment.cifEgp, الرسم: feeTotals.duty, الضريبة: feeTotals.vat }]} /><button className="btn-primary" onClick={() => void save()} disabled={saving}><Save size={15} /> {saving ? "جاري الحفظ..." : "حفظ الملف"}</button></>}
      />
      <FxStrip fx={fx} />
      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-4">
          <section className="card grid gap-3 p-4 md:grid-cols-4">
            <label className="md:col-span-2 relative block">
              <span className="field-label">اسم الشركة / Company</span>
              <input className="field" value={companyQuery} placeholder="اكتب الاسم لتظهر بياناتها المحفوظة" onChange={(e) => { setCompanyQuery(e.target.value); setShowCompanies(true); set("clientId", ""); }} onFocus={() => setShowCompanies(true)} />
              {showCompanies && companyMatches.length > 0 && (
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 bg-white shadow-xl">
                  {companyMatches.map((client: Row) => (
                    <button key={client.id} className="block w-full px-3 py-2 text-right text-[11px] hover:bg-teal-50" onClick={() => chooseClient(client)}>
                      <strong>{client.name}</strong><span className="mt-0.5 block text-slate-400">{client.taxNumber || "بدون رقم ضريبي"} · {client.city || ""}</span>
                    </button>
                  ))}
                </div>
              )}
            </label>
            <label><span className="field-label">الرقم الضريبي</span><input className="field" value={form.taxNumber} onChange={(e) => set("taxNumber", e.target.value)} /></label>
            <label><span className="field-label">الهاتف</span><input className="field" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></label>
            <label><span className="field-label">البريد</span><input className="field text-left" dir="ltr" value={form.email} onChange={(e) => set("email", e.target.value)} /></label>
            <label><span className="field-label">المدينة</span><input className="field" value={form.city} onChange={(e) => set("city", e.target.value)} /></label>
            <div className="md:col-span-2 flex items-end"><button className="btn-ghost w-full" onClick={() => void saveCompany()}><Building2 size={14} /> حفظ الشركة تلقائياً</button></div>
          </section>

          <section className="card grid gap-3 p-4 md:grid-cols-4">
            <Select label="نوع الشحنة" value={form.cargoKind} onChange={(v) => set("cargoKind", v)} options={cargoKinds} />
            <Select label="النظام الجمركي" value={form.customsRegime} onChange={(v) => set("customsRegime", v)} options={customsRegimes} />
            <Select label="نظام الخضوع" value={form.subjectionSystem} onChange={(v) => set("subjectionSystem", v)} options={subjectionSystems} />
            <Select label="نوع التعاقد / Incoterm" value={form.contractType} onChange={(v) => set("contractType", v)} options={incoterms} />
            <label><span className="field-label">رقم الفاتورة التجارية</span><input className="field" value={form.commercialInvoiceNo} onChange={(e) => set("commercialInvoiceNo", e.target.value)} /></label>
            <label><span className="field-label">تاريخ الفاتورة</span><input type="date" className="field" value={String(form.commercialInvoiceDate).slice(0, 10)} onChange={(e) => set("commercialInvoiceDate", e.target.value)} /></label>
            <label><span className="field-label">قيمة الفاتورة</span><input className="field" value={form.cargoValue} onChange={(e) => set("cargoValue", e.target.value)} /></label>
            <label><span className="field-label">العملة</span><select className="field" value={form.currency} onChange={(e) => set("currency", e.target.value)}>{Object.keys(fx.rates).map((code) => <option key={code}>{code}</option>)}</select></label>
            <label><span className="field-label">الشحن</span><input className="field" value={form.freightAmount} onChange={(e) => set("freightAmount", e.target.value)} /></label>
            <label><span className="field-label">التأمين</span><input className="field" value={form.insuranceAmount} onChange={(e) => set("insuranceAmount", e.target.value)} /></label>
            <Select label="أسلوب السداد" value={form.paymentMethod} onChange={(v) => set("paymentMethod", v)} options={paymentMethods} />
            <label><span className="field-label">البنك / Bank</span>
              <select className="field" value={form.bankId} onChange={(e) => set("bankId", e.target.value)}>
                <option value="">— اختر —</option>
                {banks.map((bankRow: Row) => <option key={bankRow.id} value={bankRow.id}>{bankRow.code} · {bankRow.nameAr}</option>)}
              </select>
            </label>
            <label className="md:col-span-2"><span className="field-label">رقم البوليصة / AWB</span><input className="field text-left" dir="ltr" value={form.transportRef} onChange={(e) => set("transportRef", e.target.value)} /></label>
            <label><span className="field-label">رقم ACID</span><input className="field text-left" dir="ltr" value={form.acidNumber} onChange={(e) => set("acidNumber", e.target.value)} /></label>
            <label><span className="field-label">تاريخ إصدار ACID</span><input type="date" className="field" value={String(form.acidIssuedAt).slice(0, 10)} onChange={(e) => set("acidIssuedAt", e.target.value)} /></label>
            <label><span className="field-label">الوصول المتوقع ETA</span><input type="date" className="field" value={String(form.eta).slice(0, 10)} onChange={(e) => set("eta", e.target.value)} /></label>
            <label><span className="field-label">المنشأ</span><input className="field" value={form.origin} onChange={(e) => set("origin", e.target.value)} /></label>
            <label className="md:col-span-4"><span className="field-label">وصف البضاعة</span><input className="field" value={form.goodsDescription} onChange={(e) => set("goodsDescription", e.target.value)} /></label>
            <label className="md:col-span-4 no-print block">
              <span className="field-label flex items-center gap-1"><FileScan size={13} /> قراءة فاتورة Excel / PDF / نص</span>
              <input type="file" accept=".xlsx,.xls,.csv,.pdf,.txt" className="field" onChange={(e) => { const file = e.target.files?.[0]; if (file) void readInvoice(file); }} />
            </label>
          </section>

          <section className="card p-4">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-bold">الأصناف والبنود الجمركية</h2><span className="text-[10px] text-slate-400">ابحث بالاسم أو البند</span></div>
            <input className="field" placeholder="مثال: تكييف أو 8415.10" value={tariffQuery} onChange={(e) => setTariffQuery(e.target.value)} />
            {tariffMatches.length > 0 && (
              <div className="mt-2 divide-y rounded-xl border border-slate-100">
                {tariffMatches.map((item: Row) => (
                  <button key={item.id} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-right hover:bg-teal-50" onClick={() => addTariff(item)}>
                    <span><strong className="font-mono text-[11px] text-teal-700">{item.hsCode}</strong> <span className="text-[11px]">{item.nameAr}</span></span>
                    <span className="text-[10px] text-slate-400">{item.dutyRate}٪ · <Plus size={12} className="inline" /></span>
                  </button>
                ))}
              </div>
            )}
            <div className="mt-3 space-y-2">
              {lines.length === 0 && <p className="py-6 text-center text-[11px] text-slate-400">لم تُضف أصناف بعد</p>}
              {lines.map((line, index) => {
                const share = lineTotal ? assessment.cifEgp * (Number(line.invoiceValue) / lineTotal) : 0;
                const fees = lineFees(share, line.dutyRate, line.vatRate, line.tableTaxRate, line.developmentRate);
                return (
                  <div key={`${line.hsCode}-${index}`} className="rounded-xl border border-slate-100 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-teal-700">{line.hsCode}</span>
                      <span className="text-[11px] font-semibold">{line.nameAr}</span>
                      {line.nameEn && <span className="text-[10px] text-slate-400">{line.nameEn}</span>}
                      {line.importStatus && <Badge value={line.importStatus} options={importStatuses} />}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
                      <input className="field" type="number" value={line.invoiceValue} placeholder="قيمة الصنف" onChange={(e) => setLines((prev) => prev.map((row, i) => i === index ? { ...row, invoiceValue: Number(e.target.value) } : row))} />
                      <input className="field" value={line.origin} placeholder="المنشأ" onChange={(e) => setLines((prev) => prev.map((row, i) => i === index ? { ...row, origin: e.target.value } : row))} />
                      <div className="rounded-lg bg-slate-50 px-2 py-2 text-[10px]">رسم {formatMoney(fees.duty)} · ضريبة {formatMoney(fees.vat)}</div>
                      <button className="text-[10px] text-rose-500" onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}>حذف الصنف</button>
                    </div>
                    {line.authorities && <p className="mt-1 text-[10px] text-slate-500">الجهات: {line.authorities}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="card p-4">
            <h2 className="text-sm font-bold">القيمة المقر عليها والرسوم</h2>
            <p className="mt-1 text-[10px] text-slate-400">تتحدث فور إدخال الفاتورة والعملة والتعاقد · {assessment.term.label}</p>
            <div className="mt-3 space-y-2 text-[12px]">
              <RowLine label="سعر الصرف" value={assessment.rate ? assessment.rate.toLocaleString("en-US", { maximumFractionDigits: 3 }) : "بانتظار التحديث"} />
              <RowLine label="قيمة الفاتورة بالجنيه" value={formatMoney(assessment.invoiceEgp)} />
              <RowLine label="الشحن / التأمين" value={formatMoney(assessment.freightEgp + assessment.insuranceEgp)} />
              <RowLine label="القيمة المقر عليها CIF" value={formatMoney(assessment.cifEgp)} strong />
              {assessment.estimated && <p className="text-[10px] text-amber-700">أُضيف شحن ٤٪ وتأمين ١٪ تقديرياً لأن التعاقد لا يشملهما ولم تُدخل قيمتهما.</p>}
              <RowLine label="الرسم الجمركي" value={formatMoney(feeTotals.duty)} />
              <RowLine label="ضريبة القيمة المضافة" value={formatMoney(feeTotals.vat)} />
              <div className="rounded-xl bg-[var(--navy)] px-3 py-2 text-white">إجمالي الرسوم <strong>{formatMoney(feeTotals.total)}</strong></div>
            </div>
            {bank && <p className="mt-3 text-[11px] leading-6 text-slate-500">السداد عبر {bank.nameAr} / {bank.nameEn} · كود {bank.code} · SWIFT {bank.swift} · {paymentMethods.find((m) => m.value === form.paymentMethod)?.label}</p>}
          </section>
          <section className="card p-4">
            <h2 className="flex items-center gap-2 text-sm font-bold"><Timer size={15} className="text-teal-600" /> صلاحية ACID وربطه بالوصول</h2>
            {!acid ? <p className="mt-2 text-[11px] text-slate-400">أدخل تاريخ إصدار ACID لحساب المدة. الصلاحية {ACID_VALIDITY_DAYS} يوماً وفق إجراءات منظومة ACI.</p> : (
              <div className="mt-3 space-y-2 text-[12px]">
                <RowLine label="تاريخ الإصدار" value={formatDate(acid.issued)} />
                <RowLine label="ينتهي في" value={formatDate(acid.expires)} />
                <RowLine label="مضى عليه" value={`${acid.elapsed} يوم`} />
                <RowLine label="المتبقي" value={acid.expired ? "منتهي" : `${acid.remaining} يوم`} />
                <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full ${acid.expired ? "bg-rose-500" : "bg-teal-500"}`} style={{ width: `${acid.progress}%` }} /></div>
                <p className={`text-[11px] ${acid.arrivesAfterExpiry ? "text-rose-600" : "text-emerald-700"}`}>{acid.arrivesAfterExpiry ? "الوصول المتوقع بعد انتهاء ACID — يجب التجديد قبل الشحن" : form.eta ? "الوصول المتوقع داخل صلاحية ACID" : "أدخل ETA لربط الوصول بالصلاحية"}</p>
              </div>
            )}
          </section>
          <section className="card border-sky-100 bg-sky-50/50 p-4 text-[11px] leading-6 text-sky-950">
            <p className="flex items-center gap-1 font-bold"><ShieldAlert size={13} /> مرجع قانوني تشغيلي</p>
            القيمة الجمركية تُحدد وفق قيمة الصفقة على أساس CIF عملاً بقانون الجمارك رقم ٢٠٧ لسنة ٢٠٢٠. التصنيف وفق النظام المنسق وكتاب التعريفة، والرقابة المسبقة عبر ACID على نافذة. الفئات تُراجع مع الإصدار الرسمي.
          </section>
        </div>
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ value: string; label: string }> }) {
  return <label><span className="field-label">{label}</span><select className="field" value={value} onChange={(e) => onChange(e.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}
function RowLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"><span className="text-slate-500">{label}</span><strong className={strong ? "text-teal-700" : ""}>{value}</strong></div>;
}
function ScaleIcon() { return <span className="text-sm font-bold">ج</span>; }
