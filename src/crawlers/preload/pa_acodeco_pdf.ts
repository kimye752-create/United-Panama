/**
 * ACODECO PDF 가격 크롤러
 * 소스: https://www.acodeco.gob.pa/inicio/estadisticas-precios/precios-2/
 *
 * ACODECO는 매월 치료영역별 의약품 소매가 PDF를 게시합니다.
 * 이 크롤러는:
 * 1) 가격 페이지를 스크래핑해 우리 제품 관련 카테고리의 최신 PDF URL을 찾고
 * 2) PDF를 다운로드해 제품명·가격 테이블을 파싱하고
 * 3) INN/키워드로 자사·경쟁사 제품을 매칭해 panama 테이블에 적재합니다.
 *
 * SSL 인증서 문제: undici Agent rejectUnauthorized: false 적용
 *
 * 실행: npx ts-node src/crawlers/preload/pa_acodeco_pdf.ts [--dry-run]
 */
/// <reference types="node" />

import { normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { Agent, fetch as undiciFetch } from "undici";
import { PDFParse } from "pdf-parse";

import {
  getSupabaseClient,
  PANAMA_TABLE,
  type PanamaPhase1InsertRow,
} from "../../utils/db_connector.js";
import { TARGET_PRODUCTS } from "../../utils/product-dictionary.js";

// ─── 상수 ───────────────────────────────────────────────────────────────────

const ACODECO_PRICES_URL =
  "https://www.acodeco.gob.pa/inicio/estadisticas-precios/precios-2/";
const ACODECO_BASE = "https://www.acodeco.gob.pa";
const PA_SOURCE = "acodeco_pdf" as const;

/** ACODECO SSL 인증서 만료 — rejectUnauthorized: false 적용 */
const ACODECO_AGENT = new Agent({ connect: { rejectUnauthorized: false } });

/** 우리 제품과 연관된 PDF 카테고리 슬러그 (파일명 부분 매칭) */
const RELEVANT_SLUGS = [
  "Colesterol",        // C10AA/C10AX — Rosumeg, Atmeg, Omethyl
  "Antihipertensivos", // B01AC/C09 — Ciloduo 경쟁 제품
  "Antimigranosos",    // 참고용
  "Antiasmáticos",     // R03AK — Sereterol 경쟁
  "Asma",              // R03 계열
  "Antibioticos",      // 범용
  "Antidiabéticos",    // 당뇨 참고
];

// ─── 헬퍼 ───────────────────────────────────────────────────────────────────

function isDryRun(): boolean {
  return process.argv.includes("--dry-run");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** ACODECO HTTPS fetch (SSL bypass) */
async function acodecFetch(url: string): Promise<Response> {
  const res = await undiciFetch(url, {
    dispatcher: ACODECO_AGENT,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,*/*;q=0.9",
    },
  } as Parameters<typeof undiciFetch>[1]);
  return res as unknown as Response;
}

/** 파일명에서 날짜 파싱 — {Category}_{MonthName}{Year}.pdf 패턴 */
const MONTH_MAP: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4,
  mayo: 5, junio: 6, julio: 7, agosto: 8,
  septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

function parseDateFromFilename(name: string): Date | null {
  // e.g. "Colesterol_Julio2025.pdf" → 2025-07
  const m = name.toLowerCase().match(/_([a-záéíóú]+)(\d{4})/);
  if (m === null) return null;
  const month = MONTH_MAP[m[1] ?? ""] ?? null;
  const year = parseInt(m[2] ?? "0", 10);
  if (month === null || year < 2020) return null;
  return new Date(year, month - 1, 1);
}

// ─── PDF 디스커버리 ──────────────────────────────────────────────────────────

interface PdfEntry {
  slug: string;
  url: string;
  date: Date;
}

/**
 * ACODECO 가격 페이지를 스크래핑해 관련 카테고리의 최신 PDF URL 목록 반환
 */
async function discoverLatestPdfs(): Promise<PdfEntry[]> {
  const res = await acodecFetch(ACODECO_PRICES_URL);
  if (!res.ok) {
    throw new Error(`ACODECO 가격 페이지 HTTP ${res.status}`);
  }
  const html = await res.text();

  // 두 가지 패턴 모두 지원:
  // 1) href="/inicio/wp-content/uploads/YYYY/MM/FileName.pdf"  (상대 경로)
  // 2) href="https://www.acodeco.gob.pa/inicio/wp-content/uploads/YYYY/MM/FileName.pdf"  (전체 URL)
  const hrefRe = /href="((?:https?:\/\/www\.acodeco\.gob\.pa)?\/inicio\/wp-content\/uploads\/\d{4}\/\d{2}\/([^"]+\.pdf))"/gi;
  const allPdfs: PdfEntry[] = [];
  let m: RegExpExecArray | null;

  while ((m = hrefRe.exec(html)) !== null) {
    const rawHref = m[1] ?? "";
    const filename = m[2] ?? "";

    // 관련 카테고리인지 확인
    const matchedSlug = RELEVANT_SLUGS.find((slug) =>
      filename.toLowerCase().includes(slug.toLowerCase()),
    );
    if (matchedSlug === undefined) continue;

    const date = parseDateFromFilename(filename);
    if (date === null) continue;

    // 상대 경로면 베이스 URL 붙이고, 전체 URL이면 그대로 사용
    const url = rawHref.startsWith("http") ? rawHref : `${ACODECO_BASE}${rawHref}`;

    allPdfs.push({
      slug: matchedSlug,
      url,
      date,
    });
  }

  // 슬러그별로 가장 최신 PDF만 유지
  const latestBySlug = new Map<string, PdfEntry>();
  for (const entry of allPdfs) {
    const existing = latestBySlug.get(entry.slug);
    if (existing === undefined || entry.date > existing.date) {
      latestBySlug.set(entry.slug, entry);
    }
  }

  return [...latestBySlug.values()];
}

// ─── PDF 파싱 ────────────────────────────────────────────────────────────────

export interface DrugPriceRow {
  rawName: string;     // 원문 제품명+용량 (e.g. "Atorvastatina Calox, tabletas 20mg")
  avgPrice: number;    // 약국별 가격 평균 (PAB)
  minPrice: number;
  maxPrice: number;
  priceCount: number;  // 가격 집계된 약국 수
}

/**
 * PDF 버퍼에서 의약품 가격 행 추출
 * 패턴: 제품명(문자) + 복수의 숫자(가격, 일부 "-")
 */
async function parsePdfPrices(buffer: Buffer): Promise<DrugPriceRow[]> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText() as { pages: Array<{ text: string }> };
  const fullText = result.pages.map((p) => p.text).join("\n");
  const lines = fullText.split("\n");
  const rows: DrugPriceRow[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length < 5) continue;

    // 첫 글자가 대문자 알파벳 (제품명 시작)
    if (!/^[A-ZÁÉÍÓÚÑ]/u.test(line)) continue;

    // 숫자 값들 추출 (가격 컬럼)
    const numTokens = [...line.matchAll(/(\d+[.,]\d+|\d{1,3})/g)]
      .map((m2) => parseFloat((m2[0] ?? "").replace(",", ".")))
      .filter((n) => Number.isFinite(n) && n > 0 && n < 1000);

    // 최소 2개 이상 가격이 있어야 유효한 행
    if (numTokens.length < 1) continue;

    // 제품명: 첫 번째 숫자 이전의 텍스트
    const firstNumIdx = line.search(/\d+[.,]\d+|\s\d+\s/);
    if (firstNumIdx <= 3) continue;

    const rawName = line.slice(0, firstNumIdx).trim().replace(/\s+/g, " ");
    if (rawName.length < 4) continue;

    // 단위 표시("mg", "ml", "caja" 등) 없으면 스킵 (헤더나 메타 텍스트)
    const lowerName = rawName.toLowerCase();
    const hasPresentation =
      lowerName.includes("mg") || lowerName.includes("ml") ||
      lowerName.includes("caja") || lowerName.includes("tab") ||
      lowerName.includes("cap") || lowerName.includes("amp") ||
      lowerName.includes("iny") || lowerName.includes("susp");
    if (!hasPresentation) continue;

    const avgPrice = numTokens.reduce((a, b) => a + b, 0) / numTokens.length;
    rows.push({
      rawName,
      avgPrice: Math.round(avgPrice * 100) / 100,
      minPrice: Math.min(...numTokens),
      maxPrice: Math.max(...numTokens),
      priceCount: numTokens.length,
    });
  }

  return rows;
}

