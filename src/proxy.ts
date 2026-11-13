import { and, eq, gt } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { canAccessPath, firstAllowedPath, permissionForPath } from "@/lib/access";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const permission = permissionForPath(path);
  if (!permission) return NextResponse.next();

  const isApi = path.startsWith("/api/");
  const token = request.cookies.get("alarabi_session")?.value;
  if (!token) {
    return isApi ? NextResponse.json({ error: "يجب تسجيل الدخول." }, { status: 401 })
      : NextResponse.redirect(new URL("/login?expired=1", request.url));
  }
  try {
    const [actor] = await db.select({
      role: users.role, permissions: users.permissions, active: users.active,
    }).from(sessions).innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date()))).limit(1);
    if (!actor || actor.active !== 1) {
      return isApi ? NextResponse.json({ error: "جلسة غير صالحة أو حساب موقوف." }, { status: 401 })
        : NextResponse.redirect(new URL("/login?expired=1", request.url));
    }
    if (!canAccessPath(actor, path)) {
      return isApi ? NextResponse.json({ error: "ليس لديك صلاحية لهذا القسم." }, { status: 403 })
        : NextResponse.redirect(new URL(firstAllowedPath(actor), request.url));
    }
    return NextResponse.next();
  } catch (error) {
    console.error("[permission-proxy]", error);
    return isApi ? NextResponse.json({ error: "تعذّر التحقق من الصلاحيات." }, { status: 503 })
      : NextResponse.redirect(new URL("/login?expired=1", request.url));
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*", "/shipments/:path*", "/tracking/:path*", "/customs/:path*",
    "/documents/:path*", "/invoices/:path*", "/clients/:path*", "/carriers/:path*",
    "/integrations/:path*", "/reports/:path*", "/users/:path*",
    "/api/:path*",
  ],
};
