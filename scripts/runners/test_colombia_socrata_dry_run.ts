/**
 * Colombia datos.gov.co Socrata — Precios Medicamentos (3t73-n4q9) dry-run (INSERT 없음)
 * 키워드별 $q 검색 → 레코드 집계·INN 포함 여부·COP→USD(4000:1 근사)
 */
/// <reference types="node" />

import { setTimeout as delay } from "node:timers/promises";

import { COLOMBIA_SOCRATA_BLOCKS } from "../../src/utils/colombia_socrata_blocks.js";

const SOCRATA_URL =
  "https://www.datos.gov.co/resource/3t73-n4q9.json";

/** 시연용 근사 환율 COP/USD (요청 스펙) */
const COP_PER_USD = 4000;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function randomDelayMs(): number {
  return 1500 + Math.floor(Math.random() * 1500);
}

type SocrataRow = Record<string, unknown>;

function rowBlob(r: SocrataRow): string {
  const parts = [
    r.principio_activo,
    r.concentracion,
    r.nombre_comercial,
    r.fabricante,
  ]
    .map((x) => (typeof x === "string" ? x : ""))
    .join(" ");
  return parts.toLowerCase();
}

/** 키워드가 principio_activo·concentracion 중심으로 실제 포함되는지(부분 일치, 정규화) */
function rowMatchesInnKeyword(r: SocrataRow, keyword: string): boolean {
  const k = keyword
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (k === "") {
    return false;
  }
  const blob = rowBlob(r)
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  return blob.includes(k);
}

function parsePrecioCOP(r: SocrataRow): number | null {
  const raw = r.precio_por_tableta;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  if (typeof raw === "string") {
    const n = Number.parseFloat(raw.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function rowKey(r: SocrataRow): string {
  return [
    String(r.principio_activo ?? ""),
    String(r.concentracion ?? ""),
    String(r.nombre_comercial ?? ""),
    String(r.fabricante ?? ""),
  ].join("|");
}

async function fetchByQ(q: string, limit: number): Promise<SocrataRow[]> {
  const u = new URL(SOCRATA_URL);
  u.searchParams.set("$q", q);
  u.searchParams.set("$limit", String(limit));
  const res = await fetch(u.toString(), {
    headers: { Accept: "application/json", "User-Agent": UA },
  });
  if (!res.ok) {
    throw new Error(`Socrata HTTP ${String(res.status)} ${u.toString()}`);
  }
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) {
    return [];
  }
  return data as SocrataRow[];
}

async function main(): Promise<void> {
  const schemaSample = await fetchByQ("midazolam", 5);
  await delay(randomDelayMs());

  const fieldNames =
    schemaSample.length > 0
      ? Object.keys(schemaSample[0] as object)
      : [];

  const perProduct: Array<{
    product: string;
    apiRecordCountSum: number;
    uniqueRows: number;
    matchedInnCount: number;
    minCop: number | null;
    maxCop: number | null;
    minUsd: number | null;
    maxUsd: number | null;
    samples: Array<{
      nombre: string;
      precioCop: number | null;
      precioUsd: number | null;
      fabricante: string;
    }>;
  }> = [];

  for (const block of COLOMBIA_SOCRATA_BLOCKS) {
    const merged = new Map<string, SocrataRow>();
    let apiSum = 0;
    for (const kw of block.keywords) {
      await delay(randomDelayMs());
      const rows = await fetchByQ(kw, 50);
      apiSum += rows.length;
      for (const r of rows) {
        merged.set(rowKey(r), r);
      }
    }
    const unique = [...merged.values()];
    const matched = unique.filter((r) =>
      block.keywords.some((kw) => rowMatchesInnKeyword(r, kw)),
    );
    const cops = matched
      .map((r) => parsePrecioCOP(r))
      .filter((n): n is number => n !== null);
    const minCop = cops.length > 0 ? Math.min(...cops) : null;
    const maxCop = cops.length > 0 ? Math.max(...cops) : null;
    const minUsd = minCop !== null ? minCop / COP_PER_USD : null;
    const maxUsd = maxCop !== null ? maxCop / COP_PER_USD : null;

    const samples = matched.slice(0, 3).map((r) => {
      const cop = parsePrecioCOP(r);
      return {
        nombre: String(r.nombre_comercial ?? r.concentracion ?? "").slice(
          0,
          120,
        ),
        precioCop: cop,
        precioUsd: cop !== null ? cop / COP_PER_USD : null,
        fabricante: String(r.fabricante ?? "").slice(0, 80),
      };
    });

    perProduct.push({
      product: block.label,
      apiRecordCountSum: apiSum,
      uniqueRows: unique.length,
      matchedInnCount: matched.length,
      minCop,
      maxCop,
      minUsd,
      maxUsd,
      samples,
    });
  }

  process.stdout.write(
    JSON.stringify(
      {
        socrataEndpoint: SOCRATA_URL,
        schemaFieldsFromSample: fieldNames,
        copPerUsdApprox: COP_PER_USD,
        paSourceRecommendation:
          "코드베이스에 colombia_secop/datos_gov_co 적재 없음 → 신규 시 `datos_gov_co` 권장(SECOP 조달과 구분)",
        perProduct,
      },
      null,
      2,
    ) + "\n",
  );
}

main().catch((e: unknown) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
