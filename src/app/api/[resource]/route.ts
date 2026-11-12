import { eq } from "drizzle-orm";
import { db } from "@/db";
import { requireApiUser } from "@/lib/auth";
import { ensureDatabase } from "@/lib/bootstrap";
import { isResourceKey, logActivity, resourceConfig, sanitize } from "@/lib/resources";
import { RESOURCE_NAMES } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ resource: string }> };
type Row = Record<string, any>;

async function guard(resource: string) {
  const user = await requireApiUser();
  if (!user) return { user: null, error: Response.json({ error: "غير مصرح" }, { status: 401 }) };
  if (!isResourceKey(resource)) {
    return { user, error: Response.json({ error: "مورد غير معروف" }, { status: 404 }) };
  }
  if (resource === "users" && user.role !== "admin") {
    return { user, error: Response.json({ error: "هذه العملية متاحة لمدير النظام فقط" }, { status: 403 }) };
  }
  return { user, error: null };
}

function publicItem(resource: string, item: Row | undefined): Row | undefined {
  if (!item) return item;
  if (resource === "users") {
    const { passwordHash: _hidden, ...safe } = item;
    void _hidden;
    return safe;
  }
  if (resource === "carrierConnections") {
    return { ...item, apiKey: item.apiKey ? "********" : null };
  }
  return item;
}

function validate(payload: Row, required: string[]) {
  for (const key of required) {
    if (payload[key] === undefined || payload[key] === null || payload[key] === "") {
      return `يرجى استكمال البيانات المطلوبة قبل الحفظ`;
    }
  }
  return null;
}

export async function POST(request: Request, context: Context) {
  const { resource } = await context.params;
  const { user, error } = await guard(resource);
  if (error || !user) return error;
  try {
    await ensureDatabase();
    const config = resourceConfig[resource as keyof typeof resourceConfig];
    const body = await request.json();
    const payload = sanitize(config, body, "create");
    const invalid = validate(payload, config.required);
    if (invalid) return Response.json({ error: invalid }, { status: 400 });
    const inserted = (await db.insert(config.table).values(payload).returning()) as Row[];
    const item = inserted[0];
    await logActivity(
      "create",
      resource,
      String(payload[config.labelField] ?? item?.id ?? ""),
      `إضافة ${RESOURCE_NAMES[resource] ?? resource} جديدة`,
      user.name,
    );
    return Response.json({ item: publicItem(resource, item) }, { status: 201 });
  } catch (err) {
    console.error("create error", err);
    return Response.json({ error: "تعذر حفظ البيانات، تأكد من عدم تكرار الكود أو البريد" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: Context) {
  const { resource } = await context.params;
  const { user, error } = await guard(resource);
  if (error || !user) return error;
  try {
    await ensureDatabase();
    const config = resourceConfig[resource as keyof typeof resourceConfig];
    const body = await request.json();
    const rawId = body.id ?? new URL(request.url).searchParams.get("id");
    const id = rawId === null || rawId === "" ? Number.NaN : Number(rawId);
    if (!Number.isFinite(id)) return Response.json({ error: "معرّف غير صالح" }, { status: 400 });
    const { id: _ignored, ...rest } = body;
    void _ignored;
    const payload = sanitize(config, rest, "update");
    if (resource === "shipments") payload.updatedAt = new Date();
    if (Object.keys(payload).length === 0) return Response.json({ error: "لا توجد بيانات للتحديث" }, { status: 400 });
    const updated = (await db.update(config.table).set(payload).where(eq(config.table.id, id)).returning()) as Row[];
    if (!updated.length) return Response.json({ error: "السجل غير موجود" }, { status: 404 });
    await logActivity(
      "update",
      resource,
      String(payload[config.labelField] ?? updated[0][config.labelField] ?? id),
      `تعديل بيانات ${RESOURCE_NAMES[resource] ?? resource}`,
      user.name,
    );
    return Response.json({ item: publicItem(resource, updated[0]) });
  } catch (err) {
    console.error("update error", err);
    return Response.json({ error: "تعذر تحديث البيانات" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: Context) {
  const { resource } = await context.params;
  const { user, error } = await guard(resource);
  if (error || !user) return error;
  try {
    await ensureDatabase();
    const config = resourceConfig[resource as keyof typeof resourceConfig];
    const url = new URL(request.url);
    const rawId = url.searchParams.get("id");
    let id = rawId !== null ? Number(rawId) : Number.NaN;
    if (!Number.isFinite(id)) {
      try {
        const body = await request.json();
        id = Number(body.id);
      } catch {
        // no body provided
      }
    }
    if (!Number.isFinite(id)) return Response.json({ error: "معرّف غير صالح" }, { status: 400 });
    if (config.cascade) await config.cascade(id);
    const deleted = (await db.delete(config.table).where(eq(config.table.id, id)).returning()) as Row[];
    if (!deleted.length) return Response.json({ error: "السجل غير موجود" }, { status: 404 });
    await logActivity(
      "delete",
      resource,
      String(deleted[0][config.labelField] ?? id),
      `حذف ${RESOURCE_NAMES[resource] ?? resource}`,
      user.name,
    );
    return Response.json({ ok: true, item: publicItem(resource, deleted[0]) });
  } catch (err) {
    console.error("delete error", err);
    return Response.json({ error: "تعذر حذف السجل" }, { status: 500 });
  }
}
