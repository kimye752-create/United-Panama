/// <reference types="node" />

import { spawn } from "node:child_process";

import { getSupabaseClient } from "../../src/utils/db_connector.js";

type RunnerKey = "datos_gov_co" | "superxtra_vtex" | "pa_acodeco_cabamed";

interface StaleItemRow {
  id: string;
  pa_source: string;
  refresh_runner_key: RunnerKey | null;
  pa_freshness_status: string | null;
}

interface RefreshTask {
  key: RunnerKey;
  description: string;
  command: string;
  args: string[];
}

const TASKS: Record<RunnerKey, RefreshTask> = {
  datos_gov_co: {
    key: "datos_gov_co",
    description: "Colombia Socrata 재수집",
    command: "npx",
    args: ["tsx", "scripts/runners/insert_colombia_socrata_panama.ts"],
  },
  superxtra_vtex: {
    key: "superxtra_vtex",
    description: "Super Xtra VTEX 재수집",
    command: "npx",
    args: ["tsx", "scripts/runners/insert_superxtra_vtex_panama.ts"],
  },
  pa_acodeco_cabamed: {
    key: "pa_acodeco_cabamed",
    description: "ACODECO CABAMED 재수집",
    command: "npx",
    args: ["tsx", "src/crawlers/preload/pa_acodeco_cabamed.ts"],
  },
};

function readDryRunArg(): boolean {
  const arg = process.argv.find((v) => v.startsWith("--dry-run="));
  if (arg === undefined) {
    return false;
  }
  const raw = arg.split("=")[1] ?? "false";
  return raw.trim().toLowerCase() === "true";
}

async function loadStaleItems(): Promise<StaleItemRow[]> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("v_stale_items")
      .select("id, pa_source, refresh_runner_key, pa_freshness_status")
      .order("pa_source", { ascending: true });
    if (error !== null) {
      throw new Error(`v_stale_items 조회 실패: ${error.message}`);
    }
    return (data ?? []) as StaleItemRow[];
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`신선도 대상 조회 중 오류: ${message}. VIEW 생성 및 권한을 확인하세요.`);
  }
}

function selectTaskKeys(rows: readonly StaleItemRow[]): RunnerKey[] {
  const keys = new Set<RunnerKey>();
  for (const row of rows) {
    if (row.refresh_runner_key !== null) {
      keys.add(row.refresh_runner_key);
    }
  }
  return [...keys];
}

async function runTask(task: RefreshTask): Promise<{ key: RunnerKey; exitCode: number; tail: string[] }> {
  return await new Promise((resolve) => {
    const output: string[] = [];
    const child = spawn(task.command, task.args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
      shell: process.platform === "win32",
    });

    child.stdout.on("data", (chunk: Buffer) => {
      output.push(chunk.toString("utf-8"));
    });
    child.stderr.on("data", (chunk: Buffer) => {
      output.push(chunk.toString("utf-8"));
    });
    child.on("close", (code) => {
      const merged = output.join("").split(/\r?\n/).filter((line) => line.trim() !== "");
      resolve({
        key: task.key,
        exitCode: code ?? 1,
        tail: merged.slice(-5),
      });
    });
  });
}

async function main(): Promise<void> {
  const dryRun = readDryRunArg();
  const staleRows = await loadStaleItems();
  const taskKeys = selectTaskKeys(staleRows);
  const tasks = taskKeys.map((key) => TASKS[key]);

  if (dryRun) {
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          mode: "dry_run",
          staleCount: staleRows.length,
          taskKeys,
          tasks: tasks.map((t) => ({
            key: t.key,
            description: t.description,
            command: `${t.command} ${t.args.join(" ")}`,
          })),
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  const results: Array<{ key: RunnerKey; exitCode: number; tail: string[] }> = [];
  for (const task of tasks) {
    const result = await runTask(task);
    results.push(result);
  }

  const failed = results.filter((r) => r.exitCode !== 0);
  process.stdout.write(
    `${JSON.stringify(
      {
        ok: failed.length === 0,
        mode: "run",
        staleCount: staleRows.length,
        taskCount: tasks.length,
        results,
      },
      null,
      2,
    )}\n`,
  );

  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
