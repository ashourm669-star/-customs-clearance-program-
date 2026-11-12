import { db } from "@/db";
import { tariffItems } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { ensureDatabase } from "@/lib/bootstrap";
import { logActivity } from "@/lib/resources";

export const dynamic = "force-dynamic";

type Incoming = Record<string, unknown>;

function text(row: Incoming, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
  }
  return "";
}
function num(row: Incoming, keys: string[], fallback = 0) {
  const raw = text(row, keys).replace(/,/g, "");
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    if (!user) return Response.json({ error: "غير مصرح" }, { status: 401 });
    await ensureDatabase();
    const body = await request.json();
    const items = Array.isArray(body.items) ? body.items as Incoming[] : [];
    if (!items.length) return Response.json({ error: "الملف لا يحتوي بنوداً" }, { status: 400 });
    let saved = 0;
    for (const row of items.slice(0, 5000)) {
      const hsCode = text(row, ["hsCode", "hs_code", "HS", "البند", "بند", "كود"]);
      const nameAr = text(row, ["nameAr", "name_ar", "الصنف", "الاسم", "البيان", "description"]);
      if (!hsCode || !nameAr) continue;
      const payload = {
        hsCode,
        chapter: text(row, ["chapter", "الفصل"]) || hsCode.slice(0, 2),
        nameAr,
        nameEn: text(row, ["nameEn", "name_en", "english", "English"]),
        dutyRate: num(row, ["dutyRate", "duty", "فئة", "الرسم", "duty_rate"]),
        vatRate: num(row, ["vatRate", "vat", "ضريبة", "vat_rate"], 14),
        tableTaxRate: num(row, ["tableTaxRate", "table", "جدول"]),
        developmentRate: num(row, ["developmentRate", "development", "تنمية"]),
        importStatus: text(row, ["importStatus", "status", "الحالة"]) || "allowed",
        importConditions: text(row, ["importConditions", "conditions", "الشروط"]),
        authorities: text(row, ["authorities", "الجهات", "رقابية"]),
        unit: text(row, ["unit", "الوحدة"]) || "عدد",
        notes: text(row, ["notes", "ملاحظات"]) || "مستورد من ملف Excel",
      };
      await db.insert(tariffItems).values(payload).onConflictDoUpdate({
        target: tariffItems.hsCode,
        set: payload,
      });
      saved += 1;
    }
    await logActivity("update", "tariffItems", "IMPORT", `استيراد ${saved} بند جمركي من Excel`, user.name);
    return Response.json({ saved });
  } catch (error) {
    console.error("tariff import", error);
    return Response.json({ error: "تعذر استيراد ملف التعريفة" }, { status: 500 });
  }
}
