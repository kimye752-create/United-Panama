import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const API_KEY = process.env.EXIM_API_KEY;
console.log(
  "1. 환경변수 로드:",
  API_KEY ? `OK (길이 ${API_KEY.length})` : "FAIL (빈 값)",
);

if (!API_KEY) {
  process.exit(1);
}

const searchDate = "20260414";
const url = `https://www.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=${API_KEY}&searchdate=${searchDate}&data=AP01`;
console.log("2. URL 조합:", url);

console.log("3. fetch 시도...");

try {
  const res = await fetch(url);
  console.log("4. fetch 성공:", res.status, res.statusText);
  const text = await res.text();
  console.log("5. 응답 길이:", text.length);
  console.log("6. 응답 처음 500자:", text.slice(0, 500));
} catch (err: unknown) {
  console.log(
    "4. fetch 실패:",
    err instanceof Error ? err.message : String(err),
  );
  const plain =
    err instanceof Error
      ? {
          name: err.name,
          message: err.message,
          stack: err.stack,
          cause: (err as Error & { cause?: unknown }).cause,
        }
      : err;
  console.log("5. 에러 전체:", JSON.stringify(plain, null, 2));
  if (err instanceof Error && (err as Error & { cause?: unknown }).cause) {
    console.log("6. err.cause:", (err as Error & { cause?: unknown }).cause);
  }
}
