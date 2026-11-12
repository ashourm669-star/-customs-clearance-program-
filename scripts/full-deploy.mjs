#!/usr/bin/env node
/**
 * نشر كامل تلقائي: ينشئ قاعدة Neon (اختياري) + يضبط DATABASE_URL على Vercel + يعيد النشر + يتحقق.
 *
 * المتغيرات المطلوبة في بيئة التشغيل:
 *   VERCEL_TOKEN        (إلزامي)  https://vercel.com/account/tokens  → Full Account
 *   NEON_API_KEY        (اختياري) https://console.neon.tech/app/settings/api-keys → ينشئ قاعدة جديدة
 *   DATABASE_URL        (بديل)    رابط PostgreSQL جاهز
 *   VERCEL_PROJECT      (اختياري) اسم مشروع Vercel — افتراضي: customs-clearance-program
 *   VERCEL_TEAM_SLUG    (اختياري) مثل: customs-clarence
 */
const token = process.env.VERCEL_TOKEN;
const neonKey = process.env.NEON_API_KEY;
let databaseUrl = process.env.DATABASE_URL?.trim();
const projectName = process.env.VERCEL_PROJECT ?? "customs-clearance-program";
const teamSlug = process.env.VERCEL_TEAM_SLUG ?? null;

const die = (message, hint) => {
  console.error(`\n✖ ${message}`);
  if (hint) console.error(`  ${hint}`);
  process.exit(1);
};

if (!token) die("VERCEL_TOKEN غير موجود.", "أنشئه من https://vercel.com/account/tokens (Full Account).");

// ── 1) قاعدة البيانات ────────────────────────────────────────────────
if ((!databaseUrl || /localhost|127\.0\.0\.1/.test(databaseUrl)) && neonKey) {
  console.log("• إنشاء قاعدة Neon جديدة…");
  const response = await fetch("https://console.neon.tech/api/v2/projects", {
    method: "POST",
    headers: { Authorization: `Bearer ${neonKey}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ project: { name: "al-araby-customs", region_id: "aws-eu-central-1", pg_version: 16 } }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) die(`تعذّر إنشاء قاعدة Neon (HTTP ${response.status}).`, JSON.stringify(data).slice(0, 300));
  const uri =
    data?.connection_uris?.[0]?.connection_uri ??
    data?.project?.connection_uris?.[0]?.connection_uri ??
    null;
  if (!uri) die("Neon لم يُرجع رابط اتصال.", JSON.stringify(data).slice(0, 300));
  databaseUrl = uri.includes("sslmode") ? uri : `${uri}${uri.includes("?") ? "&" : "?"}sslmode=require`;
  console.log("✔ قاعدة Neon جاهزة");
}

if (!databaseUrl || /localhost|127\.0\.0\.1/.test(databaseUrl)) {
  die("لا يوجد DATABASE_URL سحابي.", "أضف NEON_API_KEY لإنشاء قاعدة تلقائياً، أو DATABASE_URL جاهز.");
}

// ── 2) Vercel ────────────────────────────────────────────────────────
const vapi = async (path, init = {}) => {
  const response = await fetch(`https://api.vercel.com${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { ok: response.ok, status: response.status, data };
};

const me = await vapi("/v2/user");
if (!me.ok) die(`توكن Vercel مرفوض (HTTP ${me.status}).`, JSON.stringify(me.data).slice(0, 200));
console.log(`✔ Vercel: ${me.data?.user?.username ?? me.data?.user?.email}`);

let teamId = null;
const teams = await vapi("/v2/teams");
if (Array.isArray(teams.data?.teams)) {
  const match =
    teams.data.teams.find((team) => team.slug === teamSlug) ??
    (teamSlug && teamSlug.toLowerCase().includes("customs") ? teams.data.teams.find((team) => /customs/i.test(team.slug ?? "")) : null) ??
    teams.data.teams[0];
  teamId = match?.id ?? null;
  if (match) console.log(`✔ الفريق: ${match.slug ?? match.name}`);
}
const q = teamId ? `?teamId=${teamId}` : "";

const project = await vapi(`/v9/projects/${projectName}${q}`);
if (!project.ok) die(`المشروع «${projectName}» غير موجود (HTTP ${project.status}).`, "مرّر VERCEL_PROJECT باسم المشروع الصحيح.");
console.log(`✔ المشروع: ${projectName}`);

const envs = await vapi(`/v9/projects/${projectName}/env${q}`);
const existing = Array.isArray(envs.data?.envs) ? envs.data.envs.find((item) => item.key === "DATABASE_URL") : null;
const body = JSON.stringify({ key: "DATABASE_URL", value: databaseUrl, type: "encrypted", target: ["production", "preview", "development"] });
const written = existing
  ? await vapi(`/v9/projects/${projectName}/env/${existing.id}${q}`, { method: "PATCH", body })
  : await vapi(`/v10/projects/${projectName}/env${q}`, { method: "POST", body });
if (!written.ok) die(`تعذّر ضبط DATABASE_URL (HTTP ${written.status}).`, JSON.stringify(written.data).slice(0, 300));
console.log("✔ DATABASE_URL مضبوط على Production + Preview");

// ── 3) إعادة نشر آخر نسخة ────────────────────────────────────────────
const deployments = await vapi(`/v6/deployments?projectId=${project.data?.id ?? ""}&limit=1${teamId ? `&teamId=${teamId}` : ""}`);
const latest = deployments.data?.deployments?.[0];
if (!latest) die("لا يوجد نشر سابق لإعادة استخدامه.");

console.log(`• إعادة نشر ${latest.url ?? latest.uid}…`);
const redeploy = await vapi(`/v13/deployments${q}`, {
  method: "POST",
  body: JSON.stringify({ name: projectName, deploymentId: latest.uid, target: "production" }),
});
if (!redeploy.ok) die(`تعذّرت إعادة النشر (HTTP ${redeploy.status}).`, JSON.stringify(redeploy.data).slice(0, 300));
console.log(`✔ بدأ النشر: ${redeploy.data?.url ?? redeploy.data?.id}`);

// ── 4) انتظار الجاهزية ──────────────────────────────────────────────
const productionUrl = `https://${projectName}.vercel.app`;
console.log(`• انتظار الجاهزية على ${productionUrl} …`);
let healthy = false;
for (let attempt = 0; attempt < 30; attempt++) {
  await new Promise((resolve) => setTimeout(resolve, 8000));
  try {
    const response = await fetch(`${productionUrl}/api/health`, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    process.stdout.write(`  [${attempt + 1}/30] ${response.status} ${JSON.stringify(payload)}\n`);
    if (payload?.ok === true) {
      healthy = true;
      break;
    }
  } catch (error) {
    process.stdout.write(`  [${attempt + 1}/30] في الانتظار…\n`);
    void error;
  }
}

console.log("\n──────────────────────────────────────────────");
console.log(healthy ? `✔ التطبيق يعمل وقاعدة البيانات متصلة` : "⚠ النشر تم لكن التحقق لم يكتمل — راجع /api/health");
console.log(`  الرابط: ${productionUrl}`);
console.log("  الدخول: admin@alarabi.com / 123456 — غيّرها من الإعدادات فوراً");
console.log("──────────────────────────────────────────────\n");
if (!healthy) process.exitCode = 1;
