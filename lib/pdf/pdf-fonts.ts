/**
 * PDF용 폰트 등록 (서버 환경 공통 경로 기준)
 * - Pretendard: UI 범용 폰트
 * - NotoSansKR: 범용 CJK 폰트
 * - NanumGothic: 시장보고서 공식 양식 폰트 (SG_01 docx 기준)
 */
import fs from "node:fs";
import path from "node:path";

import { Font } from "@react-pdf/renderer";

const REG      = path.join(process.cwd(), "public/fonts/Pretendard-Regular.ttf");
const BOLD     = path.join(process.cwd(), "public/fonts/Pretendard-Bold.ttf");
const SEMIBOLD = path.join(process.cwd(), "public/fonts/Pretendard-SemiBold.ttf");

const NOTO_REG  = path.join(process.cwd(), "public/fonts/NotoSansCJKkr-Regular.otf");
const NOTO_BOLD = path.join(process.cwd(), "public/fonts/NotoSansCJKkr-Bold.otf");

const NANUM_REG  = path.join(process.cwd(), "public/fonts/NanumGothic-Regular.ttf");
const NANUM_BOLD = path.join(process.cwd(), "public/fonts/NanumGothic-Bold.ttf");
const NANUM_EXTRABOLD = path.join(process.cwd(), "public/fonts/NanumGothic-ExtraBold.ttf");

try {
  // Pretendard
  const fontDefs: Array<{ src: string; fontWeight: "normal" | "bold" | 600 }> = [
    { src: REG,  fontWeight: "normal" },
    { src: BOLD, fontWeight: "bold" },
  ];
  if (fs.existsSync(SEMIBOLD)) {
    fontDefs.push({ src: SEMIBOLD, fontWeight: 600 });
  }
  Font.register({ family: "Pretendard", fonts: fontDefs });

  // NotoSansKR
  if (fs.existsSync(NOTO_REG) && fs.existsSync(NOTO_BOLD)) {
    Font.register({
      family: "NotoSansKR",
      fonts: [
        { src: NOTO_REG,  fontWeight: "normal" },
        { src: NOTO_BOLD, fontWeight: "bold" },
      ],
    });
  }

  // NanumGothic (시장보고서 공식 양식 폰트)
  if (fs.existsSync(NANUM_REG) && fs.existsSync(NANUM_BOLD)) {
    Font.register({
      family: "NanumGothic",
      fonts: [
        { src: NANUM_REG,  fontWeight: "normal" },
        { src: NANUM_BOLD, fontWeight: "bold" },
        ...(fs.existsSync(NANUM_EXTRABOLD)
          ? [{ src: NANUM_EXTRABOLD, fontWeight: 800 as const }]
          : []),
      ],
    });
  }

  Font.registerHyphenationCallback((word: string) => [word]);
} catch (error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  console.error("[pdf-fonts] 폰트 등록 실패:", msg);
}
