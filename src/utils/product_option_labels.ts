import type { ProductMaster } from "./product-dictionary";

/** 드롭다운 라벨용 정적 메타 (DB/스키마와 별도) */
export type ProductOptionMeta = {
  therapeutic_group: string;
  /** 복합제, BILDAS 서방형, DPI 등. 없으면 대괄호에 제품군만 표시 */
  drug_type?: string;
  inn_display: string;
  dosage_form: string;
  strength_display: string;
};

const PRODUCT_OPTION_META: Record<string, ProductOptionMeta> = {
  "bdfc9883-6040-438a-8e7a-df01f1230682": {
    therapeutic_group: "항암제",
    inn_display: "Hydroxyurea",
    dosage_form: "캡슐",
    strength_display: "500mg",
  },
  "fcae4399-aa80-4318-ad55-89d6401c10a9": {
    therapeutic_group: "혈전+지질",
    drug_type: "복합제",
    inn_display: "Cilostazol + Rosuvastatin",
    dosage_form: "정제",
    strength_display: "100mg + 5mg",
  },
  "24738c3b-3a5b-40a9-9e8e-889ec075b453": {
    therapeutic_group: "소화제",
    drug_type: "BILDAS 서방형",
    inn_display: "Mosapride Citrate",
    dosage_form: "CR 정제",
    strength_display: "5mg",
  },
  "2504d79b-c2ce-4660-9ea7-5576c8bb755f": {
    therapeutic_group: "고지혈증",
    drug_type: "복합제",
    inn_display: "Rosuvastatin + Omega-3",
    dosage_form: "연질캡슐",
    strength_display: "10mg + 1g",
  },
  "859e60f9-8544-43b3-a6a0-f6c7529847eb": {
    therapeutic_group: "고지혈증",
    drug_type: "복합제",
    inn_display: "Atorvastatin + Omega-3",
    dosage_form: "연질캡슐",
    strength_display: "20mg + 1g",
  },
  "014fd4d2-dc66-4fc1-8d4f-59695183387f": {
    therapeutic_group: "천식 흡입기",
    drug_type: "DPI",
    inn_display: "Salmeterol + Fluticasone",
    dosage_form: "흡입기",
    strength_display: "50μg + 250μg",
  },
  "f88b87b8-c0ab-4f6e-ba34-e9330d1d4e18": {
    therapeutic_group: "고지혈증",
    inn_display: "Omega-3",
    dosage_form: "연질캡슐",
    strength_display: "1g",
  },
  "895f49ae-6ce3-44a3-93bd-bb77e027ba59": {
    therapeutic_group: "MRI 조영제",
    inn_display: "Gadobutrol",
    dosage_form: "프리필드시린지",
    strength_display: "7.5ml",
  },
};

/**
 * 1공정 품목 선택 드롭다운 한 줄.
 * 포맷: [therapeutic_group · drug_type] brand (INN, dosage_form, strength) — drug_type 없으면 [therapeutic_group] 만
 */
export function formatProductOptionLabel(product: ProductMaster): string {
  const meta = PRODUCT_OPTION_META[product.product_id];
  if (meta === undefined) {
    return `${product.kr_brand_name} (${product.who_inn_en})`;
  }
  return formatProductOptionLabelWithMeta(product, meta);
}

/** 메타를 직접 넘겨 라벨을 만들 때 (테스트·스토리북용) */
export function formatProductOptionLabelWithMeta(
  product: ProductMaster,
  meta: ProductOptionMeta,
): string {
  const brand = product.kr_brand_name;
  const groupPart =
    meta.drug_type !== undefined && meta.drug_type.trim() !== ""
      ? `${meta.therapeutic_group} · ${meta.drug_type}`
      : meta.therapeutic_group;
  const detail = `${meta.inn_display}, ${meta.dosage_form}, ${meta.strength_display}`;
  return `[${groupPart}] ${brand} (${detail})`;
}
