/**
 * 기법 ⑦ Polite Scraping + ⑩ Resource Blocking(Skeleton)
 * Playwright는 타입만 참조 — 런타임은 호출부에서 주입된 Page 사용.
 */
/// <reference types="node" />

import type { Page } from "playwright";

/** UA 로테이션 풀 (5종) */
const USER_AGENTS: readonly string[] = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0",
  "Mozilla/5.0 (compatible; PanamaResearchBot/1.0; +https://example.invalid/bot)",
];

/**
 * 요청 간 1.5~3초(기본) 랜덤 대기 — Polite Scraping.
 */
export function randomDelay(min = 1500, max = 3000): Promise<void> {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  const ms = lo + Math.floor(Math.random() * (hi - lo + 1));
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** 5종 UA 중 무작위 선택 */
export function getRandomUserAgent(): string {
  const idx = Math.floor(Math.random() * USER_AGENTS.length);
  const ua = USER_AGENTS[idx];
  if (ua === undefined) {
    return USER_AGENTS[0] ?? "";
  }
  return ua;
}

/**
 * 이미지·폰트·미디어 요청 차단(⑩ Skeleton).
 * route 핸들러 내부에서만 Playwright API 사용 — 본 모듈은 `Page` 타입만 import.
 */
export async function applyResourceBlocking(page: Page): Promise<void> {
  await page.route("**/*", async (route, request) => {
    const t = request.resourceType();
    if (t === "image" || t === "font" || t === "media") {
      await route.abort();
      return;
    }
    await route.continue();
  });
}

export type PoliteFetch = (
  input: Parameters<typeof fetch>[0],
  init?: RequestInit,
) => ReturnType<typeof fetch>;

/**
 * fetch 래퍼: 매 요청 전 랜덤 딜레이 + User-Agent 자동 주입(미설정 시).
 */
export function createPoliteFetch(): PoliteFetch {
  return async (input, init) => {
    await randomDelay();
    const headers = new Headers(init?.headers);
    if (!headers.has("User-Agent")) {
      headers.set("User-Agent", getRandomUserAgent());
    }
    return fetch(input, { ...init, headers });
  };
}
