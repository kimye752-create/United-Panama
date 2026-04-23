/**
 * ACODECO PDF 파싱 테스트 — Colesterol PDF 다운로드 후 약품 행 추출 확인
 */
import { Agent, fetch as undiciFetch } from "undici";
import { PDFParse } from "pdf-parse";
import { TARGET_PRODUCTS } from "../../src/utils/product-dictionary.js";

const ACODECO_AGENT = new Agent({ connect: { rejectUnauthorized: false } });
const PDF_URL = "https://www.acodeco.gob.pa/inicio/wp-content/uploads/2025/08/Colesterol_Julio2025.pdf";

async function main() {
  console.log("[test] PDF 다운로드:", PDF_URL);
  const res = await (undiciFetch as any)(PDF_URL, {
    dispatcher: ACODECO_AGENT,
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
  });
  console.log("[test] HTTP", res.status);
  if (!res.ok) { console.error("다운로드 실패"); process.exit(1); }

  const buf = Buffer.from(await res.arrayBuffer());
  console.log("[test] 버퍼 크기:", buf.length, "bytes");

  // PDF 파싱
  const parser = new PDFParse({ data: new Uint8Array(buf) });
  const result = await parser.getText() as { pages: Array<{ text: string }> };
  const fullText = result.pages.map(p => p.text).join("\n");
  const lines = fullText.split("\n");

  console.log(`[test] 전체 줄 수: ${lines.length}`);
  console.log("\n--- 샘플 줄 (처음 30개) ---");
  lines.slice(0, 30).forEach((l, i) => console.log(`  ${i+1}: ${l}`));

  // 약품 행 필터링
  const drugLines: string[] = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length < 5) continue;
    if (!/^[A-ZÁÉÍÓÚÑ]/u.test(line)) continue;
    const lowerLine = line.toLowerCase();
    const hasPresentation = ["mg","ml","caja","tab","cap","amp","iny","susp"].some(k => lowerLine.includes(k));
    if (!hasPresentation) continue;
    const numTokens = [...line.matchAll(/(\d+[.,]\d+|\d{1,3})/g)]
      .map(m2 => parseFloat((m2[0]??"").replace(",",".")))
      .filter(n => Number.isFinite(n) && n > 0 && n < 1000);
    if (numTokens.length < 1) continue;
    drugLines.push(line);
  }
  console.log(`\n--- 약품 행 ${drugLines.length}개 ---`);
  drugLines.slice(0, 20).forEach(l => console.log(" ·", l));

  // 매칭 테스트
  console.log("\n--- 제품 매칭 테스트 ---");
  for (const line of drugLines) {
    const lower = line.toLowerCase();
    for (const p of TARGET_PRODUCTS) {
      const innTokens = p.who_inn_en.toLowerCase().split(/[\s+&,]+/);
      const innMatch = innTokens.some(tok => tok.length > 3 && lower.includes(tok));
      const kwMatch = p.panama_search_keywords.some(kw => kw.length > 3 && lower.includes(kw.toLowerCase()));
      if (innMatch || kwMatch) {
        console.log(`  ✅ [${p.product_id} / ${p.kr_brand_name}] ← ${line.slice(0, 80)}`);
        break;
      }
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
