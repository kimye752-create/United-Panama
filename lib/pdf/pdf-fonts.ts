/**
 * PDF 폰트 등록 — 임베디드 base64 → /tmp 파일로 materialize → Font.register 경로 전달.
 *
 * 왜 이 방식인가:
 *  - data URL 방식은 @react-pdf/font 의 atob 디코드 경로 (정상 동작함을 로컬 검증)
 *    이지만, Vercel 런타임에서 실제로 동작하지 않는 사례가 있어 안전빵으로 전환.
 *  - Font.register 의 src 가 "경로" 일 때는 fontkit.open(path) 로 fs 열기 → 가장 검증된 경로.
 *  - /tmp 은 Vercel serverless 에서 쓰기 가능 (512MB) & 호출 내 재사용 OK.
 *  - 번들 누락 걱정은 임베디드 base64 TS 모듈로 원천 차단 (lib/pdf/fonts-embedded/).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { Font } from "@react-pdf/renderer";

import {
  NANUM_REGULAR_B64,
  NANUM_BOLD_B64,
  NANUM_EXTRABOLD_B64,
} from "@/lib/pdf/fonts-embedded/nanumgothic";

function materialize(filename: string, b64: string): string | null {
  try {
    const tmp = path.join(os.tmpdir(), filename);
    if (!fs.existsSync(tmp)) {
      fs.writeFileSync(tmp, Buffer.from(b64, "base64"));
    }
    const size = fs.statSync(tmp).size;
    console.info(`[pdf-fonts] ✓ materialized ${filename} → ${tmp} (${size} bytes)`);
    return tmp;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[pdf-fonts] ❌ materialize 실패 ${filename}: ${msg}`);
    return null;
  }
}

try {
  const regPath   = materialize("NanumGothic-Regular.ttf",   NANUM_REGULAR_B64);
  const boldPath  = materialize("NanumGothic-Bold.ttf",      NANUM_BOLD_B64);
  const extraPath = materialize("NanumGothic-ExtraBold.ttf", NANUM_EXTRABOLD_B64);

  if (regPath !== null && boldPath !== null) {
    const fonts: Array<{ src: string; fontWeight: "normal" | "bold" | 800 }> = [
      { src: regPath,  fontWeight: "normal" },
      { src: boldPath, fontWeight: "bold" },
    ];
    if (extraPath !== null) {
      fonts.push({ src: extraPath, fontWeight: 800 });
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
