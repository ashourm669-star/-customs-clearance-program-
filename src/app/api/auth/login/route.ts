import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { asString, jsonError } from "@/lib/api";
import { verifyPassword } from "@/lib/password";
import { ensureSeeded } from "@/lib/seed";

function redirectTo(_request: Request, path: string) {
  // Use a relative Location so the browser stays on the public origin
  // (absolute URLs built from request.url would expose the internal proxy host).
  const safePath = path.startsWith("/") ? path : `/${path}`;
  return new Response(null, { status: 303, headers: { Location: safePath, "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
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

  const email = asString(payload.email).toLowerCase();
  const password = asString(payload.password);
  const next = asString(payload.next) || "/dashboard";

  const fail = (message: string, status = 401) =>
    isForm ? redirectTo(request, `/login?error=${encodeURIComponent(message)}`) : jsonError(message, status);

  if (!email || !password) return fail("يرجى إدخال البريد الإلكتروني وكلمة المرور.", 400);

  const found = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = found[0];
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return fail("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
  }

  await createSession(user.id);

  if (isForm) return redirectTo(request, next.startsWith("/") ? next : "/dashboard");

  return Response.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}
