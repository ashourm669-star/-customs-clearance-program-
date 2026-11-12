#!/usr/bin/env node
/**
 * One-command Vercel deployment for Al-Araby Customs.
 *
 * Requires two environment variables in this sandbox:
 *   VERCEL_TOKEN   → https://vercel.com/account/tokens  (scope: full account)
 *   DATABASE_URL   → hosted PostgreSQL URL, e.g. Neon with ?sslmode=require
 *
 * Usage:  node scripts/deploy-vercel.mjs
 */
import { execFileSync } from "node:child_process";

const token = process.env.VERCEL_TOKEN;
let databaseUrl = process.env.DATABASE_URL;
const projectName = process.env.VERCEL_PROJECT_NAME ?? "al-araby-customs";

function fail(message, hint) {
  console.error(`\n✖ ${message}`);
  if (hint) console.error(`  ${hint}`);
  process.exit(1);
}

if (!token) {
  fail(
    "VERCEL_TOKEN غير موجود في متغيرات البيئة.",
    "أنشئ توكن من https://vercel.com/account/tokens ثم أضفه كمتغير بيئة باسم VERCEL_TOKEN.",
  );
}
const neonKey = process.env.NEON_API_KEY;
const needsLocalDb = !databaseUrl || /(^@|\/\/)(localhost|127\.0\.0\.1)/.test(databaseUrl);

if (needsLocalDb && neonKey) {
  console.log("• إنشاء قاعدة PostgreSQL مجانية على Neon…");
  const response = await fetch("https://console.neon.tech/api/v2/projects", {
    method: "POST",
    headers: { Authorization: `Bearer ${neonKey}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ project: { name: "al-araby-customs", region_id: "aws-eu-central-1", pg_version: 15 } }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.warn(`  ⚠ تعذّر إنشاء قاعدة Neon (HTTP ${response.status}): ${JSON.stringify(data).slice(0, 200)}`);
  } else {
    const uri = data?.connection_uris?.[0]?.connection_uri;
    const host = data?.project?.connection_uris?.[0]?.connection_uri;
    databaseUrl = uri ?? host;
    if (databaseUrl && !databaseUrl.includes("sslmode")) databaseUrl += `${databaseUrl.includes("?") ? "&" : "?"}sslmode=require`;
    console.log("✔ تم إنشاء قاعدة بيانات Neon");
  }
}

if (needsLocalDb && !databaseUrl) {
  fail(
    "DATABASE_URL غير موجود أو يشير إلى قاعدة محلية.",
    "أضف DATABASE_URL لقاعدة سحابية (Neon/Supabase/Railway) تحتوي ?sslmode=require، أو أضف NEON_API_KEY لإنشائها تلقائياً.",
  );
}

const api = async (path, init = {}) => {
  const response = await fetch(`https://api.vercel.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
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

const me = await api("/v2/user");
if (!me.ok) fail(`التوكن مرفوض (HTTP ${me.status}).`, typeof me.data === "string" ? me.data.slice(0, 200) : JSON.stringify(me.data).slice(0, 200));
const username = me.data?.user?.username ?? me.data?.user?.email ?? "unknown";
console.log(`✔ التوكن صالح — الحساب: ${username}`);

const teams = await api("/v2/teams");
const teamId = Array.isArray(teams.data?.teams) && teams.data.teams.length ? teams.data.teams[0].id : null;
const teamQuery = teamId ? `?teamId=${teamId}` : "";

console.log(`• إنشاء/تحديث المشروع «${projectName}»${teamId ? " داخل الفريق" : ""}…`);
const project = await api(`/v11/projects${teamQuery}`, {
  method: "POST",
  body: JSON.stringify({ name: projectName, framework: "nextjs" }),
});
const projectId = project.data?.id;
if (!projectId) {
  const existing = await api(`/v9/projects/${projectName}${teamQuery}`);
  if (!existing.data?.id) fail("تعذّر إنشاء المشروع أو العثور عليه.", JSON.stringify(project.data).slice(0, 300));
}

const envTargets = ["production", "preview", "development"];
for (const [key, value] of [
  ["DATABASE_URL", databaseUrl],
  ["PGPOOL_MAX", "5"],
]) {
  const created = await api(`/v10/projects/${projectName}/env${teamQuery}`, {
    method: "POST",
    body: JSON.stringify({ key, value, type: "encrypted", target: envTargets }),
  });
  if (!created.ok) {
    // already exists → update it
    const list = await api(`/v9/projects/${projectName}/env${teamQuery}`);
    const found = Array.isArray(list.data?.envs) ? list.data.envs.find((item) => item.key === key) : null;
    if (found) {
      await api(`/v9/projects/${projectName}/env/${found.id}${teamQuery}`, {
        method: "PATCH",
        body: JSON.stringify({ value, target: envTargets }),
      });
    } else {
      console.warn(`  ⚠ تعذّر ضبط ${key}: ${JSON.stringify(created.data).slice(0, 200)}`);
    }
  }
  console.log(`✔ متغير البيئة ${key} مضبوط`);
}

console.log("• بدء النشر (قد يستغرق 2–5 دقائق)…");
try {
  const output = execFileSync(
    "npx",
    ["--yes", "vercel@latest", "deploy", "--prod", "--yes", "--token", token, "--name", projectName],
    { stdio: "inherit", env: { ...process.env, VERCEL_ORG_ID: "", VERCEL_PROJECT_ID: "" } },
  );
  void output;
} catch {
  fail("فشل أمر النشر. راجع السجل أعلاه.");
}

const latest = await api(`/v6/deployments?projectId=${projectId ?? ""}&limit=1&target=production${teamId ? `&teamId=${teamId}` : ""}`);
const url = latest.data?.deployments?.[0]?.url;
console.log("\n──────────────────────────────────────────────");
console.log(url ? `✔ الرابط النهائي: https://${url}` : `✔ تم النشر — افتح لوحة Vercel للمشروع ${projectName}`);
console.log("  الدخول: admin@alarabi.com / 123456 (غيّرها فوراً من الإعدادات)");
console.log("──────────────────────────────────────────────\n");
