/**
 * round6_dnfd_procedure.json — 위생등록 절차 메타 1행 (MACRO_PRODUCT_ID)
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  insertRow,
  validatePanamaPhase1Common,
  type PanamaPhase1InsertRow,
} from "../utils/db_connector.js";
import { MACRO_PRODUCT_ID } from "../utils/product-dictionary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PA_SOURCE = "dnfd_procedure_meta" as const;

interface ProcedureStep {
  step: number;
  title: string;
  detail: string;
  duration_weeks: number;
  highlight?: string;
}

interface DnfdProcedureFile {
  procedure_steps: readonly ProcedureStep[];
  legal_basis: string;
  wla_korea_status: string;
  source: string;
  collected_at: string;
}

function isProcedureStep(x: unknown): x is ProcedureStep {
  if (x === null || typeof x !== "object") {
    return false;
  }
  const o = x as Record<string, unknown>;
  return (
    typeof o.step === "number" &&
    typeof o.title === "string" &&
    typeof o.detail === "string" &&
    typeof o.duration_weeks === "number"
  );
}

function parseFile(raw: unknown): DnfdProcedureFile | null {
  if (raw === null || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const steps = o.procedure_steps;
  if (!Array.isArray(steps) || !steps.every(isProcedureStep)) {
    return null;
  }
  if (
    typeof o.legal_basis !== "string" ||
    typeof o.wla_korea_status !== "string" ||
    typeof o.source !== "string" ||
    typeof o.collected_at !== "string"
  ) {
    return null;
  }
  return {
    procedure_steps: steps,
    legal_basis: o.legal_basis,
    wla_korea_status: o.wla_korea_status,
    source: o.source,
    collected_at: o.collected_at,
  };
}

export async function loadDnfdProcedureMeta(
  dryRun = false,
): Promise<{ ok: boolean; message: string }> {
  const path = join(__dirname, "..", "seed_data", "round6_dnfd_procedure.json");
  let text: string;
  try {
    text = await readFile(path, "utf-8");
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      message: `round6_dnfd_procedure.json 읽기 실패: ${msg}`,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { ok: false, message: `JSON 파싱 실패: ${msg}` };
  }

  const file = parseFile(parsed);
  if (file === null) {
    return { ok: false, message: "round6_dnfd_procedure.json 스키마 불일치" };
  }

  const pa_notes = JSON.stringify({
    procedure_steps: file.procedure_steps,
    legal_basis: file.legal_basis,
    wla_korea_status: file.wla_korea_status,
    source: file.source,
    collected_at: file.collected_at,
  });

  const row: PanamaPhase1InsertRow = {
    product_id: MACRO_PRODUCT_ID,
    market_segment: "regulatory",
    fob_estimated_usd: null,
    confidence: 0.82,
    crawled_at: new Date().toISOString(),
    pa_source: PA_SOURCE,
    pa_source_url:
      "https://tramites-minsa.panamadigital.gob.pa/",
    pa_product_name_local: "DNFD/MINSA 위생등록 절차 메타 (round6)",
    pa_currency_unit: "N/A",
    pa_price_local: null,
    pa_notes: pa_notes,
  };

  try {
    validatePanamaPhase1Common(row);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { ok: false, message: `행 검증 실패: ${msg}` };
  }

  if (dryRun) {
    return { ok: true, message: "[dry-run] dnfd_procedure_meta 1건 변환만" };
  }

  const r = await insertRow(row);
  if (!r.ok) {
    return { ok: false, message: r.message };
  }
  return { ok: true, message: "dnfd_procedure_meta 1건 적재 완료" };
}
