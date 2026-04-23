/// <reference types="node" />
/**
 * 파나마 파트너 기업 심층 수집 배치 스크립트
 * ────────────────────────────────────────────
 * [1차 수집] PharmChoices / D&B / manual_psi_seed → DB에 이미 저장된 66개 기업
 * [2차 수집] 필터 → Claude claude-3-5-haiku + web_search_20250305 툴 → DB 업데이트
 *
 * 실행: npx tsx scripts/runners/enrich_partners_claude.ts
 * 옵션: --dry-run (DB 저장 없이 결과만 출력)
 *       --limit N (최대 N개 기업만 처리)
 *       --force   (이미 수집된 기업도 재수집)
 */

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });

// ─── 설정 ──────────────────────────────────────────────────────────────────────

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY ?? "";
const TABLE = "panama_partner_candidates";

/** 필터링: 글로벌 MNC + 원료의약품 + 오리지널 제약사 키워드 */
const EXCLUDE_KEYWORDS = [
  "bayer", "roche", "novartis", "sandoz", "menarini", "menafar", "glaxo",
  "smithkline", "gsk", "astrazeneca", "mundipharm", "acino", "bial",
  "gruenthal", "grünenthal", "ferring", "servier", "lundbeck", "sanofi",
  "pfizer", "merck sharp", "msd", "abbvie", "abbott", "eli lilly",
  "bristol", "johnson", "organon", "baxter", "amgen", "biogen", "gilead",
  "takeda", "daiichi", "astellas", "eisai", "otsuka", "hetero", "cipla",
  "dr. reddy", "sun pharma", "csl behring", "apotex", "guerbet",
  "radiofarmacia", "radiofarma",
];

function isExcluded(name: string): boolean {
  const lower = name.toLowerCase();
  return EXCLUDE_KEYWORDS.some((kw) => lower.includes(kw));
}

// ─── 타입 ──────────────────────────────────────────────────────────────────────

interface DBCandidate {
  id: string;
  company_name: string;
  company_name_normalized: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  source_primary: string | null;
  therapeutic_areas: string[] | null;
  registered_products: string[] | null;
  revenue_usd: number | null;
  employee_count: number | null;
  founded_year: number | null;
  import_history: boolean | null;
  import_history_detail: string | null;
  gmp_certified: boolean | null;
  mah_capable: boolean | null;
  pharmacy_chain_operator: boolean | null;
  public_procurement_wins: number | null;
  korea_partnership: boolean | null;
  korea_partnership_detail: string | null;
  source_secondary: string[] | null;
  collected_secondary_at: string | null;
}

interface EnrichedData {
  email: string | null;
  website: string | null;
  phone: string | null;
  revenue_usd: number | null;
  employee_count: number | null;
  founded_year: number | null;
  therapeutic_areas: string[] | null;
  main_products: string[] | null;
  pipeline: string[] | null;
  gmp_certified: boolean | null;
  import_history: boolean | null;
  import_history_detail: string | null;
  public_procurement_wins: number | null;
  pharmacy_chain_operator: boolean | null;
  mah_capable: boolean | null;
  korea_partnership: boolean | null;
  korea_partnership_detail: string | null;
  source_urls: string[] | null;
}

// ─── 유틸 ──────────────────────────────────────────────────────────────────────

function toBoolOrNull(v: unknown): boolean | null {
  if (v === true || v === false) return v;
  return null;
}
function toNumOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}
function toStrOrNull(v: unknown): string | null {
  if (typeof v === "string" && v.trim() !== "") return v.trim();
  return null;
}
function toStrArrOrNull(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const out = v.filter((x): x is string => typeof x === "string" && x.trim() !== "").map((x) => x.trim());
  return out.length > 0 ? out : null;
}

