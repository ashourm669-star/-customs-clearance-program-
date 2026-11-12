import { cookies, headers } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";

export const SESSION_COOKIE = "alarabi_session";
const SESSION_DAYS = 14;

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  active: boolean;
  createdAt: string;
};

/** Returns every available session token: bearer header first, cookie second. */
export async function sessionTokens(): Promise<string[]> {
  const headerList = await headers();
  const auth = headerList.get("authorization");
  const bearer = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const explicit = headerList.get("x-session-token") ?? "";
  const store = await cookies();
  const cookieToken = store.get(SESSION_COOKIE)?.value ?? "";
  return [...new Set([bearer, explicit, cookieToken].filter(Boolean))];
}

export async function readToken(): Promise<string | null> {
  return (await sessionTokens())[0] ?? null;
}

export async function createSession(userId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ token, userId, expiresAt });
  const store = await cookies();
  const production = process.env.NODE_ENV === "production";
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // SameSite=None keeps the session usable when the preview is embedded in an iframe.
    sameSite: production ? "none" : "lax",
    secure: production,
    partitioned: production,
    path: "/",
    expires: expiresAt,
  });
  return token;
}

export async function destroySession() {
  for (const token of await sessionTokens()) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const tokens = await sessionTokens();
  for (const token of tokens) {
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        phone: users.phone,
        active: users.active,
        createdAt: users.createdAt,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
      .limit(1);
    const row = rows[0];
    if (!row || !row.active) continue;
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      phone: row.phone,
      active: row.active,
      createdAt: row.createdAt.toISOString(),
    };
  }
  return null;
}

/** Used only by API routes: returns null instead of redirecting. */
export async function requireApiUser(): Promise<SessionUser | null> {
  return getSession();
}
