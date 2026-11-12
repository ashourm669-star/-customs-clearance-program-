import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureDatabase } from "@/lib/bootstrap";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    await ensureDatabase();
    return Response.json({ ok: true });
  } catch (error) {
    console.error("health error", error);
    return Response.json({ ok: false }, { status: 500 });
  }
}
