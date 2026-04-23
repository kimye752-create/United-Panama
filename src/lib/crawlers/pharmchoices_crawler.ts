/**
 * PharmChoices Panama 실시간 크롤러
 * ────────────────────────────────────────────────────────
 * 버튼 클릭 시 PharmChoices Panama 페이지를 크롤링하여
 * 파나마 현지 제약사 목록을 DB에 upsert합니다.
 *
 * URL: https://pharmchoices.com/full-list-of-pharmaceutical-companies-in-panama/
 */

import { createSupabaseServer } from "@/lib/supabase-server";

const PHARMCHOICES_URL =
  "https://pharmchoices.com/full-list-of-pharmaceutical-companies-in-panama/";

export interface CrawledCompany {
  company_name: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
}

export interface CrawlResult {
  crawled: number;
  upserted: number;
  skipped: number;
  error: string | null;
}

// ─── 정규화 ─────────────────────────────────────────────────────────────────

function normalizeCompanyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[.,;:!?'"()\[\]{}]/g, "")
    .replace(/\s+/g, "");
}

// ─── HTML 파서 유틸 ────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractEmail(text: string): string | null {
  const m =
    text.match(/mailto:([^\s"'>?&]+)/i) ??
    text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);
  return m ? (m[1] ?? m[0]).trim() : null;
}

function extractPhone(text: string): string | null {
  // tel: 링크 우선
  const telLink = text.match(/tel:([\d+\-().\s]{7,})/i);
  if (telLink) return telLink[1].trim();
  // 패턴 매칭 (파나마 형식 포함)
  const pattern = text.match(
    /(?:Tel|Phone|Teléfono|Fax)[^\d]*([\d+\-().\s]{7,})/i,
  );
  return pattern ? pattern[1].trim() : null;
}

function extractWebsite(html: string): string | null {
  // pharmchoices.com 자체 링크 제외
  const m = html.match(
    /href="(https?:\/\/(?!pharmchoices\.com|#)[^"]+)"/i,
  );
  return m ? m[1] : null;
}

function isValidCompanyName(name: string): boolean {
  if (name.length < 3 || name.length > 200) return false;
  // 숫자/기호만 있는 경우 제외
  if (!/[a-záéíóúñüA-ZÁÉÍÓÚÑÜ]/.test(name)) return false;
  // 헤더/네비 텍스트 제외
  const SKIP = [
    "company",
    "name",
    "phone",
    "email",
    "website",
    "address",
    "city",
    "contact",
    "home",
    "about",
    "menu",
    "search",
  ];
  const lower = name.toLowerCase();
  if (SKIP.some((s) => lower === s)) return false;
  return true;
}

// ─── HTML 파싱 ────────────────────────────────────────────────────────────

/**
 * PharmChoices 페이지 HTML에서 기업 목록 파싱
 * 테이블 → 카드/리스트 순으로 시도
 */
export function parseCompaniesFromHtml(html: string): CrawledCompany[] {
  // 1. 테이블 파싱 시도
  const tableCompanies = parseFromTable(html);
  if (tableCompanies.length >= 5) return tableCompanies;

  // 2. 카드/항목 파싱 시도
  const cardCompanies = parseFromCards(html);
  if (cardCompanies.length >= 3) return cardCompanies;

  // 3. 단순 li/p 텍스트에서 회사명 추출
  return parseFromListItems(html);
}

function parseFromTable(html: string): CrawledCompany[] {
  const companies: CrawledCompany[] = [];
  const tableMatch = html.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return companies;

  const tableHtml = tableMatch[1];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  let isHeader = true;

  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const rowHtml = rowMatch[1];
    // th 행(헤더) 스킵
    if (/<th/i.test(rowHtml)) { isHeader = false; continue; }
    if (isHeader) { isHeader = false; continue; }

    const cells: string[] = [];
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let tdMatch;
    while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
      cells.push(tdMatch[1]);
    }
    if (cells.length < 1) continue;

    const name = stripHtml(cells[0] ?? "");
    if (!isValidCompanyName(name)) continue;

    companies.push({
      company_name: name,
      phone: extractPhone(cells[1] ?? "") ?? extractPhone(rowHtml),
      email:
        extractEmail(cells[2] ?? "") ??
        extractEmail(rowHtml),
      website: extractWebsite(cells[3] ?? rowHtml),
      address: cells[4] ? stripHtml(cells[4]) : null,
    });
  }
  return companies;
}

