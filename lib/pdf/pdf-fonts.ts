/**
 * PDF용 Pretendard 등록 (서버 환경 공통 경로 기준)
 */
import fs from "node:fs";
import path from "node:path";

import { Font } from "@react-pdf/renderer";

const REG = path.join(process.cwd(), "public/fonts/Pretendard-Regular.ttf");
const BOLD = path.join(process.cwd(), "public/fonts/Pretendard-Bold.ttf");
const SEMIBOLD = path.join(process.cwd(), "public/fonts/Pretendard-SemiBold.ttf");

try {
  const fontDefs: Array<{ src: string; fontWeight: "normal" | "bold" | 600 }> = [
    { src: REG, fontWeight: "normal" },
    { src: BOLD, fontWeight: "bold" },
  ];
  if (fs.existsSync(SEMIBOLD)) {
    fontDefs.push({ src: SEMIBOLD, fontWeight: 600 });
  }

  Font.register({
    family: "Pretendard",
    fonts: fontDefs,
  });

  Font.registerHyphenationCallback((word: string) => [word]);
} catch (error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(
    "[pdf-fonts] 폰트 등록 실패:",
    msg,
  );
}
