/**
 * panama_therapeutic_stats 수집기
 * 1) World Bank API — 파나마 보건 지출 GDP%, 1인당 지출
 * 2) Anthropic Haiku — 치료영역별 유병률 + 시장 규모 (PAHO/IQVIA 기반 서술)
 *
 * 실행: npx ts-node src/crawlers/collect_therapeutic_stats.ts <product_id> <atc4_code> <therapeutic_area>
 * 예:  npx ts-node src/crawlers/collect_therapeutic_stats.ts prod_001 C09A "cardiovascular"
 */
import { createSupabaseServer } from "@/lib/supabase-server";
import Anthropic from "@anthropic-ai/sdk";
import type { Tool } from "@anthropic-ai/sdk/resources/messages/messages.js";

const WB_BASE = "https://api.worldbank.org/v2/country/PA/indicator";

// ─── World Bank API 호출 ──────────────────────────────────────────────────────

interface WBValue { value: number | null; date: string }

async function fetchWorldBank(indicator: string): Promise<WBValue | null> {
  try {
    const res = await fetch(`${WB_BASE}/${indicator}?format=json&mrv=3`);
    if (!res.ok) return null;
    const json = (await res.json()) as [unknown, WBValue[]];
    const rows = json[1] ?? [];
    // 가장 최신 non-null 값 반환
    const hit = rows.find((r) => r.value !== null);
    return hit ?? null;
  } catch { return null; }
}

// ─── Haiku LLM: 치료영역 유병률 + 시장 규모 ────────────────────────────────

const THER_TOOL: Tool = {
  name: "generate_therapeutic_stats",
  description: "파나마 특정 치료영역의 유병률·시장 규모를 반환한다.",
  input_schema: {
    type: "object",
    properties: {
      prevalence_rate_pct: {
        type: "number",
        description: "파나마 성인 인구 대비 유병률 % (PAHO/WHO 기준, 없으면 null)",
      },
      prevalence_source: { type: "string", description: "출처 기관명 (예: PAHO PLISA 2023)" },
      prevalence_year:   { type: "integer", description: "통계 기준 연도" },
      therapeutic_market_usd: {
        type: "number",
        description: "파나마 해당 치료영역 의약품 시장 규모 USD (없으면 null)",
      },
      therapeutic_market_source: { type: "string", description: "출처 (예: IQVIA 2024, Statista)" },
      therapeutic_market_year:   { type: "integer" },
    },
    required: [
      "prevalence_rate_pct", "prevalence_source", "prevalence_year",
      "therapeutic_market_usd", "therapeutic_market_source", "therapeutic_market_year",
    ],
  },
};

interface TherPayload {
  prevalence_rate_pct:        number | null;
  prevalence_source:          string;
  prevalence_year:            number;
  therapeutic_market_usd:     number | null;
  therapeutic_market_source:  string;
  therapeutic_market_year:    number;
}

async function fetchTherStatsLLM(
  therapeuticArea: string,
  atc4Code: string,
): Promise<TherPayload | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey?.trim()) return null;

  const client = new Anthropic({ apiKey });
  const prompt = `
파나마(Panama) 의약품 시장에서 아래 치료영역의 PAHO/WHO/IQVIA 기반 통계를 조회한다.
- 치료영역: ${therapeuticArea}
- ATC4 코드: ${atc4Code}

파나마 인구: 435만 명 (2024, World Bank)
파나마 전체 의약품 시장: USD 496M (2024, Statista)

1) 해당 치료영역 파나마 유병률 (성인 대비 %)
2) 해당 치료영역 파나마 의약품 시장 규모 (USD)

출처는 PAHO PLISA, WHO GHO, IQVIA, Statista 중 가장 적합한 것 사용.
데이터가 없으면 null 반환.
`.trim();

  try {
    const resp = await client.messages.create({
      model:       "claude-haiku-4-5-20251001",
      max_tokens:  400,
      temperature: 0,
      tools:       [THER_TOOL],
      tool_choice: { type: "tool", name: "generate_therapeutic_stats" },
      messages:    [{ role: "user", content: prompt }],
    });
    const block = resp.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") return null;
    return block.input as TherPayload;
  } catch { return null; }
}

// ─── 메인 수집 함수 ───────────────────────────────────────────────────────────

export async function collectTherapeuticStats(
  productId:      string,
  atc4Code:       string,
  therapeuticArea: string,
): Promise<void> {
  const supabase = createSupabaseServer();

  // 1. World Bank
  const [expPct, expPc] = await Promise.all([
    fetchWorldBank("SH.XPD.CHEX.GD.ZS"), // 보건지출 GDP%
    fetchWorldBank("SH.XPD.CHEX.PC.CD"), // 1인당 보건지출 USD
  ]);

  // 2. LLM 치료영역 통계
  const therStats = await fetchTherStatsLLM(therapeuticArea, atc4Code);

  // 3. Supabase 적재 (upsert — product_id + atc4_code 중복 방지)
  const { error } = await supabase.from("panama_therapeutic_stats").upsert(
    {
      product_id:   productId,
      atc4_code:    atc4Code,
      therapeutic_area: therapeuticArea,

      health_expenditure_pct_gdp:       expPct?.value  ?? null,
      health_expenditure_usd_per_capita: expPc?.value  ?? null,

      prevalence_rate_pct:       therStats?.prevalence_rate_pct       ?? null,
      prevalence_source:         therStats?.prevalence_source          ?? null,
      prevalence_year:           therStats?.prevalence_year            ?? null,
      therapeutic_market_usd:    therStats?.therapeutic_market_usd    ?? null,
      therapeutic_market_source: therStats?.therapeutic_market_source ?? null,
      therapeutic_market_year:   therStats?.therapeutic_market_year   ?? null,

      data_source: "worldbank_api+llm_search",
      raw_response: {
        worldbank_exp_pct: expPct,
        worldbank_exp_pc:  expPc,
        llm_ther:          therStats,
      },
    },
    { onConflict: "product_id,atc4_code" },
  );

  if (error) {
    process.stderr.write(`[therapeutic_stats] 적재 실패: ${error.message}\n`);
  } else {
    process.stdout.write(
      `[therapeutic_stats] ${productId}/${atc4Code} 적재 완료\n`,
    );
  }
}

// CLI 실행
if (require.main === module) {
  const [, , productId, atc4Code, therapeuticArea] = process.argv;
  if (!productId || !atc4Code || !therapeuticArea) {
    process.stderr.write("Usage: collect_therapeutic_stats <product_id> <atc4_code> <therapeutic_area>\n");
    process.exit(1);
  }
  collectTherapeuticStats(productId, atc4Code, therapeuticArea)
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1); });
}
