/**
 * ACODECO PDF 크롤러 테스트 — PDF 검색 + 파싱 미리보기 (DB INSERT 없음)
 */
import { Agent, fetch as undiciFetch } from "undici";

const ACODECO_AGENT = new Agent({ connect: { rejectUnauthorized: false } });
const ACODECO_PRICES_URL = "https://www.acodeco.gob.pa/inicio/estadisticas-precios/precios-2/";
const ACODECO_BASE = "https://www.acodeco.gob.pa";
const RELEVANT_SLUGS = [
  "Colesterol", "Antihipertensivos", "Antimigranosos", "Antiasmáticos",
  "Asma", "Antibioticos", "Antidiabéticos",
];

const MONTH_MAP: Record<string, number> = {
  enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,
  julio:7,agosto:8,septiembre:9,octubre:10,noviembre:11,diciembre:12,
};

async function acodecFetch(url: string) {
  const res = await undiciFetch(url, {
    dispatcher: ACODECO_AGENT,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,*/*;q=0.9",
    },
  } as Parameters<typeof undiciFetch>[1]);
  return res as unknown as Response;
}

async function main() {
  console.log("[test] ACODECO 가격 페이지 접속 중...");
  const res = await acodecFetch(ACODECO_PRICES_URL);
  console.log(`[test] HTTP ${res.status}`);
  if (!res.ok) { console.error("페이지 접속 실패"); process.exit(1); }

  const html = await res.text();
  const hrefRe = /href="(\/inicio\/wp-content\/uploads\/\d{4}\/\d{2}\/([^"]+\.pdf))"/gi;
  const found: { slug: string; url: string; date: string }[] = [];
  let m: RegExpExecArray | null;

  while ((m = hrefRe.exec(html)) !== null) {
    const path = m[1] ?? "";
    const filename = m[2] ?? "";
    const matchedSlug = RELEVANT_SLUGS.find(s => filename.toLowerCase().includes(s.toLowerCase()));
    if (!matchedSlug) continue;
    const nm = filename.toLowerCase().match(/_([a-záéíóú]+)(\d{4})/);
    if (!nm) continue;
    const month = MONTH_MAP[nm[1] ?? ""] ?? null;
    const year = parseInt(nm[2] ?? "0", 10);
    if (!month || year < 2020) continue;
    found.push({ slug: matchedSlug, url: `${ACODECO_BASE}${path}`, date: `${year}-${String(month).padStart(2, "0")}` });
  }

  // 슬러그별 최신 하나만
  const latestMap = new Map<string, { url: string; date: string }>();
  for (const f of found) {
    const ex = latestMap.get(f.slug);
    if (!ex || f.date > ex.date) latestMap.set(f.slug, { url: f.url, date: f.date });
  }

  console.log(`\n[test] 발견 PDF ${found.length}개 → 최신 ${latestMap.size}개:`);
  for (const [slug, { url, date }] of latestMap) {
    console.log(`  ${slug} (${date}): ${url}`);
  }

  if (latestMap.size === 0) {
    console.log("[test] 관련 PDF 없음 — ACODECO 페이지 구조 변경 가능");
  }
}

main().catch(e => { console.error(e); process.exit(1); });
