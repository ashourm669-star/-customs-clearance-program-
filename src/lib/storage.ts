import { sql } from "drizzle-orm";
import { db } from "@/db";

export type StorageTable = { table: string; label: string; rows: number; size: string };

export type StorageStats = {
  database: string;
  host: string;
  port: string;
  engine: string;
  totalSize: string;
  tables: StorageTable[];
  lastWrite: string | null;
};

const TABLE_LABELS: Record<string, string> = {
  users: "المستخدمون والصلاحيات",
  sessions: "جلسات الدخول",
  clients: "العملاء",
  carriers: "شركات الطيران والملاحة",
  shipments: "ملفات التخليص",
  shipment_events: "سجل التتبع والتحركات",
  documents: "المستندات",
  invoices: "الفواتير والتحصيل",
  integration_logs: "سجل التكامل ونافذة",
};

export async function getStorageStats(): Promise<StorageStats> {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  let host = "127.0.0.1";
  let port = "5432";
  try {
    const parsed = new URL(databaseUrl);
    host = parsed.hostname;
    port = parsed.port || "5432";
  } catch {
    // ignore malformed URL and keep defaults
  }

  try {
    const info = await db.execute<{ database: string; engine: string; size: string }>(sql`
      select current_database() as database,
             version() as engine,
             pg_size_pretty(pg_database_size(current_database())) as size
    `);
    const tables = await db.execute<{ table: string; rows: number; size: string }>(sql`
      select relname as table,
             n_live_tup::int as rows,
             pg_size_pretty(pg_total_relation_size(relid)) as size
      from pg_stat_user_tables
      order by n_live_tup desc
    `);
    const lastWrite = await db.execute<{ last_write: string | null }>(sql`
      select to_char(greatest(
        (select coalesce(max(created_at), now()) from shipments),
        (select coalesce(max(created_at), now()) from invoices),
        (select coalesce(max(created_at), now()) from shipment_events)
      ), 'YYYY-MM-DD HH24:MI') as last_write
    `);

    const first = info.rows[0];
    return {
      database: first?.database ?? "app_db",
      host,
      port,
      engine: first?.engine ?? "PostgreSQL",
      totalSize: first?.size ?? "—",
      lastWrite: lastWrite.rows[0]?.last_write ?? null,
      tables: tables.rows.map((row) => ({
        table: row.table,
        label: TABLE_LABELS[row.table] ?? row.table,
        rows: Number(row.rows ?? 0),
        size: row.size,
      })),
    };
  } catch (error) {
    console.error("[storage] stats failed:", error);
    return {
      database: "app_db",
      host,
      port,
      engine: "PostgreSQL",
      totalSize: "—",
      tables: [],
      lastWrite: null,
    };
  }
}
