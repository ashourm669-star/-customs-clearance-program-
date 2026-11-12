"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Inbox, LoaderCircle, Plus, X } from "lucide-react";
import { formatDate, statusLabel, tone, type Option } from "@/lib/constants";

export function Badge({ value, options }: { value?: string | null; options?: Option[] }) {
  return <span className={tone(value)}>{options ? statusLabel(options, value) : (value ?? "—")}</span>;
}

export function PageHeader({
  title, subtitle, icon, actions, badge,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3.5">
        {icon && (
          <div className="hidden h-11 w-11 shrink-0 place-items-center rounded-xl border border-teal-100 bg-teal-50 text-teal-700 sm:grid">
            {icon}
          </div>
        )}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-[var(--navy)] sm:text-2xl">{title}</h1>
            {badge}
          </div>
          {subtitle && <p className="mt-1 text-xs leading-6 text-slate-500 sm:text-sm">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionCard({
  title, subtitle, action, children, className = "", bodyClassName = "",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`card overflow-hidden ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-bold text-[var(--navy)]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function StatCard({
  label, value, hint, icon, color = "teal", progress,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: ReactNode;
  color?: "teal" | "blue" | "amber" | "violet" | "rose" | "slate";
  progress?: number;
}) {
  const colors: Record<string, string> = {
    teal: "bg-teal-50 text-teal-600", blue: "bg-sky-50 text-sky-600",
    amber: "bg-amber-50 text-amber-600", violet: "bg-violet-50 text-violet-600",
    rose: "bg-rose-50 text-rose-600", slate: "bg-slate-100 text-slate-600",
  };
  const bars: Record<string, string> = {
    teal: "bg-teal-500", blue: "bg-sky-500", amber: "bg-amber-500",
    violet: "bg-violet-500", rose: "bg-rose-500", slate: "bg-slate-500",
  };
  return (
    <div className="card p-4 sm:p-5 fade-up">
      <div className="flex items-start justify-between gap-2">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${colors[color]}`}>{icon}</div>
        {progress !== undefined && (
          <span className="rounded-full bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500">{progress}٪</span>
        )}
      </div>
      <p className="mt-4 text-2xl font-bold leading-none text-[var(--navy)]">{value}</p>
      <p className="mt-2 text-xs font-semibold text-slate-600">{label}</p>
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
      {progress !== undefined && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${bars[color]}`} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
      )}
    </div>
  );
}

export function EmptyState({
  title, description, actionLabel, onAction, icon,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-50 text-slate-300">
        {icon ?? <Inbox size={30} />}
      </div>
      <h3 className="mt-4 text-sm font-bold text-slate-700">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-xs leading-6 text-slate-500">{description}</p>}
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn-primary mt-5"><Plus size={15} /> {actionLabel}</button>
      )}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="p-5">
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="skeleton h-9 w-9 rounded-lg" />
            {Array.from({ length: cols }).map((__, j) => (
              <div key={j} className="skeleton h-4 flex-1" style={{ maxWidth: j === 0 ? 180 : undefined }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-xs font-semibold text-slate-500">
      <LoaderCircle size={17} className="animate-spin text-teal-600" /> {label ?? "جاري التحميل..."}
    </div>
  );
}

export function Drawer({
  open, title, subtitle, onClose, children, footer, width = "max-w-xl",
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]" onClick={onClose} aria-label="إغلاق" />
      <div className={`slide-in relative ms-auto flex h-full w-full flex-col bg-white shadow-2xl ${width}`}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-bold text-[var(--navy)]">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50" aria-label="إغلاق">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3.5 sm:px-6">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open, title, description, onCancel, onConfirm, loading,
}: {
  open: boolean;
  title: string;
  description?: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]" onClick={onCancel} aria-label="إغلاق" />
      <div className="fade-up relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-rose-50 text-rose-600"><AlertTriangle size={22} /></div>
        <h3 className="mt-4 text-base font-bold text-[var(--navy)]">{title}</h3>
        <p className="mt-2 text-xs leading-6 text-slate-500">{description ?? "لا يمكن التراجع عن هذا الإجراء."}</p>
        <div className="mt-6 flex gap-2">
          <button onClick={onConfirm} disabled={loading} className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-60">
            {loading ? "جاري الحذف..." : "نعم، احذف"}
          </button>
          <button onClick={onCancel} className="btn-ghost flex-1">إلغاء</button>
        </div>
      </div>
    </div>
  );
}

export function FieldInput({
  label, value, onChange, type = "text", options, placeholder, required, hint, disabled,
}: {
  label: string;
  value: any;
  onChange: (value: any) => void;
  type?: string;
  options?: Option[];
  placeholder?: string;
  required?: boolean;
  hint?: string;
  disabled?: boolean;
}) {
  const common = { disabled, value: value ?? "", placeholder };
  const ltr = type === "email" || type === "password" || type === "url" || type === "tel";
  return (
    <label className="block">
      <span className="field-label">{label} {required && <span className="text-rose-500">*</span>}</span>
      {options ? (
        <select className="field" {...common} onChange={(e) => onChange(e.target.value)}>
          <option value="">— اختر —</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : type === "textarea" ? (
        <textarea className="field" rows={3} {...common} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input
          className={`field ${ltr ? "text-left" : ""}`}
          {...common}
          type={type}
          dir={ltr ? "ltr" : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {hint && <span className="mt-1 block text-[10px] text-slate-400">{hint}</span>}
    </label>
  );
}

export function DisplayDate({ value }: { value?: string | null }) {
  return <span className="whitespace-nowrap text-xs text-slate-600">{formatDate(value)}</span>;
}
