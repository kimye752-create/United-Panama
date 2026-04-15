/**
 * PanamaCompra V3 정형 JSON 직접 INSERT
 * PDF 파싱 없이 curated JSON을 panama 테이블에 적재한다.
 */
/// <reference types="node" />

import { readFile } from "node:fs/promises";
import path from "node:path";

import { getSupabaseClient, insertRow } from "../../src/utils/db_connector.js";

const SOURCE_URL = "https://www.panamacompra.gob.pa/Inicio/#/busqueda-avanzada";
const PA_SOURCE = "panamacompra_v3" as const;
const CURATED_PATH = path.join(
  process.cwd(),
  "data",
  "seed",
  "panama",
  "round6_panamacompra_v3_curated.json",
);

type CuratedRow = {
  proceso_numero: string;
  fecha: string;
  entidad: string;
  dependencia: string;
  inn: string;
  concentracion: string;
  forma_farma: string;
  nombre_comercial: string;
  marca: string;
  fabricante: string;
  pais_origen: string;
  proveedor: string;
  cantidad: number;
  precio_unitario: number;
  importe_total: number;
  registro_sanitario: string;
  ficha_tecnica_ctni: string;
  self_product_match: string;
  self_product_uuid: string | null;
  atc_code: string;
  bonus_data?: boolean;
  bonus_reason?: string;
};

type ExistingRow = {
  pa_ingredient_inn: string | null;
  pa_notes: string | null;
};

function upperInn(value: string): string {
  return value.trim().toUpperCase();
}

function atc4(value: string): string {
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const match = normalized.match(/^[A-Z][0-9]{2}[A-Z]{2}/);
  if (match !== null) {
    return match[0];
  }
  return normalized.length >= 5 ? normalized.slice(0, 5) : normalized;
}

function dedupKey(procesoNumero: string, inn: string): string {
  return `${procesoNumero.trim().toUpperCase()}__${upperInn(inn)}`;
}

function parseExistingKeySet(rows: ExistingRow[]): Set<string> {
  const out = new Set<string>();
  for (const row of rows) {
    const inn = row.pa_ingredient_inn ?? "";
    const notesRaw = row.pa_notes;
    if (notesRaw === null || notesRaw.trim() === "") {
      continue;
    }
    try {
      const parsed = JSON.parse(notesRaw) as { proceso_numero?: string };
      const proceso = parsed.proceso_numero ?? "";
      if (proceso.trim() === "" || inn.trim() === "") {
        continue;
      }
      out.add(dedupKey(proceso, inn));
    } catch {
      // 기존 pa_notes가 비JSON일 수 있어 무시한다.
    }
  }
  return out;
}

async function loadCuratedRows(): Promise<CuratedRow[]> {
  const raw = await readFile(CURATED_PATH, "utf-8");
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("curated JSON 루트는 배열이어야 합니다.");
  }
  return parsed as CuratedRow[];
}

async function loadExistingDedupKeys(): Promise<Set<string>> {
  const client = getSupabaseClient();
  const res = await client
    .from("panama")
    .select("pa_ingredient_inn, pa_notes")
    .eq("pa_source", PA_SOURCE);
  if (res.error !== null) {
    throw new Error(`기존 panamacompra_v3 조회 실패: ${res.error.message}`);
  }
  return parseExistingKeySet((res.data ?? []) as ExistingRow[]);
}

async function clearPanamaReportCache(): Promise<void> {
  const client = getSupabaseClient();
  const del = await client
    .from("panama_report_cache")
    .delete()
    .gte("generated_at", "1970-01-01T00:00:00Z");
  if (del.error !== null) {
    throw new Error(`panama_report_cache 삭제 실패: ${del.error.message}`);
  }
}

async function queryPanamacompraV3ByProduct(): Promise<
  Array<{
    product_id: string;
    cnt: number;
    min_usd: number | null;
    max_usd: number | null;
    avg_usd: number | null;
  }>
> {
  const client = getSupabaseClient();
  const res = await client
    .from("panama")
    .select("product_id, pa_price_local")
    .eq("pa_source", PA_SOURCE);
  if (res.error !== null) {
    throw new Error(`panamacompra_v3 집계 조회 실패: ${res.error.message}`);
  }
  const map = new Map<string, number[]>();
  for (const row of res.data ?? []) {
    const productId = String((row as { product_id: string }).product_id);
    const raw = (row as { pa_price_local: number | string | null }).pa_price_local;
    const n = typeof raw === "number" ? raw : Number.parseFloat(String(raw ?? ""));
    if (!Number.isFinite(n)) {
      continue;
    }
    const cur = map.get(productId);
    if (cur === undefined) {
      map.set(productId, [n]);
    } else {
      cur.push(n);
    }
  }
  return [...map.entries()]
    .map(([product_id, prices]) => {
      const sum = prices.reduce((acc, x) => acc + x, 0);
      return {
        product_id,
        cnt: prices.length,
        min_usd: prices.length > 0 ? Math.min(...prices) : null,
        max_usd: prices.length > 0 ? Math.max(...prices) : null,
        avg_usd: prices.length > 0 ? Number((sum / prices.length).toFixed(4)) : null,
      };
    })
    .sort((a, b) => b.cnt - a.cnt);
}

