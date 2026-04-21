/**
 * public 스키마 SQL 덤프 (pg_dump). Docker의 postgres 이미지 사용.
 * .env.local: DATABASE_URL 또는 SUPABASE_URL + SUPABASE_DB_PASSWORD
 */
import { spawnSync } from "child_process";
import { config as loadEnv } from "dotenv";
import fs from "fs";
import path from "path";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

function buildDirectPostgresUrl(): string | undefined {
  const explicit = process.env["DATABASE_URL"]?.trim();
  if (explicit) {
    return explicit;
  }
  const pass = process.env["SUPABASE_DB_PASSWORD"]?.trim();
  const supabaseUrl =
    process.env["SUPABASE_URL"]?.trim() ??
    process.env["NEXT_PUBLIC_SUPABASE_URL"]?.trim();
  if (!pass || !supabaseUrl) {
    return undefined;
  }
  let host: string;
  try {
    host = new URL(supabaseUrl).hostname;
  } catch {
    return undefined;
  }
  const ref = host.split(".")[0];
  if (!ref) {
    return undefined;
  }
  const enc = encodeURIComponent(pass);
  return `postgresql://postgres:${enc}@db.${ref}.supabase.co:5432/postgres`;
}

const dbUrl = buildDirectPostgresUrl();
if (!dbUrl) {
  console.error(
    "[backup] DATABASE_URL 또는 SUPABASE_URL + SUPABASE_DB_PASSWORD(.env.local)가 필요합니다.",
  );
  process.exit(1);
}

const backupsDir = path.join(process.cwd(), "backups");
fs.mkdirSync(backupsDir, { recursive: true });

const outFile = path.join(
  backupsDir,
  "supabase_backup_20260421_pre_combined_refactor.sql",
);

// Windows Docker 볼륨 마운트용 경로
const winPath = path.resolve(backupsDir).replace(/\\/g, "/");

const args = [
  "run",
  "--rm",
  "-v",
  `${winPath}:/dumpout`,
  "-e",
  `PGDUMPURL=${dbUrl}`,
  "postgres:16",
  "bash",
  "-lc",
  'pg_dump "$PGDUMPURL" --schema=public --no-owner --no-acl -f /dumpout/' +
    path.basename(outFile),
];

const r = spawnSync("docker", args, {
  stdio: ["ignore", "pipe", "pipe"],
  encoding: "utf-8",
  shell: false,
});

if (r.status !== 0) {
  console.error("[backup] docker pg_dump 실패:", r.stderr || r.stdout);
  process.exit(r.status ?? 1);
}

const st = fs.statSync(outFile);
console.log(
  `[backup] 완료: ${outFile} (${(st.size / 1024).toFixed(1)} KiB)`,
);
