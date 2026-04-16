import * as fs from "node:fs/promises";
import * as path from "node:path";

import { getSupabaseClient } from "../../src/utils/db_connector";
import { OUTPUT_DIR, writeJsonFile } from "./jina_minsa_shared";

const REG_PATTERNS = [/R-?\d{4,6}/g, /R\d-\d{6}/g, /\b\d{6}-?R?\d?\b/g] as const;

interface ExtractedRegistration {
  product: string;
  inn: string;
  source_file: string;
  registration_numbers: string[];
  context_snippets: string[];
}

interface Phase4Summary {
  generated_at: string;
  extracted: ExtractedRegistration[];
  panamacompra_v3_registrations: string[];
  overlap_with_panamacompra_v3: string[];
}

function parseSearchFileName(fileName: string): { product: string; inn: string } | null {
  const match = fileName.match(/^search_(.+?)_(.+)\.txt$/);
  if (match === null) {
    return null;
  }
  return { product: match[1] ?? "unknown", inn: match[2] ?? "unknown" };
}

function extractFromContent(content: string): { regs: string[]; snippets: string[] } {
  const regs: string[] = [];
  const snippets: string[] = [];
  for (const pattern of REG_PATTERNS) {
    const matches = [...content.matchAll(pattern)];
    for (const match of matches) {
      const reg = match[0];
      if (typeof reg !== "string") {
        continue;
      }
      regs.push(reg);
      const idx = match.index ?? 0;
      snippets.push(
        content.slice(Math.max(0, idx - 80), idx + 100).replace(/\n/g, " "),
      );
    }
  }
  return { regs: [...new Set(regs)], snippets: snippets.slice(0, 5) };
}

async function fetchPanamaCompraV3Registrations(): Promise<string[]> {
  const sb = getSupabaseClient();
  try {
    const { data, error } = await sb
      .from("panama")
      .select("pa_notes")
      .eq("pa_source", "panamacompra_v3");
    if (error !== null) {
      throw new Error(error.message);
    }
    const found: string[] = [];
    for (const row of (data ?? []) as Array<{ pa_notes?: string | null }>) {
      const notes = row.pa_notes ?? "";
      for (const pattern of REG_PATTERNS) {
        const matches = [...notes.matchAll(pattern)];
        for (const match of matches) {
          if (typeof match[0] === "string") {
            found.push(match[0]);
          }
        }
      }
    }
    return [...new Set(found)];
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[Phase4] PanamaCompra V3 등록번호 조회 실패: ${message}. 비교 매트릭스는 빈 값으로 저장합니다.`,
    );
    return [];
  }
}

export async function runPhase4(): Promise<Phase4Summary> {
  const files = await fs.readdir(OUTPUT_DIR);
  const extracted: ExtractedRegistration[] = [];

  for (const file of files) {
    if (!file.startsWith("search_") || !file.endsWith(".txt")) {
      continue;
    }
    const parsed = parseSearchFileName(file);
    if (parsed === null) {
      continue;
    }
    const content = await fs.readFile(path.join(OUTPUT_DIR, file), "utf-8");
    const { regs, snippets } = extractFromContent(content);
    if (regs.length === 0) {
      continue;
    }
    extracted.push({
      product: parsed.product,
      inn: parsed.inn,
      source_file: file,
      registration_numbers: regs,
      context_snippets: snippets,
    });
  }

  const panamacompraV3Regs = await fetchPanamaCompraV3Registrations();
  const extractedAll = extracted.flatMap((item) => item.registration_numbers);
  const overlap = [...new Set(extractedAll)].filter((reg) =>
    panamacompraV3Regs.includes(reg),
  );

  const summary: Phase4Summary = {
    generated_at: new Date().toISOString(),
    extracted,
    panamacompra_v3_registrations: panamacompraV3Regs,
    overlap_with_panamacompra_v3: overlap,
  };
  await writeJsonFile(path.join(OUTPUT_DIR, "_phase4_registrations.json"), extracted);
  await writeJsonFile(path.join(OUTPUT_DIR, "_phase4_summary.json"), summary);
  return summary;
}

async function main(): Promise<void> {
  const summary = await runPhase4();
  console.log(`\n=== Phase 4 결과: ${summary.extracted.length}개 제품 등록 정보 추출 ===`);
  for (const item of summary.extracted) {
    console.log(`\n${item.product} (${item.inn}):`);
    for (const reg of item.registration_numbers) {
      console.log(`  - ${reg}`);
    }
  }
  console.log(
    `\nPanamaCompra V3 중복 등록번호: ${summary.overlap_with_panamacompra_v3.length}건`,
  );
}

if (process.argv[1] !== undefined && process.argv[1].endsWith("jina_minsa_phase4.ts")) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[Phase4][fatal] ${message}`);
    process.exitCode = 1;
  });
}
