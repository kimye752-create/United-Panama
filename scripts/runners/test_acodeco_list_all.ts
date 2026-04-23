/**
 * ACODECO 페이지에 있는 모든 PDF 목록 출력
 */
import { Agent, fetch as undiciFetch } from "undici";

const ACODECO_AGENT = new Agent({ connect: { rejectUnauthorized: false } });
const ACODECO_PRICES_URL = "https://www.acodeco.gob.pa/inicio/estadisticas-precios/precios-2/";

async function main() {
  const res = await (undiciFetch as any)(ACODECO_PRICES_URL, {
    dispatcher: ACODECO_AGENT,
    headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html,*/*" },
  });
  console.log("HTTP:", res.status);
  const html: string = await res.text();

  // 모든 PDF href 추출
  const hrefRe = /href="([^"]+\.pdf)"/gi;
  const all = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html)) !== null) {
    all.add(m[1] ?? "");
  }
  console.log(`\n전체 PDF 링크 ${all.size}개:`);
  for (const href of all) {
    const filename = href.split("/").pop() ?? href;
    console.log(" -", filename);
  }
}

main().catch(console.error);
