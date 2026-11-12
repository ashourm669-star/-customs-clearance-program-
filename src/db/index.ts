import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

// Do not crash the whole build/preview when the database is not configured yet:
// the app must be deployable first, then connected to a PostgreSQL instance.
if (!databaseUrl) {
  console.error("[db] DATABASE_URL is not set — add it in the hosting environment variables.");
}

const connectionString = databaseUrl ?? "postgresql://postgres:postgres@127.0.0.1:5432/app_db";

const isLocal = /(^|@)(localhost|127\.0\.0\.1|::1)(:|\/)/.test(connectionString);
const hasSslParam = /[?&]sslmode=/i.test(connectionString);

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString,
    max: Number(process.env.PGPOOL_MAX ?? (isLocal ? 10 : 5)),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
    // Hosted providers (Neon, Supabase, Railway, Render, RDS) require TLS.
    ...(hasSslParam || isLocal ? {} : { ssl: { rejectUnauthorized: false } }),
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

pool.on("error", (error) => {
  console.error("[db] idle client error", error.message);
});

export const db = drizzle(pool);
