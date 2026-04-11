/**
 * 기법 ① WebWalker — Phase B 연기 (stub)
 */
/// <reference types="node" />

export interface WebWalkerTask {
  seedUrl: string;
  targetKeywords: string[];
  maxDepth: number;
}

export interface WebWalkerResult {
  visitedUrls: string[];
  extractedData: Record<string, unknown>[];
  exploredDepth: number;
}

export async function exploreWithWebWalker(
  _task: WebWalkerTask,
): Promise<WebWalkerResult> {
  throw new Error(
    "WebWalker: Phase B deferred - session 9+. 11개 타겟 사이트 URL 확정 상태에서 불필요, 국가 확장 시 활성화",
  );
}