// ─── 제품 매칭 ────────────────────────────────────────────────────────────────

interface MatchResult {
  productId: string;
  inn: string;
}

/**
 * 약품명으로 자사/경쟁 제품 매칭
 * 1차: who_inn_en 포함 여부
 * 2차: panama_search_keywords 포함 여부
 */
function matchDrugName(rawName: string): MatchResult | null {
  const lower = rawName.toLowerCase();

  for (const product of TARGET_PRODUCTS) {
    // INN 직접 매칭
    const innTokens = product.who_inn_en.toLowerCase().split(/[\s+&,]+/);
    if (innTokens.some((tok) => tok.length > 3 && lower.includes(tok))) {
      return { productId: product.product_id, inn: product.who_inn_en };
    }
    // 키워드 매칭
    for (const kw of product.panama_search_keywords) {
      if (kw.length > 3 && lower.includes(kw.toLowerCase())) {
        return { productId: product.product_id, inn: product.who_inn_en };
      }
    }
  }
  return null;
}

// ─── 메인 수집 함수 ──────────────────────────────────────────────────────────

export interface AcodecopdResult {
  ok: boolean;
  pdfsProcessed: number;
  rowsInserted: number;
  message: string;
}

export async function runAcodeckoPdfPreload(): Promise<AcodecopdResult> {
  if (isDryRun()) {
    return { ok: true, pdfsProcessed: 0, rowsInserted: 0, message: "[dry-run] ACODECO PDF INSERT 생략" };
  }

  const supabase = getSupabaseClient();
  const crawledAt = new Date().toISOString();

  // 1. 최신 PDF 목록 검색
  process.stdout.write("[acodeco_pdf] PDF 목록 검색 중...\n");
  const pdfs = await discoverLatestPdfs();
  process.stdout.write(`[acodeco_pdf] ${pdfs.length}개 PDF 발견\n`);

  let totalInserted = 0;
  const productCounts = new Map<string, number>();

  for (const entry of pdfs) {
    await sleep(2000 + Math.random() * 1500);

    process.stdout.write(`[acodeco_pdf] 다운로드: ${entry.url}\n`);
    let pdfBuffer: Buffer;
    try {
      const res = await acodecFetch(entry.url);
      if (!res.ok) {
        process.stderr.write(`[acodeco_pdf] HTTP ${res.status}: ${entry.url}\n`);
        continue;
      }
      pdfBuffer = Buffer.from(await res.arrayBuffer());
    } catch (e) {
      process.stderr.write(`[acodeco_pdf] 다운로드 실패: ${String(e)}\n`);
      continue;
    }

    // 2. PDF 파싱
    let priceRows: DrugPriceRow[];
    try {
      priceRows = await parsePdfPrices(pdfBuffer);
    } catch (e) {
      process.stderr.write(`[acodeco_pdf] 파싱 실패: ${String(e)}\n`);
      continue;
    }
    process.stdout.write(`[acodeco_pdf] ${entry.slug}: ${priceRows.length}행 파싱됨\n`);

    // 3. 매칭 + DB 적재
    const rows: PanamaPhase1InsertRow[] = [];
    for (const row of priceRows) {
      const match = matchDrugName(row.rawName);
      if (match === null) continue;

      const perProduct = productCounts.get(match.productId) ?? 0;
      if (perProduct >= 15) continue; // 제품당 최대 15건
      productCounts.set(match.productId, perProduct + 1);

      rows.push({
        product_id: match.productId,
        market_segment: "private",
        fob_estimated_usd: null,
        confidence: 0.72,
        crawled_at: crawledAt,
        pa_source: PA_SOURCE,
        pa_source_url: entry.url,
        pa_source_type: "static_pre_loaded",
        pa_product_name_local: row.rawName.slice(0, 200),
        pa_ingredient_inn: match.inn,
        pa_price_local: row.avgPrice,
        pa_currency_unit: "PAB",
        pa_price_type: "retail_normal",
        pa_decree_listed: false,
        pa_notes: JSON.stringify({
          category: entry.slug,
          pdf_date: entry.date.toISOString().slice(0, 7),
          min_price: row.minPrice,
          max_price: row.maxPrice,
          price_count: row.priceCount,
          source: "ACODECO 월간 의약품 가격 모니터링",
        }),
      });
    }

    if (rows.length === 0) {
      process.stdout.write(`[acodeco_pdf] ${entry.slug}: 매칭 제품 없음\n`);
      continue;
    }

    const { error } = await supabase.from(PANAMA_TABLE).insert(rows);
    if (error !== null) {
      process.stderr.write(`[acodeco_pdf] INSERT 실패: ${error.message}\n`);
    } else {
      totalInserted += rows.length;
      process.stdout.write(`[acodeco_pdf] ${entry.slug}: ${rows.length}건 적재\n`);
    }
  }

  return {
    ok: true,
    pdfsProcessed: pdfs.length,
    rowsInserted: totalInserted,
    message: `ACODECO PDF ${pdfs.length}개 처리, ${totalInserted}건 적재`,
  };
}

// ─── CLI 실행 ────────────────────────────────────────────────────────────────

const _invoked = process.argv[1];
if (_invoked !== undefined) {
  const _a = normalize(fileURLToPath(import.meta.url));
  const _b = normalize(_invoked);
  if (_a === _b) {
    runAcodeckoPdfPreload()
      .then((r) => {
        process.stdout.write(`[완료] ${r.message}\n`);
        process.exit(r.ok ? 0 : 1);
      })
      .catch((e: unknown) => {
        process.stderr.write(`[acodeco_pdf] 오류: ${String(e)}\n`);
        process.exit(1);
      });
  }
}
