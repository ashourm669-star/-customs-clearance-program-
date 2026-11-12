import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { getAlerts } from "@/lib/queries";
import { readProviderConfig } from "@/lib/dcsa";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const alerts = await getAlerts().catch(() => []);
  const nafezaConfigured = Boolean(process.env.NAFEZA_TOKEN_URL && process.env.NAFEZA_DECLARATIONS_URL && process.env.NAFEZA_CLIENT_ID && process.env.NAFEZA_CLIENT_SECRET);
  const trackingConfigured = readProviderConfig().kind !== "unconfigured";
  return <AppShell user={user} alertsCount={alerts.length} nafezaConfigured={nafezaConfigured} trackingConfigured={trackingConfigured}>{children}</AppShell>;
}
