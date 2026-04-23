/**
 * ACODECO 페이지에서 의약품 관련 PDF의 실제 href 경로 출력
 */
import { Agent, fetch as undiciFetch } from "undici";

const ACODECO_AGENT = new Agent({ connect: { rejectUnauthorized: false } });
const ACODECO_PRICES_URL = "https://www.acodeco.gob.pa/inicio/estadisticas-precios/precios-2/";

async function main() {
  const res = await (undiciFetch as any)(ACODECO_PRICES_URL, {
    dispatcher: ACODECO_AGENT,
    headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html,*/*" },
  });
  const html: string = await res.text();

  const DRUG_SLUGS = ["Colesterol","Antihipertensivos","Antimigranosos","Antiasmáticos","Asma","Antibioticos","Antidiabéticos"];

  // 모든 href 추출 (href=".." 패턴)
  const hrefRe = /href="([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html)) !== null) {
    const href = m[1] ?? "";
    if (!href.toLowerCase().endsWith(".pdf")) continue;
    const filename = href.split("/").pop() ?? "";
    const isRelevant = DRUG_SLUGS.some(s => filename.toLowerCase().includes(s.toLowerCase()));
    if (isRelevant) {
      console.log(`FULL HREF: "${href}"`);
      console.log(`  → filename: ${filename}`);
    }
  }
}

main().catch(console.error);
