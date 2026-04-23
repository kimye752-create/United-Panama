/// <reference types="node" />

import Anthropic from "@anthropic-ai/sdk";
import type { PartnerCandidate } from "@/src/types/phase3_partner";

// web_search_20250305 툴을 지원하는 모델 (env 우선)
const ANTHROPIC_MODEL_SEARCH = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";
const ANTHROPIC_MODEL_REASON = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001";

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

function toBooleanOrNull(value: unknown): boolean | null {
  if (value === true || value === false) return value;
  return null;
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return null;
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  return null;
}

function toStringArrayOrNull(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim() !== "") out.push(item.trim());
  }
  return out.length > 0 ? out : null;
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const candidates = [trimmed];
  const fenced = [...trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)];
  for (const m of fenced) {
    if (m[1] !== undefined) candidates.push(m[1]);
  }
  for (const candidate of candidates) {
    const start = candidate.indexOf("{");
    const end   = candidate.lastIndexOf("}");
    if (start < 0 || end <= start) continue;
    try {
      const parsed = JSON.parse(candidate.slice(start, end + 1)) as unknown;
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch { continue; }
  }
  return null;
}

/** Claude beta 응답에서 최종 텍스트 추출 */
function extractFinalText(response: Anthropic.Beta.BetaMessage): string {
  const texts: string[] = [];
  for (const block of response.content) {
    if (block.type === "text") {
      texts.push(block.text);
    }
  }
  return texts.join("\n").trim();
}

// ─── 제품 컨텍스트 ─────────────────────────────────────────────────────────────

export interface ProductContext {
  productName: string;
  inn: string;
  therapeuticArea: string;
}

// ─── Claude web_search 기업 심층 수집 ─────────────────────────────────────────

/**
 * Claude claude-3-5-haiku + web_search_20250305 툴로 파나마 제약사 상세 정보 수집.
 * 파이프라인·주력상품·매출·수입이력 등을 JSON으로 반환.
 */
export async function enrichCandidateWithLLM(
  candidate: PartnerCandidate,
): Promise<PartnerCandidate> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey === undefined || apiKey.trim() === "") return candidate;

  const timeoutMs =
    typeof process.env.LLM_TIMEOUT_MS === "string" && process.env.LLM_TIMEOUT_MS.trim() !== ""
      ? Number.parseInt(process.env.LLM_TIMEOUT_MS, 10)
      : 45_000;

  const websiteHint = candidate.website ? `웹사이트: ${candidate.website}\n` : "";
  const addressHint = candidate.address ? `주소: ${candidate.address}\n` : "";
  const emailHint   = candidate.email   ? `이메일(기존): ${candidate.email}\n`   : "";

  const client = new Anthropic({ apiKey: apiKey.trim() });

  try {
    const response = await Promise.race([
      client.beta.messages.create(
        {
          model: ANTHROPIC_MODEL_SEARCH,
          max_tokens: 2000,
          tools: [{ type: "web_search_20250305" as const, name: "web_search" }],
          messages: [
            {
              role: "user",
              content:
                `파나마 제약 기업 "${candidate.company_name}"을(를) 웹 검색으로 조사하여 ` +
                `아래 JSON 형식으로만 응답하세요 (설명 없이 JSON 객체만).\n` +
                websiteHint +
                addressHint +
                emailHint +
                "확인되지 않은 값은 null:\n" +
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
                "- therapeutic_areas: 영문 치료 영역명 (예: Cardiology, Oncology, Respiratory)\n" +
                "- import_history_detail: 수입 이력이 있으면 구체적 내용 (조달 건수, 품목 등)\n" +
                "- public_procurement_wins: PanamaCompra 등 공공조달 낙찰 건수 (숫자)",
            },
          ],
        },
        { headers: { "anthropic-beta": "web-search-2025-03-05" } },
      ),
      new Promise<never>((_, reject) =>
        setTimeout(() => { reject(new Error("TIMEOUT")); }, timeoutMs),
      ),
    ]);

    const text = extractFinalText(response);
    if (text === "") return candidate;

    const parsed = parseJsonObject(text);
    if (parsed === null) return candidate;

    // main_products + pipeline → registered_products 통합
    const mainProducts = toStringArrayOrNull(parsed["main_products"]);
    const pipeline     = toStringArrayOrNull(parsed["pipeline"]);
    const combined     =
      mainProducts !== null || pipeline !== null
        ? [...(mainProducts ?? []), ...(pipeline ?? [])].filter(
            (v, i, arr) => arr.indexOf(v) === i,
          )
        : null;

    // 연락처: 기존 값이 없을 때만 채움 (수동 입력 데이터 보호)
    const llmEmail   = toStringOrNull(parsed["email"]);
    const llmWebsite = toStringOrNull(parsed["website"]);
    const llmPhone   = toStringOrNull(parsed["phone"]);

    return {
      ...candidate,
      // 연락처 — 기존 값 없을 때만 LLM 값 사용
      email:                   candidate.email   ?? llmEmail,
      website:                 candidate.website ?? llmWebsite,
      phone:                   candidate.phone   ?? llmPhone,
      // 정량 데이터 — LLM 값 우선 (최신 정보)
      revenue_usd:             toNumberOrNull(parsed["revenue_usd"])            ?? candidate.revenue_usd,
      employee_count:          toNumberOrNull(parsed["employee_count"])          ?? candidate.employee_count,
      founded_year:            toNumberOrNull(parsed["founded_year"])            ?? candidate.founded_year,
      therapeutic_areas:       toStringArrayOrNull(parsed["therapeutic_areas"])  ?? candidate.therapeutic_areas,
      gmp_certified:           toBooleanOrNull(parsed["gmp_certified"])          ?? candidate.gmp_certified,
      import_history:          toBooleanOrNull(parsed["import_history"])         ?? candidate.import_history,
      import_history_detail:   toStringOrNull(parsed["import_history_detail"])   ?? candidate.import_history_detail,
      public_procurement_wins: toNumberOrNull(parsed["public_procurement_wins"]) ?? candidate.public_procurement_wins,
      pharmacy_chain_operator: toBooleanOrNull(parsed["pharmacy_chain_operator"]) ?? candidate.pharmacy_chain_operator,
      mah_capable:             toBooleanOrNull(parsed["mah_capable"])            ?? candidate.mah_capable,
      korea_partnership:       toBooleanOrNull(parsed["korea_partnership"])      ?? candidate.korea_partnership,
      korea_partnership_detail: toStringOrNull(parsed["korea_partnership_detail"]) ?? candidate.korea_partnership_detail,
      source_secondary:        toStringArrayOrNull(parsed["source_urls"])        ?? candidate.source_secondary,
      registered_products:     combined                                          ?? candidate.registered_products,
      collected_secondary_at:  new Date().toISOString(),
    };
  } catch {
    return candidate;
  }
}

