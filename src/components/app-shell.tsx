"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, Bell, Building2, ChevronDown, ClipboardList, ExternalLink, FileText, Globe2, KeyRound,
  Landmark, LayoutDashboard, LogOut, Menu, Plane, Printer, ReceiptText, Scale, Search, Settings,
  Ship, ShieldCheck, UsersRound, X, CircleCheck, ChartNoAxesCombined,
} from "lucide-react";
import { DataProvider, authHeaders, clearToken, useData, type Row } from "@/components/data-provider";
import { PwaInstaller } from "@/components/pwa-installer";
import { COMPANY, formatDateTime, statusLabel, roles } from "@/lib/constants";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; badge?: "shipments" | "tasks" };
type NavGroup = { title: string; items: NavItem[] };

const groups: NavGroup[] = [
  { title: "الرئيسية", items: [{ href: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard }] },
  {
    title: "استعلام وبنود",
    items: [
      { href: "/lookup", label: "استعلام برقم بوليصة", icon: Search },
      { href: "/tariff", label: "البند الجمركي", icon: Scale },
      { href: "/clearance", label: "ملف التخليص الجمركي", icon: FileText },
    ],
  },
  {
    title: "العمليات الجمركية",
    items: [
      { href: "/shipments", label: "الشحنات والتخليص", icon: Ship, badge: "shipments" },
      { href: "/tasks", label: "المهام", icon: ClipboardList, badge: "tasks" },
      { href: "/documents", label: "المستندات", icon: FileText },
      { href: "/nafeza", label: "منصة نافذة", icon: Activity },
    ],
  },
  {
    title: "الجهات والشركاء",
    items: [
      { href: "/clients", label: "العملاء", icon: Building2 },
      { href: "/carriers", label: "الناقلون والخطوط", icon: Plane },
      { href: "/connections", label: "ربط الناقلين API", icon: KeyRound },
      { href: "/ports", label: "الموانئ والمنافذ", icon: Globe2 },
    ],
  },
  {
    title: "المالية والتقارير",
    items: [
      { href: "/invoices", label: "الفواتير", icon: ReceiptText },
      { href: "/banks", label: "البنوك والسداد", icon: Landmark },
      { href: "/reports", label: "التقارير والإحصاءات", icon: ChartNoAxesCombined },
    ],
  },
  {
    title: "النظام",
    items: [
      { href: "/users", label: "المستخدمون", icon: UsersRound },
      { href: "/settings", label: "الإعدادات", icon: Settings },
    ],
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data } = useData();
  return (
    <div className="flex h-full flex-col bg-[linear-gradient(180deg,#071426_0%,#0b1d36_60%,#0d2a44_100%)] text-white">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 shadow-lg shadow-teal-900/30">
          <Building2 size={20} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">الشركة العربي</p>
          <p className="truncate text-[10px] text-white/50">التخليص الجمركي واللوجستيات</p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-3 text-[10px] font-bold tracking-wide text-white/35">{group.title}</p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const count = item.badge === "shipments"
                  ? data?.shipments.filter((s: Row) => !["delivered", "released"].includes(s.status)).length
                  : item.badge === "tasks"
                    ? data?.tasks.filter((t: Row) => t.status !== "done").length
                    : undefined;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12.5px] font-semibold transition-all ${
                      active
                        ? "bg-gradient-to-l from-teal-500/25 to-teal-500/5 text-teal-200 shadow-[inset_-3px_0_0_#20c4a9]"
                        : "text-white/65 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <item.icon size={17} className={active ? "text-teal-300" : ""} />
                    <span className="flex-1">{item.label}</span>
                    {count !== undefined && count > 0 && (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/70">{count}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-xl border border-teal-400/20 bg-teal-400/5 p-3">
          <div className="flex items-center gap-2">
            <CircleCheck size={15} className="text-teal-300" />
            <p className="text-[11px] font-bold text-teal-100">الربط مع نافذة نشط</p>
          </div>
          <p className="mt-1.5 text-[10px] leading-5 text-white/45">آخر مزامنة: {data?.serverTime ? formatDateTime(data.serverTime) : "الآن"}</p>
        </div>
        <p className="mt-3 text-center text-[9px] text-white/30">الإصدار ٢٠٢٦.١ · جميع الحقوق محفوظة</p>
      </div>
    </div>
  );
}

function Topbar({ user, onMenu }: { user: Row; onMenu: () => void }) {
  const pathname = usePathname();
  const { data } = useData();
  const [openNotifications, setOpenNotifications] = useState(false);
  const [openUser, setOpenUser] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [embedded, setEmbedded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const current = groups.flatMap((g) => g.items).find((i) => pathname === i.href || pathname.startsWith(i.href + "/"));
  const title = current?.label ?? "لوحة التحكم";
  const shown: Row = data?.currentUser ?? user;

  useEffect(() => {
    setEmbedded(window.self !== window.top);
    function close(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenNotifications(false);
        setOpenUser(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST", headers: authHeaders() });
    clearToken();
    window.location.replace("/login");
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-3">
        <button onClick={onMenu} className="rounded-lg border border-slate-200 p-2 text-slate-600 lg:hidden" aria-label="القائمة"><Menu size={18} /></button>
        <div>
          <h2 className="text-sm font-bold text-[var(--navy)] sm:text-base">{title}</h2>
          <p className="hidden text-[10px] text-slate-400 sm:block">{COMPANY.name}</p>
        </div>
      </div>

      <div className="flex items-center gap-2" ref={menuRef}>
        <button className="btn-ghost hidden px-2.5 py-2 sm:inline-flex" onClick={() => window.print()} title="طباعة / حفظ PDF"><Printer size={15} /> طباعة</button>
        <Link href="/lookup" className="hidden items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-[11px] font-bold text-teal-800 xl:flex">
          <Search size={14} /> استعلام بوليصة
        </Link>

        {embedded && (
          <button
            onClick={() => window.open(window.location.href, "_blank", "noopener")}
            className="hidden items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10px] font-bold text-amber-700 hover:bg-amber-100 sm:inline-flex"
            title="فتح التطبيق في تبويب جديد"
          >
            <ExternalLink size={13} /> فتح في تبويب جديد
          </button>
        )}

        <div className="relative">
          <button onClick={() => { setOpenNotifications((v) => !v); setOpenUser(false); }} className="relative rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" aria-label="الإشعارات">
            <Bell size={17} />
            {(data?.activities?.length ?? 0) > 0 && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />}
          </button>
          {openNotifications && (
            <div className="fade-up absolute end-0 top-12 w-[min(330px,calc(100vw-30px))] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/10">
              <p className="mb-2 px-1 text-xs font-bold text-[var(--navy)]">آخر النشاطات</p>
              <div className="max-h-72 space-y-1 overflow-y-auto">
                {(data?.activities ?? []).slice(0, 6).map((activity: Row) => (
                  <div key={activity.id} className="flex gap-2.5 rounded-xl p-2 hover:bg-slate-50">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal-500" />
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-[11px] font-semibold text-slate-700">{activity.description}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">{activity.actor} · {formatDateTime(activity.createdAt)}</p>
                    </div>
                  </div>
                ))}
                {(data?.activities?.length ?? 0) === 0 && <p className="py-6 text-center text-[11px] text-slate-400">لا توجد نشاطات بعد</p>}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <button onClick={() => { setOpenUser((v) => !v); setOpenNotifications(false); }} className="flex items-center gap-2 rounded-xl border border-slate-200 px-2 py-1.5 hover:bg-slate-50">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--navy)] text-[11px] font-bold text-white">{String(shown.name ?? "ع").slice(0, 1)}</div>
            <div className="hidden text-right sm:block">
              <p className="text-[11px] font-bold text-slate-700">{shown.name}</p>
              <p className="text-[10px] text-slate-400">{statusLabel(roles, shown.role)}</p>
            </div>
            <ChevronDown size={13} className="text-slate-400" />
          </button>
          {openUser && (
            <div className="fade-up absolute end-0 top-12 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10">
              <div className="border-b border-slate-100 px-3 py-2">
                <p className="text-xs font-bold text-slate-700">{shown.name}</p>
                <p dir="ltr" className="mt-0.5 truncate text-right text-[10px] text-slate-400">{shown.email}</p>
              </div>
              <Link href="/settings" onClick={() => setOpenUser(false)} className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"><Settings size={14} /> إعدادات الشركة</Link>
              <button onClick={() => void logout()} disabled={loggingOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60">
                <LogOut size={14} /> {loggingOut ? "جاري الخروج..." : "تسجيل الخروج"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export function AppShell({ user, children }: { user: Row; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <DataProvider>
      <div className="min-h-screen bg-[#f4f7fb]">
        <aside className="fixed inset-y-0 right-0 z-40 hidden w-64 lg:block">
          <SidebarContent />
        </aside>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" onClick={() => setMobileOpen(false)} aria-label="إغلاق القائمة" />
            <aside className="slide-in absolute inset-y-0 right-0 w-72 shadow-2xl">
              <button onClick={() => setMobileOpen(false)} className="absolute left-3 top-5 z-10 rounded-lg bg-white/10 p-1.5 text-white" aria-label="إغلاق"><X size={16} /></button>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        )}
        <div className="lg:pr-64">
          <Topbar user={user} onMenu={() => setMobileOpen(true)} />
          <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 sm:py-7">{children}</main>
          <footer className="border-t border-slate-200/70 px-6 py-4 text-center text-[10px] text-slate-400">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={12} /> {COMPANY.license}</span>
          </footer>
        </div>
        <PwaInstaller />
      </div>
    </DataProvider>
  );
}
