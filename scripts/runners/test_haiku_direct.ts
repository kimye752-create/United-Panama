/**
 * Haiku 직접 호출 스모크 테스트
 * 실행: npx tsx scripts/runners/test_haiku_direct.ts
 */
/// <reference types="node" />

import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv();

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const HAIKU_MODEL = "claude-haiku-4-5-20251001";

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey === undefined || apiKey.trim() === "") {
    throw new Error(
      "ANTHROPIC_API_KEY가 비어 있습니다. .env.local 또는 실행 환경변수에 키를 설정하세요.",
    );
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey.trim(),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: HAIKU_MODEL,
      max_tokens: 100,
      messages: [{ role: "user", content: "Say hello in Korean" }],
    }),
  });

  const bodyText = await response.text();
  process.stdout.write(`status=${String(response.status)}\n`);
  process.stdout.write(`${bodyText}\n`);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`[test_haiku_direct] 실패: ${message}\n`);
  process.exit(1);
});
