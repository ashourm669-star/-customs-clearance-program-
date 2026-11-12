import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { ensureDatabase } from "@/lib/bootstrap";
import { verifyPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await ensureDatabase();
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!email || !password) {
      return Response.json({ error: "يرجى إدخال البريد الإلكتروني وكلمة المرور" }, { status: 400 });
    }
    const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = rows[0];
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return Response.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
    }
    if (!user.active) {
      return Response.json({ error: "هذا الحساب غير مفعل، تواصل مع مدير النظام" }, { status: 403 });
    }
    const token = await createSession(user.id);
    return Response.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("login error", error);
    return Response.json({ error: "حدث خطأ أثناء تسجيل الدخول" }, { status: 500 });
  }
}
