import type { ConflictLevel, PipelineTier } from "./types";

// 8제품 복합제 여부 (세션 19 확정 UUID 기준 product_key)
const IS_COMBINATION_DRUG: Record<string, boolean> = {
  rosumeg: true,
  atmeg: true,
  ciloduo: true,
  sereterol: true,
  gastiin: false,
  omethyl: false,
  gadvoa: false,
  hydrine: false,
};

const PRODUCT_INGREDIENTS: Record<
  string,
  {
    korean_name: string;
    ingredients: string[];
    primary: string;
    secondary?: string;
  }
> = {
  rosumeg: {
    korean_name: "Rosumeg Combigel",
    ingredients: ["Rosuvastatin", "Omega-3"],
    primary: "Rosuvastatin",
    secondary: "Omega-3",
  },
  atmeg: {
    korean_name: "Atmeg Combigel",
    ingredients: ["Atorvastatin", "Omega-3"],
    primary: "Atorvastatin",
    secondary: "Omega-3",
  },
  ciloduo: {
    korean_name: "Ciloduo",
    ingredients: ["Cilostazol", "Rosuvastatin"],
    primary: "Cilostazol",
    secondary: "Rosuvastatin",
  },
  sereterol: {
    korean_name: "Sereterol Activair",
    ingredients: ["Salmeterol", "Fluticasone"],
    primary: "Salmeterol",
    secondary: "Fluticasone",
  },
  gastiin: {
    korean_name: "Gastiin CR",
    ingredients: ["Mosapride"],
    primary: "Mosapride",
  },
  omethyl: {
    korean_name: "Omethyl Cutielet",
    ingredients: ["Omega-3"],
    primary: "Omega-3",
  },
  gadvoa: {
    korean_name: "Gadvoa Inj",
    ingredients: ["Gadobutrol"],
    primary: "Gadobutrol",
  },
  hydrine: {
    korean_name: "Hydrine",
    ingredients: ["Hydroxyurea"],
    primary: "Hydroxyurea",
  },
};

export function detectConflict(params: {
  product_key: string;
  pipeline_tier: PipelineTier;
  partner_matched_products: string[];
}): { level: ConflictLevel; insight: string } {
  const { product_key, pipeline_tier, partner_matched_products } = params;
  const product = PRODUCT_INGREDIENTS[product_key];
  const isCombination = IS_COMBINATION_DRUG[product_key] === true;

  if (!product) {
    return { level: "none", insight: "신규 라인업 확장 관점에서 접근 가능." };
  }

  if (pipeline_tier >= 3) {
    return {
      level: "none",
      insight: "신규 라인업 확장 관점에서 접근 가능.",
    };
  }

  if (pipeline_tier === 2) {
    return {
      level: "adjacent_category",
      insight:
        "동일 치료영역 운영 중이나 성분은 다릅니다. 파트너의 기존 처방의 네트워크 활용 가능성 높음.",
    };
  }

  if (pipeline_tier === 1 && isCombination) {
    const matched = partner_matched_products.join(", ");
    return {
      level: "upgrade_opportunity",
      insight:
        "⚠ Conflict: 이 파트너는 자체 " +
        product.primary +
        " 단일제(" +
        matched +
        ")를 생산·유통 중입니다. " +
        "💡 Opportunity: 우리 " +
        product.korean_name +
        "은 " +
        product.ingredients.join(" + ") +
        " 복합제로, " +
        "파트너는 이미 " +
        product.primary +
        " 유통 채널을 보유한 상태입니다. " +
        "자체 생산 대비 복합제 포트폴리오를 확장하며 마진을 추가 확보할 수 있는 Upgrade 제안이 가능합니다. " +
        "제안 시나리오: 자체 단일제는 유지하되, 복합제 수요층은 우리 제품 수입·유통으로 커버.",
    };
  }

  if (pipeline_tier === 1 && !isCombination) {
    return {
      level: "direct_competition",
      insight:
        "⚠ Conflict: 이 파트너는 동일 성분(" +
        product.primary +
        ") 자체 생산 중입니다. 대체 유통 제안 어려움. 보조 파트너 또는 타 채널 우선 검토.",
    };
  }

  return { level: "none", insight: "신규 라인업 확장 관점에서 접근 가능." };
}
