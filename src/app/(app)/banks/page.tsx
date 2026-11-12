"use client";
import { ResourcePage } from "@/components/resource-page";
import { ExportBar } from "@/components/export-bar";
import { useData } from "@/components/data-provider";
import { pageConfigs } from "@/lib/ui-config";

const banksConfig = {
  ...pageConfigs.clients,
  resource: "banks" as const,
  title: "البنوك وأسلوب السداد",
  subtitle: "أكواد البنوك المصرية وSWIFT وأساليب السداد المرتبطة: اعتماد مستندي، تحويل، CAD",
  singular: "بنك",
  addLabel: "إضافة بنك",
  searchKeys: ["nameAr", "nameEn", "code", "swift"],
  searchPlaceholder: "بحث باسم البنك أو الكود أو SWIFT...",
  defaults: { status: "active", paymentMethods: "LC,TT" },
  filters: [],
  columns: [
    { key: "code", label: "كود البنك", kind: "mono" as const },
    { key: "nameAr", label: "البنك", wide: true },
    { key: "nameEn", label: "English" },
    { key: "swift", label: "SWIFT", kind: "mono" as const },
    { key: "paymentMethods", label: "أساليب السداد" },
    { key: "status", label: "الحالة", kind: "badge" as const, options: [{ value: "active", label: "نشط" }, { value: "inactive", label: "موقوف" }] },
  ],
  fields: [
    { key: "nameAr", label: "اسم البنك بالعربي", required: true },
    { key: "nameEn", label: "Bank name in English" },
    { key: "code", label: "كود البنك", hint: "يُنشأ تلقائياً إن تُرك فارغاً" },
    { key: "swift", label: "SWIFT / BIC" },
    { key: "paymentMethods", label: "أساليب السداد", placeholder: "LC,TT,CAD" },
    { key: "status", label: "الحالة", type: "select" as const, options: [{ value: "active", label: "نشط" }, { value: "inactive", label: "موقوف" }] },
  ],
};

export default function BanksPage() {
  const { data } = useData();
  return (
    <ResourcePage
      config={banksConfig}
      extraActions={<ExportBar filename="البنوك" title="دليل البنوك" rows={(data?.banks ?? []).map((bank) => ({ الكود: bank.code, البنك: bank.nameAr, English: bank.nameEn, SWIFT: bank.swift, السداد: bank.paymentMethods }))} />}
    />
  );
}
