import type {
  ImportExperienceLevel,
  PharmacyChainLevel,
  PipelineTier,
  RevenueDataSource,
  RevenueTier,
} from "./types";

const REVENUE_TIER_SCORE: Record<RevenueTier, number> = {
  1: 100,
  2: 80,
  3: 60,
  4: 40,
  5: 20,
};

const REVENUE_TIER_LABEL: Record<RevenueTier, string> = {
  1: "Tier 1 ($100M+)",
  2: "Tier 2 ($50M~$100M)",
  3: "Tier 3 ($10M~$50M)",
  4: "Tier 4 ($1M~$10M)",
  5: "Tier 5 (<$1M 또는 미공개)",
};

export function quantizeRevenue(params: {
  revenue_usd: number | null;
  employee_count: number | null;
  year_established: number | null;
}): {
  tier: RevenueTier;
  score: number;
  label: string;
  source: RevenueDataSource;
} {
  const { revenue_usd, employee_count, year_established } = params;

  if (revenue_usd !== null && revenue_usd > 0) {
    let tier: RevenueTier;
    if (revenue_usd >= 100_000_000) {
      tier = 1;
    } else if (revenue_usd >= 50_000_000) {
      tier = 2;
    } else if (revenue_usd >= 10_000_000) {
      tier = 3;
    } else if (revenue_usd >= 1_000_000) {
      tier = 4;
    } else {
      tier = 5;
    }

    return {
      tier,
      score: REVENUE_TIER_SCORE[tier],
      label: REVENUE_TIER_LABEL[tier],
      source: "dnb_official",
    };
  }

  if (employee_count !== null && employee_count >= 100) {
    return {
      tier: 3,
      score: REVENUE_TIER_SCORE[3],
      label: `${REVENUE_TIER_LABEL[3]} (직원수 추정)`,
      source: "estimated_by_employees",
    };
  }

  const currentYear = new Date().getFullYear();
  if (year_established !== null && currentYear - year_established >= 35) {
    return {
      tier: 4,
      score: REVENUE_TIER_SCORE[4],
      label: `${REVENUE_TIER_LABEL[4]} (설립연도 추정)`,
      source: "estimated_by_age",
    };
  }

  return {
    tier: 5,
    score: REVENUE_TIER_SCORE[5],
    label: REVENUE_TIER_LABEL[5],
    source: "missing",
  };
}

const PIPELINE_TIER_SCORE: Record<PipelineTier, number> = {
  1: 100,
  2: 80,
  3: 60,
  4: 40,
  5: 20,
};

const PIPELINE_TIER_LABEL: Record<PipelineTier, string> = {
  1: "Tier 1 (동일 성분 취급)",
  2: "Tier 2 (동일 ATC 계열 취급)",
  3: "Tier 3 (동일 치료영역 취급)",
  4: "Tier 4 (일반 의약품 유통)",
  5: "Tier 5 (매칭 없음/미확인)",
};

export function quantizePipeline(tier: PipelineTier): {
  score: number;
  label: string;
} {
  return {
    score: PIPELINE_TIER_SCORE[tier],
    label: PIPELINE_TIER_LABEL[tier],
  };
}

export function quantizeManufacturing(hasManufacturing: boolean): {
  score: number;
  label: string;
} {
  return hasManufacturing
    ? { score: 100, label: "제조소 보유" }
    : { score: 0, label: "제조소 미보유" };
}

export function quantizeImportExperience(level: ImportExperienceLevel): {
  score: number;
  label: string;
} {
  const map: Record<ImportExperienceLevel, { score: number; label: string }> = {
    abundant: { score: 100, label: "수입경험 풍부 (3건+)" },
    some: { score: 50, label: "수입경험 있음 (1~2건)" },
    none: { score: 0, label: "수입경험 미확인" },
  };
  return map[level];
}

export function quantizePharmacyChain(level: PharmacyChainLevel): {
  score: number;
  label: string;
} {
  const map: Record<PharmacyChainLevel, { score: number; label: string }> = {
    large: { score: 100, label: "대형 약국체인 (10개+)" },
    small: { score: 50, label: "소형 약국 (1~9개)" },
    none: { score: 0, label: "약국 미운영" },
  };
  return map[level];
}
