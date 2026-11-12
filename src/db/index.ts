import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const isLocal = /(^|@)(localhost|127\.0\.0\.1|::1)(:|\/)/.test(databaseUrl);
const hasSslParam = /[?&]sslmode=/i.test(databaseUrl);

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
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
