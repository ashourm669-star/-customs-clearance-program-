"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  ChevronDown,
  FileStack,
  BookOpenCheck,
  LayoutDashboard,
  Radar,
  LogOut,
  Menu,
  PackageSearch,
  PieChart,
  PlugZap,
  Plus,
  ReceiptText,
  Search,
  Settings,
  Ship,
  ShieldCheck,
  Users,
  BellRing,
  X,
} from "lucide-react";
import { navSections } from "@/lib/constants";
import type { SessionUser } from "@/lib/auth";
import { Avatar } from "@/components/ui";
import { InstallAppCard } from "@/components/pwa";
import { ExportMenu } from "@/components/export-menu";

const icons: Record<string, ReactNode> = {
  dashboard: <LayoutDashboard className="size-[18px]" />,
  shipments: <PackageSearch className="size-[18px]" />,
  tracking: <Radar className="size-[18px]" />,
  documents: <FileStack className="size-[18px]" />,
  customs: <BookOpenCheck className="size-[18px]" />,
  invoices: <ReceiptText className="size-[18px]" />,
  carriers: <Ship className="size-[18px]" />,
  integrations: <PlugZap className="size-[18px]" />,
  clients: <Building2 className="size-[18px]" />,
  reports: <PieChart className="size-[18px]" />,
  settings: <Settings className="size-[18px]" />,
  users: <Users className="size-[18px]" />,
  alerts: <BellRing className="size-[18px]" />,
};

const pageTitles: Record<string, string> = {
  "/dashboard": "لوحة التحكم",
  "/shipments": "ملفات التخليص",
  "/tracking": "تتبع بوليصة / AWB",
  "/documents": "مركز المستندات",
  "/customs": "المنظومة الجمركية",
  "/invoices": "الفواتير والتحصيل",
  "/carriers": "شركات الطيران والخطوط الملاحية",
  "/integrations": "الربط والتكامل",
  "/clients": "قاعدة العملاء",
  "/reports": "التقارير والتحليلات",
  "/settings": "الإعدادات",
  "/users": "المستخدمون والصلاحيات",
  "/alerts": "الإشعارات والتنبيهات",
};

