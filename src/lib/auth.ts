import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { ensureSeeded } from "@/lib/seed";

export const SESSION_COOKIE = "alarabi_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  jobTitle: string | null;
  phone: string | null;
  avatarColor: string;
};

async function isSecureRequest() {
  try {
    const store = await headers();
    const proto = (store.get("x-forwarded-proto") ?? "").split(",")[0]?.trim().toLowerCase();
    return proto === "https";
  } catch {
    return false;
  }
}

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ token, userId, expiresAt });
  const secure = await isSecureRequest();
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: secure ? "none" : "lax",
    secure,
    path: "/",
    expires: expiresAt,
  });
  return token;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    await ensureSeeded();
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        jobTitle: users.jobTitle,
        phone: users.phone,
        avatarColor: users.avatarColor,
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
      .limit(1);

    return rows[0] ?? null;
  } catch (error) {
    console.error("[auth] session lookup failed:", error);
    return null;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?expired=1");
  return user;
}

export const ROLE_LABELS: Record<string, string> = {
  admin: "مدير النظام",
  manager: "مدير تشغيل",
  agent: "مخلص جمركي",
};
