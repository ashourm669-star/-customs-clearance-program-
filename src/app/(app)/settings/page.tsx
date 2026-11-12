import { count } from "drizzle-orm";
import { db } from "@/db";
import { carriers, clients, documents, invoices, shipments, users } from "@/db/schema";
import { requireUser, ROLE_LABELS } from "@/lib/auth";
import { getStorageStats } from "@/lib/storage";
import { getAppSettings } from "@/lib/queries";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  const [shipmentCount, clientCount, carrierCount, invoiceCount, documentCount, userCount, storage, company] = await Promise.all([
    db.select({ total: count() }).from(shipments),
    db.select({ total: count() }).from(clients),
    db.select({ total: count() }).from(carriers),
    db.select({ total: count() }).from(invoices),
    db.select({ total: count() }).from(documents),
    db.select({ total: count() }).from(users),
    getStorageStats(),
    getAppSettings(),
  ]);

  return (
    <SettingsClient
      user={user}
      roleLabel={ROLE_LABELS[user.role] ?? user.role}
      storage={storage}
      company={company}
      stats={{
        shipments: Number(shipmentCount[0]?.total ?? 0),
        clients: Number(clientCount[0]?.total ?? 0),
        carriers: Number(carrierCount[0]?.total ?? 0),
        invoices: Number(invoiceCount[0]?.total ?? 0),
        documents: Number(documentCount[0]?.total ?? 0),
        users: Number(userCount[0]?.total ?? 0),
      }}
    />
  );
}
