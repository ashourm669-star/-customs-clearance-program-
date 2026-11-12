import { sql } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/lib/db-bootstrap";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return Response.json({ ok: false, database: "not_configured", hint: "أضف DATABASE_URL في متغيرات البيئة" }, { status: 503 });
  }
  try {
    await db.execute(sql`select 1`);
    await ensureSchema();
    return Response.json({ ok: true, database: "connected" });
  } catch (error) {
    console.error("[health]", error);
    return Response.json({ ok: false, database: "error" }, { status: 500 });
  }
}
