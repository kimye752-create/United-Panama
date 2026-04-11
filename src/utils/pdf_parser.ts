/**
 * D2 작업 — Phase A 공공 수집 공유 유틸
 * pdf-parse v2 (PDFParse 클래스) 기반 PDF 텍스트 추출 래퍼.
 * pa_css.ts, pa_acodeco.ts에서 사용 예정.
 */
/// <reference types="node" />

import axios from "axios";
import { PDFParse } from "pdf-parse";

// ─────────────────────────────────────────────────
// 공개 타입
// ─────────────────────────────────────────────────

/** 이미 다운로드된 Buffer 또는 PDF URL 문자열 */
export type PdfInput = Buffer | string;

// ─────────────────────────────────────────────────
// 공개 함수
// ─────────────────────────────────────────────────

/**
 * PDF에서 텍스트를 추출하고 공백을 정규화합니다.
 *
 * - 입력이 string이면 내부 fetchPdfBuffer()로 다운로드 후 파싱
 * - 입력이 Buffer면 바로 파싱
 * - 연속 공백·줄바꿈을 단일 공백으로 정규화 (스페인어·한국어 안전)
 * - 실패 시 한국어 메시지로 Error throw → 호출부 try-catch 필수
 */
export async function extractPdfText(input: PdfInput): Promise<string> {
  const buffer =
    typeof input === "string" ? await fetchPdfBuffer(input) : input;

  let parser: PDFParse | undefined;

  try {
    // Buffer → Uint8Array 변환은 PDFParse 생성자가 내부 처리하지만 명시적으로 변환
    parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();

    // 연속 공백·탭·줄바꿈 → 단일 공백 후 양쪽 trim
    return result.text.replace(/\s+/g, " ").trim();
  } catch (error: unknown) {
    const msg = (error as Error).message ?? String(error);
    throw new Error(
      `PDF 텍스트 추출에 실패했습니다: ${msg}. ` +
        `파일이 손상되었거나 암호화된 PDF인지 확인하세요.`,
    );
  } finally {
    // PDFParse 내부 pdfjs-dist 문서 객체를 명시적으로 해제
    if (parser !== undefined) {
      await parser.destroy();
    }
  }
}

// ─────────────────────────────────────────────────
// 내부 헬퍼 (export 금지)
// ─────────────────────────────────────────────────

/**
 * URL에서 PDF를 다운로드하여 Buffer를 반환합니다.
 * response.ok에 해당하는 2xx 여부를 수동 체크합니다.
 */
async function fetchPdfBuffer(url: string): Promise<Buffer> {
  const response = await axios.get<ArrayBuffer>(url, {
    responseType: "arraybuffer",
    timeout: 30_000,
    // 모든 상태 코드를 허용 후 아래에서 수동 체크 (fetch의 response.ok 패턴과 동일)
    validateStatus: () => true,
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; PanamaResearchBot/1.0)",
      Accept: "application/pdf,*/*",
    },
  });

  // 2xx 범위 밖이면 상세 메시지와 함께 throw
  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `PDF 다운로드 실패 — HTTP ${response.status} ${response.statusText}. ` +
        `URL이 올바른지, 서버 접근 제한이 없는지 확인하세요: ${url}`,
    );
  }

  return Buffer.from(response.data);
}
