/**
 * D2 작업 — Phase A 공공 수집 공유 유틸
 * HTML 5단계 전처리 파이프라인 — LLM 입력 토큰 70~80% 절감 목적
 * 사용처: pa_minsa.ts (D2), Phase B 실시간 보강 (D6)
 */

import { load, type CheerioAPI } from "cheerio";
import { isTag, type Element, type AnyNode } from "domhandler";

// ─────────────────────────────────────────────────
// 공개 인터페이스
// ─────────────────────────────────────────────────

export interface PreprocessOptions {
  /** 블록 텍스트 밀도 최솟값 (기본 0.3). 텍스트길이 / 블록outerHTML근사길이 */
  minTextDensity?: number;
  /** 블록 최소 텍스트 길이(자) (기본 20) */
  minBlockLength?: number;
}

export interface PreprocessResult {
  /** 최종 구조화 토큰 텍스트 ([TITLE] / [PARAGRAPH] / [LIST_ITEM] / [CELL]) */
  tokens: string;
  /** 원본 HTML 문자 길이 */
  originalLength: number;
  /** 변환 결과 문자 길이 */
  reducedLength: number;
  /** 절감률 0~1 (1에 가까울수록 많이 절감) */
  reductionRatio: number;
}

// ─────────────────────────────────────────────────
// 상수 (내부 사용)
// ─────────────────────────────────────────────────

const DEFAULT_MIN_TEXT_DENSITY = 0.3;
const DEFAULT_MIN_BLOCK_LENGTH = 20;

/** 제거할 노이즈 요소 선택자 (시맨틱 태그 + 일반적인 보조 영역) */
const NOISE_SELECTOR =
  "script, style, noscript, iframe, svg, link, meta, header, nav, footer, aside, form, button, input, select, textarea";

/** 처리 대상 태그 선택자 */
const CONTENT_SELECTOR = "h1, h2, h3, h4, h5, h6, p, li, td, th, div";

/** 태그명 → 구조화 토큰 타입 매핑 */
const TAG_TOKEN_MAP: Readonly<Record<string, string>> = {
  h1: "[TITLE]",
  h2: "[TITLE]",
  h3: "[TITLE]",
  h4: "[TITLE]",
  h5: "[TITLE]",
  h6: "[TITLE]",
  p: "[PARAGRAPH]",
  div: "[PARAGRAPH]",
  li: "[LIST_ITEM]",
  td: "[CELL]",
  th: "[CELL]",
};

// ─────────────────────────────────────────────────
// 내부 헬퍼 (export 금지)
// ─────────────────────────────────────────────────

/** 텍스트 정규화: 연속 공백·줄바꿈 → 단일 공백 + trim */
function normalizeText(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

/**
 * 태그명에 대응하는 토큰 타입 반환.
 * 매핑에 없는 태그는 [PARAGRAPH]로 폴백.
 */
function resolveTokenType(tagName: string): string {
  return TAG_TOKEN_MAP[tagName] ?? "[PARAGRAPH]";
}

/**
 * 블록 outerHTML 근사 길이 계산 (속성 제거 후 기준).
 * 공식: `<TAG>text</TAG>` = text.length + 2*tagNameLen + 5
 * 이 값을 분모로 쓰면 텍스트 밀도가 의미 있는 범위(0~1)에 놓인다.
 */
function approxOuterHtmlLen(text: string, tagName: string): number {
  return text.length + tagName.length * 2 + 5;
}

/** HTML 주석 노드를 제거합니다. */
function removeComments($: CheerioAPI): void {
  $("*")
    .contents()
    .each((_: number, node: AnyNode) => {
      // domhandler Comment 타입 판별
      if (node.type === "comment") {
        $(node as AnyNode).remove();
      }
    });
}

/** 모든 요소의 class, id, style, data-* 속성을 제거합니다. */
function stripAllAttributes($: CheerioAPI): void {
  $("*").each((_: number, node: AnyNode) => {
    if (isTag(node)) {
      // domhandler isTag()로 타입 좁힘 → attribs 안전 접근
      (node as Element).attribs = {};
    }
  });
}

// ─────────────────────────────────────────────────
// 공개 함수
// ─────────────────────────────────────────────────

/**
 * HTML 5단계 파이프라인으로 구조화 토큰 텍스트를 생성합니다.
 *
 * 1) 파싱 (cheerio.load)
 * 2) 노이즈 제거 (script, style, nav 등 + HTML 주석)
 * 3) DOM 단순화 (모든 속성 제거)
 * 4) 텍스트 블록 추출 (밀도 >= minTextDensity AND 길이 >= minBlockLength)
 * 5) 토큰 변환 ([TITLE] / [PARAGRAPH] / [LIST_ITEM] / [CELL])
 */
export function preprocessHtml(
  html: string,
  options?: PreprocessOptions,
): PreprocessResult {
  const minTextDensity =
    options?.minTextDensity ?? DEFAULT_MIN_TEXT_DENSITY;
  const minBlockLength =
    options?.minBlockLength ?? DEFAULT_MIN_BLOCK_LENGTH;
  const originalLength = html.length;

  // ① 파싱
  const $ = load(html);

  // ② 노이즈 요소 + HTML 주석 제거
  $(NOISE_SELECTOR).remove();
  removeComments($);

  // ③ DOM 단순화: 모든 속성 제거
  stripAllAttributes($);

  // ④ 텍스트 블록 추출 + ⑤ 토큰 변환
  const tokenLines: string[] = [];

  $(CONTENT_SELECTOR).each((_: number, node: AnyNode) => {
    if (!isTag(node)) return;

    const el = node as Element;
    const $el = $(el);
    const tagName = el.name.toLowerCase();

    // div는 자식 요소가 없는 리프 텍스트 블록만 처리
    if (tagName === "div" && $el.children("*").length > 0) return;

    const text = normalizeText($el.text());
    if (text.length === 0) return;

    // 텍스트 밀도 = 텍스트길이 / 블록outerHTML근사길이
    // (속성 제거 후 기준: 텍스트가 마크업 대비 얼마나 풍부한지)
    const outerLen = approxOuterHtmlLen(text, tagName);
    const density = text.length / outerLen;

    if (density < minTextDensity || text.length < minBlockLength) return;

    tokenLines.push(`${resolveTokenType(tagName)} ${text}`);
  });

  const tokens = tokenLines.join("\n");
  const reducedLength = tokens.length;
  const reductionRatio =
    originalLength > 0 ? 1 - reducedLength / originalLength : 0;

  return { tokens, originalLength, reducedLength, reductionRatio };
}
