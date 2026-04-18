/// <reference types="node" />

import Anthropic from "@anthropic-ai/sdk";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

async function main(): Promise<void> {
  const apiKeyRaw = process.env.ANTHROPIC_API_KEY;
  const modelRaw = process.env.ANTHROPIC_MODEL;
  const model = modelRaw !== undefined && modelRaw.trim() !== ""
    ? modelRaw.trim()
    : "claude-haiku-4-5-20251001";

  if (apiKeyRaw === undefined || apiKeyRaw.trim() === "") {
    throw new Error("ANTHROPIC_API_KEY가 없어 Haiku 테스트를 실행할 수 없습니다.");
  }

  const apiKey = apiKeyRaw.trim();
  const client = new Anthropic({ apiKey });
  const startedAt = Date.now();

  const response = await client.messages.create({
    model,
    max_tokens: 64,
    temperature: 0,
    messages: [{ role: "user", content: "hello" }],
  });

  const elapsedMs = Date.now() - startedAt;
  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        model,
        elapsedMs,
        stopReason: response.stop_reason ?? null,
      },
      null,
      2,
    ) + "\n",
  );
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(
    JSON.stringify(
      {
        ok: false,
        error: message,
      },
      null,
      2,
    ) + "\n",
  );
  process.exit(1);
});
