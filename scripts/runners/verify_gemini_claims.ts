/**
 * Gemini 단독 근거 주장에 대한 다중 채널 텍스트 검증 + evidence_notes 병합
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";

import { getSupabaseClient } from "../../src/utils/db_connector";

export const OUTPUT_DIR = "data/raw/verify_gemini" as const;

type DbTarget =
  | { table: "panama_ingredient_eligibility"; inn: string }
  | { table: "panama_product_registration"; self_brand: string }
  | { table: "panama_product_registration"; byRegistrationPath: "wla_korea_fast" };

interface VerificationTarget {
  claim: string;
  channels: readonly string[];
  keywords: readonly string[];
  /** DB에 시도 이력·승격 반영 대상 */
  dbTargets: readonly DbTarget[];
  /** 매칭 시 primary_source_strength·report_displayable 승격 (성분/단일 제품만) */
  promoteOnEvidenceMatch: boolean;
}

const VERIFICATION_TARGETS: VerificationTarget[] = [
  {
    claim: "Gadobutrol 파나마 등록 (Gadovist)",
    channels: [
      "https://dream.kotra.or.kr/kotranews/cms/news/actionKotraBoardList.do?pageNo=1&pageSize=10&SITE_NO=3&MENU_ID=200&CONTENTS_NO=1&bbsGbn=251&bbsSn=251&searchCondition=all&searchKeyword=%ED%8C%8C%EB%82%98%EB%A7%88+%EC%A1%B0%EC%98%81%EC%A0%9C",
      "https://r.jina.ai/https://www.gacetaoficial.gob.pa/",
      "https://r.jina.ai/https://www.panamacompra.gob.pa/",
    ],
    keywords: ["Gadobutrol", "Gadovist", "contraste", "contraste MRI"],
    dbTargets: [
      { table: "panama_ingredient_eligibility", inn: "Gadobutrol" },
      { table: "panama_product_registration", self_brand: "Gadvoa Inj." },
    ],
    promoteOnEvidenceMatch: true,
  },
  {
    claim: "Mosapride 시장 상태 (비주류)",
    channels: [
      "https://r.jina.ai/https://www.gacetaoficial.gob.pa/",
      "https://r.jina.ai/https://www.minsa.gob.pa/",
    ],
    keywords: ["Mosaprida", "Mosapride", "procinético", "procinetico", "dispepsia"],
    dbTargets: [
      { table: "panama_ingredient_eligibility", inn: "Mosapride" },
      { table: "panama_product_registration", self_brand: "Gastiin CR" },
    ],
    promoteOnEvidenceMatch: true,
  },
  {
    claim: "WLA 한국 트랙 + Ley 419 de 2024 (규제 근거)",
    channels: [
      "https://r.jina.ai/https://dream.kotra.or.kr/kotranews/cms/news/actionKotraBoardList.do?pageNo=1&pageSize=5&SITE_NO=3&MENU_ID=200&CONTENTS_NO=1&bbsGbn=251&bbsSn=251&searchCondition=all&searchKeyword=%ED%8C%8C%EB%82%98%EB%A7%88+%EC%A0%9C%EC%95%BD",
      "https://r.jina.ai/https://www.gacetaoficial.gob.pa/",
      "https://r.jina.ai/https://www.mfds.go.kr/brd/m_99/list.do",
      "https://r.jina.ai/https://www.kpbma.or.kr/",
    ],
    keywords: [
      "Ley 419",
      "419",
      "WHO Listed Authority",
      "WLA",
      "alta vigilancia",
      "Corea",
      "Korea",
      "한국",
      "위생선진국",
      "fast track",
      "fast-track",
      "Panamá",
    ],
    dbTargets: [{ table: "panama_product_registration", byRegistrationPath: "wla_korea_fast" }],
    promoteOnEvidenceMatch: true,
  },
];

interface KeywordMatch {
  keyword: string;
  context: string;
  line: number;
}

interface ChannelResult {
  claim: string;
  channel: string;
  success: boolean;
  error?: string;
  charCount: number;
  matches: number;
  evidence: KeywordMatch[];
}

function toFetchUrl(url: string): string {
  if (url.startsWith("https://r.jina.ai/")) {
    return url;
  }
  return `https://r.jina.ai/${url}`;
}

async function fetchText(url: string): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const fetchUrl = toFetchUrl(url);
  try {
    const response = await fetch(fetchUrl, {
      method: "GET",
      headers: {
        Accept: "text/plain",
        "User-Agent": "Mozilla/5.0 (compatible; UPharma/1.0)",
      },
    });
    if (!response.ok) {
      return {
        ok: false,
        error: `HTTP ${String(response.status)} ${response.statusText}`,
      };
    }
    const text = await response.text();
    return { ok: true, text };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

function searchKeywords(text: string, keywords: readonly string[]): KeywordMatch[] {
  const lines = text.split("\n");
  const matches: KeywordMatch[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const lower = line.toLowerCase();
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) {
        const start = Math.max(0, i - 2);
        const end = Math.min(lines.length, i + 3);
        matches.push({
          keyword: kw,
          context: lines.slice(start, end).join("\n").slice(0, 500),
          line: i + 1,
        });
      }
    }
  }
  return matches;
}

