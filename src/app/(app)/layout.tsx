import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { getNotificationFeed } from "@/lib/notification-feed";
import { providerStatus } from "@/lib/tracking";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const feed = await getNotificationFeed(user).catch(() => ({ count: 0, activityUnread: 0 }));
  const nafezaConfigured = Boolean(process.env.NAFEZA_TOKEN_URL && process.env.NAFEZA_DECLARATIONS_URL && process.env.NAFEZA_CLIENT_ID && process.env.NAFEZA_CLIENT_SECRET);
  const trackingConfigured = providerStatus().ready;
  return <AppShell user={user} alertsCount={feed.count} activityUnreadCount={feed.activityUnread} nafezaConfigured={nafezaConfigured} trackingConfigured={trackingConfigured}>{children}</AppShell>;
}
