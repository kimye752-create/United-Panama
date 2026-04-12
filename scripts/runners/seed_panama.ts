/**
 * seed_panama.ts — 파나마 seed 3종 통합 runner
 *
 * ⚠ 재실행 경고
 * 이 runner는 load_macro / load_eml / load_market_intel을 순차 호출함.
 * load_eml과 load_market_intel은 이미 Supabase에 적재된 상태이므로
 * 재실행 시 중복 INSERT가 발생함.
 *
 * 사용 시점:
 *  1. clean slate 초기화 직후 (panama 테이블 TRUNCATE 후)
 *  2. 새로운 환경(스테이징/프로덕션) 첫 세팅
 *
 * 일반 개발 중에는 개별 로더를 단독으로 호출할 것.
 */
import { loadEmlFromFile } from "../../src/seed_loaders/load_eml.js";
import {
  DEFAULT_ROUND1_MACRO_PATH,
  loadRound1MacroFromFile,
} from "../../src/seed_loaders/load_macro.js";
import {
  DEFAULT_ROUND3_MARKET_INTEL_PATH,
  loadMarketIntelFromFile,
} from "../../src/seed_loaders/load_market_intel.js";
import { loadRegulatoryMilestones } from "../../src/seed_loaders/load_regulatory_milestones.js";

type StageName = "macro" | "eml" | "market_intel" | "regulatory_milestones";

interface StageInsertCount {
  table: string;
  count: number;
}

interface StageResult {
  stage: StageName;
  status: "ok" | "error";
  inserted: StageInsertCount[];
  error: string | null;
  durationMs: number;
}

interface RunnerSummary {
  dryRun: boolean;
  startedAt: string;
  finishedAt: string;
  totalDurationMs: number;
  stages: StageResult[];
  overallStatus: "ok" | "failed";
}

const TABLE_PANAMA = "panama";
const TABLE_PANAMA_EML = "panama_eml";
const TABLE_PANAMA_DIST = "panama_distributors";

function writeSummary(summary: RunnerSummary): void {
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

function emitFailed(
  startedAt: string,
  stages: StageResult[],
  dryRun: boolean,
): void {
  const finishedAt = new Date().toISOString();
  const totalDurationMs = Date.parse(finishedAt) - Date.parse(startedAt);
  writeSummary({
    dryRun,
    startedAt,
    finishedAt,
    totalDurationMs,
    stages,
    overallStatus: "failed",
  });
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const startedAt = new Date().toISOString();
  const stages: StageResult[] = [];

  try {
    const tMacro = Date.now();
    const macroRes = await loadRound1MacroFromFile(DEFAULT_ROUND1_MACRO_PATH, {
      dryRun,
    });
    const macroMs = Date.now() - tMacro;

    if (dryRun && macroRes.inserted === 0) {
      stages.push({
        stage: "macro",
        status: "error",
        inserted: [],
        error: macroRes.messages[0] ?? "macro dry-run 변환 0건",
        durationMs: macroMs,
      });
      emitFailed(startedAt, stages, dryRun);
      process.exit(1);
    }
    if (
      !dryRun &&
      macroRes.failed > 0
    ) {
      stages.push({
        stage: "macro",
        status: "error",
        inserted: [{ table: TABLE_PANAMA, count: macroRes.inserted }],
        error: macroRes.messages.join(" | "),
        durationMs: macroMs,
      });
      emitFailed(startedAt, stages, dryRun);
      process.exit(1);
    }
    if (!dryRun && macroRes.inserted === 0 && macroRes.failed === 0) {
      stages.push({
        stage: "macro",
        status: "error",
        inserted: [],
        error: macroRes.messages[0] ?? "macro 적재 0건",
        durationMs: macroMs,
      });
      emitFailed(startedAt, stages, dryRun);
      process.exit(1);
    }

    stages.push({
      stage: "macro",
      status: "ok",
      inserted: [{ table: TABLE_PANAMA, count: macroRes.inserted }],
      error: null,
      durationMs: macroMs,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    stages.push({
      stage: "macro",
      status: "error",
      inserted: [],
      error: msg,
      durationMs: 0,
    });
    emitFailed(startedAt, stages, dryRun);
    process.exit(1);
  }

  try {
    const tEml = Date.now();
    const emlCount = await loadEmlFromFile(undefined, { dryRun });
    const emlMs = Date.now() - tEml;
    stages.push({
      stage: "eml",
      status: "ok",
      inserted: [{ table: TABLE_PANAMA_EML, count: emlCount }],
      error: null,
      durationMs: emlMs,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    stages.push({
      stage: "eml",
      status: "error",
      inserted: [],
      error: msg,
      durationMs: 0,
    });
    emitFailed(startedAt, stages, dryRun);
    process.exit(1);
  }

  try {
    const tMi = Date.now();
    const mi = await loadMarketIntelFromFile(DEFAULT_ROUND3_MARKET_INTEL_PATH, {
      dryRun,
    });
    const miMs = Date.now() - tMi;
    stages.push({
      stage: "market_intel",
      status: "ok",
      inserted: [
        { table: TABLE_PANAMA, count: mi.panamaInserted },
        { table: TABLE_PANAMA_DIST, count: mi.distributorsInserted },
      ],
      error: null,
      durationMs: miMs,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    stages.push({
      stage: "market_intel",
      status: "error",
      inserted: [],
      error: msg,
      durationMs: 0,
    });
    emitFailed(startedAt, stages, dryRun);
    process.exit(1);
  }

  try {
    const tReg = Date.now();
    const reg = await loadRegulatoryMilestones({ dryRun });
    const regMs = Date.now() - tReg;
    if (!dryRun && reg.failed > 0) {
      stages.push({
        stage: "regulatory_milestones",
        status: "error",
        inserted: [{ table: TABLE_PANAMA, count: reg.inserted }],
        error: reg.messages.join(" | "),
        durationMs: regMs,
      });
      emitFailed(startedAt, stages, dryRun);
      process.exit(1);
    }
    stages.push({
      stage: "regulatory_milestones",
      status: "ok",
      inserted: [{ table: TABLE_PANAMA, count: reg.inserted }],
      error: null,
      durationMs: regMs,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    stages.push({
      stage: "regulatory_milestones",
      status: "error",
      inserted: [],
      error: msg,
      durationMs: 0,
    });
    emitFailed(startedAt, stages, dryRun);
    process.exit(1);
  }

  const finishedAt = new Date().toISOString();
  const totalDurationMs = Date.now() - Date.parse(startedAt);
  writeSummary({
    dryRun,
    startedAt,
    finishedAt,
    totalDurationMs,
    stages,
    overallStatus: "ok",
  });
}

main().catch((e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e);
  process.stderr.write(`${msg}\n`);
  process.exit(1);
});
