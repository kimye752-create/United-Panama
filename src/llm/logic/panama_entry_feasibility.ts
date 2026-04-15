import type { PanamaRow } from "../../logic/fetch_panama_data";
import { getSupabaseClient } from "../../utils/db_connector";
import { findProductById } from "../../utils/product-dictionary";

export interface EntryFeasibility {
  grade:
    | "A_immediate"
    | "B_short_term"
    | "C_mid_term"
    | "D_long_term"
    | "F_blocked"
    | "unknown";
  verdict: string;
  duration_days: number | null;
  cost_usd: number | null;
  path: string;
  evidence: Record<string, unknown>;
}

type RegistrationRow = {
  identical_set_registered?: boolean | null;
  identical_registration_no?: string | null;
  identical_examples?: unknown;
  similar_combination_exists?: boolean | null;
  similar_examples?: unknown;
  estimated_duration_days?: number | null;
  estimated_cost_usd?: number | null;
  registration_path?: string | null;
};

type IngredientEligibilityRow = {
  inn?: string | null;
  panama_distributable?: boolean | null;
  example_registration_no?: string | null;
  market_status?: string | null;
};

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim() !== "") {
      out.push(item.trim());
    }
  }
  return out;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseFloat(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function extractIngredientList(whoInnEn: string): string[] {
  return whoInnEn
    .split("+")
    .map((part) => part.trim())
    .filter((part) => part !== "");
}

export async function evaluatePanamaEntryFeasibility(
  productId: string,
  panamaRows: readonly PanamaRow[],
): Promise<EntryFeasibility> {
  const product = findProductById(productId);
  if (product === undefined) {
    return {
      grade: "unknown",
      verdict: "제품 정보 없음",
      duration_days: null,
      cost_usd: null,
      path: "no_path",
      evidence: { error: "product_not_found" },
    };
  }

  const ingredients: string[] =
    typeof product.who_inn_en === "string" && product.who_inn_en.trim() !== ""
      ? extractIngredientList(product.who_inn_en)
      : [];

  const sb = getSupabaseClient();

  let regData: RegistrationRow | null = null;
  let ingData: IngredientEligibilityRow[] = [];
  const queryErrors: string[] = [];

  try {
    const { data, error } = await sb
      .from("panama_product_registration")
      .select("*")
      .eq("product_id", productId)
      .maybeSingle();
    if (error !== null) {
      throw new Error(error.message);
    }
    regData = (data as RegistrationRow | null) ?? null;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "등록 상태 조회 중 알 수 없는 오류";
    queryErrors.push(
      `등록 상태 조회 실패: ${message}. 테이블 panama_product_registration 데이터와 권한을 확인하세요.`,
    );
  }

  if (ingredients.length > 0) {
    try {
      const { data, error } = await sb
        .from("panama_ingredient_eligibility")
        .select("*")
        .in("inn", ingredients);
      if (error !== null) {
        throw new Error(error.message);
      }
      ingData = (data as IngredientEligibilityRow[] | null) ?? [];
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "성분 유통 가능성 조회 중 알 수 없는 오류";
      queryErrors.push(
        `성분 유통 조회 실패: ${message}. 테이블 panama_ingredient_eligibility와 INN 값을 확인하세요.`,
      );
    }
  }
  if (queryErrors.length > 0) {
    return {
      grade: "unknown",
      verdict: "판정 데이터 테이블 미연결로 자동 판정 보류",
      duration_days: null,
      cost_usd: null,
      path: "no_path",
      evidence: {
        type: "query_error",
        errors: queryErrors,
        product_id: productId,
        panama_row_count: panamaRows.length,
      },
    };
  }

  if (regData?.identical_set_registered === true) {
    return {
      grade: "A_immediate",
      verdict: `동일 조합 다수 등록 확인 (${regData.identical_registration_no ?? "등록번호 미상"}). 즉시 진입 가능`,
      duration_days: toFiniteNumber(regData.estimated_duration_days) ?? 35,
      cost_usd: toFiniteNumber(regData.estimated_cost_usd) ?? 500,
      path:
        typeof regData.registration_path === "string" &&
        regData.registration_path.trim() !== ""
          ? regData.registration_path.trim()
          : "wla_korea_fast",
      evidence: {
        type: "identical_set_match",
        registration_no: regData.identical_registration_no ?? null,
        examples: toStringArray(regData.identical_examples),
      },
    };
  }

  if (regData?.similar_combination_exists === true) {
    return {
      grade: "B_short_term",
      verdict: "유사 조합 등록, 자사 제품 차별화로 단기 진입 가능",
      duration_days: toFiniteNumber(regData.estimated_duration_days) ?? 40,
      cost_usd: toFiniteNumber(regData.estimated_cost_usd) ?? 500,
      path:
        typeof regData.registration_path === "string" &&
        regData.registration_path.trim() !== ""
          ? regData.registration_path.trim()
          : "wla_korea_fast",
      evidence: {
        type: "similar_combination_match",
        examples: toStringArray(regData.similar_examples),
      },
    };
  }

  const ingredientStatuses = ingredients.map((inn) => {
    const found = ingData.find((row) => row.inn === inn);
    return {
      inn,
      distributable: found?.panama_distributable === true,
      registration_no: found?.example_registration_no ?? null,
      market_status: found?.market_status ?? null,
    };
  });
  const allDistributable =
    ingredientStatuses.length > 0 &&
    ingredientStatuses.every((status) => status.distributable === true);

  if (allDistributable && product.is_combination_drug === true) {
    const someNiche = ingredientStatuses.some(
      (status) =>
        status.market_status === "niche" || status.market_status === "minimal",
    );

    if (someNiche) {
      return {
        grade: "D_long_term",
        verdict: "성분 유통 가능, 단 시장 미발달 → 시장 교육 + 신규 등록",
        duration_days: toFiniteNumber(regData?.estimated_duration_days) ?? 45,
        cost_usd: toFiniteNumber(regData?.estimated_cost_usd) ?? 500,
        path: "wla_korea_fast_with_market_education",
        evidence: {
          type: "underdeveloped_market",
          ingredient_statuses: ingredientStatuses,
          panama_row_count: panamaRows.length,
        },
      };
    }

    return {
      grade: "C_mid_term",
      verdict: "개별 성분 유통 가능, 복합제 신규 등록 필요 (WLA 트랙 활용)",
      duration_days: toFiniteNumber(regData?.estimated_duration_days) ?? 45,
      cost_usd: toFiniteNumber(regData?.estimated_cost_usd) ?? 500,
      path: "wla_korea_fast",
      evidence: {
        type: "individual_ingredients_only",
        ingredient_statuses: ingredientStatuses,
        panama_row_count: panamaRows.length,
      },
    };
  }

  if (allDistributable && product.is_combination_drug !== true) {
    return {
      grade: "B_short_term",
      verdict: "단일 성분 유통 가능, WLA 트랙으로 단기 진입",
      duration_days: 40,
      cost_usd: 500,
      path: "wla_korea_fast",
      evidence: {
        type: "single_ingredient_distributable",
        ingredient_statuses: ingredientStatuses,
        panama_row_count: panamaRows.length,
      },
    };
  }

  return {
    grade: "F_blocked",
    verdict: "일부 성분 파나마 유통 불가, 진출 불가",
    duration_days: null,
    cost_usd: null,
    path: "no_path",
    evidence: {
      type: "ingredients_not_distributable",
      ingredient_statuses: ingredientStatuses,
      panama_row_count: panamaRows.length,
    },
  };
}

export function feasibilityToReportText(f: EntryFeasibility): string {
  const gradeIcon: Record<EntryFeasibility["grade"], string> = {
    A_immediate: "🥇",
    B_short_term: "🥈",
    C_mid_term: "🥉",
    D_long_term: "4th",
    F_blocked: "❌",
    unknown: "?",
  };

  const pathLabel: Record<string, string> = {
    wla_korea_fast: "WLA 한국 트랙 (위생선진국 패스트트랙)",
    wla_korea_fast_with_market_education: "WLA 트랙 + 시장 교육 병행",
    standard_minsa: "표준 MINSA 트랙",
    special_track: "특수 트랙 (항암제/조영제)",
    no_path: "진출 경로 없음",
  };

  const lines = [
    `[진출 가능성 자동 판정] ${gradeIcon[f.grade]} ${f.grade}`,
    `근거: ${f.verdict}`,
    `경로: ${pathLabel[f.path] ?? f.path}`,
  ];

  if (f.duration_days !== null && f.duration_days > 0) {
    lines.push(
      `예상 기간: ${f.duration_days}일 (일반 트랙 1~2년 대비 ${Math.round(365 / f.duration_days)}배 단축)`,
    );
  }

  if (f.cost_usd !== null) {
    lines.push(`예상 비용: $${f.cost_usd}`);
  }

  return lines.join(". ");
}
