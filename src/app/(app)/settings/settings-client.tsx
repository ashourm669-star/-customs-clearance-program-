"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  Building2,
  Globe2,
  KeyRound,
  Lock,
  Mail,
  Phone,
  Save,
  Settings2,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Avatar, Badge, Field, PageHeader, SectionCard, Spinner } from "@/components/ui";
import { useToast } from "@/components/toast";
import type { SessionUser } from "@/lib/auth";
import type { StorageStats } from "@/lib/storage";
import { InstallAppCard } from "@/components/pwa";

const COLORS = ["#0f9d8b", "#6366f1", "#c9a227", "#0ea5e9", "#f43f5e", "#8b5cf6", "#0a2239"];

export function SettingsClient({
  user,
  roleLabel,
  stats,
  storage,
  company,
}: {
  user: SessionUser;
  roleLabel: string;
  stats: { shipments: number; clients: number; carriers: number; invoices: number; documents: number };
  storage: StorageStats;
  company: Record<string, string>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [profile, setProfile] = useState({
    name: user.name,
    jobTitle: user.jobTitle ?? "",
    phone: user.phone ?? "",
    avatarColor: user.avatarColor,
  });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [email, setEmail] = useState(user.email);
  const [companyForm, setCompanyForm] = useState({
    company_name: company.company_name ?? "العربي للخدمات الجمركية واللوجستية",
    company_name_en: company.company_name_en ?? "Al-Araby Customs & Logistics Services",
    commercial_register: company.commercial_register ?? "364",
    tax_id: company.tax_id ?? "439942616",
    customs_license: company.customs_license ?? "EG-CB-10942",
    phone: company.phone ?? "+20 3 480 2244",
    email: company.email ?? "info@alarabi-logistics.com",
    address: company.address ?? "الإسكندرية، مصر",
    website: company.website ?? "",
  });
  const [savingCompany, setSavingCompany] = useState(false);

  async function saveCompany(event: React.FormEvent) {
    event.preventDefault();
    setSavingCompany(true);
    try {
      const response = await fetch("/api/settings/company", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(companyForm) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "تعذّر الحفظ");
      toast({ title: "تم حفظ بيانات المنشأة", description: `سجل تجاري ${companyForm.commercial_register} · ضريبي ${companyForm.tax_id}`, tone: "success" });
      router.refresh();
    } catch (error) { toast({ title: "تعذّر الحفظ", description: error instanceof Error ? error.message : undefined, tone: "error" }); }
    finally { setSavingCompany(false); }
  }
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    setSavingProfile(true);
    try {
      const response = await fetch("/api/settings/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profile, email }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "");
      toast({ title: "تم تحديث الملف الشخصي", description: profile.name, tone: "success" });
      router.refresh();
    } catch (error) {
      toast({ title: "تعذّر الحفظ", description: error instanceof Error ? error.message : undefined, tone: "error" });
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(event: React.FormEvent) {
    event.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({ title: "كلمتا المرور غير متطابقتين", tone: "error" });
      return;
    }
    setSavingPassword(true);
    try {
      const response = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "");
      toast({ title: "تم تغيير كلمة المرور", tone: "success" });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      toast({ title: "تعذّر تغيير كلمة المرور", description: error instanceof Error ? error.message : undefined, tone: "error" });
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div>
      <PageHeader title="الإعدادات" description="بيانات حسابك، أمان الدخول، ومعلومات منصة العربي للخدمات الجمركية." />

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <SectionCard title="الملف الشخصي" description="تظهر هذه البيانات في سجل التحديثات والفواتير" bodyClassName="p-5">
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="flex flex-wrap items-center gap-4 rounded-xl bg-slate-50 p-4">
                <Avatar name={profile.name || user.name} color={profile.avatarColor} size="lg" />
                <div>
                  <p className="text-sm font-extrabold text-slate-900">{profile.name || user.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {user.email} · {roleLabel}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setProfile({ ...profile, avatarColor: color })}
                        className={`size-5 rounded-full ring-2 transition ${profile.avatarColor === color ? "ring-slate-900" : "ring-transparent"}`}
                        style={{ background: color }}
                        aria-label={`اختيار اللون ${color}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="الاسم الكامل" required>
                  <input className="input" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} required />
                </Field>
                <Field label="المسمى الوظيفي">
                  <input className="input" value={profile.jobTitle} onChange={(event) => setProfile({ ...profile, jobTitle: event.target.value })} />
                </Field>
                <Field label="رقم الهاتف">
                  <input className="input" dir="ltr" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} />
                </Field>
                <Field label="البريد الإلكتروني" hint="يمكنك تغييره بنفسك — يُستخدم في تسجيل الدخول">
                  <input type="email" dir="ltr" className="input" value={email} onChange={(event) => setEmail(event.target.value)} />
                </Field>
              </div>

              <div className="flex justify-end">
                <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                  {savingProfile ? <Spinner /> : <Save className="size-4" />}
                  حفظ التغييرات
                </button>
              </div>
            </form>
          </SectionCard>

          <SectionCard title="أمان الحساب" description="تغيير كلمة المرور وحماية الدخول" bodyClassName="p-5">
            <form onSubmit={savePassword} className="grid gap-4 sm:grid-cols-2">
              <Field label="كلمة المرور الحالية" className="sm:col-span-2">
                <input
                  type="password"
                  className="input"
                  value={passwords.currentPassword}
                  onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })}
                  required
                />
              </Field>
              <Field label="كلمة المرور الجديدة">
                <input
                  type="password"
                  className="input"
                  value={passwords.newPassword}
                  onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })}
                  minLength={6}
                  required
                />
              </Field>
              <Field label="تأكيد كلمة المرور">
                <input
                  type="password"
                  className="input"
                  value={passwords.confirmPassword}
                  onChange={(event) => setPasswords({ ...passwords, confirmPassword: event.target.value })}
                  minLength={6}
                  required
                />
              </Field>
              <div className="sm:col-span-2 flex justify-end">
                <button type="submit" className="btn btn-ghost" disabled={savingPassword}>
                  {savingPassword ? <Spinner /> : <KeyRound className="size-4" />}
                  تحديث كلمة المرور
                </button>
              </div>
            </form>
          </SectionCard>
        </div>

        <div className="space-y-5">
          <InstallAppCard />

          <SectionCard title="بيانات المنشأة" description="السجل التجاري والرقم الضريبي يظهران في السندات والفواتير المطبوعة" bodyClassName="p-5">
            <form onSubmit={saveCompany} className="grid gap-3 sm:grid-cols-2">
              <Field label="اسم المنشأة"><input className="input" value={companyForm.company_name} onChange={(event) => setCompanyForm({ ...companyForm, company_name: event.target.value })} /></Field>
              <Field label="الاسم بالإنجليزية"><input className="input" dir="ltr" value={companyForm.company_name_en} onChange={(event) => setCompanyForm({ ...companyForm, company_name_en: event.target.value })} /></Field>
              <Field label="رقم السجل التجاري" required><input className="input" dir="ltr" value={companyForm.commercial_register} onChange={(event) => setCompanyForm({ ...companyForm, commercial_register: event.target.value })} required /></Field>
              <Field label="الرقم الضريبي" required><input className="input" dir="ltr" value={companyForm.tax_id} onChange={(event) => setCompanyForm({ ...companyForm, tax_id: event.target.value })} required /></Field>
              <Field label="رقم ترخيص المخلص"><input className="input" dir="ltr" value={companyForm.customs_license} onChange={(event) => setCompanyForm({ ...companyForm, customs_license: event.target.value })} /></Field>
              <Field label="الهاتف"><input className="input" dir="ltr" value={companyForm.phone} onChange={(event) => setCompanyForm({ ...companyForm, phone: event.target.value })} /></Field>
              <Field label="البريد الرسمي"><input className="input" dir="ltr" value={companyForm.email} onChange={(event) => setCompanyForm({ ...companyForm, email: event.target.value })} /></Field>
              <Field label="العنوان"><input className="input" value={companyForm.address} onChange={(event) => setCompanyForm({ ...companyForm, address: event.target.value })} /></Field>
              <div className="sm:col-span-2 flex justify-end"><button type="submit" className="btn btn-primary" disabled={savingCompany}>{savingCompany ? <Spinner /> : <Save className="size-4" />} حفظ بيانات المنشأة</button></div>
            </form>
          </SectionCard>

          <SectionCard title="المنشأة" bodyClassName="p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-xl bg-[#0a2239] text-[#ead07a]">
                <ShieldCheck className="size-6" />
              </span>
              <div>
                <p className="text-sm font-extrabold text-slate-900">العربي للخدمات الجمركية</p>
                <p className="text-[11px] text-slate-500">واللوجستية · الإسكندرية، مصر</p>
              </div>
            </div>
            <ul className="mt-4 space-y-2.5 text-[11px]">
              {[
                { icon: <Building2 className="size-3.5" />, label: "السجل التجاري", value: "88421 - الإسكندرية" },
                { icon: <BadgeCheck className="size-3.5" />, label: "رقم المخلص الجمركي", value: "EG-CB-10942" },
                { icon: <Phone className="size-3.5" />, label: "الهاتف", value: "+20 3 480 2244" },
                { icon: <Mail className="size-3.5" />, label: "البريد", value: "info@alarabi-logistics.com" },
                { icon: <Globe2 className="size-3.5" />, label: "نافذة", value: "متصل · API v2" },
              ].map((item) => (
                <li key={item.label} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    {item.icon}
                    {item.label}
                  </span>
                  <span className="font-bold text-slate-800" dir={item.label === "الهاتف" ? "ltr" : undefined}>
                    {item.value}
                  </span>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard title="ملخص بيانات المنصة" bodyClassName="p-5">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "ملفات التخليص", value: stats.shipments },
                { label: "العملاء", value: stats.clients },
                { label: "شركات الشحن", value: stats.carriers },
                { label: "الفواتير", value: stats.invoices },
                { label: "المستندات", value: stats.documents },
                { label: "المستخدمون", value: 3 },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-100 p-3 text-center">
                  <p className="text-lg font-extrabold text-slate-900">{item.value}</p>
                  <p className="text-[10px] text-slate-500">{item.label}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="قاعدة البيانات والتخزين"
            description="مكان حفظ بيانات المنصة فعلياً"
            bodyClassName="p-5"
          >
            <div className="space-y-2 text-[11px]">
              <div className="rounded-lg bg-slate-900 p-2.5 font-mono text-[9px] leading-5 text-emerald-300" dir="ltr">
                postgresql://{storage.host}:{storage.port}/{storage.database}
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-slate-500">النوع</span>
                <span className="font-bold text-slate-800">PostgreSQL 15 · Drizzle ORM</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-slate-500">اسم قاعدة البيانات</span>
                <span className="font-bold text-slate-800" dir="ltr">{storage.database}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-slate-500">حجم التخزين</span>
                <span className="font-bold text-slate-800" dir="ltr">{storage.totalSize}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-slate-500">آخر كتابة للبيانات</span>
                <span className="font-bold text-slate-800" dir="ltr">{storage.lastWrite ?? "—"}</span>
              </div>
            </div>

            <p className="mt-3 mb-2 text-[10px] font-bold text-slate-500">الجداول المخزَّنة</p>
            <ul className="space-y-1">
              {storage.tables.map((table) => (
                <li key={table.table} className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-[10px] odd:bg-slate-50">
                  <span className="truncate text-slate-600">{table.label}</span>
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <span className="font-bold text-slate-900">{table.rows}</span>
                    <span className="text-slate-400" dir="ltr">{table.size}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 rounded-lg bg-emerald-50 p-2 text-[10px] leading-5 text-emerald-800">
              كل إضافة أو تعديل أو حذف تُكتب مباشرةً في قاعدة البيانات عبر Drizzle ORM، وليس في ذاكرة المتصفح.
            </p>
          </SectionCard>

          <SectionCard title="حسابك" bodyClassName="p-5">
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <UserRound className="size-3.5" /> الصلاحية
                </span>
                <Badge tone="indigo">{roleLabel}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Lock className="size-3.5" /> الجلسة
                </span>
                <Badge tone="emerald">نشطة · 30 يوم</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <Settings2 className="size-3.5" /> الإصدار
                </span>
                <span className="font-bold text-slate-800">2.4.0</span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
