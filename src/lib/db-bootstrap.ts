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
  if (!(await tableExists())) {
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
  // Additive migrations for existing Neon databases; never remove user data.
  const upgrades = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '[]'::jsonb",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS active integer NOT NULL DEFAULT 1",
    "ALTER TABLE carriers ADD COLUMN IF NOT EXISTS provider_slug text",
    "ALTER TABLE carriers ADD COLUMN IF NOT EXISTS tracking_url text",
    "ALTER TABLE carriers ADD COLUMN IF NOT EXISTS api_key text",
    "ALTER TABLE carriers ADD COLUMN IF NOT EXISTS api_secret text",
    "ALTER TABLE carriers ADD COLUMN IF NOT EXISTS credential_note text",
    "CREATE TABLE IF NOT EXISTS app_settings (key text primary key, value text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())",
    "CREATE TABLE IF NOT EXISTS audit_logs (id serial primary key, user_id integer REFERENCES users(id) ON DELETE SET NULL, actor_name text, action text NOT NULL, entity text, entity_id integer, details text, created_at timestamptz NOT NULL DEFAULT now())",
    "CREATE TABLE IF NOT EXISTS document_blobs (document_id integer primary key REFERENCES documents(id) ON DELETE CASCADE, mime_type text NOT NULL, data_base64 text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())",
  ];
  for (const statement of upgrades) await db.execute(sql.raw(statement));
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
