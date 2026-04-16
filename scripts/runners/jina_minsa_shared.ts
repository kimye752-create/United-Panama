import * as fs from "node:fs/promises";
import * as path from "node:path";

export const OUTPUT_DIR = "data/raw/jina_minsa" as const;
export const PLAYWRIGHT_OUTPUT_DIR = "data/raw/playwright_minsa" as const;

export const PHASE1_TARGETS = [
  "https://www.minsa.gob.pa",
  "https://tramites-minsa.panamadigital.gob.pa/",
  "https://www.acodeco.gob.pa",
  "https://www.dnfd.minsa.gob.pa",
] as const;

export const SEARCH_KEYWORDS = [
  "buscar medicamento",
  "registro sanitario",
  "consulta de medicamentos",
  "consulta medicamentos",
  "farmacia y drogas",
  "dnfd",
  "medicamentos registrados",
] as const;

export const URL_PATTERN = /https?:\/\/[^\s)\]]+/g;

export const SELF_INNS_ES = [
  { product: "Rosumeg", inn: "Rosuvastatina" },
  { product: "Atmeg", inn: "Atorvastatina" },
  { product: "Ciloduo", inn: "Cilostazol" },
  { product: "Gastiin_CR", inn: "Mosaprida" },
  { product: "Sereterol", inn: "Salmeterol" },
  { product: "Hydrine", inn: "Hidroxiurea" },
  { product: "Gadvoa", inn: "Gadobutrol" },
  { product: "Omethyl", inn: "Esteres etilicos del acido omega" },
] as const;

export interface PhaseResult<T> {
  ok: boolean;
  data: T;
  error?: string;
}

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function sanitizeToFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "_");
}

export function toJinaUrl(url: string): string {
  return `https://r.jina.ai/${url}`;
}

export async function fetchViaJina(targetUrl: string): Promise<string> {
  const jinaUrl = toJinaUrl(targetUrl);
  try {
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
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Jina 요청 중 알 수 없는 오류";
    throw new Error(
      `Jina Reader 호출 실패: ${message}. URL=${targetUrl} 네트워크/차단 상태를 확인하세요.`,
    );
  }
}

export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

export function resolveOutput(...segments: string[]): string {
  return path.join(OUTPUT_DIR, ...segments);
}
