import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { asString, getApiUser, jsonError, unauthorized } from "@/lib/api";
import { hashPassword } from "@/lib/password";
import { ALL_PERMISSIONS, ROLE_PERMISSIONS } from "@/lib/permissions";
import { listUsers } from "@/lib/queries";

export async function GET() {
  const actor = await getApiUser();
  if (!actor) return unauthorized();
  return Response.json({ users: await listUsers() });
}

export async function POST(request: Request) {
  const actor = await getApiUser();
  if (!actor) return unauthorized();
  if (actor.role !== "admin") return jsonError("إضافة الموظفين متاحة لمدير النظام فقط.", 403);
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError("بيانات غير صالحة."); }
  const p = body as Record<string, unknown>;
  const name = asString(p.name);
  const email = asString(p.email).toLowerCase();
  const password = asString(p.password);
  const role = asString(p.role, "agent");
  if (name.length < 3) return jsonError("الاسم يجب أن يكون 3 أحرف على الأقل.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return jsonError("صيغة البريد الإلكتروني غير صحيحة.");
  if (password.length < 6) return jsonError("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
  if (!ROLE_PERMISSIONS[role]) return jsonError("الدور الوظيفي غير صالح.");
  const exists = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (exists.length) return jsonError("هذا البريد مستخدم بالفعل.", 409);
  const permissions = Array.isArray(p.permissions)
    ? (p.permissions as unknown[]).map(String).filter((value) => ALL_PERMISSIONS.includes(value))
    : [];
  const [created] = await db.insert(users).values({
    name, email, passwordHash: hashPassword(password), role,
    jobTitle: asString(p.jobTitle, "مخلص جمركي"), phone: asString(p.phone) || null,
    permissions, avatarColor: asString(p.avatarColor, "#0f9d8b") || "#0f9d8b",
  }).returning({ id: users.id });
  await db.insert(auditLogs).values({ userId: actor.id, actorName: actor.name, action: "إضافة موظف", entity: "users", entityId: created.id, details: `${name} — ${role}` });
  return Response.json({ users: await listUsers() }, { status: 201 });
}
