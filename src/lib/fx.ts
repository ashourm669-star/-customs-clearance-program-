import { db } from "@/db";
import { exchangeRates } from "@/db/schema";
import { sql } from "drizzle-orm";

let lastAttempt = 0;
let inFlight: Promise<void> | null = null;

export async function refreshExchangeRates(force = false): Promise<void> {
  if (!force && Date.now() - lastAttempt < 15 * 60_000) return;
  if (inFlight) return inFlight;
  lastAttempt = Date.now();
  inFlight = (async () => {
    try {
      const response = await fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(10_000), cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json() as { result?: string; rates?: Record<string, number>; time_last_update_utc?: string };
      if (data.result !== "success" || !data.rates) return;
      const updatedAt = data.time_last_update_utc ? new Date(data.time_last_update_utc) : new Date();
      const validDate = Number.isNaN(updatedAt.getTime()) ? new Date() : updatedAt;
      for (const [currency, rate] of Object.entries(data.rates)) {
        if (!/^[A-Z]{3}$/.test(currency) || !Number.isFinite(rate) || rate <= 0) continue;
        await db.insert(exchangeRates).values({ currency, rate, source: "ExchangeRate-API", updatedAt: validDate }).onConflictDoUpdate({
          target: exchangeRates.currency,
          set: { previousRate: sql`${exchangeRates.rate}`, rate, source: "ExchangeRate-API", updatedAt: validDate },
        });
      }
    } catch (error) {
      console.warn("[fx] provider unavailable", error instanceof Error ? error.message : error);
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export async function getExchangeRates() {
  await refreshExchangeRates();
  const rows = await db.select().from(exchangeRates);
  return rows.map((row) => ({ currency: row.currency, rate: Number(row.rate), previousRate: row.previousRate === null ? null : Number(row.previousRate), source: row.source, updatedAt: row.updatedAt.toISOString() }));
}
