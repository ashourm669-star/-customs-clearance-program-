"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Pencil, Plus, ShieldCheck, Trash2, UserCheck, UserX, Users } from "lucide-react";
import { Avatar, Badge, EmptyState, Field, Modal, PageHeader, Spinner } from "@/components/ui";
import { useToast } from "@/components/toast";
import { PERMISSIONS, ROLE_PERMISSIONS } from "@/lib/permissions";

type UserRow = { id: number; name: string; email: string; role: string; jobTitle: string | null; phone: string | null; permissions: string[]; active: number; createdAt: string };
const ROLE_LABELS: Record<string, string> = { admin: "مدير النظام", manager: "مدير تشغيل", agent: "مخلص جمركي", viewer: "مطالع فقط" };
const EMPTY = { name: "", email: "", password: "", role: "agent", jobTitle: "مخلص جمركي", phone: "", permissions: [] as string[], active: 1 };

export function UsersClient({ initialUsers, actor }: { initialUsers: UserRow[]; actor: { id: number; role: string; name: string } }) {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState(initialUsers);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const isAdmin = actor.role === "admin";

  function start(user?: UserRow) {
    setEditing(user ?? null);
    setError(null);
    setForm(user ? { name: user.name, email: user.email, password: "", role: user.role, jobTitle: user.jobTitle ?? "", phone: user.phone ?? "", permissions: user.permissions ?? [], active: user.active } : { ...EMPTY });
    setOpen(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(editing ? `/api/users/${editing.id}` : "/api/users", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "تعذّر الحفظ");
      setRows(data.users);
      toast({ title: editing ? "تم تحديث بيانات الموظف" : "تمت إضافة الموظف", description: form.email, tone: "success" });
      setOpen(false);
      router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "تعذّر الحفظ"); }
    finally { setSaving(false); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      const response = await fetch(`/api/users/${target.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setRows(data.users);
      toast({ title: "تم حذف الموظف", tone: "success" });
      router.refresh();
    } catch (caught) { toast({ title: "تعذّر الحذف", description: caught instanceof Error ? caught.message : undefined, tone: "error" }); }
  }

  return (
    <div>
      <PageHeader title="المستخدمون والصلاحيات" description="أضف موظفين وحدد صلاحية كل واحد منهم داخل المنصة.">
        {isAdmin ? <button type="button" onClick={() => start()} className="btn btn-primary"><Plus className="size-4" /> موظف جديد</button> : null}
      </PageHeader>

      {!isAdmin ? (
        <div className="mb-4 rounded-xl bg-amber-50 p-3 text-[11px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
          إضافة وتعديل الموظفين متاحة لمدير النظام فقط. يمكنك مراجعة الصلاحيات لكن لا يمكنك تغييرها.
        </div>
      ) : null}

      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState title="لا يوجد مستخدمون" icon={<Users className="size-7" />} action={<button type="button" className="btn btn-primary" onClick={() => start()}><Plus className="size-4" /> إضافة موظف</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-slate-50/80"><tr>{["الموظف", "البريد", "الدور", "الصلاحيات", "الحالة", ""].map((label) => <th key={label} className="th">{label}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/60">
                    <td className="td"><div className="flex items-center gap-2"><Avatar name={user.name} size="sm" /><div><p className="text-[12px] font-bold text-slate-900">{user.name}</p><p className="text-[10px] text-slate-500">{user.jobTitle ?? "—"}</p></div></div></td>
                    <td className="td text-[11px] text-slate-600" dir="ltr">{user.email}</td>
                    <td className="td"><Badge tone={user.role === "admin" ? "indigo" : user.role === "manager" ? "sky" : user.role === "agent" ? "emerald" : "slate"}>{ROLE_LABELS[user.role] ?? user.role}</Badge></td>
                    <td className="td"><div className="flex flex-wrap gap-1">{(user.permissions.length ? user.permissions : ROLE_PERMISSIONS[user.role] ?? []).slice(0, 4).map((key) => <span key={key} className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">{PERMISSIONS.find((p) => p.key === key)?.label ?? key}</span>)}</div></td>
                    <td className="td">{user.active ? <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600"><UserCheck className="size-3.5" /> نشط</span> : <span className="flex items-center gap-1 text-[10px] font-bold text-rose-600"><UserX className="size-3.5" /> موقوف</span>}</td>
                    <td className="td"><div className="flex justify-end gap-1">{isAdmin ? <><button type="button" onClick={() => start(user)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-[#0f9d8b]" aria-label="تعديل"><Pencil className="size-4" /></button>{user.id !== actor.id ? <button type="button" onClick={() => setDeleteTarget(user)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="حذف"><Trash2 className="size-4" /></button> : null}</> : null}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} size="lg" title={editing ? `تعديل ${editing.name}` : "إضافة موظف جديد"} description="حدد الدور والصلاحيات. البريد وكلمة المرور تُستخدم للدخول." footer={<><button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>إلغاء</button><button type="submit" form="user-form" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : <ShieldCheck className="size-4" />} حفظ</button></>}>
        <form id="user-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="الاسم الكامل" required><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
          <Field label="المسمى الوظيفي"><input className="input" value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} /></Field>
          <Field label="البريد الإلكتروني" required><input type="email" dir="ltr" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></Field>
          <Field label="رقم الهاتف"><input dir="ltr" className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label={editing ? "كلمة مرور جديدة (اختياري)" : "كلمة المرور"} required={!editing}><input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} minLength={editing ? 0 : 6} required={!editing} /></Field>
          <Field label="الدور"><select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{Object.entries(ROLE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></Field>
          <Field label="الحالة"><select className="input" value={form.active} onChange={(e) => setForm({ ...form, active: Number(e.target.value) })}><option value={1}>نشط</option><option value={0}>موقوف</option></select></Field>
          <div className="sm:col-span-2">
            <p className="label">الصلاحيات الفعلية للموظف</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {PERMISSIONS.map((permission) => (
                <label key={permission.key} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2 text-[11px] font-semibold text-slate-700">
                  <input type="checkbox" checked={form.permissions.includes(permission.key)} onChange={(e) => setForm({ ...form, permissions: e.target.checked ? [...form.permissions, permission.key] : form.permissions.filter((value) => value !== permission.key) })} />
                  {permission.label}
                </label>
              ))}
            </div>
            <p className="mt-2 text-[10px] font-semibold text-teal-700">{form.role === "admin" ? "المدير يملك كل الصلاحيات دائماً." : form.permissions.length ? `المحدد فقط (${form.permissions.length}) هو المتاح؛ لا تُضاف إليه صلاحيات الدور.` : `لم تُحدد صلاحيات خاصة: ستطبق صلاحيات الدور الافتراضية (${(ROLE_PERMISSIONS[form.role] ?? []).length}).`}</p>
          </div>
          {error ? <div className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 sm:col-span-2">{error}</div> : null}
        </form>
      </Modal>

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="حذف الموظف" footer={<><button type="button" className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>إلغاء</button><button type="button" className="btn btn-danger" onClick={confirmDelete}><Trash2 className="size-4" /> حذف</button></>}>
        <p className="text-sm text-slate-600">سيتم حذف حساب «{deleteTarget?.name}» نهائياً مع جلساته.</p>
      </Modal>

      <p className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-400"><KeyRound className="size-3.5" /> كلمات المرور مشفّرة (scrypt) ولا يمكن استعراضها — يمكن إعادة تعيينها فقط.</p>
    </div>
  );
}
