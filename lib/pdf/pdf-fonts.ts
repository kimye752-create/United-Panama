/**
 * PDF 폰트 등록 — base64 임베디드 모듈에서 로드.
 *
 *  - fs.readFileSync / HTTP fetch 모두 미사용 → Vercel 번들 누락 문제 원천 차단
 *  - lib/pdf/fonts-embedded/nanumgothic.ts 에 base64 상수로 선번들됨
 *  - Font.register 는 "data:font/ttf;base64,..." data URL 형식 지원
 */
import { Font } from "@react-pdf/renderer";

import {
  NANUM_REGULAR_B64,
  NANUM_BOLD_B64,
  NANUM_EXTRABOLD_B64,
} from "@/lib/pdf/fonts-embedded/nanumgothic";

function toDataUrl(b64: string): string {
  return `data:font/ttf;base64,${b64}`;
}

try {
  console.info(
    `[pdf-fonts] NanumGothic 임베디드 로드 — Regular=${NANUM_REGULAR_B64.length}b64, Bold=${NANUM_BOLD_B64.length}b64, ExtraBold=${NANUM_EXTRABOLD_B64.length}b64`,
  );

  Font.register({
    family: "NanumGothic",
    fonts: [
      { src: toDataUrl(NANUM_REGULAR_B64),   fontWeight: "normal" },
      { src: toDataUrl(NANUM_BOLD_B64),      fontWeight: "bold" },
      { src: toDataUrl(NANUM_EXTRABOLD_B64), fontWeight: 800 },
    ],
  });
  console.info("[pdf-fonts] ✓ NanumGothic 등록 완료 (3 weights)");

  Font.registerHyphenationCallback((word: string) => [word]);
} catch (error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  console.error("[pdf-fonts] ❌ 등록 예외:", msg);
}
