import { eq } from "drizzle-orm";
import { db } from "@/db";
import { exchangeRates } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { ensureDatabase } from "@/lib/bootstrap";

export const dynamic = "force-dynamic";

const TRACKED = ["USD", "EUR", "GBP", "CNY", "SAR", "AED", "EGP"];

async function refreshRates() {
  const response = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("fx upstream failed");
  const json = await response.json() as { rates?: Record<string, number> };
  const usdToEgp = Number(json.rates?.EGP);
  if (!usdToEgp) throw new Error("EGP rate missing");
  const now = new Date();
  for (const currency of TRACKED) {
    const perUsd = currency === "USD" ? 1 : Number(json.rates?.[currency]);
    const rateToEgp = currency === "EGP" ? 1 : perUsd ? usdToEgp / perUsd : 0;
    if (!rateToEgp) continue;
    const existing = await db.select().from(exchangeRates).where(eq(exchangeRates.currency, currency)).limit(1);
    if (existing[0]) {
      await db.update(exchangeRates).set({ rateToEgp, source: "open.er-api.com", fetchedAt: now }).where(eq(exchangeRates.currency, currency));
    } else {
      await db.insert(exchangeRates).values({ currency, rateToEgp, source: "open.er-api.com", fetchedAt: now });
    }
  }
}

export async function GET(request: Request) {
  try {
    const user = await requireApiUser();
    if (!user) return Response.json({ error: "غير مصرح" }, { status: 401 });
    await ensureDatabase();
    const force = new URL(request.url).searchParams.get("refresh") === "1";
    const current = await db.select().from(exchangeRates);
    const newest = current.reduce((max, row) => Math.max(max, new Date(row.fetchedAt).getTime()), 0);
    const stale = Date.now() - newest > 60 * 60 * 1000;
    let live = false;
    let warning = "";
    if (force || stale || current.length === 0) {
      try { await refreshRates(); live = true; } catch (error) {
        warning = error instanceof Error ? error.message : "تعذر تحديث الأسعار، تُعرض آخر أسعار محفوظة";
      }
    }
    const rows = await db.select().from(exchangeRates);
    return Response.json({
      rates: Object.fromEntries(rows.map((row) => [row.currency, row.rateToEgp])),
      fetchedAt: rows[0]?.fetchedAt ?? null,
      source: live ? "open.er-api.com" : rows[0]?.source ?? "cache",
      live,
      warning,
    });
  } catch (error) {
    console.error("fx error", error);
    return Response.json({ error: "تعذر تحميل أسعار العملات" }, { status: 500 });
  }
}