export function AppShell({ user, alertsCount = 0, children }: { user: SessionUser; alertsCount?: number; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const title = useMemo(() => {
    if (pathname.startsWith("/shipments/")) return "تفاصيل ملف التخليص";
    return pageTitles[pathname] ?? "العربي للخدمات الجمركية";
  }, [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    if (!search.trim()) return;
    router.push(`/shipments?q=${encodeURIComponent(search.trim())}`);
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-[linear-gradient(185deg,#0a2239_0%,#0d2f4f_58%,#0b3b47_100%)] text-slate-200">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <div className="flex size-11 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#c9a227,#ead07a)] text-[#0a2239] shadow-lg">
          <ShieldCheck className="size-6" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-white">العربي للخدمات الجمركية</p>
          <p className="truncate text-[11px] text-slate-300/80">واللوجستية · Al-Araby Clearance</p>
        </div>
        <button
          type="button"
          className="mr-auto rounded-lg p-1.5 text-slate-300 hover:bg-white/10 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="إغلاق القائمة"
        >
          <X className="size-5" />
        </button>
      </div>

      <nav className="scroll-thin flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {navSections.map((section) => (
          <div key={section.title}>
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400/70">{section.title}</p>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => {
                        setMobileOpen(false);
                        setMenuOpen(false);
                      }}
                      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition ${
                        active
                          ? "bg-white/12 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                          : "text-slate-300 hover:bg-white/[0.07] hover:text-white"
                      }`}
                    >
                      <span className={active ? "text-[#7ee0cf]" : "text-slate-400 group-hover:text-slate-200"}>
                        {icons[item.icon]}
                      </span>
                      <span className="truncate">{item.label}</span>
                      {active ? <span className="mr-auto size-1.5 rounded-full bg-[#7ee0cf]" /> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mx-3 mb-3 rounded-xl border border-white/10 bg-white/[0.06] p-3">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
          </span>
          <p className="text-[11px] font-bold text-white">نافذة · متصل</p>
          <span className="mr-auto rounded-md bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
            API v2
          </span>
        </div>
        <p className="mt-1.5 text-[10px] leading-5 text-slate-300/80">
          الربط مع الشباك الواحد و11 شركة شحن يعمل بكفاءة.
        </p>
      </div>

      <div className="px-3 pb-2">
        <InstallAppCard compact />
      </div>

      <div className="border-t border-white/10 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={user.name} color={user.avatarColor} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-xs font-bold text-white">{user.name}</p>
            <p className="truncate text-[10px] text-slate-300/80">{user.jobTitle ?? "فريق العربي"}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <aside className="app-sidebar fixed inset-y-0 right-0 z-40 hidden w-[268px] lg:block">{sidebar}</aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 right-0 w-[280px] shadow-2xl">{sidebar}</aside>
        </div>
      ) : null}

      <div className="app-content lg:mr-[268px]">
        <header className="app-topbar sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              className="rounded-lg border border-slate-200 p-2 text-slate-600 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="القائمة"
            >
              <Menu className="size-5" />
            </button>
            <div className="hidden min-w-0 sm:block">
              <h2 className="truncate text-sm font-bold text-slate-900">{title}</h2>
              <p className="text-[11px] text-slate-500">
                {new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }).format(new Date())}
              </p>
            </div>

            <form onSubmit={submitSearch} className="relative mr-auto w-full max-w-xs">
              <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="بحث برقم الملف، البوليصة…"
                className="input h-10 pr-9 text-xs"
              />
            </form>

            <ExportMenu />

            <Link href="/shipments?new=1" className="btn btn-mint hidden h-10 px-3 text-xs sm:inline-flex">
              <Plus className="size-4" />
              ملف تخليص
            </Link>

            <Link
              href="/alerts"
              className="relative rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50"
              aria-label="الإشعارات"
            >
              <Bell className="size-5" />
              {alertsCount > 0 ? (
                <span className="absolute -left-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
                  {alertsCount > 9 ? "9+" : alertsCount}
                </span>
              ) : null}
            </Link>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 p-1 pl-2 transition hover:bg-slate-50"
              >
                <ChevronDown className="size-4 text-slate-400" />
                <span className="hidden text-right sm:block">
                  <span className="block text-[11px] font-bold leading-4 text-slate-800">{user.name}</span>
                  <span className="block text-[10px] leading-3 text-slate-500">{user.email}</span>
                </span>
                <Avatar name={user.name} color={user.avatarColor} size="sm" />
              </button>
              {menuOpen ? (
                <div className="absolute left-0 top-12 z-40 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-fade-up">
                  <div className="border-b border-slate-100 px-3 py-2">
                    <p className="text-xs font-bold text-slate-900">{user.name}</p>
                    <p className="text-[11px] text-slate-500">{user.jobTitle ?? "فريق العربي"}</p>
                  </div>
                  <Link href="/settings" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    <Settings className="size-4 text-slate-400" />
                    إعدادات الحساب
                  </Link>
                  <Link href="/integrations" className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    <PlugZap className="size-4 text-slate-400" />
                    حالة التكاملات
                  </Link>
                  <button
                    type="button"
                    onClick={logout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right text-xs font-semibold text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut className="size-4" />
                    تسجيل الخروج
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="app-safe-bottom px-4 pb-24 pt-5 sm:px-6 sm:pt-6 lg:pb-8">{children}</main>

        <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-md safe-bottom lg:hidden">
          <div className="grid grid-cols-5">
            {[
              { href: "/dashboard", label: "الرئيسية", icon: <LayoutDashboard className="size-[18px]" /> },
              { href: "/shipments", label: "الملفات", icon: <PackageSearch className="size-[18px]" /> },
              { href: "/tracking", label: "تتبع", icon: <Radar className="size-[18px]" /> },
              { href: "/documents", label: "مستندات", icon: <FileStack className="size-[18px]" /> },
              { href: "/invoices", label: "فواتير", icon: <ReceiptText className="size-[18px]" /> },
            ].map((tab) => {
              const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold transition ${
                    active ? "text-[#0f9d8b]" : "text-slate-400"
                  }`}
                >
                  <span className={active ? "text-[#0f9d8b]" : "text-slate-400"}>{tab.icon}</span>
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