async function ensureOutputDir(): Promise<void> {
  await fs.mkdir(path.join(process.cwd(), OUTPUT_DIR), { recursive: true });
}

interface SummaryRow {
  claim: string;
  totalMatches: number;
  hadPrimaryHit: boolean;
}

function isPositiveMatchTotal(payload: Record<string, unknown>): boolean {
  const m = payload.match_total;
  return typeof m === "number" && m > 0;
}

async function applyEvidenceNotesPatch(
  target: DbTarget,
  claim: string,
  payload: Record<string, unknown>,
  promoteOnMatch: boolean,
): Promise<number> {
  const sb = getSupabaseClient();
  if (target.table === "panama_ingredient_eligibility") {
    const { data, error } = await sb
      .from("panama_ingredient_eligibility")
      .select("evidence_notes")
      .eq("inn", target.inn)
      .maybeSingle();
    if (error !== null) {
      throw new Error(`성분 ${target.inn} 조회 실패: ${error.message}`);
    }
    const prev =
      data !== null &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      "evidence_notes" in data &&
      typeof (data as { evidence_notes: unknown }).evidence_notes === "object" &&
      (data as { evidence_notes: unknown }).evidence_notes !== null &&
      !Array.isArray((data as { evidence_notes: unknown }).evidence_notes)
        ? ((data as { evidence_notes: Record<string, unknown> }).evidence_notes as Record<string, unknown>)
        : {};
    const merged: Record<string, unknown> = {
      ...prev,
      gemini_claim_verification: {
        ...(typeof prev.gemini_claim_verification === "object" &&
        prev.gemini_claim_verification !== null &&
        !Array.isArray(prev.gemini_claim_verification)
          ? (prev.gemini_claim_verification as Record<string, unknown>)
          : {}),
        [claim]: payload,
      },
    };
    if (promoteOnMatch && isPositiveMatchTotal(payload)) {
      merged.primary_source_strength = "high";
      merged.requires_primary_source = false;
      merged.report_displayable = true;
      merged.display_note =
        "다중 채널 텍스트에서 키워드 매칭(1차 출처 후보). 문맥 수동 확인 권장.";
    }
    const { error: upErr } = await sb
      .from("panama_ingredient_eligibility")
      .update({ evidence_notes: merged })
      .eq("inn", target.inn);
    if (upErr !== null) {
      throw new Error(`성분 ${target.inn} 업데이트 실패: ${upErr.message}`);
    }
    return 1;
  }

  if ("self_brand" in target) {
    const { data, error } = await sb
      .from("panama_product_registration")
      .select("evidence_notes")
      .eq("self_brand", target.self_brand)
      .maybeSingle();
    if (error !== null) {
      throw new Error(`제품 ${target.self_brand} 조회 실패: ${error.message}`);
    }
    const prev =
      data !== null &&
      typeof data === "object" &&
      "evidence_notes" in data &&
      typeof (data as { evidence_notes: unknown }).evidence_notes === "object" &&
      (data as { evidence_notes: unknown }).evidence_notes !== null &&
      !Array.isArray((data as { evidence_notes: unknown }).evidence_notes)
        ? ((data as { evidence_notes: Record<string, unknown> }).evidence_notes as Record<string, unknown>)
        : {};
    const merged: Record<string, unknown> = {
      ...prev,
      gemini_claim_verification: {
        ...(typeof prev.gemini_claim_verification === "object" &&
        prev.gemini_claim_verification !== null &&
        !Array.isArray(prev.gemini_claim_verification)
          ? (prev.gemini_claim_verification as Record<string, unknown>)
          : {}),
        [claim]: payload,
      },
    };
    if (promoteOnMatch && isPositiveMatchTotal(payload)) {
      merged.primary_source_strength = "high";
      merged.requires_primary_source = false;
      merged.report_displayable = true;
      merged.display_note =
        "다중 채널 텍스트에서 키워드 매칭(1차 출처 후보). 문맥 수동 확인 권장.";
    }
    const { error: upErr } = await sb
      .from("panama_product_registration")
      .update({ evidence_notes: merged })
      .eq("self_brand", target.self_brand);
    if (upErr !== null) {
      throw new Error(`제품 ${target.self_brand} 업데이트 실패: ${upErr.message}`);
    }
    return 1;
  }

  const { data: rows, error: listErr } = await sb
    .from("panama_product_registration")
    .select("product_id, evidence_notes")
    .eq("registration_path", target.byRegistrationPath);
  if (listErr !== null) {
    throw new Error(`WLA 경로 제품 목록 조회 실패: ${listErr.message}`);
  }
  if (!Array.isArray(rows)) {
    return 0;
  }
  let rowCount = 0;
  for (const row of rows) {
    if (typeof row !== "object" || row === null || Array.isArray(row)) {
      continue;
    }
    const r = row as { product_id?: string; evidence_notes?: unknown };
    const prev =
      typeof r.evidence_notes === "object" &&
      r.evidence_notes !== null &&
      !Array.isArray(r.evidence_notes)
        ? (r.evidence_notes as Record<string, unknown>)
        : {};
    const merged: Record<string, unknown> = {
      ...prev,
      gemini_claim_verification: {
        ...(typeof prev.gemini_claim_verification === "object" &&
        prev.gemini_claim_verification !== null &&
        !Array.isArray(prev.gemini_claim_verification)
          ? (prev.gemini_claim_verification as Record<string, unknown>)
          : {}),
        [claim]: payload,
      },
    };
    if (promoteOnMatch && isPositiveMatchTotal(payload)) {
      merged.wla_verification_hint = {
        verified_at: new Date().toISOString(),
        note: "WLA/Ley419 키워드 다중 채널 매칭(후보). 본문 확인 필요.",
      };
    }
    const pid = r.product_id;
    if (typeof pid !== "string" || pid === "") {
      continue;
    }
    const { error: upErr } = await sb
      .from("panama_product_registration")
      .update({ evidence_notes: merged })
      .eq("product_id", pid);
    if (upErr !== null) {
      console.error(`[verify_gemini] product_id=${pid} 업데이트 실패: ${upErr.message}`);
    } else {
      rowCount += 1;
    }
  }
  return rowCount;
}