function parseJsonFromText(text: string): Record<string, unknown> | null {
  const attempts = [text.trim()];
  const fenced = [...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)];
  for (const m of fenced) if (m[1]) attempts.push(m[1]);
  for (const attempt of attempts) {
    const s = attempt.indexOf("{"), e = attempt.lastIndexOf("}");
    if (s < 0 || e <= s) continue;
    try {
      const parsed = JSON.parse(attempt.slice(s, e + 1));
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch { continue; }
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractFinalText(response: Anthropic.Beta.BetaMessage): string {
  return response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

// ─── Claude 웹검색 수집 ─────────────────────────────────────────────────────────

async function enrichWithClaude(
  client: Anthropic,
  company: DBCandidate,
): Promise<EnrichedData | null> {
  const websiteHint = company.website ? `웹사이트: ${company.website}\n` : "";
  const addressHint = company.address ? `주소: ${company.address}\n` : "";
  const emailHint   = company.email   ? `이메일(기존): ${company.email}\n`   : "";

  try {
    const response = await client.beta.messages.create(
      {
        model: process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        tools: [{ type: "web_search_20250305" as const, name: "web_search" }],
        messages: [
          {
            role: "user",
            content:
              `파나마 제약 기업 "${company.company_name}"을(를) 웹 검색으로 조사하여 ` +
              `아래 JSON 형식으로만 응답하세요 (설명 없이 JSON 객체만).\n` +
              websiteHint +
              addressHint +
              emailHint +
              "확인되지 않은 값은 반드시 null:\n" +
              "{\n" +
              '  "email": <string|null>,\n' +
              '  "website": <string|null>,\n' +
              '  "phone": <string|null>,\n' +
              '  "revenue_usd": <number|null>,\n' +
              '  "employee_count": <number|null>,\n' +
              '  "founded_year": <number|null>,\n' +
              '  "therapeutic_areas": <string[]|null>,\n' +
              '  "main_products": <string[]|null>,\n' +
              '  "pipeline": <string[]|null>,\n' +
              '  "gmp_certified": <true|false|null>,\n' +
              '  "import_history": <true|false|null>,\n' +
              '  "import_history_detail": <string|null>,\n' +
              '  "public_procurement_wins": <number|null>,\n' +
              '  "pharmacy_chain_operator": <true|false|null>,\n' +
              '  "mah_capable": <true|false|null>,\n' +
              '  "korea_partnership": <true|false|null>,\n' +
              '  "korea_partnership_detail": <string|null>,\n' +
              '  "source_urls": <string[]>\n' +
              "}\n" +
              "- email: 기업 공식 연락처 이메일 (홈페이지·LinkedIn·디렉토리에서 확인)\n" +
              "- website: 기업 공식 홈페이지 URL\n" +
              "- phone: 기업 대표 전화번호\n" +
              "- main_products: 파나마에서 판매·유통하는 완제 의약품 브랜드명 최대 5개\n" +
              "- pipeline: 취급/등록 중인 주요 성분(INN) 또는 제품명 최대 5개\n" +
              "- therapeutic_areas: 영문 치료 영역명 (Cardiology, Oncology, Respiratory 등)\n" +
              "- import_history_detail: 수입 이력 구체적 내용 (조달 건수, 취급 품목 등)\n" +
              "- public_procurement_wins: PanamaCompra 공공조달 낙찰 건수",
          },
        ],
      },
      { headers: { "anthropic-beta": "web-search-2025-03-05" } },
    );

    const text = extractFinalText(response);
    if (!text) return null;

    const parsed = parseJsonFromText(text);
    if (!parsed) {
      process.stderr.write(`  [JSON 파싱 실패] 원문 일부: ${text.slice(0, 200)}\n`);
      return null;
    }

    return {
      email:                   toStrOrNull(parsed["email"]),
      website:                 toStrOrNull(parsed["website"]),
      phone:                   toStrOrNull(parsed["phone"]),
      revenue_usd:             toNumOrNull(parsed["revenue_usd"]),
      employee_count:          toNumOrNull(parsed["employee_count"]),
      founded_year:            toNumOrNull(parsed["founded_year"]),
      therapeutic_areas:       toStrArrOrNull(parsed["therapeutic_areas"]),
      main_products:           toStrArrOrNull(parsed["main_products"]),
      pipeline:                toStrArrOrNull(parsed["pipeline"]),
      gmp_certified:           toBoolOrNull(parsed["gmp_certified"]),
      import_history:          toBoolOrNull(parsed["import_history"]),
      import_history_detail:   toStrOrNull(parsed["import_history_detail"]),
      public_procurement_wins: toNumOrNull(parsed["public_procurement_wins"]),
      pharmacy_chain_operator: toBoolOrNull(parsed["pharmacy_chain_operator"]),
      mah_capable:             toBoolOrNull(parsed["mah_capable"]),
      korea_partnership:       toBoolOrNull(parsed["korea_partnership"]),
      korea_partnership_detail: toStrOrNull(parsed["korea_partnership_detail"]),
      source_urls:             toStrArrOrNull(parsed["source_urls"]),
    };
  } catch (err) {
    process.stderr.write(`  [API 에러] ${err instanceof Error ? err.message : String(err)}\n`);
    return null;
  }
}

// ─── 메인 ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const isDryRun = process.argv.includes("--dry-run");
  const isForce  = process.argv.includes("--force");
  const limitIdx = process.argv.indexOf("--limit");
  const limitArg = process.argv.find((a) => a.startsWith("--limit=")) ?? (limitIdx >= 0 ? process.argv[limitIdx + 1] : undefined);
  const limit    = limitArg ? parseInt(String(limitArg).replace("--limit=", ""), 10) : 999;

  if (!ANTHROPIC_KEY) { process.stderr.write("ANTHROPIC_API_KEY 없음\n"); process.exit(1); }
  if (!SUPABASE_URL || !SUPABASE_KEY) { process.stderr.write("Supabase 환경변수 없음\n"); process.exit(1); }

  const sb     = createClient(SUPABASE_URL, SUPABASE_KEY);
  const claude = new Anthropic({ apiKey: ANTHROPIC_KEY });

  // DB에서 전체 후보 조회
  const { data, error } = await sb.from(TABLE).select("*").order("updated_at", { ascending: false });
  if (error || !data) { process.stderr.write(`DB 조회 실패: ${error?.message}\n`); process.exit(1); }

  const all = data as DBCandidate[];
  process.stdout.write(`\n전체 ${all.length}개사 조회\n`);

  // 필터링
  const candidates = all.filter((c) => !isExcluded(c.company_name));
  process.stdout.write(`필터 후 ${candidates.length}개사 (${all.length - candidates.length}개 MNC/API 제외)\n`);

  // 수집 대상 선정
  const needsEnrichment = candidates.filter((c) => {
    if (isForce) return true;
    // 아래 조건 모두 충족해야 스킵:
    //   - 보강 이력 있음
    //   - 치료영역 확보
    //   - 매출 확보
    //   - 이메일 또는 웹사이트 중 하나 이상 확보
    return !(
      c.collected_secondary_at &&
      c.therapeutic_areas &&
      c.revenue_usd &&
      (c.email || c.website)
    );
  });
  const alreadyDone = candidates.length - needsEnrichment.length;
  const toEnrich = needsEnrichment.slice(0, limit);

  process.stdout.write(`수집 대상 ${toEnrich.length}개사 (이미 완료 ${alreadyDone}개 스킵, limit=${limit})\n`);
  if (isDryRun) process.stdout.write("[dry-run 모드: DB 저장 안 함]\n");
  process.stdout.write("━".repeat(60) + "\n\n");

  let done = 0, failed = 0, skipped = 0;

  for (const company of toEnrich) {
    process.stdout.write(`[${done + failed + skipped + 1}/${toEnrich.length}] ${company.company_name}\n`);

    const enriched = await enrichWithClaude(claude, company);

    if (!enriched) {
      process.stdout.write(`  → 수집 실패\n\n`);
      failed++;
      await sleep(2000);
      continue;
    }

    // 결과 요약 출력
    const hasData = enriched.therapeutic_areas || enriched.revenue_usd || enriched.main_products;
    if (hasData) {
      process.stdout.write(`  치료영역: ${enriched.therapeutic_areas?.join(", ") ?? "—"}\n`);
      process.stdout.write(`  주력상품: ${enriched.main_products?.slice(0, 3).join(", ") ?? "—"}\n`);
      process.stdout.write(`  매출: ${enriched.revenue_usd ? `USD ${(enriched.revenue_usd/1e6).toFixed(1)}M` : "—"} | 직원: ${enriched.employee_count ?? "—"}명\n`);
      process.stdout.write(`  수입이력: ${enriched.import_history === true ? "✓" : "—"} | GMP: ${enriched.gmp_certified === true ? "✓" : "—"} | MAH: ${enriched.mah_capable === true ? "✓" : "—"}\n`);
      if (enriched.source_urls?.length) {
        process.stdout.write(`  출처: ${enriched.source_urls.slice(0, 2).join(", ")}\n`);
      }
    } else {
      process.stdout.write(`  → 검색됐으나 데이터 없음 (소규모 or 정보 부족)\n`);
    }

    if (!isDryRun) {
      // registered_products = main_products + pipeline 통합
      const combinedProducts = [
        ...(enriched.main_products ?? []),
        ...(enriched.pipeline ?? []),
      ].filter((v, i, arr) => arr.indexOf(v) === i);

      const updatePayload: Record<string, unknown> = {
        collected_secondary_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 연락처 — 기존 값 없을 때만 채움 (수동 입력 데이터 보호)
      if (enriched.email   !== null && !company.email)   updatePayload["email"]   = enriched.email;
      if (enriched.website !== null && !company.website) updatePayload["website"] = enriched.website;
      if (enriched.phone   !== null && !company.phone)   updatePayload["phone"]   = enriched.phone;

      // null이 아닌 필드만 업데이트
      if (enriched.revenue_usd            !== null) updatePayload["revenue_usd"]             = enriched.revenue_usd;
      if (enriched.employee_count         !== null) updatePayload["employee_count"]           = enriched.employee_count;
      if (enriched.founded_year           !== null) updatePayload["founded_year"]             = enriched.founded_year;
      if (enriched.therapeutic_areas      !== null) updatePayload["therapeutic_areas"]        = enriched.therapeutic_areas;
      if (combinedProducts.length > 0)              updatePayload["registered_products"]      = combinedProducts;
      if (enriched.gmp_certified          !== null) updatePayload["gmp_certified"]            = enriched.gmp_certified;
      if (enriched.import_history         !== null) updatePayload["import_history"]           = enriched.import_history;
      if (enriched.import_history_detail  !== null) updatePayload["import_history_detail"]    = enriched.import_history_detail;
      if (enriched.public_procurement_wins !== null) updatePayload["public_procurement_wins"] = enriched.public_procurement_wins;
      if (enriched.pharmacy_chain_operator !== null) updatePayload["pharmacy_chain_operator"] = enriched.pharmacy_chain_operator;
      if (enriched.mah_capable            !== null) updatePayload["mah_capable"]              = enriched.mah_capable;
      if (enriched.korea_partnership      !== null) updatePayload["korea_partnership"]        = enriched.korea_partnership;
      if (enriched.korea_partnership_detail !== null) updatePayload["korea_partnership_detail"] = enriched.korea_partnership_detail;
      if (enriched.source_urls?.length)             updatePayload["source_secondary"]         = enriched.source_urls;

      const { error: updErr } = await sb
        .from(TABLE)
        .update(updatePayload)
        .eq("id", company.id);

      if (updErr) {
        process.stderr.write(`  [DB 저장 실패] ${updErr.message}\n`);
      } else {
        process.stdout.write(`  → DB 저장 완료\n`);
      }
    }

    process.stdout.write("\n");
    done++;

    // Rate limit 방지: 기업 간 2초 대기
    await sleep(2000);
  }

  process.stdout.write("━".repeat(60) + "\n");
  process.stdout.write(`완료: 성공 ${done}개 | 실패 ${failed}개 | 스킵 ${skipped}개\n`);
}

void main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`[치명적 오류] ${msg}\n`);
  process.exit(1);
});
