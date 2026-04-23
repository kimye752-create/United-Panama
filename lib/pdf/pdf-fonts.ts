/**
 * PDF 폰트 등록 — 로컬은 파일시스템, Vercel 서버리스에서는 HTTP fetch 기반으로 로드.
 *
 * 배경:
 *   Vercel 서버리스 번들은 public/ 파일을 기본 포함하지 않고, outputFileTracingIncludes
 *   가 경우에 따라 동작하지 않아 @react-pdf/renderer 가 NanumGothic/NotoSansKR 을
 *   찾지 못하고 Helvetica 로 폴백 → 한글 mojibake 발생.
 *
 *   반면 public/ 은 Vercel CDN 으로 항상 서빙되므로 VERCEL_URL 기반 절대 URL 로
 *   Font.register 하면 번들 여부와 무관하게 폰트를 로드할 수 있다.
 *
 * 규칙:
 *   - VERCEL_URL 있으면 URL(https://…/fonts/...) 사용
 *   - 없으면(로컬 dev) 파일시스템 경로 사용
 */
import fs from "node:fs";
import path from "node:path";

import { Font } from "@react-pdf/renderer";

function resolveFontSrc(filename: string): string | null {
  const vercelUrl = process.env.VERCEL_URL;
  if (typeof vercelUrl === "string" && vercelUrl !== "") {
    return `https://${vercelUrl}/fonts/${filename}`;
  }

  // 로컬 dev: 파일시스템 경로
  const full = path.join(process.cwd(), "public", "fonts", filename);
  if (!fs.existsSync(full)) {
    console.error(`[pdf-fonts] 파일 없음 (로컬): ${full}`);
    return null;
  }
  return full;
}

try {
  // ── Pretendard ────────────────────────────────────────────────────────────
  const preReg  = resolveFontSrc("Pretendard-Regular.ttf");
  const preBold = resolveFontSrc("Pretendard-Bold.ttf");
  if (preReg !== null && preBold !== null) {
    Font.register({
      family: "Pretendard",
      fonts: [
        { src: preReg,  fontWeight: "normal" },
        { src: preBold, fontWeight: "bold" },
      ],
    });
  }

  // ── NotoSansKR (통합 보고서 기본 폰트) ───────────────────────────────────
  const notoReg  = resolveFontSrc("NotoSansCJKkr-Regular.otf");
  const notoBold = resolveFontSrc("NotoSansCJKkr-Bold.otf");
  if (notoReg !== null && notoBold !== null) {
    Font.register({
      family: "NotoSansKR",
      fonts: [
        { src: notoReg,  fontWeight: "normal" },
        { src: notoBold, fontWeight: "bold" },
      ],
    });
  }

  // ── NanumGothic (시장·가격·바이어 개별 보고서) ──────────────────────────
  const nanReg   = resolveFontSrc("NanumGothic-Regular.ttf");
  const nanBold  = resolveFontSrc("NanumGothic-Bold.ttf");
  const nanExtra = resolveFontSrc("NanumGothic-ExtraBold.ttf");
  if (nanReg !== null && nanBold !== null) {
    const fonts: Array<{ src: string; fontWeight: "normal" | "bold" | 800 }> = [
      { src: nanReg,  fontWeight: "normal" },
      { src: nanBold, fontWeight: "bold" },
    ];
    if (nanExtra !== null) {
      fonts.push({ src: nanExtra, fontWeight: 800 });
    }
    Font.register({ family: "NanumGothic", fonts });
  }

  Font.registerHyphenationCallback((word: string) => [word]);
} catch (error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  console.error("[pdf-fonts] 폰트 등록 실패:", msg);
}
