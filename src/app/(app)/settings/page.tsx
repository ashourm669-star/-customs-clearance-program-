"use client";

import Link from "next/link";
import {
  Activity, Building2, Database, Download, Globe2, KeyRound, MapPin, Phone,
  Plane, ShieldCheck, Ship, Smartphone, UsersRound, Mail, ExternalLink,
} from "lucide-react";
import { useData, type Row } from "@/components/data-provider";
import { EmptyState, PageHeader, SectionCard } from "@/components/ui";
import { COMPANY, formatDateTime, formatNumber, statusLabel, roles } from "@/lib/constants";

export default function SettingsPage() {
  const { data, loading } = useData();
  const users = data?.users ?? [];
  const carriers = data?.carriers ?? [];
  const ports = data?.ports ?? [];

  const info = [
    { icon: Building2, label: "اسم الشركة", value: COMPANY.name },
    { icon: ShieldCheck, label: "الترخيص", value: COMPANY.license },
    { icon: KeyRound, label: "الرقم الضريبي", value: COMPANY.taxNumber },
    { icon: MapPin, label: "العنوان", value: COMPANY.address },
    { icon: Phone, label: "هاتف الشركة", value: COMPANY.phone },
    { icon: Mail, label: "البريد الإلكتروني", value: COMPANY.email },
  ];

  const integrations = [
    { icon: Activity, label: "منصة نافذة", detail: "NAFEZA API v2.4 · بيئة الإنتاج", value: "متصل", tone: "text-emerald-600 bg-emerald-50" },
    { icon: Plane, label: "شركات الطيران", detail: `${formatNumber(carriers.filter((c: Row) => c.type === "airline").length)} ناقل جوي مرتبط`, value: "متصل", tone: "text-emerald-600 bg-emerald-50", href: "/carriers" },
    { icon: Ship, label: "الخطوط الملاحية", detail: `${formatNumber(carriers.filter((c: Row) => c.type === "shipping").length)} خط ملاحي مرتبط`, value: "متصل", tone: "text-emerald-600 bg-emerald-50", href: "/carriers" },
    { icon: Globe2, label: "الموانئ والمنافذ", detail: `${formatNumber(ports.length)} منفذ جمركي مربوط`, value: "متصل", tone: "text-emerald-600 bg-emerald-50", href: "/ports" },
  ];

  return (
    <div className="fade-up">
      <PageHeader
        title="إعدادات النظام والشركة"
        subtitle="بيانات الشركة، حالة التكاملات الخارجية، فريق العمل وحالة قاعدة البيانات"
        icon={<ShieldCheck size={21} />}
        badge={<span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> كل الخدمات تعمل</span>}
      />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <SectionCard title="بيانات الشركة" subtitle="الهوية الرسمية المستخدمة في المستندات والتقارير">
          <div className="relative overflow-hidden p-5">
            <div className="mb-5 flex items-center gap-3 rounded-2xl bg-[linear-gradient(120deg,#071426,#0d3550)] p-4 text-white">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600"><Building2 size={24} /></div>
              <div>
                <p className="text-sm font-bold">{COMPANY.name}</p>
                <p className="mt-0.5 text-[10px] text-white/55">{COMPANY.englishName}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {info.map((item) => (
                <div key={item.label} className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-600"><item.icon size={15} /></div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-slate-400">{item.label}</p>
                    <p className="mt-0.5 text-[11px] font-semibold leading-5 text-slate-700">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <div className="grid gap-4">
          <SectionCard title="التكاملات والربط الخارجي" subtitle="حالة الاتصال بالجهات والمنصات">
            <div className="divide-y divide-slate-100">
              {integrations.map((item) => (
                <div key={item.label} className="flex items-center gap-3 px-4 py-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-50 text-slate-600"><item.icon size={16} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-slate-700">{item.label}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">{item.detail}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${item.tone}`}>{item.value}</span>
                  {item.href && <Link href={item.href} className="text-slate-300 hover:text-teal-600"><ExternalLink size={13} /></Link>}
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="حالة قاعدة البيانات" subtitle="إحصاءات السجلات المخزنة فعلياً" action={<Database size={16} className="text-slate-400" />}>
            <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3">
              {[
                { label: "الشحنات", value: data?.shipments?.length },
                { label: "العملاء", value: data?.clients?.length },
                { label: "الناقلون", value: carriers.length },
                { label: "المستندات", value: data?.documents?.length },
                { label: "الفواتير", value: data?.invoices?.length },
                { label: "المستخدمون", value: users.length },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-center">
                  <p className="text-lg font-bold text-[var(--navy)]">{loading ? "…" : formatNumber(item.value ?? 0)}</p>
                  <p className="text-[10px] text-slate-500">{item.label}</p>
                </div>
              ))}
            </div>
            <p className="border-t border-slate-100 px-4 py-3 text-[10px] text-slate-400">آخر مزامنة مع الخادم: {data?.serverTime ? formatDateTime(data.serverTime) : "—"}</p>
          </SectionCard>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <SectionCard title="فريق العمل والصلاحيات" subtitle="الحسابات المسجلة على النظام" action={<Link href="/users" className="text-[11px] font-bold text-teal-700 hover:underline">إدارة المستخدمين</Link>}>
          {loading ? <div className="space-y-2 p-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>
            : users.length === 0 ? <EmptyState title="لا يوجد مستخدمون" /> : (
              <div className="divide-y divide-slate-100">
                {users.map((user: Row) => (
                  <div key={user.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--navy)] text-xs font-bold text-white">{String(user.name).slice(0, 1)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-slate-700">{user.name}</p>
                      <p dir="ltr" className="mt-0.5 truncate text-right text-[10px] text-slate-400">{user.email}</p>
                    </div>
                    <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-bold text-sky-700">{statusLabel(roles, user.role)}</span>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${user.active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>{user.active ? "نشط" : "معطل"}</span>
                  </div>
                ))}
              </div>
            )}
        </SectionCard>

        <div className="grid gap-4">
          <SectionCard title="الوصول السريع" subtitle="أقسام إدارة البيانات">
            <div className="grid grid-cols-2 gap-2 p-4">
              {[
                { label: "الشحنات", href: "/shipments", icon: Ship },
                { label: "العملاء", href: "/clients", icon: Building2 },
                { label: "الناقلون", href: "/carriers", icon: Plane },
                { label: "الموانئ", href: "/ports", icon: Globe2 },
                { label: "الفواتير", href: "/invoices", icon: UsersRound },
                { label: "منصة نافذة", href: "/nafeza", icon: Activity },
              ].map((item) => (
                <Link key={item.href} href={item.href} className="flex items-center gap-2 rounded-xl border border-slate-100 p-3 text-[11px] font-semibold text-slate-600 transition-colors hover:border-teal-200 hover:bg-teal-50/50 hover:text-teal-700">
                  <item.icon size={15} /> {item.label}
                </Link>
              ))}
            </div>
          </SectionCard>
          <div className="card border-amber-200 bg-amber-50/60 p-4">
            <p className="text-xs font-bold text-amber-800">بيانات تجريبية جاهزة</p>
            <p className="mt-1.5 text-[11px] leading-6 text-amber-900/70">النظام مزوّد ببيانات واقعية للشحنات والعملاء والناقلين والمستندات. يمكنك التعديل أو الحذف أو الإضافة من أي صفحة، وكل التغييرات محفوظة في قاعدة البيانات بشكل دائم.</p>
            <p className="mt-2 text-[10px] text-amber-900/60">حساب تجريبي: ops@alarabi.com · Admin@123 (يمكن تعديل حساب المدير من صفحة المستخدمين)</p>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <SectionCard title="تثبيت التطبيق على الموبايل" subtitle="PWA قابل للتثبيت — يفتح ملء الشاشة بأيقونة مستقلة" action={<Smartphone size={16} className="text-teal-600" />}>
          <div className="grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
            <div>
              <p className="text-[11px] font-bold text-slate-700">أندرويد (Chrome / Edge)</p>
              <p className="mt-1 text-[10px] leading-6 text-slate-500">اضغط «تثبيت التطبيق» أو من قائمة المتصفح اختر «تثبيت التطبيق / إضافة إلى الشاشة الرئيسية».</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-700">آيفون (Safari)</p>
              <p className="mt-1 text-[10px] leading-6 text-slate-500">زر المشاركة ← «إضافة إلى الشاشة الرئيسية». يعمل ملء الشاشة مع شاشة أوفلاين عند انقطاع الإنترنت.</p>
            </div>
            <button
              className="btn-primary whitespace-nowrap"
              onClick={() => window.dispatchEvent(new Event("pwa-install-request"))}
            >
              <Download size={15} /> تثبيت التطبيق
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
