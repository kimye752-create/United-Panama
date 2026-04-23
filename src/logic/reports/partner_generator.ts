import { createSupabaseServer } from "@/lib/supabase-server";
import { crawlAndUpsertPharmChoices } from "@/src/lib/crawlers/pharmchoices_crawler";
import {
  enrichCandidateWithLLM,
  generateRecommendationReasons,
} from "@/src/llm/partner_enrichment";
import { fetchPartnerCandidatesFromDB } from "@/src/logic/partner_search";
import { findProductById } from "@/src/utils/product-dictionary";
import { saveLlmOutput } from "@/src/lib/llm-output-logger";
import type { PartnerCandidate } from "@/src/types/phase3_partner";

export interface GeneratePartnerInput {
  sessionId: string;
  productId: string;
  country: string;
  weightedCriteria: Record<string, unknown>;
}

export interface GeneratePartnerResult {
  id: string;
  report_data: Record<string, unknown>;
}

// 실시간 보강 최대 기업 수
// 라이브 파이프라인은 한 번도 보강 안 된 신규 기업만, 소수만 처리
// 대부분 기업은 배치 스크립트(enrich_partners_claude.ts)가 사전 보강
const ENRICH_LIMIT = 5;

// 추천할 기업 수
const RECOMMEND_COUNT = 10;

// ─── 내부 점수 계산 (사용자에게 표시 안 함) ───────────────────────────────

/**
 * 데이터 충실도 + 제품 관련성 기반 후보 선발 점수
 * 보고서에는 표시하지 않고, 상위 10개 선발 기준으로만 사용
 */
function calcSelectionScore(
  candidate: PartnerCandidate,
  productTherapeuticArea: string,
): number {
  let score = 0;

  // 데이터 충실도
  if (candidate.therapeutic_areas !== null && candidate.therapeutic_areas.length > 0) score += 3;
  if (candidate.revenue_usd !== null) score += 2;
  if (candidate.employee_count !== null) score += 1;
  if (candidate.registered_products !== null && candidate.registered_products.length > 0) score += 1;
  if (candidate.import_history_detail !== null) score += 1;

  // 수입/유통 역량
  if (candidate.import_history === true) score += 3;
  if (candidate.gmp_certified === true) score += 2;
  if (candidate.mah_capable === true) score += 2;
  if (candidate.public_procurement_wins !== null && candidate.public_procurement_wins > 0) score += 2;
  if (candidate.pharmacy_chain_operator === true) score += 1;

  // 한국 파트너십 경험
  if (candidate.korea_partnership === true) score += 4;

  // 제품 치료영역 매칭
  if (candidate.therapeutic_areas !== null) {
    const productArea = productTherapeuticArea.toLowerCase();
    for (const area of candidate.therapeutic_areas) {
      if (area.toLowerCase().includes(productArea) || productArea.includes(area.toLowerCase())) {
        score += 5;
        break;
      }
    }
    // 부분 매칭 (단어 단위)
    const productWords = productArea.split(/[\s,/]+/).filter((w) => w.length > 3);
    for (const word of productWords) {
      if (
        candidate.therapeutic_areas.some((a) => a.toLowerCase().includes(word))
      ) {
        score += 2;
        break;
      }
    }
  }

  // 연락처 완성도 (실제 연락 가능성)
  if (candidate.email !== null) score += 1;
  if (candidate.website !== null) score += 1;

  return score;
}

/**
 * 필터링된 후보 중 제품/데이터 기준으로 상위 N개 선발
 * ※ 점수는 내부 선발 기준이며 보고서에 표시하지 않음
 */
function selectTopCandidates(
  candidates: PartnerCandidate[],
  productTherapeuticArea: string,
  n: number,
): PartnerCandidate[] {
  const scored = candidates.map((c) => ({
    candidate: c,
    score: calcSelectionScore(c, productTherapeuticArea),
  }));

  // 점수 내림차순 정렬
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, n).map((s) => s.candidate);
}

// ─── 메인 보고서 생성 ────────────────────────────────────────────────────

