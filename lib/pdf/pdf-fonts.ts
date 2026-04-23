/**
 * PDF 폰트 등록 — fs 로 읽어 base64 data URL 로 Font.register.
 *
 *  - 네트워크 fetch 미사용 → Vercel Deployment Protection 401 문제 없음
 *  - vercel.json 의 functions.includeFiles 로 public/fonts/** 강제 번들
 *  - 로딩 상태를 명시적 로그로 기록 → Vercel 로그에서 성공/실패 확인 가능
 */
import fs from "node:fs";
import path from "node:path";

import { Font } from "@react-pdf/renderer";

const FONT_DIR = path.join(process.cwd(), "public", "fonts");

function loadAsDataUrl(filename: string, mime = "font/ttf"): string | null {
  const full = path.join(FONT_DIR, filename);
  try {
    if (!fs.existsSync(full)) {
      console.error(`[pdf-fonts] ❌ 파일 없음: ${full}`);
      return null;
    }
    const buf = fs.readFileSync(full);
    if (buf.length === 0) {
      console.error(`[pdf-fonts] ❌ 빈 파일: ${full}`);
      return null;
    }
    console.info(`[pdf-fonts] ✓ ${filename} (${buf.length} bytes)`);
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[pdf-fonts] ❌ 읽기 실패 ${full}: ${msg}`);
    return null;
  }
}

try {
  console.info(`[pdf-fonts] FONT_DIR=${FONT_DIR}  cwd=${process.cwd()}`);

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
    console.info("[pdf-fonts] ✓ Pretendard 등록");
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
    console.info(`[pdf-fonts] ✓ NanumGothic 등록 (weights: ${fonts.length})`);
  } else {
    console.error("[pdf-fonts] ❌ NanumGothic 핵심 weight 누락 — 한글 mojibake 발생 예정");
  }

  Font.registerHyphenationCallback((word: string) => [word]);
} catch (error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  console.error("[pdf-fonts] ❌ 등록 예외:", msg);
}
