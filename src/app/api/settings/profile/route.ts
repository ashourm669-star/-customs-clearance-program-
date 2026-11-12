import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { asOptionalString, asString, getApiUser, jsonError, unauthorized } from "@/lib/api";

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) return unauthorized();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("بيانات غير صالحة.");
  }
  const payload = body as Record<string, unknown>;
  const name = asString(payload.name);
  if (name.length < 3) return jsonError("الاسم يجب أن يكون 3 أحرف على الأقل.");
  // Normalize accidental spaces (for example "gmail. com") without requiring a password reset.
  const email = asString(payload.email).replace(/\s+/g, "").toLowerCase();
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return jsonError("صيغة البريد الإلكتروني غير صحيحة.");
  if (email && email !== user.email) {
    const duplicate = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (duplicate.length) return jsonError("هذا البريد مستخدم لحساب آخر.", 409);
  }

  const [updated] = await db
    .update(users)
    .set({
      name,
      ...(email ? { email } : {}),
      jobTitle: asOptionalString(payload.jobTitle),
      phone: asOptionalString(payload.phone),
      avatarColor: asString(payload.avatarColor, user.avatarColor) || user.avatarColor,
    })
    .where(eq(users.id, user.id))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      jobTitle: users.jobTitle,
      phone: users.phone,
      avatarColor: users.avatarColor,
    });

  return Response.json({ user: updated });
}
