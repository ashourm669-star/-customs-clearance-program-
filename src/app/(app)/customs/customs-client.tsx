"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle, ArrowLeft, BadgeCheck, BookOpen, Building2, Check, CircleDollarSign, Download,
  FileText, Globe2, Landmark, Loader2, Pencil, Plus, Printer, RefreshCw, Save, Search, Ship,
  Trash2, Upload, Wallet,
} from "lucide-react";
import { Badge, EmptyState, Field, Modal, PageHeader, Spinner, cx } from "@/components/ui";
import { ExportMenu } from "@/components/export-menu";
import { useToast } from "@/components/toast";
import type { CustomsData } from "@/lib/customs-queries";
import type { ContractItem, BankItem, TariffItem, CommercialInvoiceItem } from "@/lib/customs";
import {
  calculateItem, egpValue, acidCountdown, CONTRACT_TYPES, CONTRACT_TYPE_META, INCOTERMS,
  INCOTERM_META, PAYMENT_METHODS, PAYMENT_METHOD_META, IMPORT_STATUS_META, CUSTOMS_SYSTEMS, CUSTOMS_SYSTEM_META,
} from "@/lib/customs";
import { CURRENCIES } from "@/lib/constants";
import { formatDate, formatDateTime, formatMoney, formatNumber, todayInputValue } from "@/lib/format";
import type { ShipmentRow } from "@/lib/types";

export type CustomsShipment = {
  id: number; reference: string; clientId: number | null; carrierId: number | null;
  contractId: number | null; incoterm: string | null; paymentMethod: string | null; bankId: number | null;
  bankReference: string | null; commercialInvoiceNumber: string | null; commercialInvoiceDate: string | null;
  originCountry: string | null; customsSystem: string | null; manifestNumber: string | null; manifestType: string | null;
  acidNumber: string | null; acidSubmittedAt: string | null; acidExpiresAt: string | null; acidStatus: string | null;
  assessmentValue: number | null; currency: string; invoiceValue: number; dutyAmount: number; vatAmount: number; serviceFees: number;
};

type Rate = { currency: string; rate: number; previousRate: number | null; source: string; updatedAt: string };
type Parsed = {
  number: string | null; date: string | null; supplierName: string | null; originCountry: string | null; currency: string;
  subtotal: number | null; freight: number | null; insurance: number | null; total: number | null; incoterm: string | null;
  paymentMethod: string | null; bankName: string | null; bankSwift: string | null; bankAccount: string | null; bankIban: string | null;
  acidNumber: string | null; hsCodes: string[]; items: { description: string; hsCode: string | null; quantity: number; unitValue: number; invoiceValue: number; currency: string }[]; warnings: string[];
};

type Tab = "file" | "items" | "contracts" | "banks" | "invoices" | "tariffs" | "acid" | "manifest" | "rates";
const TABS: { key: Tab; label: string }[] = [
  { key: "file", label: "بيانات الملف" }, { key: "items", label: "البنود والرسوم" },
  { key: "contracts", label: "العقود" }, { key: "banks", label: "البنوك والسداد" },
  { key: "invoices", label: "الفواتير التجارية" }, { key: "tariffs", label: "التعريفة الجمركية" },
  { key: "acid", label: "ACID" }, { key: "manifest", label: "منافيست" }, { key: "rates", label: "العملات" },
];

function toForm(s: CustomsShipment | null): Record<string, string> {
  return {
    contractId: s?.contractId ? String(s.contractId) : "", incoterm: s?.incoterm ?? "FOB", paymentMethod: s?.paymentMethod ?? "bank_transfer",
    bankId: s?.bankId ? String(s.bankId) : "", bankReference: s?.bankReference ?? "",
    commercialInvoiceNumber: s?.commercialInvoiceNumber ?? "", commercialInvoiceDate: todayInputValue(s?.commercialInvoiceDate).slice(0, 10),
    originCountry: s?.originCountry ?? "", customsSystem: s?.customsSystem ?? "nafeza",
    manifestNumber: s?.manifestNumber ?? "", manifestType: s?.manifestType ?? "import",
    acidNumber: s?.acidNumber ?? "", acidSubmittedAt: todayInputValue(s?.acidSubmittedAt), acidExpiresAt: todayInputValue(s?.acidExpiresAt),
    acidStatus: s?.acidStatus ?? "draft",
  };
}