async function querySourceCounts(): Promise<Array<{ pa_source: string; cnt: number }>> {
  const client = getSupabaseClient();
  const res = await client.from("panama").select("pa_source");
  if (res.error !== null) {
    throw new Error(`pa_source 집계 조회 실패: ${res.error.message}`);
  }
  const map = new Map<string, number>();
  for (const row of res.data ?? []) {
    const source = String((row as { pa_source: string | null }).pa_source ?? "");
    map.set(source, (map.get(source) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([pa_source, cnt]) => ({ pa_source, cnt }))
    .sort((a, b) => b.cnt - a.cnt);
}

async function queryPanamaTotalCount(): Promise<number | null> {
  const client = getSupabaseClient();
  const res = await client.from("panama").select("*", { count: "exact", head: true });
  if (res.error !== null) {
    throw new Error(`panama 전체 행 수 조회 실패: ${res.error.message}`);
  }
  return res.count ?? null;
}

async function main(): Promise<void> {
  const rows = await loadCuratedRows();
  const existing = await loadExistingDedupKeys();
  const seen = new Set<string>(existing);

  let inserted = 0;
  let skippedDuplicate = 0;
  let skippedBonus = 0;
  let insertFailed = 0;

  const nowIso = new Date().toISOString();

  for (const row of rows) {
    if (row.self_product_uuid === null || row.self_product_uuid.trim() === "") {
      skippedBonus += 1;
      process.stdout.write(
        `[insert_panamacompra_v3_curated] BONUS SKIP (${row.proceso_numero} / ${row.inn})\n`,
      );
      continue;
    }

    const key = dedupKey(row.proceso_numero, row.inn);
    if (seen.has(key)) {
      skippedDuplicate += 1;
      process.stdout.write(
        `[insert_panamacompra_v3_curated] DUPLICATE SKIP (${row.proceso_numero} / ${row.inn})\n`,
      );
      continue;
    }

    const notes = {
      self_inn_target: row.inn,
      self_inn_atc4: atc4(row.atc_code),
      match_type: "competitor_public_procurement",
      proceso_numero: row.proceso_numero,
      fabricante: row.fabricante,
      proveedor: row.proveedor,
      cantidad: row.cantidad,
      importe_total: row.importe_total,
      registro_sanitario: row.registro_sanitario,
      ficha_tecnica_ctni: row.ficha_tecnica_ctni,
      pais_origen: row.pais_origen,
      forma_farma: row.forma_farma,
      concentracion: row.concentracion,
      entidad_compradora: row.dependencia,
      fecha_orden: row.fecha,
      ley_419_2024: true,
      css_minsa_official: true,
      fuente: "PanamaCompra V3 - DGCP",
      collection_method: "manual_pdf_+_claude_extraction",
    };

    const result = await insertRow({
      product_id: row.self_product_uuid,
      market_segment: "public",
      fob_estimated_usd: null,
      confidence: 0.98,
      crawled_at: nowIso,
      pa_source: PA_SOURCE,
      pa_source_url: SOURCE_URL,
      pa_collected_at: nowIso,
      pa_product_name_local: row.nombre_comercial,
      pa_ingredient_inn: upperInn(row.inn),
      pa_price_type: "public_procurement",
      pa_price_local: row.precio_unitario,
      pa_currency_unit: "USD",
      pa_package_unit: row.forma_farma,
      pa_stock_status: "in_stock",
      pa_notes: JSON.stringify(notes),
    });

    if (result.ok) {
      inserted += 1;
      seen.add(key);
    } else {
      insertFailed += 1;
      process.stderr.write(
        `[insert_panamacompra_v3_curated] INSERT 실패 (${row.proceso_numero}): ${result.message}\n`,
      );
    }
  }

  await clearPanamaReportCache();
  const byProduct = await queryPanamacompraV3ByProduct();
  const sourceCounts = await querySourceCounts();
  const panamaTotal = await queryPanamaTotalCount();

  process.stdout.write(
    JSON.stringify(
      {
        source: PA_SOURCE,
        source_url: SOURCE_URL,
        curated_path: CURATED_PATH,
        curated_rows: rows.length,
        inserted,
        skipped_bonus: skippedBonus,
        skipped_duplicate: skippedDuplicate,
        insert_failed: insertFailed,
        panama_report_cache_deleted: true,
        panamacompra_v3_by_product: byProduct,
        panama_by_source: sourceCounts,
        panama_total_rows: panamaTotal,
      },
      null,
      2,
    ) + "\n",
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
