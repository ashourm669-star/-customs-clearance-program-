"use client";

import { useMemo, useState } from "react";
import { BookOpen, Calculator, Scale, ShieldAlert, Upload } from "lucide-react";
import { authHeaders, useData, type Row } from "@/components/data-provider";
import { ExportBar } from "@/components/export-bar";
import { FxStrip, useFx } from "@/components/fx-strip";
import { Badge, EmptyState, PageHeader, SectionCard } from "@/components/ui";
import { formatMoney } from "@/lib/constants";
import { assessableValue, importStatuses, incoterms, lineFees } from "@/lib/customs";

export default function TariffPage() {
  const { data, loading, refresh, toast } = useData();
  const fx = useFx();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const [invoice, setInvoice] = useState("10000");
  const [currency, setCurrency] = useState("USD");
  const [contract, setContract] = useState("CIF");
  const items = data?.tariffItems ?? [];

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items.slice(0, 40);
    return items.filter((item: Row) =>
      [item.hsCode, item.nameAr, item.nameEn, item.chapter, item.authorities].join(" ").toLowerCase().includes(term),
    ).slice(0, 60);
  }, [items, query]);

  const current = selected ?? results[0] ?? null;
  const assessment = assessableValue({
    invoiceValue: Number(invoice) || 0,
    currency,
    freight: 0,
    insurance: 0,
    contractType: contract,
    rates: fx.rates,
  });
  const fees = current ? lineFees(
    assessment.cifEgp,
    Number(current.dutyRate ?? 0),
    Number(current.vatRate ?? 0),
    Number(current.tableTaxRate ?? 0),
    Number(current.developmentRate ?? 0),
  ) : null;

  async function importFile(file: File) {
    const XLSX = await import("xlsx");
    const book = XLSX.read(await file.arrayBuffer());
    const rows = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]]) as Record<string, unknown>[];
    const res = await fetch("/api/tariff/import", {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ items: rows }),
    });
    const json = await res.json();
    if (!res.ok) { toast(json.error ?? "تعذر الاستيراد", "error"); return; }
    toast(`تم حفظ ${json.saved} بند في كتاب التعريفة`);
    await refresh();
  }

  return (
    <div className="space-y-4" id="print-root">
      <PageHeader
        title="البند الجمركي — كتاب التعريفة"
        subtitle="ابحث باسم الصنف أو برقم البند. المرجع التشغيلي وفق النظام المنسق وقانون الجمارك ٢٠٧ لسنة ٢٠٢٠، ويمكن استيراد الكتاب الرسمي من Excel"
        icon={<BookOpen size={21} />}
        badge={<span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">{items.length} بند</span>}
        actions={
          <>
            <label className="btn-ghost cursor-pointer"><Upload size={15} /> استيراد Excel
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void importFile(file); e.target.value = ""; }} />
            </label>
            <ExportBar filename="التعريفة-الجمركية" title="كتاب التعريفة الجمركية" rows={results.map((item: Row) => ({
              البند: item.hsCode, الصنف: item.nameAr, English: item.nameEn, الفئة: item.dutyRate,
              الضريبة: item.vatRate, الحالة: item.importStatus, الشروط: item.importConditions, الجهات: item.authorities,
            }))} />
          </>
        }
      />
      <FxStrip fx={fx} />
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <SectionCard title="بحث البند" subtitle="بالاسم العربي أو الإنجليزي أو رقم البند" bodyClassName="">
          <div className="border-b border-slate-100 p-3">
            <input className="field" placeholder="مثال: تكييف أو 8415 أو smartphones" value={query} onChange={(e) => { setQuery(e.target.value); setSelected(null); }} />
          </div>
          {loading ? <div className="p-6 text-xs text-slate-400">جاري تحميل التعريفة...</div>
            : results.length === 0 ? <EmptyState title="لا يوجد بند مطابق" description="جرّب اسماً آخر أو استورد ملف التعريفة" />
              : (
                <div className="max-h-[640px] overflow-auto">
                  <table className="w-full min-w-[680px] text-right">
                    <thead><tr className="bg-slate-50 text-[10px] font-bold text-slate-500">
                      <th className="px-3 py-2">البند</th><th className="px-3 py-2">الصنف</th><th className="px-3 py-2">الفئة</th><th className="px-3 py-2">الضريبة</th><th className="px-3 py-2">الاستيراد</th>
                    </tr></thead>
                    <tbody>
                      {results.map((item: Row) => (
                        <tr key={item.id} onClick={() => setSelected(item)} className={`cursor-pointer border-t border-slate-100 ${current?.id === item.id ? "bg-teal-50/70" : "hover:bg-slate-50"}`}>
                          <td className="px-3 py-2.5 font-mono text-[11px] font-bold text-teal-700">{item.hsCode}</td>
                          <td className="px-3 py-2.5"><p className="text-[11px] font-semibold text-slate-700">{item.nameAr}</p><p className="text-[10px] text-slate-400">{item.nameEn}</p></td>
                          <td className="px-3 py-2.5 text-[11px] font-bold">{item.dutyRate}٪</td>
                          <td className="px-3 py-2.5 text-[11px]">{item.vatRate}٪</td>
                          <td className="px-3 py-2.5"><Badge value={item.importStatus} options={importStatuses} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
        </SectionCard>

        <div className="space-y-4">
          {current ? (
            <SectionCard title={`${current.hsCode} — ${current.nameAr}`} subtitle={current.nameEn || "تفاصيل البند"} action={<Scale size={16} className="text-teal-600" />}>
              <div className="space-y-3 p-4 text-[12px]">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["فئة البند الجمركي", `${current.dutyRate}٪`],
                    ["فئة ضريبة القيمة المضافة", `${current.vatRate}٪`],
                    ["ضريبة الجدول", `${current.tableTaxRate || 0}٪`],
                    ["رسم تنمية", `${current.developmentRate || 0}٪`],
                    ["الفصل", current.chapter],
                    ["الوحدة", current.unit],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-slate-50 p-2.5"><p className="text-[10px] text-slate-400">{label}</p><p className="font-bold text-[var(--navy)]">{value || "—"}</p></div>
                  ))}
                </div>
                <div className="flex items-center gap-2"><Badge value={current.importStatus} options={importStatuses} /><span className="text-[11px] text-slate-500">{current.importStatus === "prohibited" ? "غير مسموح استيراده" : "راجع الشروط قبل الإفراج"}</span></div>
                <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3">
                  <p className="flex items-center gap-1 text-[11px] font-bold text-amber-800"><ShieldAlert size={13} /> شروط الاستيراد</p>
                  <p className="mt-1 text-[11px] leading-6 text-amber-950">{current.importConditions || "لا توجد شروط إضافية مسجلة"}</p>
                </div>
                <div className="rounded-xl border border-sky-100 bg-sky-50/70 p-3">
                  <p className="text-[11px] font-bold text-sky-800">الجهات الرقابية</p>
                  <p className="mt-1 text-[11px] leading-6 text-sky-950">{current.authorities || "مصلحة الجمارك"}</p>
                </div>
              </div>
            </SectionCard>
          ) : <EmptyState title="اختر بنداً" />}

          <SectionCard title="حساب الرسوم لحظياً" subtitle="أول ما تدخل القيمة والعملة والتعاقد" action={<Calculator size={16} className="text-teal-600" />}>
            <div className="grid grid-cols-3 gap-2 p-4">
              <label className="block"><span className="field-label">قيمة الفاتورة</span><input className="field" value={invoice} onChange={(e) => setInvoice(e.target.value)} /></label>
              <label className="block"><span className="field-label">العملة</span>
                <select className="field" value={currency} onChange={(e) => setCurrency(e.target.value)}>{Object.keys(fx.rates).map((code) => <option key={code}>{code}</option>)}</select>
              </label>
              <label className="block"><span className="field-label">التعاقد</span>
                <select className="field" value={contract} onChange={(e) => setContract(e.target.value)}>{incoterms.map((term) => <option key={term.value} value={term.value}>{term.label}</option>)}</select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2 px-4 pb-4 text-[11px]">
              <div className="rounded-xl bg-slate-50 p-3">سعر الصرف <strong>{assessment.rate.toLocaleString("en-US", { maximumFractionDigits: 3 })}</strong></div>
              <div className="rounded-xl bg-slate-50 p-3">القيمة المقر عليها <strong>{formatMoney(assessment.cifEgp)}</strong>{assessment.estimated ? " · تقديري" : ""}</div>
              <div className="rounded-xl bg-teal-50 p-3 text-teal-900">الرسم الجمركي <strong>{formatMoney(fees?.duty ?? 0)}</strong></div>
              <div className="rounded-xl bg-teal-50 p-3 text-teal-900">ضريبة القيمة المضافة <strong>{formatMoney(fees?.vat ?? 0)}</strong></div>
              <div className="col-span-2 rounded-xl bg-[var(--navy)] p-3 text-white">إجمالي الرسوم المستحقة <strong>{formatMoney(fees?.total ?? 0)}</strong></div>
            </div>
          </SectionCard>
        </div>
      </div>
      <p className="text-[10px] leading-6 text-slate-400">المرجع: قانون الجمارك رقم ٢٠٧ لسنة ٢٠٢٠ وتعديلاته، ومنظومة ACI، والنظام المنسق. الفئات المعروضة مرجع تشغيلي شائع وليست بديلاً عن مطابقة الإصدار الرسمي لكتاب التعريفة الجمركية المتكاملة. استورد ملف المصلحة ليحل محل هذه الفئات.</p>
    </div>
  );
}
