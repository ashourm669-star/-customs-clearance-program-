import { sql } from "drizzle-orm";
import { db } from "@/db";
import { SCHEMA_STATEMENTS } from "@/lib/schema-ddl";

/**
 * Bootstraps the schema on a fresh / hosted PostgreSQL database.
 * Safe to call on every cold start: the tables are created only once and
 * duplicate-object errors from concurrent bootstraps are ignored.
 */
const DUPLICATE_CODES = new Set(["42P07", "42710", "42701", "42P16", "23505"]);

async function tableExists(): Promise<boolean> {
  const result = await db.execute<{ exists: string | null }>(sql`select to_regclass('public.users')::text as exists`);
  return Boolean(result.rows[0]?.exists);
}

async function run(): Promise<void> {
  if (await tableExists()) return;
  console.log("[db] empty database detected — creating schema");
  for (const statement of SCHEMA_STATEMENTS) {
    try {
      await db.execute(sql.raw(statement));
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code && DUPLICATE_CODES.has(code)) continue;
      console.error("[db] bootstrap statement failed", code, statement.slice(0, 80));
      throw error;
    }
  }
  console.log("[db] schema ready");
}

const globalForBootstrap = globalThis as typeof globalThis & { __alarabiSchemaPromise?: Promise<void> };

export function ensureSchema(): Promise<void> {
  if (!globalForBootstrap.__alarabiSchemaPromise) {
    globalForBootstrap.__alarabiSchemaPromise = run().catch((error) => {
      globalForBootstrap.__alarabiSchemaPromise = undefined;
      throw error;
    });
  }
  return globalForBootstrap.__alarabiSchemaPromise;
}
