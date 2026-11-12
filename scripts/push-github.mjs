#!/usr/bin/env node
/**
 * Pushes the whole project into the (currently empty) GitHub repository
 * so Vercel can import it.
 *
 * Requires:
 *   GITHUB_TOKEN  → https://github.com/settings/tokens  (classic token, scope: repo)
 * Optional:
 *   GITHUB_REPO   → default: ashourm669-star/-customs-clearance-program-
 *
 * Usage: node scripts/push-github.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const token = process.env.GITHUB_TOKEN;
const repo = process.env.GITHUB_REPO ?? "ashourm669-star/-customs-clearance-program-";
const branch = process.env.GITHUB_BRANCH ?? "main";
const root = process.cwd();

const SKIP_DIRS = new Set(["node_modules", ".next", ".git", ".tessdata", ".vercel", "downloads", "tmp"]);
const SKIP_FILES = new Set([".env", ".env.local", "package-lock.json.bak"]);
const MAX_FILE_BYTES = 5 * 1024 * 1024;

if (!token) {
  console.error("\n✖ GITHUB_TOKEN غير موجود في متغيرات البيئة.");
  console.error("  أنشئ توكن من https://github.com/settings/tokens (scope: repo) ثم أضفه باسم GITHUB_TOKEN.\n");
  process.exit(1);
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry) || SKIP_FILES.has(entry)) continue;
    const full = path.join(dir, entry);
    const relative = path.relative(root, full);
    const info = statSync(full);
    if (info.isDirectory()) walk(full, files);
    else if (info.size <= MAX_FILE_BYTES) files.push({ relative, size: info.size });
  }
  return files;
}

async function api(endpoint, init = {}, allowFail = false) {
  const response = await fetch(`https://api.github.com${endpoint}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
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
  if (!response.ok) {
    if (allowFail) return { __error: true, status: response.status, data };
    console.error(`\n✖ GitHub رفض الطلب ${endpoint} (HTTP ${response.status})`);
    console.error(typeof data === "string" ? data.slice(0, 300) : JSON.stringify(data).slice(0, 300));
    process.exit(1);
  }
  return data;
}

console.log("• التحقق من التوكن…");
const user = await api("/user");
console.log(`✔ الحساب: ${user.login}`);

// GitHub rejects git/blobs on a completely empty repository (HTTP 409).
// Create the first commit through the contents API when needed.
const refProbe = await api(`/repos/${repo}/git/ref/heads/${branch}`, {}, true);
if (refProbe && !refProbe.__error && refProbe.object) {
  console.log("• المستودع يحتوي التزامات سابقة — سيتم التحديث فوقها");
} else {
  console.log("• المستودع فارغ — إنشاء الالتزام الأول…");
  await api(`/repos/${repo}/contents/README.md`, {
    method: "PUT",
    body: JSON.stringify({
      message: "Initial commit",
      content: Buffer.from(
        "# العربي للخدمات الجمركية واللوجستية\n\nمنصة إدارة التخليص الجمركي — Next.js + PostgreSQL.\n\nراجع DEPLOY.md لخطوات النشر ومتغيرات البيئة.\n",
        "utf8",
      ).toString("base64"),
      branch,
    }),
  });
  console.log("✔ تم تهيئة المستودع");
}

const files = walk(root).filter((file) => !file.relative.startsWith("public/downloads"));
console.log(`• ${files.length} ملفاً جاهزاً للرفع`);

const blobs = [];
for (const [index, file] of files.entries()) {
  const content = readFileSync(path.join(root, file.relative));
  const created = await api(`/repos/${repo}/git/blobs`, {
    method: "POST",
    body: JSON.stringify({ content: content.toString("base64"), encoding: "base64" }),
  });
  blobs.push({ path: file.relative.split(path.sep).join("/"), mode: "100644", type: "blob", sha: created.sha });
  if ((index + 1) % 25 === 0) console.log(`  … ${index + 1}/${files.length}`);
}

console.log("• إنشاء شجرة الملفات والالتزام…");
const tree = await api(`/repos/${repo}/git/trees`, {
  method: "POST",
  body: JSON.stringify({ tree: blobs }),
});

let parentSha = null;
const refNow = await api(`/repos/${repo}/git/ref/heads/${branch}`, {}, true);
if (refNow && !refNow.__error) parentSha = refNow.object?.sha ?? null;

const commit = await api(`/repos/${repo}/git/commits`, {
  method: "POST",
  body: JSON.stringify({
    message: "Al-Araby customs clearance platform — full source",
    tree: tree.sha,
    ...(parentSha ? { parents: [parentSha] } : {}),
  }),
});

if (parentSha) {
  await api(`/repos/${repo}/git/refs/heads/${branch}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });
} else {
  await api(`/repos/${repo}/git/refs`, {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commit.sha }),
  });
}

console.log("\n──────────────────────────────────────────────");
console.log(`✔ تم رفع الكود إلى https://github.com/${repo}`);
console.log("  الخطوة التالية: Vercel → Import → أضف DATABASE_URL → Deploy");
console.log("──────────────────────────────────────────────\n");
