/// <reference types="node" />

import type { PartnerCandidate } from "@/src/types/phase3_partner";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const HAIKU_MODEL = "claude-haiku-4-5-20251001";

function toBooleanOrNull(value: unknown): boolean | null {
  if (value === true || value === false) {
    return value;
  }
  return null;
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return null;
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value === "string" && value.trim() !== "") {
    return value.trim();
  }
  return null;
}

function toStringArrayOrNull(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const out: string[] = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim() !== "") {
      out.push(item.trim());
    }
  }
  return out.length > 0 ? out : null;
}

function extractText(raw: unknown): string {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return "";
  }
  const blocks = (raw as Record<string, unknown>)["content"];
  if (!Array.isArray(blocks)) {
    return "";
  }
  const texts: string[] = [];
  for (const block of blocks) {
    if (typeof block !== "object" || block === null || Array.isArray(block)) {
      continue;
    }
    const row = block as Record<string, unknown>;
    if (row["type"] === "text" && typeof row["text"] === "string") {
      texts.push(row["text"]);
    }
  }
  return texts.join("\n").trim();
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const candidates = [trimmed];
  const fenced = [...trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)];
  for (const match of fenced) {
    if (match[1] !== undefined) {
      candidates.push(match[1]);
    }
  }
  for (const candidate of candidates) {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start < 0 || end <= start) {
      continue;
    }
    try {
      const parsed = JSON.parse(candidate.slice(start, end + 1)) as unknown;
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      continue;
    }
  }
  return null;
}

export interface ProductContext {
  productName: string;
  inn: string;
  therapeuticArea: string;
}

/**
 * 바이어 후보 기업이 해당 의약품과 왜 맞는지 한 문장 연관성 이유를 LLM으로 생성한다.
 * 기업 정보(파이프라인·치료영역·수입이력)와 제품 정보를 결합하여 구체적인 설명을 생성.
 */
export async function generateProductRelevanceReason(
  candidate: PartnerCandidate,
  product: ProductContext,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey === undefined || apiKey.trim() === "") {
    return "해당 제품의 치료 영역 취급 이력을 보유한 기업으로 적합성이 확인됩니다.";
  }

  const ta = (candidate.therapeutic_areas ?? []).join(", ") || "정보 없음";
  const products = (candidate.registered_products ?? []).slice(0, 5).join(", ") || "정보 없음";
  const importExp = candidate.import_history === true ? "수입 이력 있음" : "수입 이력 불명";
  const mah = candidate.mah_capable === true ? "MAH 역량 보유" : "";

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey.trim(),
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: HAIKU_MODEL,
        temperature: 0.2,
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content:
              `파나마 제약 바이어 "${candidate.company_name}"이(가) 한국유나이티드제약의 수출 의약품 "${product.productName}(${product.inn}, 치료영역: ${product.therapeuticArea})"을 취급하기에 왜 적합한지, 아래 회사 정보를 바탕으로 한국어 2~3문장으로 구체적으로 설명하시오.\n` +
              `회사 치료 영역: ${ta}\n` +
              `등록/취급 제품 예시: ${products}\n` +
              `수입 경험: ${importExp}\n` +
              `${mah !== "" ? `${mah}\n` : ""}` +
              `설명에는 반드시 제품의 치료 영역과 회사의 기존 파이프라인/이력 간 연관성을 포함하시오. 추측이나 과장 없이 사실에 근거하시오.`,
          },
        ],
      }),
    });
    if (!response.ok) {
      return "해당 제품 취급에 필요한 유통 역량을 갖춘 기업입니다.";
    }
    const raw = (await response.json()) as unknown;
    const text = extractText(raw).trim();
    return text.length > 20 ? text.slice(0, 400) : "해당 제품 취급에 필요한 유통 역량을 갖춘 기업입니다.";
  } catch {
    return "해당 제품 취급에 필요한 유통 역량을 갖춘 기업입니다.";
  }
}

export async function enrichCandidateWithLLM(
  candidate: PartnerCandidate,
): Promise<PartnerCandidate> {
  if (process.env.PHASE3_ENABLE_ENRICH !== "1") {
    return candidate;
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey === undefined || apiKey.trim() === "") {
    return candidate;
  }
  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey.trim(),
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: HAIKU_MODEL,
        temperature: 0.1,
        max_tokens: 1200,
        messages: [
          {
            role: "user",
            content:
              `파나마 제약사 "${candidate.company_name}"의 심층 정보를 JSON 객체 하나로 반환하시오.\n` +
              "키: revenue_usd, employee_count, founded_year, therapeutic_areas, gmp_certified, " +
              "import_history, import_history_detail, public_procurement_wins, pharmacy_chain_operator, " +
              "mah_capable, korea_partnership, korea_partnership_detail, source_urls, " +
              "registered_products, cphi_category\n" +
              "registered_products: 파나마(MINSA DNFD)에 등록된 의약품 제품명 배열 (최대 10개, 모르면 null).\n" +
              "cphi_category: CPHI 또는 국제 전시회에서 분류되는 제약 카테고리 (예: Finished Dosage Forms, API, Generic Pharma, OTC 등, 모르면 null).\n" +
              "모르는 값은 null 또는 빈 배열로 두고 추정하지 마시오.",
          },
        ],
      }),
    });
    if (!response.ok) {
      return candidate;
    }
    const raw = (await response.json()) as unknown;
    const text = extractText(raw);
    const parsed = parseJsonObject(text);
    if (parsed === null) {
      return candidate;
    }
    return {
      ...candidate,
      revenue_usd: toNumberOrNull(parsed["revenue_usd"]) ?? candidate.revenue_usd,
      employee_count: toNumberOrNull(parsed["employee_count"]) ?? candidate.employee_count,
      founded_year: toNumberOrNull(parsed["founded_year"]) ?? candidate.founded_year,
      therapeutic_areas:
        toStringArrayOrNull(parsed["therapeutic_areas"]) ?? candidate.therapeutic_areas,
      gmp_certified: toBooleanOrNull(parsed["gmp_certified"]) ?? candidate.gmp_certified,
      import_history: toBooleanOrNull(parsed["import_history"]) ?? candidate.import_history,
      import_history_detail:
        toStringOrNull(parsed["import_history_detail"]) ?? candidate.import_history_detail,
      public_procurement_wins:
        toNumberOrNull(parsed["public_procurement_wins"]) ?? candidate.public_procurement_wins,
      pharmacy_chain_operator:
        toBooleanOrNull(parsed["pharmacy_chain_operator"]) ?? candidate.pharmacy_chain_operator,
      mah_capable: toBooleanOrNull(parsed["mah_capable"]) ?? candidate.mah_capable,
      korea_partnership: toBooleanOrNull(parsed["korea_partnership"]) ?? candidate.korea_partnership,
      korea_partnership_detail:
        toStringOrNull(parsed["korea_partnership_detail"]) ?? candidate.korea_partnership_detail,
      source_secondary: toStringArrayOrNull(parsed["source_urls"]) ?? candidate.source_secondary,
      registered_products:
        toStringArrayOrNull(parsed["registered_products"]) ?? candidate.registered_products,
      cphi_category: toStringOrNull(parsed["cphi_category"]) ?? candidate.cphi_category,
      collected_secondary_at: new Date().toISOString(),
    };
  } catch {
    return candidate;
  }
}

