/**
 * ACODECO PDF 발견 테스트 v2 — 수정된 정규식 검증
 */
import { Agent, fetch as undiciFetch } from "undici";

const ACODECO_AGENT = new Agent({ connect: { rejectUnauthorized: false } });
const ACODECO_PRICES_URL = "https://www.acodeco.gob.pa/inicio/estadisticas-precios/precios-2/";
const ACODECO_BASE = "https://www.acodeco.gob.pa";
const RELEVANT_SLUGS = ["Colesterol","Antihipertensivos","Antimigranosos","Antiasmáticos","Asma","Antibioticos","Antidiabéticos"];

const MONTH_MAP: Record<string, number> = {
  enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,octubre:10,noviembre:11,diciembre:12,
};

async function main() {
  const res = await (undiciFetch as any)(ACODECO_PRICES_URL, {
    dispatcher: ACODECO_AGENT,
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", Accept: "text/html,*/*" },
  });
  const html: string = await res.text();

  // 수정된 정규식 — 상대/전체 URL 모두 처리
  const hrefRe = /href="((?:https?:\/\/www\.acodeco\.gob\.pa)?\/inicio\/wp-content\/uploads\/\d{4}\/\d{2}\/([^"]+\.pdf))"/gi;
  const found: { slug: string; url: string; date: string }[] = [];
  let m: RegExpExecArray | null;

  while ((m = hrefRe.exec(html)) !== null) {
    const rawHref = m[1] ?? "";
    const filename = m[2] ?? "";
    const matchedSlug = RELEVANT_SLUGS.find(s => filename.toLowerCase().includes(s.toLowerCase()));
    if (!matchedSlug) continue;
    const nm = filename.toLowerCase().match(/_([a-záéíóú]+)(\d{4})/);
    if (!nm) continue;
    const month = MONTH_MAP[nm[1] ?? ""] ?? null;
    const year = parseInt(nm[2] ?? "0", 10);
    if (!month || year < 2020) continue;
    const url = rawHref.startsWith("http") ? rawHref : `${ACODECO_BASE}${rawHref}`;
    found.push({ slug: matchedSlug, url, date: `${year}-${String(month).padStart(2,"0")}` });
  }

  // 슬러그별 최신
  const latestMap = new Map<string, { url: string; date: string }>();
  for (const f of found) {
    const ex = latestMap.get(f.slug);
    if (!ex || f.date > ex.date) latestMap.set(f.slug, { url: f.url, date: f.date });
  }

  console.log(`발견 ${found.length}개 → 최신 ${latestMap.size}개:`);
  for (const [slug, { url, date }] of latestMap) {
    console.log(`  [${slug}] (${date}) ${url}`);
  }
}

main().catch(console.error);