function parseFromCards(html: string): CrawledCompany[] {
  const companies: CrawledCompany[] = [];
  // 클래스에 company, entry, listing, member, card, pharma 가 포함된 블록
  const blockRegex =
    /<(?:div|article|li|section)[^>]*class="[^"]*(?:company|entry|listing|member|card|pharma|profile)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|article|li|section)>/gi;
  let m;
  while ((m = blockRegex.exec(html)) !== null) {
    const block = m[1];
    // 이름: h2~h4, strong, a 순으로
    const nameMatch =
      block.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i) ??
      block.match(/<strong[^>]*>([\s\S]*?)<\/strong>/i) ??
      block.match(/<a[^>]*class="[^"]*(?:title|name)[^"]*"[^>]*>([\s\S]*?)<\/a>/i);
    if (!nameMatch) continue;
    const name = stripHtml(nameMatch[1]);
    if (!isValidCompanyName(name)) continue;

    companies.push({
      company_name: name,
      phone: extractPhone(block),
      email: extractEmail(block),
      website: extractWebsite(block),
      address: null,
    });
  }
  return companies;
}

function parseFromListItems(html: string): CrawledCompany[] {
  const companies: CrawledCompany[] = [];
  // 콘텐츠 영역만 추출 (헤더/푸터 제외)
  const contentMatch =
    html.match(/<(?:main|article|div[^>]*(?:content|post|entry))[^>]*>([\s\S]*?)<\/(?:main|article|div)>/i);
  const content = contentMatch ? contentMatch[1] : html;

  // li 태그 내 텍스트
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let m;
  while ((m = liRegex.exec(content)) !== null) {
    const text = stripHtml(m[1]);
    if (isValidCompanyName(text) && text.length < 100) {
      companies.push({
        company_name: text,
        phone: extractPhone(m[1]),
        email: extractEmail(m[1]),
        website: extractWebsite(m[1]),
        address: null,
      });
    }
  }
  return companies;
}

// ─── DB upsert ────────────────────────────────────────────────────────────

/**
 * PharmChoices Panama 페이지를 크롤링하여 DB에 upsert
 * - 기존 기업: 연락처 정보만 업데이트 (enrichment 데이터 보존)
 * - 신규 기업: 전체 삽입
 */
export async function crawlAndUpsertPharmChoices(): Promise<CrawlResult> {
  // 1. 페이지 fetch
  let html: string;
  try {
    const res = await fetch(PHARMCHOICES_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(20000),
      next: { revalidate: 0 }, // Next.js 캐시 비활성화
    });
    if (!res.ok) {
      return {
        crawled: 0,
        upserted: 0,
        skipped: 0,
        error: `HTTP ${res.status} fetching PharmChoices`,
      };
    }
    html = await res.text();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { crawled: 0, upserted: 0, skipped: 0, error: `fetch 실패: ${msg}` };
  }

  // 2. HTML 파싱
  const companies = parseCompaniesFromHtml(html);
  if (companies.length === 0) {
    return {
      crawled: 0,
      upserted: 0,
      skipped: 0,
      error: "파싱 결과 없음 (페이지 구조 변경 가능성)",
    };
  }

  // 3. DB upsert (연락처만 — enrichment 필드는 건드리지 않음)
  const supabase = createSupabaseServer();
  let upserted = 0;
  let skipped = 0;

  for (const company of companies) {
    const normalized = normalizeCompanyName(company.company_name);
    if (!normalized) { skipped++; continue; }

    const row: Record<string, unknown> = {
      company_name: company.company_name,
      company_name_normalized: normalized,
      source_primary: "pharmchoices",
      collected_primary_at: new Date().toISOString(),
    };
    // null이 아닌 값만 업데이트
    if (company.phone !== null) row["phone"] = company.phone;
    if (company.email !== null) row["email"] = company.email;
    if (company.website !== null) row["website"] = company.website;
    if (company.address !== null) row["address"] = company.address;

    const { error } = await supabase
      .from("panama_partner_candidates")
      .upsert(row, {
        onConflict: "company_name_normalized",
        ignoreDuplicates: false,
      });

    if (error !== null) {
      skipped++;
    } else {
      upserted++;
    }
  }

  return {
    crawled: companies.length,
    upserted,
    skipped,
    error: null,
  };
}
