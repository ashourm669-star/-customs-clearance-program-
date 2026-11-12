import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { asNumber, asString, getApiUser, jsonError, notFound, unauthorized } from "@/lib/api";
import { hashPassword } from "@/lib/password";
import { ALL_PERMISSIONS, ROLE_PERMISSIONS } from "@/lib/permissions";
import { listUsers } from "@/lib/queries";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const actor = await getApiUser();
  if (!actor) return unauthorized();
  if (actor.role !== "admin") return jsonError("تعديل الموظفين متاح لمدير النظام فقط.", 403);
  const { id } = await params;
  const userId = Number(id);
  const rows = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  if (!rows.length) return notFound("المستخدم");
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError("بيانات غير صالحة."); }
  const p = body as Record<string, unknown>;
  const email = asString(p.email).toLowerCase();
  if (email && email !== rows[0].email) {
    const duplicate = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (duplicate.length) return jsonError("البريد مستخدم لمستخدم آخر.", 409);
  }
  const role = asString(p.role);
  const password = asString(p.password);
  await db.update(users).set({
    ...(p.name !== undefined ? { name: asString(p.name) } : {}),
    ...(email ? { email } : {}),
    ...(role && ROLE_PERMISSIONS[role] ? { role } : {}),
    ...(p.jobTitle !== undefined ? { jobTitle: asString(p.jobTitle) } : {}),
    ...(p.phone !== undefined ? { phone: asString(p.phone) || null } : {}),
    ...(Array.isArray(p.permissions) ? { permissions: (p.permissions as unknown[]).map(String).filter((value) => ALL_PERMISSIONS.includes(value)) } : {}),
    ...(p.active !== undefined ? { active: asNumber(p.active, 1) ? 1 : 0 } : {}),
    ...(password.length >= 6 ? { passwordHash: hashPassword(password) } : {}),
  }).where(eq(users.id, userId));
  await db.insert(auditLogs).values({ userId: actor.id, actorName: actor.name, action: "تعديل موظف", entity: "users", entityId: userId, details: password ? "بيانات + كلمة مرور" : "بيانات" });
  return Response.json({ users: await listUsers() });
}

export async function DELETE(_request: Request, { params }: Params) {
  const actor = await getApiUser();
  if (!actor) return unauthorized();
  if (actor.role !== "admin") return jsonError("حذف الموظفين متاح لمدير النظام فقط.", 403);
  const { id } = await params;
  const userId = Number(id);
  if (userId === actor.id) return jsonError("لا يمكنك حذف حسابك الحالي.");
  await db.delete(users).where(eq(users.id, userId));
  await db.insert(auditLogs).values({ userId: actor.id, actorName: actor.name, action: "حذف موظف", entity: "users", entityId: userId });
  return Response.json({ users: await listUsers() });
}