export function CustomsClient({ initialData, clients, shipments, initialShipment, shipmentSummary, userName }: {
  initialData: CustomsData & { rates: Rate[] }; clients: { id: number; name: string }[]; shipments: { id: number; reference: string; clientId: number | null }[];
  initialShipment: CustomsShipment | null; shipmentSummary: ShipmentRow | null; userName: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState(initialData);
  const [shipment, setShipment] = useState(initialShipment);
  const [form, setForm] = useState(() => toForm(initialShipment));
  const [tab, setTab] = useState<Tab>("file");
  const [saving, setSaving] = useState(false);
  const [billQuery, setBillQuery] = useState("");
  const [billLoading, setBillLoading] = useState(false);
  const [billResult, setBillResult] = useState<{ local: { id: number; reference: string; blNumber: string | null }[]; live: { status: string; message: string; events: unknown[] } } | null>(null);
  const [tariffQuery, setTariffQuery] = useState("");
  const [selectedTariff, setSelectedTariff] = useState<TariffItem | null>(null);
  const [modal, setModal] = useState<"contract" | "bank" | "tariff" | "item" | "invoice" | null>(null);
  const [editing, setEditing] = useState<ContractItem | BankItem | TariffItem | null>(null);
  const [contractForm, setContractForm] = useState({ number: "", clientId: "", name: "", type: "sale", incoterm: "FOB", paymentMethod: "bank_transfer", bankId: "", currency: "USD", amount: "0", startDate: "", endDate: "", paymentTerms: "تحويل بنكي قبل الشحن", notes: "" });
  const [bankForm, setBankForm] = useState({ name: "", nameEn: "", code: "", swift: "", accountName: "", accountNumber: "", iban: "", currency: "EGP", branch: "", notes: "" });
  const [tariffForm, setTariffForm] = useState({ code: "", nameAr: "", nameEn: "", chapter: "", category: "", unit: "قطعة", dutyBps: "", vatBps: "1400", importStatus: "verification_required", authorities: "", conditions: "", sourceUrl: "https://customs.gov.eg/", sourceReference: "", legalUpdatedAt: "", verified: "0", notes: "" });
  const [itemForm, setItemForm] = useState({ shipmentId: String(initialShipment?.id ?? ""), tariffId: "", description: "", hsCode: "", originCountry: "", quantity: "1", unit: "قطعة", unitValue: "0", currency: "USD", invoiceValue: "0", freight: "0", insurance: "0" });
  const [ocrLoading, setOcrLoading] = useState(false);
  const [parsed, setParsed] = useState<Parsed | null>(null);
  const [invoiceText, setInvoiceText] = useState("");
  const [invoiceFilename, setInvoiceFilename] = useState("");
  const [invoiceView, setInvoiceView] = useState<CommercialInvoiceItem | null>(null);
  const [importing, setImporting] = useState(false);
  const [fxLoading, setFxLoading] = useState(false);
  const [calculator, setCalculator] = useState({ amount: "1000", currency: "USD", freight: "100", insurance: "20", tariffId: "", manualRate: "" });
  const [deleteTarget, setDeleteTarget] = useState<{ resource: string; id: number; name: string } | null>(null);

  const filteredTariffs = useMemo(() => {
    const q = tariffQuery.trim().toLowerCase();
    return data.tariffs.filter((item) => !q || [item.code, item.nameAr, item.nameEn].some((value) => value?.toLowerCase().includes(q)));
  }, [data.tariffs, tariffQuery]);

  const selectedContract = data.contracts.find((item) => item.id === Number(form.contractId));
  const selectedBank = data.banks.find((item) => item.id === Number(form.bankId));
  const rateMap = Object.fromEntries(data.rates.map((rate) => [rate.currency, rate.rate]));
  const countdown = form.acidSubmittedAt && form.acidExpiresAt ? acidCountdown(form.acidSubmittedAt, form.acidExpiresAt) : null;
  const calcTariff = data.tariffs.find((item) => item.id === Number(calculator.tariffId));
  const calc = calculateItem({ description: "", quantity: 1, unitValue: Number(calculator.amount), currency: calculator.currency, invoiceValue: Number(calculator.amount), freight: Number(calculator.freight), insurance: Number(calculator.insurance), dutyBps: calcTariff?.dutyBps ?? null, vatBps: calcTariff?.vatBps ?? null });
  const manualRate = Number(calculator.manualRate || rateMap[calculator.currency] || (calculator.currency === "EGP" ? 1 : 0));
  const assessedValue = egpValue(calc.cif, calculator.currency, { ...rateMap, ...(manualRate > 0 ? { [calculator.currency]: manualRate } : {}) });

  async function api(path: string, body: unknown, method = "POST") {
    const response = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "تعذّر تنفيذ العملية.");
    return result;
  }

  async function refresh() {
    const response = await fetch("/api/customs");
    if (response.ok) setData(await response.json());
    router.refresh();
  }

  async function saveShipment(event?: React.FormEvent) {
    event?.preventDefault();
    if (!shipment) return;
    setSaving(true);
    const previous = shipment;
    setShipment({ ...shipment, contractId: Number(form.contractId) || null, incoterm: form.incoterm, paymentMethod: form.paymentMethod, bankId: Number(form.bankId) || null });
    try {
      await api("/api/customs", { resource: "shipment", id: shipment.id, values: form }, "PATCH");
      toast({ title: "تم حفظ بيانات الملف", description: shipment.reference, tone: "success" });
      await refresh();
    } catch (error) {
      setShipment(previous);
      toast({ title: "تعذّر الحفظ", description: error instanceof Error ? error.message : undefined, tone: "error" });
    } finally { setSaving(false); }
  }

  async function searchBill() {
    if (billQuery.trim().length < 3) { toast({ title: "أدخل رقم بوليصة صحيحاً", tone: "error" }); return; }
    setBillLoading(true);
    try {
      const response = await fetch(`/api/tracking?q=${encodeURIComponent(billQuery)}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setBillResult(result);
    } catch { toast({ title: "تعذّر البحث", tone: "error" }); }
    finally { setBillLoading(false); }
  }

  async function importBill() {
    setBillLoading(true);
    try {
      const result = await api("/api/tracking", { action: "import", query: billQuery });
      toast({ title: result.result.ok ? "تم استيراد البيانات" : "لا توجد بيانات", description: result.result.message, tone: result.result.ok ? "success" : "error" });
      if (result.result.shipmentId) router.push(`/customs?id=${result.result.shipmentId}`);
      await refresh();
    } catch { toast({ title: "تعذّر الاستيراد", tone: "error" }); }
    finally { setBillLoading(false); }
  }

  function openContract(contract?: ContractItem) {
    setEditing(contract ?? null);
    setContractForm(contract ? {
      number: contract.number, clientId: String(contract.clientId ?? ""), name: contract.name, type: contract.type,
      incoterm: contract.incoterm ?? "FOB", paymentMethod: contract.paymentMethod, bankId: String(contract.bankId ?? ""), currency: contract.currency ?? "USD",
      amount: String(contract.amount ?? 0), startDate: todayInputValue(contract.startDate).slice(0, 10), endDate: todayInputValue(contract.endDate).slice(0, 10),
      paymentTerms: contract.paymentTerms ?? "", notes: contract.notes ?? "",
    } : { number: "", clientId: String(shipment?.clientId ?? ""), name: "", type: "sale", incoterm: "FOB", paymentMethod: "bank_transfer", bankId: "", currency: "USD", amount: "0", startDate: "", endDate: "", paymentTerms: "تحويل بنكي قبل الشحن", notes: "" });
    setModal("contract");
  }

  function openBank(bank?: BankItem) {
    setEditing(bank ?? null);
    setBankForm(bank ? { name: bank.name, nameEn: bank.nameEn ?? "", code: bank.code ?? "", swift: bank.swift ?? "", accountName: bank.accountName ?? "", accountNumber: bank.accountNumber ?? "", iban: bank.iban ?? "", currency: bank.currency ?? "EGP", branch: bank.branch ?? "", notes: bank.notes ?? "" } : { name: "", nameEn: "", code: "", swift: "", accountName: "", accountNumber: "", iban: "", currency: "EGP", branch: "", notes: "" });
    setModal("bank");
  }

  function openTariff(tariff?: TariffItem) {
    setEditing(tariff ?? null);
    setTariffForm(tariff ? { code: tariff.code, nameAr: tariff.nameAr, nameEn: tariff.nameEn ?? "", chapter: tariff.chapter ?? "", category: tariff.category ?? "", unit: tariff.unit ?? "قطعة", dutyBps: tariff.dutyBps === null ? "" : String(tariff.dutyBps / 100), vatBps: tariff.vatBps === null ? "" : String(tariff.vatBps / 100), importStatus: tariff.importStatus, authorities: tariff.authorities?.join(" | ") ?? "", conditions: tariff.conditions?.join(" | ") ?? "", sourceUrl: tariff.sourceUrl ?? "", sourceReference: tariff.sourceReference ?? "", legalUpdatedAt: todayInputValue(tariff.legalUpdatedAt).slice(0, 10), verified: String(tariff.verified), notes: tariff.notes ?? "" } : { code: "", nameAr: "", nameEn: "", chapter: "", category: "", unit: "قطعة", dutyBps: "", vatBps: "1400", importStatus: "verification_required", authorities: "", conditions: "", sourceUrl: "https://customs.gov.eg/", sourceReference: "", legalUpdatedAt: "", verified: "0", notes: "" });
    setModal("tariff");
  }

  function openItem(tariff?: TariffItem) {
    setItemForm({ shipmentId: String(shipment?.id ?? ""), tariffId: tariff ? String(tariff.id) : "", description: tariff?.nameAr ?? "", hsCode: tariff?.code ?? "", originCountry: form.originCountry, quantity: "1", unit: tariff?.unit ?? "قطعة", unitValue: "0", currency: shipment?.currency || "USD", invoiceValue: "0", freight: "0", insurance: "0" });
    setModal("item");
  }

  async function submitModal(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      if (modal === "contract") {
        await api("/api/customs", { resource: "contract", ...(editing ? { id: editing.id } : {}), values: contractForm }, editing ? "PATCH" : "POST");
      } else if (modal === "bank") {
        await api("/api/customs", { resource: "bank", ...(editing ? { id: editing.id } : {}), values: bankForm }, editing ? "PATCH" : "POST");
      } else if (modal === "tariff") {
        await api("/api/customs", { resource: "tariff", ...(editing ? { id: editing.id } : {}), values: tariffForm }, editing ? "PATCH" : "POST");
      } else if (modal === "item") {
        await api("/api/customs", { resource: "item", values: itemForm });
      } else if (modal === "invoice" && parsed) {
        await api("/api/customs", { resource: "invoice", values: { ...parsed, shipmentId: shipment?.id, clientId: shipment?.clientId, contractId: Number(form.contractId) || null, sourceText: invoiceText, sourceFilename: invoiceFilename } });
      }
      toast({ title: "تم الحفظ في قاعدة البيانات", tone: "success" });
      setModal(null);
      setParsed(null);
      await refresh();
    } catch (error) { toast({ title: "تعذّر الحفظ", description: error instanceof Error ? error.message : undefined, tone: "error" }); }
    finally { setSaving(false); }
  }

  async function readInvoice(file: File) {
    setOcrLoading(true);
    setParsed(null);
    setInvoiceText("");
    setInvoiceFilename(file.name);
    try {
      const body = new FormData(); body.append("file", file);
      const response = await fetch("/api/customs/ocr", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? result.message);
      setParsed(result.parsed);
      setInvoiceText(result.text);
      setModal("invoice");
      toast({ title: "تمت قراءة الفاتورة", description: "راجع البيانات قبل حفظها — النتائج تحتاج اعتماداً.", tone: "info" });
    } catch (error) { toast({ title: "تعذّرت قراءة الفاتورة", description: error instanceof Error ? error.message : undefined, tone: "error" }); }
    finally { setOcrLoading(false); }
  }

  async function importTariff(file: File) {
    setImporting(true);
    try {
      const body = new FormData(); body.append("file", file);
      const response = await fetch("/api/customs", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      toast({ title: `تم استيراد ${result.imported} بند`, description: "راجع النسب وبيانات الاعتماد القانوني.", tone: "success" });
      await refresh();
    } catch (error) { toast({ title: "تعذّر الاستيراد", description: error instanceof Error ? error.message : undefined, tone: "error" }); }
    finally { setImporting(false); }
  }

  function downloadTemplate() {
    const rows = [{ code: "1509100010", nameAr: "زيت زيتون", nameEn: "Olive oil", chapter: "15", category: "زيوت", unit: "كجم", dutyBps: "", vatBps: "14", importStatus: "verification_required", authorities: "مصلحة الجمارك", conditions: "راجع النسب والمنشورات الرسمية", sourceUrl: "https://customs.gov.eg/", sourceReference: "مرجع يحتاج اعتماد", legalUpdatedAt: "", verified: "0", notes: "" }];
    const csv = "\uFEFF" + Object.keys(rows[0]).join(",") + "\n" + rows.map((row) => Object.values(row).map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "customs-tariff-template.csv"; a.click(); URL.revokeObjectURL(url);
  }

  async function refreshRates() {
    setFxLoading(true);
    try {
      const result = await api("/api/fx/refresh", {});
      setData((current) => ({ ...current, rates: result.rates }));
      toast({ title: "تم تحديث أسعار العملات", description: "المصدر: ExchangeRate-API — تحديث يومي", tone: "success" });
    } catch { toast({ title: "تعذّر التحديث", tone: "error" }); }
    finally { setFxLoading(false); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget; setDeleteTarget(null);
    try {
      await api(`/api/customs?resource=${target.resource}&id=${target.id}`, {}, "DELETE");
      toast({ title: "تم الحذف", tone: "success" }); await refresh();
    } catch { toast({ title: "تعذّر الحذف", tone: "error" }); }
  }

  const selectShipment = (id: string) => router.push(`/customs?id=${id}`);
  const renderDelete = (resource: string, id: number, name: string) => <button type="button" onClick={() => setDeleteTarget({ resource, id, name })} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="حذف"><Trash2 className="size-3.5" /></button>;

  return (
    <div className="space-y-5">
      <PageHeader title="المنظومة الجمركية" description="ملف واحد يربط البوليصة بالبند الجمركي والعقد والفاتورة والمنشأ والسداد وACID.">
        <ExportMenu shipmentId={shipment?.id} />
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-900"><Ship className="size-4 text-[#0f9d8b]" /> استعلام بوليصة / AWB</h2>
          <p className="text-[10px] text-slate-500">بحث في قاعدة بياناتك + مزوّد التتبع (يتطلب مفاتيح الربط)</p>
          <form onSubmit={(e) => { e.preventDefault(); void searchBill(); }} className="mt-3 flex gap-2">
            <input className="input text-xs" dir="ltr" placeholder="MAEU-8841203" value={billQuery} onChange={(e) => setBillQuery(e.target.value)} />
            <button type="submit" className="btn btn-primary px-3" disabled={billLoading}>{billLoading ? <Spinner /> : <Search className="size-4" />}</button>
          </form>
          {billResult ? <div className="mt-2 space-y-1.5">
            <p className="rounded-lg bg-amber-50 p-2 text-[10px] leading-5 text-amber-800">{billResult.live.message}</p>
            {billResult.local.map((match) => <button type="button" key={match.id} onClick={() => selectShipment(String(match.id))} className="flex w-full items-center justify-between rounded-lg bg-slate-50 px-2 py-1.5 text-[11px] font-bold text-slate-700"><span dir="ltr">{match.blNumber ?? match.reference}</span><ArrowLeft className="size-3.5" /></button>)}
            {billResult.live.status === "ok" && billResult.live.events.length ? <button type="button" onClick={importBill} className="btn btn-mint w-full"><Download className="size-4" /> استيراد البيانات الحقيقية</button> : null}
          </div> : null}
        </section>

        <section className="card p-4">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-900"><BookOpen className="size-4 text-[#0f9d8b]" /> البند الجمركي / كتاب التعريفة</h2>
          <p className="text-[10px] text-slate-500">ابحث باسم الصنف أو كود HS — النسب غير المؤكدة واضحة</p>
          <div className="relative mt-3"><Search className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" /><input className="input pr-8 text-xs" placeholder="زيت زيتون / 1509100010" value={tariffQuery} onChange={(e) => setTariffQuery(e.target.value)} /></div>
          <div className="scroll-thin mt-2 max-h-40 space-y-1 overflow-y-auto">
            {filteredTariffs.slice(0, 6).map((tariff) => <button type="button" key={tariff.id} onClick={() => setSelectedTariff(tariff)} className="flex w-full items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5 text-right hover:bg-slate-100"><span className="flex-1 truncate"><span className="block text-[11px] font-bold text-slate-800">{tariff.nameAr}</span><span className="font-mono text-[9px] text-slate-500" dir="ltr">{tariff.code}</span></span><Badge tone={IMPORT_STATUS_META[tariff.importStatus]?.tone ?? "slate"}>{IMPORT_STATUS_META[tariff.importStatus]?.label ?? tariff.importStatus}</Badge></button>)}
            {!filteredTariffs.length ? <p className="py-4 text-center text-[11px] text-slate-400">لا يوجد بند مطابق. يمكنك استيراد التعريفة أو إضافة بند.</p> : null}
          </div>
          {selectedTariff ? <div className="mt-2 rounded-xl border border-slate-200 p-2.5 text-[10px] leading-5">
            <p className="text-xs font-extrabold text-slate-900">{selectedTariff.nameAr}</p>
            <p className="text-slate-500">{selectedTariff.nameEn}</p>
            <div className="mt-1 flex flex-wrap gap-2"><Badge tone="slate">جمارك {selectedTariff.dutyBps === null ? "غير معتمدة" : `${selectedTariff.dutyBps / 100}%`}</Badge><Badge tone="slate">ض.ق.م {selectedTariff.vatBps === null ? "غير معتمد" : `${selectedTariff.vatBps / 100}%`}</Badge></div>
            <p className="mt-1 font-bold text-slate-600">الجهات: {selectedTariff.authorities?.join(" · ") || "تحتاج تحديد"}</p>
            <ul className="list-disc pr-4 text-slate-500">{selectedTariff.conditions?.map((condition) => <li key={condition}>{condition}</li>)}</ul>
            <div className="mt-1 flex flex-wrap gap-2"><a href={selectedTariff.sourceUrl ?? "https://customs.gov.eg/"} target="_blank" rel="noreferrer" className="font-bold text-[#0f9d8b]">المصدر الرسمي ↗</a><button type="button" onClick={() => openItem(selectedTariff)} className="font-bold text-[#0a2239]">إضافة للملف +</button></div>
          </div> : null}
        </section>
      </div>

      {shipment ? <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3"><div><p className="text-sm font-extrabold text-slate-900">{shipment.reference}</p><p className="text-[11px] text-slate-500">{shipmentSummary?.clientName} · {shipmentSummary?.carrierName}</p></div><select className="input w-auto text-xs" value={shipment.id} onChange={(e) => selectShipment(e.target.value)}>{shipments.map((option) => <option key={option.id} value={option.id}>{option.reference}</option>)}</select></div> : null}

      <div className="card overflow-hidden">
        <div className="scroll-thin flex gap-1 overflow-x-auto border-b border-slate-100 px-3 pt-2 no-print">{TABS.map((item) => <button type="button" key={item.key} onClick={() => setTab(item.key)} className={cx("whitespace-nowrap rounded-t-lg px-3 py-2.5 text-[11px] font-bold transition", tab === item.key ? "bg-[#0a2239] text-white" : "text-slate-500 hover:bg-slate-50")}>{item.label}</button>)}</div>
        <div className="p-5">
          {tab === "file" && shipment ? <form onSubmit={saveShipment}>
            <div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-bold text-slate-900">بيانات الملف والتعاقد والسداد</h2><button type="submit" className="btn btn-primary h-9 text-xs" disabled={saving}>{saving ? <Spinner /> : <Save className="size-4" />} حفظ</button></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="نظام التخليص"><select className="input" value={form.customsSystem} onChange={(e) => setForm({ ...form, customsSystem: e.target.value })}>{CUSTOMS_SYSTEMS.map((system) => <option key={system} value={system}>{CUSTOMS_SYSTEM_META[system].label}</option>)}</select></Field>
              <Field label="العقد"><select className="input" value={form.contractId} onChange={(e) => { const c = data.contracts.find((item) => item.id === Number(e.target.value)); setForm({ ...form, contractId: e.target.value, ...(c ? { incoterm: c.incoterm ?? "FOB", paymentMethod: c.paymentMethod, bankId: String(c.bankId ?? "") } : {}) }); }}><option value="">— بدون عقد —</option>{data.contracts.map((c) => <option key={c.id} value={c.id}>{c.number} — {c.name}</option>)}</select></Field>
              <Field label="نوع التعاقد"><input className="input bg-slate-50" readOnly value={selectedContract ? CONTRACT_TYPE_META[selectedContract.type]?.label ?? selectedContract.type : "—" } /></Field>
              <Field label="شروط التجارة Incoterm"><select className="input" value={form.incoterm} onChange={(e) => setForm({ ...form, incoterm: e.target.value })}>{INCOTERMS.map((term) => <option key={term} value={term}>{term} — {INCOTERM_META[term].label}</option>)}</select></Field>
              <Field label="أسلوب السداد"><select className="input" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>{PAYMENT_METHODS.map((method) => <option key={method} value={method}>{PAYMENT_METHOD_META[method].label}</option>)}</select></Field>
              <Field label="البنك"><select className="input" value={form.bankId} onChange={(e) => setForm({ ...form, bankId: e.target.value })}><option value="">— بدون بنك —</option>{data.banks.map((bank) => <option key={bank.id} value={bank.id}>{bank.name}</option>)}</select></Field>
              <Field label="رقم الفاتورة التجارية"><input className="input" value={form.commercialInvoiceNumber} onChange={(e) => setForm({ ...form, commercialInvoiceNumber: e.target.value })} /></Field>
              <Field label="تاريخ الفاتورة التجارية"><input type="date" className="input" value={form.commercialInvoiceDate} onChange={(e) => setForm({ ...form, commercialInvoiceDate: e.target.value })} /></Field>
              <Field label="بلد المنشأ"><input className="input" value={form.originCountry} onChange={(e) => setForm({ ...form, originCountry: e.target.value })} placeholder="إيطاليا" /></Field>
              <Field label="رقم منافيست"><input className="input" value={form.manifestNumber} onChange={(e) => setForm({ ...form, manifestNumber: e.target.value })} /></Field>
              <Field label="نوع المنافيست"><select className="input" value={form.manifestType} onChange={(e) => setForm({ ...form, manifestType: e.target.value })}><option value="import">وارد</option><option value="export">صادر</option><option value="transit">عبور</option></select></Field>
              <Field label="مرجع بنكي / سند سداد"><input className="input" value={form.bankReference} onChange={(e) => setForm({ ...form, bankReference: e.target.value })} /></Field>
            </div>
            {selectedBank ? <div className="mt-4 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-600"><p className="font-bold text-slate-900">{selectedBank.name}</p><p dir="ltr">SWIFT: {selectedBank.swift ?? "—"} · {selectedBank.currency}</p><p dir="ltr">{selectedBank.accountNumber ?? "أضف رقم الحساب"}</p></div> : null}
            <p className="mt-3 text-[10px] text-slate-400">الحفظ يشمل بيانات الشحنة فقط. بيانات منافيست تُسجّل محلياً ولا تعني إرسالاً إلكترونياً إلى المنصة.</p>
          </form> : <EmptyState title="اختر ملف تخليص" description="ابدأ من ملفات التخليص أو استعلام البوليصة." />}

          {tab === "items" && <>
            <div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-bold text-slate-900">بنود الصنف وحساب الرسوم</h2><p className="text-[11px] text-slate-500">القيمة التقديرية: CIF + الرسوم الجمركية + ض.ق.م</p></div><button type="button" onClick={() => openItem()} className="btn btn-primary h-9 text-xs"><Plus className="size-4" /> إضافة بند</button></div>
            {data.items.length ? <div className="overflow-x-auto"><table className="w-full min-w-[800px]"><thead className="bg-slate-50"><tr>{["الصنف", "HS / المنشأ", "القيمة", "CIF", "الجمارك", "ض.ق.م", "الإجمالي", ""].map((label) => <th key={label} className="th">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{data.items.map((item) => <tr key={item.id}><td className="td text-xs font-bold">{item.tariffName ?? item.description}</td><td className="td font-mono text-[10px]" dir="ltr">{item.hsCode}<span className="block text-slate-500">{item.originCountry}</span></td><td className="td text-xs">{formatMoney(item.calculation.amount, item.currency)}</td><td className="td text-xs">{formatMoney(item.calculation.cif, item.currency)}</td><td className="td text-xs">{item.calculation.duty === null ? <Badge tone="amber">نسبة غير معتمدة</Badge> : formatMoney(item.calculation.duty, item.currency)}</td><td className="td text-xs">{item.calculation.vat === null ? "—" : formatMoney(item.calculation.vat, item.currency)}</td><td className="td text-xs font-bold">{item.calculation.total === null ? "—" : formatMoney(item.calculation.total, item.currency)}</td><td className="td">{renderDelete("item", item.id, item.description)}</td></tr>)}</tbody></table></div> : <EmptyState title="لا توجد بنود بعد" description="أضف صنفاً من التعريفة وحدد قيمته وكميته وشحنه وتأمينه." action={<button type="button" onClick={() => openItem()} className="btn btn-primary"><Plus className="size-4" /> إضافة صنف</button>} />}
          </>}

          {tab === "contracts" && <><div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-bold text-slate-900">العقود ({data.contracts.length})</h2><button type="button" onClick={() => openContract()} className="btn btn-primary h-9 text-xs"><Plus className="size-4" /> عقد جديد</button></div>{data.contracts.length ? <div className="grid gap-3 md:grid-cols-2">{data.contracts.map((c) => <article key={c.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-extrabold text-slate-900">{c.number}</p><p className="text-[11px] text-slate-500">{c.name}</p></div><Badge tone="emerald">{CONTRACT_TYPE_META[c.type]?.label ?? c.type}</Badge></div><p className="mt-2 text-xs text-slate-600">{clients.find((client) => client.id === c.clientId)?.name ?? "—"}</p><div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-500"><span>التعاقد: {c.incoterm}</span><span>السداد: {PAYMENT_METHOD_META[c.paymentMethod]?.label}</span><span>القيمة: {formatMoney(Number(c.amount ?? 0), c.currency ?? "USD")}</span><span>الحالة: {c.status === "active" ? "نشط" : c.status}</span></div><p className="mt-2 text-[10px] leading-5 text-slate-500">{c.paymentTerms}</p><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => openContract(c)} className="btn btn-ghost h-8 px-2 text-[10px]"><Pencil className="size-3.5" /> تعديل</button>{renderDelete("contract", c.id, c.number)}</div></article>)}</div> : <EmptyState title="لا توجد عقود" description="أضف العقد وحدد نوعه وشروط التجارة والسداد والبنك." />}</>}

          {tab === "banks" && <><div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-bold text-slate-900">البنوك وبيانات التحصيل</h2><button type="button" onClick={() => openBank()} className="btn btn-primary h-9 text-xs"><Plus className="size-4" /> بنك جديد</button></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.banks.map((bank) => <article key={bank.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-2"><span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Landmark className="size-4" /></span><div><p className="text-xs font-extrabold text-slate-900">{bank.name}</p><p className="text-[10px] text-slate-500">{bank.nameEn}</p></div></div><div className="mt-3 space-y-1 text-[10px] text-slate-600"><p dir="ltr">SWIFT: {bank.swift ?? "—"}</p><p dir="ltr">{bank.code} · {bank.currency}</p><p>الحساب: {bank.accountName ?? "—"}</p><p dir="ltr">{bank.accountNumber ?? "لم يُضف رقم الحساب"}</p><p dir="ltr">{bank.iban ?? "—"}</p></div><p className="mt-2 text-[10px] leading-5 text-slate-400">{bank.notes}</p><div className="mt-3 flex justify-end"><button type="button" onClick={() => openBank(bank)} className="btn btn-ghost h-8 px-2 text-[10px]"><Pencil className="size-3.5" /> تعديل</button>{renderDelete("bank", bank.id, bank.name)}</div></article>)}</div><p className="mt-3 text-[10px] text-amber-700">البيانات المصرفية يدوية؛ لا يوجد ربط أو تنفيذ تحويلات بنكية.</p></>}

          {tab === "invoices" && <><div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-bold text-slate-900">قراءة الفواتير التجارية</h2><Badge tone="amber">مراجعة يدوية مطلوبة</Badge></div><label className="flex cursor-pointer flex-col items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center"><Upload className="size-6 text-slate-400" /><span className="mt-2 text-xs font-bold text-slate-800">{ocrLoading ? "جاري قراءة الفاتورة…" : "ارفع فاتورة PDF أو صورة"}</span><span className="mt-1 text-[10px] text-slate-500">حتى 12 ميجابايت · OCR عربي وإنجليزي</span><input type="file" accept=".pdf,image/png,image/jpeg,image/webp" className="hidden" disabled={ocrLoading} onChange={(e) => { const file = e.target.files?.[0]; if (file) void readInvoice(file); }} /></label><div className="mt-4 space-y-2">{data.invoices.map((invoice) => <button type="button" key={invoice.id} onClick={() => setInvoiceView(invoice)} className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-slate-200 p-3 text-right hover:bg-slate-50"><FileText className="size-5 text-slate-400" /><div className="flex-1"><p className="text-xs font-bold text-slate-900">{invoice.number}</p><p className="text-[10px] text-slate-500">{invoice.supplierName ?? "مورد"} · {invoice.originCountry ?? "منشأ غير محدد"}</p></div><span className="text-xs font-bold text-slate-800">{formatMoney(Number(invoice.total ?? 0), invoice.currency ?? "USD")}</span><Badge tone={invoice.reviewStatus === "reviewed" ? "emerald" : "amber"}>{invoice.reviewStatus === "reviewed" ? "تمت المراجعة" : "يحتاج مراجعة"}</Badge></button>)}{!data.invoices.length ? <p className="py-4 text-center text-[11px] text-slate-400">لا توجد فواتير تجارية مرفوعة بعد.</p> : null}</div><p className="mt-3 text-[10px] leading-5 text-slate-500">النص الناتج عن OCR يُراجع قبل الحفظ. لا يتم تخمين المنشأ أو النسب القانونية، ولا تُرسل الفاتورة إلى أي جهة خارجية.</p></>}

          {tab === "tariffs" && <><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-bold text-slate-900">التعريفة الجمركية</h2><p className="text-[10px] text-slate-500">{data.tariffs.length} بند مرجعي — ليس الكتاب الرسمي الكامل</p></div><div className="flex gap-2"><button type="button" onClick={downloadTemplate} className="btn btn-ghost h-9 text-xs"><Download className="size-3.5" /> قالب CSV</button><label className="btn btn-primary h-9 cursor-pointer text-xs"><Upload className="size-3.5" /> استيراد<input type="file" accept=".csv,.xlsx,.xls" className="hidden" disabled={importing} onChange={(e) => { const file = e.target.files?.[0]; if (file) void importTariff(file); }} /></label><button type="button" onClick={() => openTariff()} className="btn btn-ghost h-9 px-2"><Plus className="size-4" /></button></div></div><div className="rounded-xl bg-amber-50 p-3 text-[10px] leading-5 text-amber-800 ring-1 ring-inset ring-amber-200">النسب الافتراضية غير معتمدة. استورد نسخة موثّقة وحدد <span className="font-mono">verified=1</span> بعد مراجعة المصدر وتاريخ التحديث. القانون المرجعي: <a href="https://www.elmodawanaeg.com/قانون-رقم-207-لسنة-2020-بإصدار-قانون-الجمارك/" target="_blank" rel="noreferrer" className="font-bold underline">207 لسنة 2020</a> والتعديلات والمنشورات اللاحقة، وليس قرار 184.</div><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[650px]"><thead className="bg-slate-50"><tr>{["الكود", "الصنف", "جمارك", "ض.ق.م", "الاستيراد", "الاعتماد", ""].map((label) => <th key={label} className="th">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{filteredTariffs.map((tariff) => <tr key={tariff.id}><td className="td font-mono text-[10px]" dir="ltr">{tariff.code}</td><td className="td"><button type="button" onClick={() => setSelectedTariff(tariff)} className="text-right text-xs font-semibold text-slate-800">{tariff.nameAr}</button><span className="block text-[10px] text-slate-400">{tariff.nameEn}</span></td><td className="td text-xs">{tariff.dutyBps === null ? "غير معتمد" : `${tariff.dutyBps / 100}%`}</td><td className="td text-xs">{tariff.vatBps === null ? "—" : `${tariff.vatBps / 100}%`}</td><td className="td"><Badge tone={IMPORT_STATUS_META[tariff.importStatus]?.tone ?? "slate"}>{IMPORT_STATUS_META[tariff.importStatus]?.label}</Badge></td><td className="td"><Badge tone={tariff.verified ? "emerald" : "amber"}>{tariff.verified ? "مُراجع" : "غير معتمد"}</Badge></td><td className="td"><div className="flex gap-1"><button type="button" onClick={() => openTariff(tariff)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100" aria-label="تعديل"><Pencil className="size-3.5" /></button>{renderDelete("tariff", tariff.id, tariff.code)}</div></td></tr>)}</tbody></table></div></>}

          {tab === "acid" && shipment ? <form onSubmit={saveShipment}><div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-bold text-slate-900">رقم ACID ومدته</h2><button type="submit" className="btn btn-primary h-9 text-xs" disabled={saving}><Save className="size-4" /> حفظ</button></div><div className="grid gap-4 sm:grid-cols-2"><Field label="رقم ACID"><input className="input" dir="ltr" value={form.acidNumber} onChange={(e) => setForm({ ...form, acidNumber: e.target.value })} placeholder="ACID-EG-2026-…" /></Field><Field label="حالة الإقرار"><select className="input" value={form.acidStatus} onChange={(e) => setForm({ ...form, acidStatus: e.target.value })}><option value="draft">مسودة</option><option value="submitted">تم الإرسال</option><option value="accepted">مقبول</option><option value="rejected">مرفوض</option><option value="expired">منتهي</option></select></Field><Field label="وقت تقديم ACI"><input type="datetime-local" className="input" value={form.acidSubmittedAt} onChange={(e) => setForm({ ...form, acidSubmittedAt: e.target.value })} /></Field><Field label="انتهاء صلاحية رقم ACID"><input type="datetime-local" className="input" value={form.acidExpiresAt} onChange={(e) => setForm({ ...form, acidExpiresAt: e.target.value })} /></Field></div>{countdown ? <div className={cx("mt-4 rounded-xl p-3 text-xs font-bold ring-1 ring-inset", countdown.expired ? "bg-rose-50 text-rose-700 ring-rose-200" : "bg-emerald-50 text-emerald-700 ring-emerald-200")}>{countdown.label}</div> : null}<p className="mt-3 text-[10px] text-slate-500">المدة تُحسب من التاريخين اللذين تدخلهما. لا توجد مدة قانونية ثابتة مفترضة؛ تحقق من شروط نافذة الخاصة بالشحنة.</p></form> : null}

          {tab === "manifest" && shipment ? <form onSubmit={saveShipment}><div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-bold text-slate-900">بيانات منافيست</h2><button type="submit" className="btn btn-primary h-9 text-xs" disabled={saving}><Save className="size-4" /> حفظ</button></div><div className="grid gap-4 sm:grid-cols-2"><Field label="رقم المنافيست"><input className="input" value={form.manifestNumber} onChange={(e) => setForm({ ...form, manifestNumber: e.target.value })} /></Field><Field label="نوع المنافيست"><select className="input" value={form.manifestType} onChange={(e) => setForm({ ...form, manifestType: e.target.value })}><option value="import">وارد</option><option value="export">صادر</option><option value="transit">عبور</option></select></Field><Field label="نظام التخليص"><select className="input" value={form.customsSystem} onChange={(e) => setForm({ ...form, customsSystem: e.target.value })}>{CUSTOMS_SYSTEMS.map((system) => <option key={system} value={system}>{CUSTOMS_SYSTEM_META[system].label}</option>)}</select></Field></div><p className="mt-3 text-[10px] text-amber-700">هذا سجل محلي لبيانات المنافيست. الإرسال الإلكتروني يحتاج اعتماد واجهة المنصة.</p></form> : null}

          {tab === "rates" && <><div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-bold text-slate-900">أسعار العملات</h2><p className="text-[10px] text-slate-500">تحديث يومي من ExchangeRate-API — الأساس دولار أمريكي</p></div><button type="button" onClick={refreshRates} disabled={fxLoading} className="btn btn-ghost h-9 text-xs">{fxLoading ? <Spinner /> : <RefreshCw className="size-3.5" />} تحديث</button></div>{data.rates.length ? <div className="overflow-x-auto"><table className="w-full min-w-[550px]"><thead className="bg-slate-50"><tr>{["العملة", "سعر الدولار", "التغير", "المصدر والتاريخ"].map((label) => <th key={label} className="th">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{data.rates.filter((rate) => ["EGP", "EUR", "GBP", "AED", "SAR", "USD", "JPY", "CNY", "CHF", "CAD"].includes(rate.currency)).map((rate) => <tr key={rate.currency}><td className="td font-mono text-xs font-bold">{rate.currency}</td><td className="td text-xs font-bold">{formatNumber(rate.rate)}</td><td className="td text-[10px] text-slate-500">{rate.previousRate ? `${(((rate.rate - rate.previousRate) / rate.previousRate) * 100).toFixed(2)}%` : "—"}</td><td className="td text-[10px] text-slate-500">{rate.source}<span className="block">{formatDateTime(rate.updatedAt)}</span></td></tr>)}</tbody></table></div> : <EmptyState title="أسعار العملات تحتاج اتصالاً" description="اضغط تحديث لجلب الأسعار اليومية. يمكنك إدخال سعر صرف يدوي في الحاسبة إلى أن يتاح المزوّد." />}</>}

          {tab !== "file" && tab !== "acid" && tab !== "manifest" ? <section className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4"><h3 className="flex items-center gap-1.5 text-xs font-bold text-slate-900"><CircleDollarSign className="size-4" /> حاسبة القيمة والرسوم التقديرية</h3><div className="mt-3 grid gap-3 sm:grid-cols-3">{[
            { key: "amount", label: "قيمة البضاعة" }, { key: "currency", label: "العملة" }, { key: "freight", label: "الشحن" },
            { key: "insurance", label: "التأمين" }, { key: "manualRate", label: "سعر صرف إلى EGP" },
          ].map((field) => field.key === "currency" ? <Field key={field.key} label={field.label}><select className="input text-xs" value={calculator.currency} onChange={(e) => setCalculator({ ...calculator, currency: e.target.value, manualRate: "" })}>{CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}</select></Field> : <Field key={field.key} label={field.label}><input type="number" min="0" step="0.01" className="input text-xs" value={calculator[field.key as "amount" | "freight" | "insurance" | "manualRate"]} onChange={(e) => setCalculator({ ...calculator, [field.key]: e.target.value })} /></Field>)}<Field label="البند الجمركي"><select className="input text-xs" value={calculator.tariffId} onChange={(e) => setCalculator({ ...calculator, tariffId: e.target.value })}><option value="">— بدون نسب معتمدة —</option>{data.tariffs.filter((tariff) => /^\d/.test(tariff.code)).map((tariff) => <option key={tariff.id} value={tariff.id}>{tariff.code} — {tariff.nameAr}</option>)}</select></Field></div><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{[{ label: "قيمة CIF", value: calc.cif }, { label: "الجمارك", value: calc.duty }, { label: "ض.ق.م", value: calc.vat }, { label: "الإجمالي", value: calc.total }].map((item) => <div key={item.label} className="rounded-lg bg-white p-2.5 text-center"><p className="text-[10px] text-slate-500">{item.label}</p><p className="text-xs font-extrabold text-slate-900">{item.value === null ? "غير معتمد" : formatMoney(item.value, calculator.currency)}</p></div>)}</div><p className="mt-2 text-[10px] text-slate-500">القيمة بالجنيه المصري: {assessedValue === null ? "أدخل سعر الصرف" : formatMoney(assessedValue)} · {calculator.manualRate ? "سعر يدوي" : "سعر المزوّد"} · تقدير إداري وليس إقراراً رسمياً.</p></section> : null}
        </div>
      </div>

      <Modal open={Boolean(modal)} onClose={() => setModal(null)} size="lg" title={modal === "contract" ? editing ? "تعديل العقد" : "عقد جديد" : modal === "bank" ? "بيانات البنك" : modal === "tariff" ? "بند جمركي" : modal === "item" ? "إضافة بند للملف" : "مراجعة الفاتورة التجارية"} description="البيانات تُحفظ في PostgreSQL بعد التأكيد." footer={<><button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>إلغاء</button><button type="submit" form="customs-modal-form" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : <Save className="size-4" />} حفظ</button></>}>
        <form id="customs-modal-form" onSubmit={submitModal} className="space-y-4">
          {modal === "contract" ? <div className="grid gap-3 sm:grid-cols-2"><Field label="رقم العقد"><input className="input" value={contractForm.number} onChange={(e) => setContractForm({ ...contractForm, number: e.target.value })} /></Field><Field label="اسم العقد" required><input className="input" value={contractForm.name} onChange={(e) => setContractForm({ ...contractForm, name: e.target.value })} required /></Field><Field label="العميل" required><select className="input" value={contractForm.clientId} onChange={(e) => setContractForm({ ...contractForm, clientId: e.target.value })} required><option value="">اختر العميل</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></Field><Field label="نوع التعاقد"><select className="input" value={contractForm.type} onChange={(e) => setContractForm({ ...contractForm, type: e.target.value })}>{CONTRACT_TYPES.map((type) => <option key={type} value={type}>{CONTRACT_TYPE_META[type].label}</option>)}</select></Field><Field label="Incoterm"><select className="input" value={contractForm.incoterm} onChange={(e) => setContractForm({ ...contractForm, incoterm: e.target.value })}>{INCOTERMS.map((term) => <option key={term}>{term}</option>)}</select></Field><Field label="أسلوب السداد"><select className="input" value={contractForm.paymentMethod} onChange={(e) => setContractForm({ ...contractForm, paymentMethod: e.target.value })}>{PAYMENT_METHODS.map((method) => <option key={method} value={method}>{PAYMENT_METHOD_META[method].label}</option>)}</select></Field><Field label="البنك"><select className="input" value={contractForm.bankId} onChange={(e) => setContractForm({ ...contractForm, bankId: e.target.value })}><option value="">بدون</option>{data.banks.map((bank) => <option key={bank.id} value={bank.id}>{bank.name}</option>)}</select></Field><Field label="قيمة العقد"><input type="number" min="0" className="input" value={contractForm.amount} onChange={(e) => setContractForm({ ...contractForm, amount: e.target.value })} /></Field><Field label="العملة"><select className="input" value={contractForm.currency} onChange={(e) => setContractForm({ ...contractForm, currency: e.target.value })}>{CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}</select></Field><Field label="بداية العقد"><input type="date" className="input" value={contractForm.startDate} onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })} /></Field><Field label="نهاية العقد"><input type="date" className="input" value={contractForm.endDate} onChange={(e) => setContractForm({ ...contractForm, endDate: e.target.value })} /></Field><Field label="شروط السداد"><input className="input" value={contractForm.paymentTerms} onChange={(e) => setContractForm({ ...contractForm, paymentTerms: e.target.value })} /></Field><Field label="ملاحظات" className="sm:col-span-2"><textarea className="input" value={contractForm.notes} onChange={(e) => setContractForm({ ...contractForm, notes: e.target.value })} /></Field></div> : null}
          {modal === "bank" ? <div className="grid gap-3 sm:grid-cols-2">{([{ key: "name", label: "اسم البنك" }, { key: "nameEn", label: "الاسم بالإنجليزية" }, { key: "code", label: "كود البنك" }, { key: "swift", label: "SWIFT" }, { key: "accountName", label: "اسم صاحب الحساب" }, { key: "accountNumber", label: "رقم الحساب" }, { key: "iban", label: "IBAN" }, { key: "branch", label: "الفرع" }] as const).map((field) => <Field key={field.key} label={field.label}><input className="input" value={bankForm[field.key]} onChange={(e) => setBankForm({ ...bankForm, [field.key]: e.target.value })} /></Field>)}<Field label="العملة"><select className="input" value={bankForm.currency} onChange={(e) => setBankForm({ ...bankForm, currency: e.target.value })}>{CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}</select></Field><Field label="ملاحظات" className="sm:col-span-2"><textarea className="input" value={bankForm.notes} onChange={(e) => setBankForm({ ...bankForm, notes: e.target.value })} /></Field></div> : null}
          {modal === "tariff" ? <><div className="grid gap-3 sm:grid-cols-2">{([{ key: "code", label: "كود HS" }, { key: "nameAr", label: "اسم الصنف بالعربية" }, { key: "nameEn", label: "اسم الصنف بالإنجليزية" }, { key: "chapter", label: "الفصل" }, { key: "category", label: "فئة البند" }, { key: "unit", label: "الوحدة" }, { key: "dutyBps", label: "الجمارك %" }, { key: "vatBps", label: "ض.ق.م %" }, { key: "sourceUrl", label: "رابط المصدر" }, { key: "sourceReference", label: "مرجع القرار / المنشور" }, { key: "legalUpdatedAt", label: "تاريخ التحديث القانوني" }] as const).map((field) => <Field key={field.key} label={field.label}><input className="input" type={field.key === "legalUpdatedAt" ? "date" : field.key === "dutyBps" || field.key === "vatBps" ? "number" : "text"} min={field.key === "dutyBps" || field.key === "vatBps" ? "0" : undefined} value={tariffForm[field.key]} onChange={(e) => setTariffForm({ ...tariffForm, [field.key]: e.target.value })} /></Field>)}<Field label="حالة الاستيراد"><select className="input" value={tariffForm.importStatus} onChange={(e) => setTariffForm({ ...tariffForm, importStatus: e.target.value })}>{Object.entries(IMPORT_STATUS_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}</select></Field><Field label="نسب معتمدة؟"><select className="input" value={tariffForm.verified} onChange={(e) => setTariffForm({ ...tariffForm, verified: e.target.value })}><option value="0">لا — تحتاج مراجعة</option><option value="1">نعم — راجعت المصدر الرسمي</option></select></Field><Field label="الجهات الرقابية (افصل بـ | )" className="sm:col-span-2"><textarea className="input" value={tariffForm.authorities} onChange={(e) => setTariffForm({ ...tariffForm, authorities: e.target.value })} /></Field><Field label="شروط الاستيراد (افصل بـ | )" className="sm:col-span-2"><textarea className="input" value={tariffForm.conditions} onChange={(e) => setTariffForm({ ...tariffForm, conditions: e.target.value })} /></Field><Field label="ملاحظات" className="sm:col-span-2"><textarea className="input" value={tariffForm.notes} onChange={(e) => setTariffForm({ ...tariffForm, notes: e.target.value })} /></Field></div><p className="rounded-lg bg-amber-50 p-2.5 text-[10px] text-amber-800">لا تضع نسبة غير موثقة. مصدر النسب والتاريخ والجهات القانونية مسؤولية المراجع المعتمد.</p></> : null}
          {modal === "item" ? <div className="grid gap-3 sm:grid-cols-2"><Field label="ملف التخليص" required><select className="input" value={itemForm.shipmentId} onChange={(e) => setItemForm({ ...itemForm, shipmentId: e.target.value })}><option value="">اختر الملف</option>{shipments.map((s) => <option key={s.id} value={s.id}>{s.reference}</option>)}</select></Field><Field label="البند الجمركي"><select className="input" value={itemForm.tariffId} onChange={(e) => { const t = data.tariffs.find((tariff) => tariff.id === Number(e.target.value)); setItemForm({ ...itemForm, tariffId: e.target.value, description: t?.nameAr ?? itemForm.description, hsCode: t?.code ?? itemForm.hsCode, unit: t?.unit ?? itemForm.unit }); }}><option value="">بدون نسبة معتمدة</option>{data.tariffs.filter((tariff) => /^\d/.test(tariff.code)).map((tariff) => <option key={tariff.id} value={tariff.id}>{tariff.code} — {tariff.nameAr}</option>)}</select></Field><Field label="وصف الصنف" required className="sm:col-span-2"><input className="input" value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} required /></Field><Field label="كود HS"><input className="input" value={itemForm.hsCode} onChange={(e) => setItemForm({ ...itemForm, hsCode: e.target.value })} /></Field><Field label="بلد المنشأ"><input className="input" value={itemForm.originCountry} onChange={(e) => setItemForm({ ...itemForm, originCountry: e.target.value })} /></Field>{([{ key: "quantity", label: "الكمية" }, { key: "unitValue", label: "سعر الوحدة" }, { key: "invoiceValue", label: "قيمة البضاعة" }, { key: "freight", label: "الشحن" }, { key: "insurance", label: "التأمين" }] as const).map((field) => <Field key={field.key} label={field.label}><input type="number" min="0" step="0.01" className="input" value={itemForm[field.key]} onChange={(e) => setItemForm({ ...itemForm, [field.key]: e.target.value })} /></Field>)}<Field label="العملة"><select className="input" value={itemForm.currency} onChange={(e) => setItemForm({ ...itemForm, currency: e.target.value })}>{CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}</select></Field><Field label="الوحدة"><input className="input" value={itemForm.unit ?? ""} onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })} /></Field></div> : null}
          {modal === "invoice" && parsed ? <><div className="rounded-xl bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">{parsed.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div><div className="grid gap-3 sm:grid-cols-2">{([{ key: "number", label: "رقم الفاتورة" }, { key: "supplierName", label: "المورد" }, { key: "originCountry", label: "المنشأ" }, { key: "currency", label: "العملة" }, { key: "subtotal", label: "قيمة البضاعة" }, { key: "freight", label: "الشحن" }, { key: "insurance", label: "التأمين" }, { key: "total", label: "الإجمالي" }, { key: "incoterm", label: "Incoterm" }, { key: "paymentMethod", label: "السداد" }, { key: "bankName", label: "البنك" }, { key: "bankSwift", label: "SWIFT" }, { key: "bankAccount", label: "رقم الحساب" }, { key: "bankIban", label: "IBAN" }, { key: "acidNumber", label: "ACID" }] as const).map((field) => <Field key={field.key} label={field.label}><input className="input" value={String(parsed[field.key] ?? "")} onChange={(e) => setParsed({ ...parsed, [field.key]: ["subtotal", "freight", "insurance", "total"].includes(field.key) ? Number(e.target.value) : e.target.value })} /></Field>)}<Field label="تاريخ الفاتورة"><input type="date" className="input" value={parsed.date?.slice(0, 10) ?? ""} onChange={(e) => setParsed({ ...parsed, date: e.target.value })} /></Field></div>{parsed.items.length ? <div className="rounded-xl bg-slate-50 p-3 text-[11px]"><p className="font-bold text-slate-800">بنود مقترحة ({parsed.items.length})</p>{parsed.items.map((item, index) => <p key={index} className="mt-1 text-slate-600">{item.description} — {item.quantity} × {item.unitValue} = {item.invoiceValue} {item.currency}</p>)}</div> : null}<details className="text-[11px]"><summary className="cursor-pointer font-bold text-slate-600">النص الأصلي للفاتورة</summary><pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-slate-500">{invoiceText}</pre></details></> : null}
        </form>
      </Modal>

      <Modal open={Boolean(invoiceView)} onClose={() => setInvoiceView(null)} size="lg" title={`الفاتورة ${invoiceView?.number ?? ""}`} footer={<><button type="button" className="btn btn-ghost" onClick={() => setInvoiceView(null)}>إغلاق</button>{invoiceView ? <Link href={`/api/export?resource=commercial_invoices&format=pdf`} className="btn btn-primary"><Download className="size-4" /> PDF</Link> : null}</>}>
        {invoiceView ? <div className="space-y-3 text-xs"><div className="grid grid-cols-2 gap-3">{[{ label: "المورد", value: invoiceView.supplierName }, { label: "المنشأ", value: invoiceView.originCountry }, { label: "التاريخ", value: formatDate(invoiceView.date) }, { label: "القيمة", value: formatMoney(Number(invoiceView.total), invoiceView.currency ?? "USD") }, { label: "Incoterm", value: invoiceView.incoterm }, { label: "السداد", value: invoiceView.paymentMethod }, { label: "البنك", value: invoiceView.bankName }, { label: "SWIFT", value: invoiceView.bankSwift }].map((field) => <div key={field.label}><p className="text-[10px] text-slate-500">{field.label}</p><p className="font-bold text-slate-900">{field.value ?? "غير محدد"}</p></div>)}</div><pre className="scroll-thin max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-900 p-3 text-[10px] leading-5 text-emerald-300">{invoiceView.sourceText ?? "تم إدخال البيانات يدوياً"}</pre><Badge tone={invoiceView.reviewStatus === "reviewed" ? "emerald" : "amber"}>{invoiceView.reviewStatus === "reviewed" ? "تمت المراجعة" : "يحتاج مراجعة"}</Badge></div> : null}
      </Modal>
      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="تأكيد الحذف" footer={<><button type="button" className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>إلغاء</button><button type="button" className="btn btn-danger" onClick={confirmDelete}><Trash2 className="size-4" /> حذف</button></>}><p className="text-sm text-slate-600">هل تريد حذف {deleteTarget?.name} نهائياً؟</p></Modal>
    </div>
  );
}
