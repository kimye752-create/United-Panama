/**
 * PDF용 Pretendard 등록 (서버·Node 번들에서 process.cwd() 기준)
 * Vercel 빌드: Font.register 예외 시 로그만 남기고 모듈 로드는 계속(런타임 PDF에서 폰트 오류 가능)
 */
import fs from "node:fs";
import path from "node:path";

import { Font } from "@react-pdf/renderer";

const REG = path.join(
  process.cwd(),
  "public/fonts/Pretendard-Regular.ttf",
);
const BOLD = path.join(process.cwd(), "public/fonts/Pretendard-Bold.ttf");

try {
  console.log("[pdf-fonts] REG:", REG);
  console.log("[pdf-fonts] REG exists:", fs.existsSync(REG));
  if (fs.existsSync(REG)) {
    console.log("[pdf-fonts] REG size:", fs.statSync(REG).size);
    console.log(
      "[pdf-fonts] REG magic:",
      fs.readFileSync(REG).subarray(0, 4).toString("hex"),
    );
  }
  console.log("[pdf-fonts] BOLD:", BOLD);
  console.log("[pdf-fonts] BOLD exists:", fs.existsSync(BOLD));

  Font.register({
    family: "Pretendard",
    fonts: [
      {
        src: REG,
        fontWeight: "normal",
      },
      {
        src: BOLD,
        fontWeight: "bold",
      },
    ],
  });

  Font.registerHyphenationCallback((word: string) => [word]);
  console.log("[pdf-fonts] Font.register SUCCESS");
} catch (error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(
    "[pdf-fonts] Font.register 실패 — PDF 생성 시 폰트 오류 가능:",
    msg,
  );
}
