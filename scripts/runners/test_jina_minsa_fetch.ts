import { promises as fs } from "node:fs";
import path from "node:path";

const TARGETS = [
  "https://www.minsa.gob.pa",
  "https://tramites-minsa.panamadigital.gob.pa/",
  "https://www.acodeco.gob.pa",
  "https://www.dnfd.minsa.gob.pa",
] as const;

interface FetchResult {
  url: string;
  success: boolean;
  size: number;
  preview: string;
  outputPath: string | null;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeFileName(url: string): string {
  return `${url.replace(/[^a-zA-Z0-9]/g, "_")}.txt`;
}

async function fetchViaJina(targetUrl: string): Promise<string> {
  const jinaUrl = `https://r.jina.ai/${targetUrl}`;
  const response = await fetch(jinaUrl, {
    method: "GET",
    headers: {
      Accept: "text/plain",
      "User-Agent": "Mozilla/5.0 (compatible; UPharma/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(`Jina fetch failed: ${response.status} ${response.statusText}`);
  }

  return await response.text();
}

async function main(): Promise<void> {
  const outputDir = path.join("data", "raw", "jina_minsa");
  await fs.mkdir(outputDir, { recursive: true });

  const results: FetchResult[] = [];

  for (const target of TARGETS) {
    try {
      console.log(`[fetch] ${target}`);
      const text = await fetchViaJina(target);
      const fileName = sanitizeFileName(target);
      const outputPath = path.join(outputDir, fileName);
      await fs.writeFile(outputPath, text, "utf-8");

      results.push({
        url: target,
        success: true,
        size: text.length,
        preview: text.slice(0, 500),
        outputPath,
      });

      console.log(`  ✓ ${text.length} chars saved -> ${outputPath}`);
      await sleep(2000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        url: target,
        success: false,
        size: 0,
        preview: message,
        outputPath: null,
      });
      console.error(`  ✗ ${message}`);
    }
  }

  console.log("\n=== 수집 결과 요약 ===");
  for (const result of results) {
    console.log(`${result.success ? "✓" : "✗"} ${result.url} (${result.size} chars)`);
    if (result.success) {
      console.log(`  File: ${result.outputPath}`);
      console.log(`  Preview: ${result.preview.slice(0, 200)}...`);
    } else {
      console.log(`  Error: ${result.preview}`);
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[fatal] ${message}`);
  process.exitCode = 1;
});
