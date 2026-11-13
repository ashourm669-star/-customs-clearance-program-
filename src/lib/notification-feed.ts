import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { changeNotifications, notificationReads } from "@/db/schema";
import { getAlerts } from "@/lib/queries";

// The database trigger records every actual row change, including changes made by
// different API routes. It never stores passwords, API keys, or document bytes.
const TABLES = [
  "shipments", "clients", "carriers", "documents", "invoices", "users",
  "banks", "contracts", "shipment_items", "tariff_codes", "commercial_invoices",
  "app_settings", "integration_logs", "shipment_events",
] as const;

const CREATE_FUNCTION = `
CREATE OR REPLACE FUNCTION alarabi_record_change() RETURNS trigger AS $fn$
DECLARE
  current_row jsonb;
  previous_row jsonb;
  changed text[] := ARRAY[]::text[];
  display_name text;
BEGIN
  IF TG_OP = 'DELETE' THEN current_row := to_jsonb(OLD);
  ELSE current_row := to_jsonb(NEW);
  END IF;

  IF TG_TABLE_NAME = 'app_settings' AND (current_row->>'key') IN
    ('business_identity_2026_11_v1','integration_truth_2026_11_v1','company_placeholder_cleanup_v1') THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    previous_row := to_jsonb(OLD);
    SELECT coalesce(array_agg(field ORDER BY field), ARRAY[]::text[]) INTO changed
    FROM jsonb_object_keys(current_row) AS field
    WHERE current_row->field IS DISTINCT FROM previous_row->field
      AND field NOT IN ('password_hash','api_key','api_secret','data_base64',
                        'updated_at','last_sync_at','shipments_synced');
    IF current_row->'password_hash' IS DISTINCT FROM previous_row->'password_hash' THEN
      changed := array_append(changed, 'password_changed');
    END IF;
    IF current_row->'api_key' IS DISTINCT FROM previous_row->'api_key' THEN
      changed := array_append(changed, 'api_key_changed');
    END IF;
    IF coalesce(array_length(changed, 1), 0) = 0 THEN RETURN NEW; END IF;
  END IF;

  display_name := coalesce(
    nullif(current_row->>'reference',''), nullif(current_row->>'number',''),
    nullif(current_row->>'name',''), nullif(current_row->>'name_ar',''),
    nullif(current_row->>'title',''), nullif(current_row->>'code',''),
    nullif(current_row->>'email',''), nullif(current_row->>'key',''),
    'رقم ' || coalesce(current_row->>'id', current_row->>'document_id', '—')
  );
  INSERT INTO change_notifications(entity, entity_ref, operation, label, changed_fields)
  VALUES (TG_TABLE_NAME, coalesce(current_row->>'id', current_row->>'key', current_row->>'currency'),
          TG_OP, left(display_name, 180), changed);
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$fn$ LANGUAGE plpgsql;
`;

let ready: Promise<void> | undefined;
export function ensureNotificationTracking(): Promise<void> {
  if (!ready) ready = (async () => {
    await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS change_notifications (
      id serial PRIMARY KEY, entity text NOT NULL, entity_ref text, operation text NOT NULL,
      label text NOT NULL, changed_fields text[] NOT NULL DEFAULT '{}',
      created_at timestamptz NOT NULL DEFAULT now()
    )`));
    await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS notification_reads (
      user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      notification_id integer NOT NULL REFERENCES change_notifications(id) ON DELETE CASCADE,
      read_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id, notification_id)
    )`));
    await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS change_notifications_recent_idx ON change_notifications(id DESC)`));
    await db.execute(sql.raw(CREATE_FUNCTION));
    for (const table of TABLES) {
      const name = `alarabi_notify_${table}`;
      const statement = `DO $block$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = '${name}' AND tgrelid = 'public.${table}'::regclass) THEN
          CREATE TRIGGER ${name} AFTER INSERT OR UPDATE OR DELETE ON ${table}
          FOR EACH ROW EXECUTE FUNCTION alarabi_record_change();
        END IF;
      END $block$`;
      try { await db.execute(sql.raw(statement)); }
      catch (error) {
        // Another serverless instance can install the same trigger concurrently.
        if ((error as { code?: string }).code !== "42710") throw error;
      }
    }
  })().catch((error) => { ready = undefined; throw error; });
  return ready;
}

export type ActivityNotice = {
  id: number;
  entity: string;
  entityRef: string | null;
  operation: string;
  label: string;
  changedFields: string[];
  createdAt: string;
  read: boolean;
};

export async function getNotificationFeed(userId: number) {
  await ensureNotificationTracking();
  const [workAlerts, rows, unreadRows] = await Promise.all([
    getAlerts(),
    db.select({
      id: changeNotifications.id,
      entity: changeNotifications.entity,
      entityRef: changeNotifications.entityRef,
      operation: changeNotifications.operation,
      label: changeNotifications.label,
      changedFields: changeNotifications.changedFields,
      createdAt: changeNotifications.createdAt,
      readAt: notificationReads.readAt,
    }).from(changeNotifications).leftJoin(notificationReads,
      and(eq(notificationReads.notificationId, changeNotifications.id), eq(notificationReads.userId, userId)))
      .orderBy(desc(changeNotifications.id)).limit(100),
    db.select({ total: count() }).from(changeNotifications).leftJoin(notificationReads,
      and(eq(notificationReads.notificationId, changeNotifications.id), eq(notificationReads.userId, userId)))
      .where(isNull(notificationReads.notificationId)),
  ]);
  const activities: ActivityNotice[] = rows.map((row) => ({
    id: row.id, entity: row.entity, entityRef: row.entityRef, operation: row.operation,
    label: row.label, changedFields: row.changedFields ?? [],
    createdAt: row.createdAt.toISOString(), read: Boolean(row.readAt),
  }));
  const activityUnread = Number(unreadRows[0]?.total ?? 0);
  return {
    alerts: workAlerts,
    activities,
    activityUnread,
    workCount: workAlerts.length,
    count: activityUnread + workAlerts.length,
  };
}

export async function markNotificationsRead(userId: number, ids?: number[]) {
  await ensureNotificationTracking();
  const clean = [...new Set((ids ?? []).filter((id) => Number.isSafeInteger(id) && id > 0))].slice(0, 200);
  if (ids === undefined) {
    await db.execute(sql`
      INSERT INTO notification_reads (user_id, notification_id)
      SELECT ${userId}, id FROM change_notifications ON CONFLICT DO NOTHING
    `);
  } else if (clean.length) {
    await db.insert(notificationReads).values(clean.map((notificationId) => ({ userId, notificationId })))
      .onConflictDoNothing();
  }
}
