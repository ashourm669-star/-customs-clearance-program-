import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/auth";
import { ensureDatabase } from "@/lib/bootstrap";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await ensureDatabase();
  // The shell is rendered even without a cookie: the client authenticates with a
  // bearer token (stored locally) so the app also works inside embedded previews.
  const user = (await getSession()) ?? {
    id: 0, name: "جاري التحميل", email: "", role: "guest", phone: null, active: true,
    createdAt: new Date().toISOString(),
  };
  return <AppShell user={user}>{children}</AppShell>;
}
