import type { ProductMaster } from "./product-dictionary";

/**
 * DB에 therapeutic_group / drug_type 등이 없을 때 드롭다운 라벨용 정적 메타.
 * 제형·함량은 대표 SKU 기준이며 실제 허가와 다를 수 있음.
 */
const PRODUCT_OPTION_META: Record<
  string,
  {
    therapeutic_group: string;
    drug_type: string;
    dosage_form_ko: string;
    strength_primary: string;
    strength_secondary?: string;
  }
> = {
  "bdfc9883-6040-438a-8e7a-df01f1230682": {
    therapeutic_group: "항암제",
    drug_type: "개량신약",
    dosage_form_ko: "캡슐",
    strength_primary: "500mg",
  },
  "fcae4399-aa80-4318-ad55-89d6401c10a9": {
    therapeutic_group: "순환기",
    drug_type: "개량신약",
    dosage_form_ko: "정제",
    strength_primary: "100mg",
    strength_secondary: "5mg",
  },
  "24738c3b-3a5b-40a9-9e8e-889ec075b453": {
    therapeutic_group: "소화기",
    drug_type: "개량신약",
    dosage_form_ko: "정제 CR",
    strength_primary: "5mg",
  },
  "2504d79b-c2ce-4660-9ea7-5576c8bb755f": {
    therapeutic_group: "순환기",
    drug_type: "개량신약",
    dosage_form_ko: "연질캡슐",
    strength_primary: "10mg",
    strength_secondary: "1g",
  },
  "859e60f9-8544-43b3-a6a0-f6c7529847eb": {
    therapeutic_group: "순환기",
    drug_type: "개량신약",
    dosage_form_ko: "연질캡슐",
    strength_primary: "20mg",
    strength_secondary: "1g",
  },
  "014fd4d2-dc66-4fc1-8d4f-59695183387f": {
    therapeutic_group: "호흡기",
    drug_type: "일반제",
    dosage_form_ko: "흡입제 DPI",
    strength_primary: "50μg",
    strength_secondary: "250μg",
  },
  "f88b87b8-c0ab-4f6e-ba34-e9330d1d4e18": {
    therapeutic_group: "순환기",
    drug_type: "개량신약",
    dosage_form_ko: "연질캡슐",
    strength_primary: "1g",
  },
  "895f49ae-6ce3-44a3-93bd-bb77e027ba59": {
    therapeutic_group: "영상진단",
    drug_type: "일반제",
    dosage_form_ko: "프리필드시린지",
    strength_primary: "7.5ml",
  },
};

function mapFormulationToKo(formulation: string): string {
  const f = formulation.trim();
  if (f === "") {
    return "";
  }
  if (/^Cap\.?$/i.test(f)) {
    return "캡슐";
  }
  if (/^Tab\.?\s*CR/i.test(f)) {
    return "정제 CR";
  }
  if (/^Tab\.?$/i.test(f)) {
    return "정제";
  }
  if (/Soft\s*Cap/i.test(f)) {
    return "연질캡슐";
  }
  if (/Inhaler/i.test(f)) {
    return "흡입제";
  }
  if (/Pouch/i.test(f)) {
    return "파우치";
  }
  if (/PFS|주사/i.test(f)) {
    return "주사";
  }
  return f;
}

/**
 * 1공정 품목 선택 드롭다운 한 줄 라벨.
 * 예: [항암제 · 개량신약] Hydrine (Hydroxyurea, 캡슐 500mg)
 */
export function formatProductOptionLabel(product: ProductMaster): string {
  const meta = PRODUCT_OPTION_META[product.product_id];
  const group = meta?.therapeutic_group ?? "";
  const type = meta?.drug_type ?? "";
  const brand = product.kr_brand_name;
  const form = meta?.dosage_form_ko ?? mapFormulationToKo(product.formulation);
  const strengthPrimary = meta?.strength_primary ?? "";
  const strengthSecondary = meta?.strength_secondary;

  let detailInner: string;
  if (
    product.is_combination_drug === true &&
    strengthSecondary !== undefined &&
    strengthPrimary !== ""
  ) {
    const parts = product.who_inn_en.split("+").map((s) => s.trim());
    if (parts.length >= 2) {
      detailInner = `${parts[0]} ${strengthPrimary} + ${parts[1]} ${strengthSecondary}`;
    } else {
      const formStrength = [form, strengthPrimary].filter((s) => s.trim() !== "").join(" ");
      detailInner = [product.who_inn_en.trim(), formStrength].filter((s) => s.trim() !== "").join(", ");
    }
  } else {
    const innFirst = product.who_inn_en.split("+")[0]?.trim() ?? product.who_inn_en.trim();
    const formStrength = [form, strengthPrimary].filter((s) => s.trim() !== "").join(" ");
    detailInner = [innFirst, formStrength].filter((s) => s.trim() !== "").join(", ");
  }

  const groupType = [group, type].filter((s) => s.trim() !== "").join(" · ");
  if (groupType !== "") {
    return `[${groupType}] ${brand} (${detailInner})`;
  }
  return `${brand} (${detailInner})`;
}
