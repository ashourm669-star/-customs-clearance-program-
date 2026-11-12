import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { getAlerts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const alerts = await getAlerts().catch(() => []);
  return <AppShell user={user} alertsCount={alerts.length}>{children}</AppShell>;
}
