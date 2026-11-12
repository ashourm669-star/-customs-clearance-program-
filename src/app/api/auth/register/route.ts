import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { asString, jsonError } from "@/lib/api";
import { hashPassword } from "@/lib/password";
import { ensureSeeded } from "@/lib/seed";

const COLORS = ["#0f9d8b", "#6366f1", "#c9a227", "#0ea5e9", "#f43f5e", "#8b5cf6"];

function redirectTo(_request: Request, path: string) {
  // Use a relative Location so the browser stays on the public origin
  // (absolute URLs built from request.url would expose the internal proxy host).
  const safePath = path.startsWith("/") ? path : `/${path}`;
  return new Response(null, { status: 303, headers: { Location: safePath, "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return redirectTo(request, `/login?mode=register&error=${encodeURIComponent("لم يتم ربط قاعدة البيانات بعد. أضف DATABASE_URL في Vercel ثم أعد النشر.")}`);
  }
  await ensureSeeded();
  const contentType = request.headers.get("content-type") ?? "";
  const isForm = contentType.includes("form-urlencoded") || contentType.includes("multipart/form-data");

  let payload: Record<string, unknown> = {};
  if (isForm) {
    const form = await request.formData();
    payload = Object.fromEntries(form.entries());
  } else {
    try {
      payload = (await request.json()) as Record<string, unknown>;
    } catch {
      return jsonError("بيانات الطلب غير صالحة.");
    }
  }

  const name = asString(payload.name);
  const email = asString(payload.email).toLowerCase();
  const password = asString(payload.password);
  const jobTitle = asString(payload.jobTitle, "مخلص جمركي");

  const fail = (message: string, status = 400) =>
    isForm
      ? redirectTo(request, `/login?mode=register&error=${encodeURIComponent(message)}`)
      : jsonError(message, status);

  if (name.length < 3) return fail("الاسم يجب أن يكون 3 أحرف على الأقل.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("صيغة البريد الإلكتروني غير صحيحة.");
  if (password.length < 6) return fail("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length) return fail("هذا البريد الإلكتروني مسجّل بالفعل. جرّب تسجيل الدخول.", 409);

  const [created] = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash: hashPassword(password),
      jobTitle,
      role: "agent",
      avatarColor: COLORS[Math.floor(Math.random() * COLORS.length)],
    })
    .returning({ id: users.id, name: users.name, email: users.email, role: users.role });

  await createSession(created.id);

  if (isForm) return redirectTo(request, "/dashboard");
  return Response.json({ user: created }, { status: 201 });
}
