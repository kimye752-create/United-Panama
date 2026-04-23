/**
 * panama_paper_citations 수집기
 * Haiku LLM이 PubMed / WHO / PAHO / MINSA 기반 논문·규제문서 3건을 생성
 * 실제 PubMed URL 패턴: https://pubmed.ncbi.nlm.nih.gov/?term=INN+panama
 *
 * 실행: npx ts-node src/crawlers/collect_paper_citations.ts <product_id> <inn> <atc4_code>
 */
import { createSupabaseServer } from "@/lib/supabase-server";
import Anthropic from "@anthropic-ai/sdk";
import type { Tool } from "@anthropic-ai/sdk/resources/messages/messages.js";

interface CitationItem {
  no:          number;
  title:       string;
  authors:     string;
  journal:     string;
  year:        number;
  source_org:  string;
  url:         string;
  summary_ko:  string;
  relevance:   string;
}

const CITATION_TOOL: Tool = {
  name: "generate_paper_citations",
  description: "제품 INN 기반 PubMed·WHO·PAHO 논문/규제문서 3건 인용 생성",
  input_schema: {
    type: "object",
    properties: {
      citations: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          properties: {
            no:         { type: "integer" },
            title:      { type: "string", description: "논문/문서 제목 (영문 원문)" },
            authors:    { type: "string", description: "저자 (First Author et al.)" },
            journal:    { type: "string", description: "학술지/기관명" },
            year:       { type: "integer" },
            source_org: { type: "string", description: "PubMed / WHO / PAHO / MINSA / Lancet 등" },
            url:        { type: "string", description: "실제 접근 가능한 URL (PubMed PMID 포함)" },
            summary_ko: { type: "string", description: "1~2문장 한국어 요약" },
            relevance:  { type: "string", description: "파나마 시장 연관성 1문장" },
          },
          required: ["no","title","authors","journal","year","source_org","url","summary_ko","relevance"],
        },
      },
    },
    required: ["citations"],
  },
};

async function fetchCitationsLLM(
  inn:      string,
  atc4Code: string,
  productId: string,
): Promise<CitationItem[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey?.trim()) return [];

  const client = new Anthropic({ apiKey });
  const prompt = `
아래 의약품에 대해 파나마/중남미 시장과 관련된 실제 논문 또는 규제 문서 3건을 인용한다.

- INN (성분명): ${inn}
- ATC4 코드: ${atc4Code}

인용 기준:
1) PubMed에 등재된 실제 논문 (PMID 포함 URL: https://pubmed.ncbi.nlm.nih.gov/{PMID}/)
2) WHO EML 또는 PAHO 보고서 (공식 URL 포함)
3) MINSA 파나마 등록 관련 문서 또는 최신 치료 가이드라인

각 인용은:
- 실제 존재하는 논문/문서
- PubMed URL은 정확한 PMID 포함
- 한국어 요약 1~2문장
- 파나마 시장 연관성 명시
`.trim();

  try {
    const resp = await client.messages.create({
      model:       "claude-haiku-4-5-20251001",
      max_tokens:  1200,
      temperature: 0,
      tools:       [CITATION_TOOL],
      tool_choice: { type: "tool", name: "generate_paper_citations" },
      messages:    [{ role: "user", content: prompt }],
    });
    const block = resp.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") return [];
    const raw = (block.input as { citations: CitationItem[] }).citations;
    return Array.isArray(raw) ? raw : [];
  } catch (e) {
    process.stderr.write(`[paper_citations] LLM 실패: ${String(e)}\n`);
    return [];
  }
}

export async function collectPaperCitations(
  productId: string,
  inn:       string,
  atc4Code:  string,
): Promise<void> {
  const supabase = createSupabaseServer();

  const citations = await fetchCitationsLLM(inn, atc4Code, productId);
  if (citations.length === 0) {
    process.stderr.write(`[paper_citations] ${productId} — 인용 없음\n`);
    return;
  }

  // 기존 인용 삭제 후 재적재 (최신 상태 유지)
  await supabase.from("panama_paper_citations")
    .delete()
    .eq("product_id", productId);

  const rows = citations.map((c) => ({
    product_id:  productId,
    inn,
    atc4_code:   atc4Code,
    citation_no: c.no,
    title:       c.title,
    authors:     c.authors,
    journal:     c.journal,
    year:        c.year,
    source_org:  c.source_org,
    url:         c.url,
    summary_ko:  c.summary_ko,
    relevance:   c.relevance,
  }));

  const { error } = await supabase.from("panama_paper_citations").insert(rows);
  if (error) {
    process.stderr.write(`[paper_citations] 적재 실패: ${error.message}\n`);
  } else {
    process.stdout.write(`[paper_citations] ${productId} — ${rows.length}건 적재 완료\n`);
  }
}

// CLI 실행
if (require.main === module) {
  const [, , productId, inn, atc4Code] = process.argv;
  if (!productId || !inn || !atc4Code) {
    process.stderr.write("Usage: collect_paper_citations <product_id> <inn> <atc4_code>\n");
    process.exit(1);
  }
  collectPaperCitations(productId, inn, atc4Code)
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1); });
}