/**
 * 파트너 발굴 보고서 생성 파이프라인
 *
 * [1단계] PharmChoices 실시간 크롤링 → DB upsert
 * [2단계] DB에서 전체 후보 조회 (MNC/API 필터 적용)
 * [3단계] 미보강 기업 Claude web_search 보강 → DB 업데이트
 * [4단계] 제품 관련성 기준으로 상위 10개 선발
 * [5단계] 추천 이유 5가지 생성
 */
export async function generatePartnerReport(
  input: GeneratePartnerInput,
): Promise<GeneratePartnerResult> {
  try {
    const product = findProductById(input.productId);
    if (product === undefined) {
      throw new Error("등록되지 않은 product_id입니다.");
    }

    const productCtx = {
      productName: product.kr_brand_name,
      inn: product.who_inn_en,
      therapeuticArea: product.therapeutic_area,
    };

    // ① 실시간 크롤링: PharmChoices Panama 페이지 → DB upsert
    //    타임아웃 내 완료 안 되면 기존 DB 데이터로 계속 진행
    const crawlResult = await Promise.race([
      crawlAndUpsertPharmChoices(),
      new Promise<{ crawled: 0; upserted: 0; skipped: 0; error: string }>((resolve) =>
        setTimeout(
          () =>
            resolve({
              crawled: 0,
              upserted: 0,
              skipped: 0,
              error: "크롤링 타임아웃 (25s) — DB 데이터 사용",
            }),
          25000,
        ),
      ),
    ]);

    const crawlNote =
      crawlResult.error !== null
        ? `크롤링 오류: ${crawlResult.error}`
        : `PharmChoices 크롤링 완료: ${crawlResult.crawled}개 파싱 / ${crawlResult.upserted}개 DB 저장`;

    // ② DB에서 전체 후보 조회 (PharmChoices 정적 데이터 병합 + MNC/API 필터)
    const allCandidates = await fetchPartnerCandidatesFromDB();

    // ③ 신규 기업만 Claude web_search 심층 보강
    //    - collected_secondary_at 없는 기업 = 한 번도 보강 시도 안 한 신규
    //    - 이미 시도된 기업(수집 결과 null이라도)은 배치 스크립트에 맡김
    //    - 최대 ENRICH_LIMIT(5)개만 처리하여 응답 지연 최소화
    const toEnrich = allCandidates
      .filter((c) => c.collected_secondary_at === null)
      .slice(0, ENRICH_LIMIT);

    // Rate-limit 방지: 최대 3개 동시 실행, 배치 간 1초 대기
    // (web_search 동시 20개 → 429 즉시 실패)
    const enrichedMap = new Map<string, PartnerCandidate>();
    const CONCURRENCY = 3;
    for (let i = 0; i < toEnrich.length; i += CONCURRENCY) {
      const batch = toEnrich.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async (candidate) => {
          const enriched = await enrichCandidateWithLLM(candidate);
          enrichedMap.set(candidate.id, enriched);
        }),
      );
      // 배치 간 1초 대기 (rate-limit 완화)
      if (i + CONCURRENCY < toEnrich.length) {
        await new Promise<void>((res) => setTimeout(res, 1000));
      }
    }

    // 보강 결과를 DB에 저장 (다음 실행 시 재활용)
    const supabaseForEnrich = createSupabaseServer();
    await Promise.allSettled(
      Array.from(enrichedMap.entries()).map(async ([candidateId, enriched]) => {
        const orig = allCandidates.find((c) => c.id === candidateId);
        if (!orig) return;
        const patch: Record<string, unknown> = {
          collected_secondary_at: enriched.collected_secondary_at,
        };
        // 연락처 — 기존 값 없을 때만 업데이트
        if (enriched.email   !== null && orig.email   === null) patch["email"]   = enriched.email;
        if (enriched.website !== null && orig.website === null) patch["website"] = enriched.website;
        if (enriched.phone   !== null && orig.phone   === null) patch["phone"]   = enriched.phone;
        // 정량 데이터 — LLM 값이 있으면 업데이트
        if (enriched.revenue_usd             !== null) patch["revenue_usd"]             = enriched.revenue_usd;
        if (enriched.employee_count          !== null) patch["employee_count"]           = enriched.employee_count;
        if (enriched.founded_year            !== null) patch["founded_year"]             = enriched.founded_year;
        if (enriched.therapeutic_areas       !== null) patch["therapeutic_areas"]        = enriched.therapeutic_areas;
        if (enriched.registered_products     !== null) patch["registered_products"]      = enriched.registered_products;
        if (enriched.gmp_certified           !== null) patch["gmp_certified"]            = enriched.gmp_certified;
        if (enriched.import_history          !== null) patch["import_history"]           = enriched.import_history;
        if (enriched.import_history_detail   !== null) patch["import_history_detail"]    = enriched.import_history_detail;
        if (enriched.public_procurement_wins !== null) patch["public_procurement_wins"]  = enriched.public_procurement_wins;
        if (enriched.pharmacy_chain_operator !== null) patch["pharmacy_chain_operator"]  = enriched.pharmacy_chain_operator;
        if (enriched.mah_capable             !== null) patch["mah_capable"]              = enriched.mah_capable;
        if (enriched.korea_partnership       !== null) patch["korea_partnership"]        = enriched.korea_partnership;
        if (enriched.korea_partnership_detail !== null) patch["korea_partnership_detail"] = enriched.korea_partnership_detail;
        if (enriched.source_secondary        !== null) patch["source_secondary"]         = enriched.source_secondary;
        await supabaseForEnrich
          .from("panama_partner_candidates")
          .update(patch)
          .eq("id", candidateId);
      }),
    );

    // 보강 결과 병합
    const allEnriched = allCandidates.map((c) => enrichedMap.get(c.id) ?? c);

    // ④ 제품 관련성 + 데이터 충실도 기준으로 상위 RECOMMEND_COUNT개 선발
    const top10 = selectTopCandidates(
      allEnriched,
      product.therapeutic_area,
      RECOMMEND_COUNT,
    );

    // ⑤ 추천 이유 5가지 생성
    const reasons = await Promise.all(
      top10.map((c) => generateRecommendationReasons(c, productCtx)),
    );

    const top10WithReasons = top10.map((c, i) => ({
      ...c,
      product_relevance_reason: reasons[i] ?? null,
    }));

    // 전체 목록도 이유 없이 포함 (상세 모달 등 UI 용)
    const reportData: Record<string, unknown> = {
      partners: top10WithReasons,           // 추천 10개 (이유 포함)
      top10: top10WithReasons,              // 하위호환 필드
      all_candidates_count: allEnriched.length,
      crawl_note: crawlNote,
      generated_at: new Date().toISOString(),
      country: input.country,
    };

    const supabase = createSupabaseServer();
    const { data, error } = await supabase
      .from("reports")
      .insert({
        session_id: input.sessionId,
        type: "partner",
        report_data: reportData,
        metadata: { product_id: input.productId },
      })
      .select("id")
      .single();

    if (error !== null) {
      throw new Error(`바이어 발굴 보고서 저장 실패: ${error.message}`);
    }
    if (data === null || typeof data.id !== "string") {
      throw new Error("바이어 발굴 보고서 id 누락");
    }

    // non-blocking 로그
    void saveLlmOutput({
      domain:               "partner_enrichment",
      session_id:           input.sessionId,
      report_id:            data.id,
      product_id:           input.productId,
      country:              input.country,
      llm_model:            "claude-haiku-4-5",
      llm_source:           "haiku",
      top10:                top10WithReasons as Record<string, unknown>[],
      all_candidates_count: allEnriched.length,
      sourceData: {
        candidatesTotal:  allEnriched.length,
        top1Score:        null,
        top1Name:
          top10WithReasons[0] !== undefined
            ? (typeof top10WithReasons[0]["company_name"] === "string"
                ? top10WithReasons[0]["company_name"]
                : null)
            : null,
      },
    });

    return { id: data.id, report_data: reportData };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`바이어 발굴 보고서 생성 실패: ${message}`);
  }
}