export async function runVerifyGeminiClaims(): Promise<{
  results: ChannelResult[];
  summary: SummaryRow[];
  dbUpdated: number;
}> {
  await ensureOutputDir();
  const results: ChannelResult[] = [];
  const summaryMap = new Map<string, number>();

  for (const target of VERIFICATION_TARGETS) {
    console.log(`\n=== 검증 중: ${target.claim} ===`);
    for (const channel of target.channels) {
      console.log(`  [fetch] ${channel.slice(0, 96)}…`);
      const fetched = await fetchText(channel);
      if (!fetched.ok) {
        results.push({
          claim: target.claim,
          channel,
          success: false,
          error: fetched.error,
          charCount: 0,
          matches: 0,
          evidence: [],
        });
        console.log(`    ✗ fetch 실패: ${fetched.error}`);
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }
      const kwMatches = searchKeywords(fetched.text, target.keywords);
      results.push({
        claim: target.claim,
        channel,
        success: true,
        charCount: fetched.text.length,
        matches: kwMatches.length,
        evidence: kwMatches.slice(0, 5),
      });
      console.log(`    ✓ ${String(fetched.text.length)} chars, ${String(kwMatches.length)} 키워드 매칭`);
      if (kwMatches.length > 0) {
        const first = kwMatches[0];
        console.log(`      첫 매칭: ${first.keyword} @ line ${String(first.line)}`);
        console.log(first.context.slice(0, 200));
      }
      summaryMap.set(target.claim, (summaryMap.get(target.claim) ?? 0) + kwMatches.length);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  const summary: SummaryRow[] = VERIFICATION_TARGETS.map((t) => {
    const total = summaryMap.get(t.claim) ?? 0;
    return {
      claim: t.claim,
      totalMatches: total,
      hadPrimaryHit: total > 0,
    };
  });

  const outPath = path.join(process.cwd(), OUTPUT_DIR, "_verification_results.json");
  await fs.writeFile(
    outPath,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        results,
        summary,
      },
      null,
      2,
    ),
    "utf-8",
  );

  let dbUpdated = 0;
  for (const target of VERIFICATION_TARGETS) {
    const total = summaryMap.get(target.claim) ?? 0;
    const promote = total > 0 && target.promoteOnEvidenceMatch;
    const channels = results.filter((r) => r.claim === target.claim);
    const payload: Record<string, unknown> = {
      attempted_at: new Date().toISOString(),
      match_total: total,
      channels: channels.map((c) => ({
        channel: c.channel,
        success: c.success,
        matches: c.matches,
        error: c.error ?? null,
        top_evidence: c.evidence.slice(0, 2),
      })),
    };
    try {
      for (const dt of target.dbTargets) {
        const n = await applyEvidenceNotesPatch(dt, target.claim, payload, promote);
        dbUpdated += n;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[verify_gemini] DB 병합 실패 (${target.claim}): ${message}`);
    }
  }

  console.log("\n=== 최종 요약 ===");
  for (const row of summary) {
    const status = row.hadPrimaryHit ? "✅ 키워드 매칭 있음(1차 후보)" : "❌ 키워드 매칭 없음";
    console.log(`${status}: ${row.claim} (총 ${String(row.totalMatches)} 매칭)`);
  }
  console.log(`\nDB 병합 시도(대상 단위): ${String(dbUpdated)}`);

  return { results, summary, dbUpdated };
}

async function main(): Promise<void> {
  await runVerifyGeminiClaims();
}

if (process.argv[1] !== undefined && process.argv[1].endsWith("verify_gemini_claims.ts")) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[verify_gemini_claims][fatal] ${message}`);
    process.exitCode = 1;
  });
}
