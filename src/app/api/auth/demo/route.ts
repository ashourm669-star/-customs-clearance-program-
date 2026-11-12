import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { ensureSeeded, seedDemoData } from "@/lib/seed";

export const dynamic = "force-dynamic";

function redirectTo(_request: Request, path: string) {
  // Use a relative Location so the browser stays on the public origin
  // (absolute URLs built from request.url would expose the internal proxy host).
  const safePath = path.startsWith("/") ? path : `/${path}`;
  return new Response(null, { status: 303, headers: { Location: safePath, "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return redirectTo(request, `/login?error=${encodeURIComponent("قاعدة البيانات غير مربوطة. من Vercel: Storage ← Create Database ← Neon ثم Redeploy.")}`);
  }
  try {
    await ensureSeeded();
    let demo = (await db.select().from(users).where(eq(users.email, "admin@alarabi.com")).limit(1))[0];
    if (!demo) {
      await seedDemoData();
      demo = (await db.select().from(users).where(eq(users.email, "admin@alarabi.com")).limit(1))[0];
    }
    if (!demo) return redirectTo(request, "/login?error=" + encodeURIComponent("تعذّر تجهيز الحساب التجريبي."));
    await createSession(demo.id);
    return redirectTo(request, "/dashboard");
  } catch (error) {
    console.error("[demo-login]", error);
    return redirectTo(request, "/login?error=" + encodeURIComponent("تعذّر الاتصال بقاعدة البيانات. حاول مرة أخرى."));
  }
}
