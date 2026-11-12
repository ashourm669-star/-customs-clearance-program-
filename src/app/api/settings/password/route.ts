import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { asString, getApiUser, jsonError, unauthorized } from "@/lib/api";
import { hashPassword, verifyPassword } from "@/lib/password";

export async function POST(request: Request) {
  const sessionUser = await getApiUser();
  if (!sessionUser) return unauthorized();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("بيانات غير صالحة.");
  }
  const payload = body as Record<string, unknown>;
  const currentPassword = asString(payload.currentPassword);
  const newPassword = asString(payload.newPassword);
  if (newPassword.length < 6) return jsonError("كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل.");

  const rows = await db.select().from(users).where(eq(users.id, sessionUser.id)).limit(1);
  const user = rows[0];
  if (!user) return unauthorized();
  if (!verifyPassword(currentPassword, user.passwordHash)) return jsonError("كلمة المرور الحالية غير صحيحة.", 401);

  await db.update(users).set({ passwordHash: hashPassword(newPassword) }).where(eq(users.id, user.id));
  return Response.json({ ok: true });
}
