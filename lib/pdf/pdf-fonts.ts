/**
 * PDF 폰트 등록 — Vercel Deployment Protection(401) 우회 + 서버리스 번들 비포함 우회.
 *
 * 전략: public/fonts/ 에서 파일을 읽어 base64 data URL 로 변환 후 Font.register src 로 전달.
 *   - HTTP fetch 불필요 → Deployment Protection 영향 없음
 *   - fontkit 가 data URL 지원 → Buffer/경로 이슈 모두 회피
 *
 * 번들에 폰트가 포함되려면 next.config.mjs 의 outputFileTracingIncludes 가 필요.
 * 만약 파일을 못 찾으면 명시적 로그로 Vercel 로그에 원인 남김 (Helvetica 폴백).
 */
import fs from "node:fs";
import path from "node:path";

import { Font } from "@react-pdf/renderer";

const FONT_DIR = path.join(process.cwd(), "public", "fonts");

function loadAsDataUrl(filename: string, mime = "font/ttf"): string | null {
  const full = path.join(FONT_DIR, filename);
  try {
    if (!fs.existsSync(full)) {
      console.error(`[pdf-fonts] 파일 없음: ${full}`);
      return null;
    }
    const buf = fs.readFileSync(full);
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[pdf-fonts] 읽기 실패 ${full}: ${msg}`);
    return null;
  }
}

try {
  // ── Pretendard (UI 범용) ──────────────────────────────────────────────────
  const preReg  = loadAsDataUrl("Pretendard-Regular.ttf");
  const preBold = loadAsDataUrl("Pretendard-Bold.ttf");
  if (preReg !== null && preBold !== null) {
    Font.register({
      family: "Pretendard",
      fonts: [
        { src: preReg,  fontWeight: "normal" },
        { src: preBold, fontWeight: "bold" },
      ],
    });
  }

  // ── NanumGothic (모든 PDF 보고서 공통 폰트) ───────────────────────────────
  const nanReg   = loadAsDataUrl("NanumGothic-Regular.ttf");
  const nanBold  = loadAsDataUrl("NanumGothic-Bold.ttf");
  const nanExtra = loadAsDataUrl("NanumGothic-ExtraBold.ttf");
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