// ─── Claude — 5가지 추천 이유 생성 ──────────────────────────────────────────

/**
 * 바이어 기업이 해당 수출 품목에 적합한 5가지 이유 생성.
 * 파이프라인 적합성 > 수입이력 > 유통채널 > MAH > 기업안정성 순 우선순위.
 */
export async function generateRecommendationReasons(
  candidate: PartnerCandidate,
  product: ProductContext,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey === undefined || apiKey.trim() === "") {
    return buildFallbackReasons(candidate, product);
  }

  const ta        = (candidate.therapeutic_areas ?? []).join(", ") || "정보 없음";
  const products  = (candidate.registered_products ?? []).slice(0, 5).join(", ") || "정보 없음";
  const importExp = candidate.import_history === true
    ? (candidate.import_history_detail ?? "의약품 수입 이력 있음")
    : "수입 이력 불명";
  const mah     = candidate.mah_capable === true ? "MAH 역량 보유" : "";
  const procure = candidate.public_procurement_wins !== null
    ? `공공 낙찰 ${candidate.public_procurement_wins}건`
    : "";

  const client = new Anthropic({ apiKey: apiKey.trim() });

  try {
    const response = await client.messages.create({
      model: ANTHROPIC_MODEL_REASON,
      max_tokens: 600,
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content:
            `파나마 제약 바이어 "${candidate.company_name}"이(가) 한국유나이티드제약의 수출 품목 ` +
            `"${product.productName}(${product.inn}, ${product.therapeuticArea})"의 현지 유통 파트너로 ` +
            `적합한 이유를 아래 5가지 기준별로 각 한 문장씩 작성하시오.\n\n` +
            `기준 순서 (반드시 이 순서 유지):\n` +
            `1. 파이프라인 적합성: 치료영역·취급제품이 수출품목과 얼마나 일치하는가\n` +
            `2. 수입 이력: 의약품 수입·조달 경험\n` +
            `3. 유통 채널: 공공(ALPS/조달청) 또는 민간(병원·약국) 채널 접근성\n` +
            `4. MAH/등록 역량: 제품 등록·MAH 업무 처리 역량\n` +
            `5. 기업 안정성: 규모·설립연도·사업지속성\n\n` +
            `기업 정보:\n` +
            `- 치료 영역: ${ta}\n` +
            `- 취급 제품: ${products}\n` +
            `- 수입 경험: ${importExp}\n` +
            (mah    ? `- MAH 역량: ${mah}\n` : "") +
            (procure ? `- 공공조달: ${procure}\n` : "") +
            `\n출력 형식:\n` +
            `① [파이프라인] ...\n② [수입이력] ...\n③ [유통채널] ...\n④ [MAH역량] ...\n⑤ [기업안정성] ...`,
        },
      ],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return text.length > 30 ? text.slice(0, 1200) : buildFallbackReasons(candidate, product);
  } catch {
    return buildFallbackReasons(candidate, product);
  }
}

function buildFallbackReasons(
  candidate: PartnerCandidate,
  product: ProductContext,
): string {
  const ta = (candidate.therapeutic_areas ?? []).join(", ");
  return [
    `① [파이프라인] ${ta ? `${ta} 치료 영역을 취급하여` : "의약품 유통을 전문으로 하여"} ${product.therapeuticArea} 계열 수출품 취급에 적합합니다.`,
    `② [수입이력] ${candidate.import_history === true ? (candidate.import_history_detail ?? "의약품 수입 이력이 확인됩니다") : "수입 이력 추가 확인이 필요합니다"}.`,
    `③ [유통채널] 파나마 현지 ${candidate.pharmacy_chain_operator ? "약국 체인" : "의약품 유통"} 채널을 운영하고 있습니다.`,
    `④ [MAH역량] ${candidate.mah_capable === true ? "MAH 역할 수행 역량이 확인됩니다" : "등록 대행 역량은 추가 확인이 필요합니다"}.`,
    `⑤ [기업안정성] ${candidate.founded_year ? `${candidate.founded_year}년 설립 이래 ` : ""}파나마 현지에서 꾸준히 사업을 영위 중입니다.`,
  ].join("\n");
}

// ─── 하위 호환 alias ───────────────────────────────────────────────────────────
/** @deprecated generateRecommendationReasons 사용 권장 */
export async function generateProductRelevanceReason(
  candidate: PartnerCandidate,
  product: ProductContext,
): Promise<string> {
  return generateRecommendationReasons(candidate, product);
}
