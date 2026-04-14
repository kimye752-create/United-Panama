/**
 * CABAMED XLSX 파싱 → panama 적재 (acodeco_cabamed_self / acodeco_cabamed_competitor)
 */
/// <reference types="node" />

import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

import * as XLSX from "xlsx";

import {
  matchCabamedRow,
  pickRetailPrice,
  type CabamedMatchResult,
} from "./cabamed_match.js";
import { insertRow, type PanamaPhase1InsertRow } from "../../utils/db_connector.js";
import type { ProductMaster } from "../../utils/product-dictionary.js";

const DEFAULT_XLSX = join(
  process.cwd(),
  "data",
  "seed",
  "panama",
  "acodeco_cabamed.xlsx",
);

const PA_URL_BASE =
  "https://www.acodeco.gob.pa/inicio/wp-content/uploads/";

/** 자사 8품목 product_id → ATC4 (보고서·pa_notes 정합) */
const ATC4_BY_PRODUCT: Readonly<Record<string, string>> = {
  "bdfc9883-6040-438a-8e7a-df01f1230682": "L01XX",
  "fcae4399-aa80-4318-ad55-89d6401c10a9": "B01AC",
  "24738c3b-3a5b-40a9-9e8e-889ec075b453": "A03FA",
  "2504d79b-c2ce-4660-9ea7-5576c8bb755f": "C10AA",
  "859e60f9-8544-43b3-a6a0-f6c7529847eb": "C10AA",
  "014fd4d2-dc66-4fc1-8d4f-59695183387f": "R03AK",
  "f88b87b8-c0ab-4f6e-ba34-e9330d1d4e18": "C10AX",
  "895f49ae-6ce3-44a3-93bd-bb77e027ba59": "V08CA",
};

/** 열 인덱스(0-based): 세션 19 XLSX 샘플 기준 */
const COL = {
  no: 0,
  descripcion: 1,
  refPromedio: 5,
  genPromedio: 8,
} as const;

function parseNumericCell(v: unknown): number | null {
  if (v === null || v === undefined) {
    return null;
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    return v;
  }
  if (typeof v === "string") {
    let s = v.trim().replace(/\s/g, "");
    if (s === "" || s === "-" || s === "—") {
      return null;
    }
    if (s.includes(",") && s.includes(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else if (s.includes(",") && !s.includes(".")) {
      s = s.replace(",", ".");
    }
    const n = Number.parseFloat(s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function isHeaderOrEmpty(desc: string): boolean {
  const u = desc.trim().toUpperCase();
  if (u === "") {
    return true;
  }
  if (u.includes("DESCRIPCI") && u.length < 40) {
    return true;
  }
  return false;
}

function publicationMonthLabel(): string {
  const d = new Date();
  return `${String(d.getUTCFullYear())}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function buildNotes(
  match: CabamedMatchResult,
  descripcion: string,
  itemNo: number | null,
  price: number,
): Record<string, unknown> {
  const pub = publicationMonthLabel();
  const base: Record<string, unknown> = {
    price_unit: "최소 판매 단위",
    price_unit_detail: "1정/1캡슐/1ml/1병 단위 평균가 (포장 박스 단위 아님)",
    usage_purpose:
      "자사 개량신약 가격 책정 핵심 인풋. 일반 제네릭 가격(하한 참조) + 오리지널 가격(상한 참조) 사이 적정 포지셔닝 산출",
    self_inn_strategy:
      "자사 개량신약은 일반 제네릭 가격 위 + 오리지널 가격 아래에 책정. 개량 효능 + 한국 GMP 차별화 정당화.",
    item_no: itemNo,
    descripcion_full: descripcion,
    data_nature: "private_pharmacy_retail_average",
    not_government_procurement: true,
    legal_basis: "Resolución 774 (2019) - 약국 의무 게시",
    publication_month: pub,
  };

  if (match.kind === "self") {
    const p: ProductMaster = match.product;
    return {
      ...base,
      match_type: "self_direct",
      self_inn_target: p.who_inn_en,
      self_inn_atc4: ATC4_BY_PRODUCT[p.product_id] ?? "",
      precio_referencia_promedio: price,
      precio_generico_promedio: price,
    };
  }

  const p = match.targetProduct;
  const atc4 = ATC4_BY_PRODUCT[p.product_id] ?? "";
  return {
    ...base,
    match_type: "competitor_same_atc4",
    competitor_inn: match.competitorInnToken,
    self_inn_target: p.who_inn_en,
    self_inn_atc4: atc4,
    precio_referencia_promedio: price,
    precio_generico_promedio: price,
    precio_referencia_brand: null,
    precio_referencia_lab: null,
    precio_generico_min: null,
    precio_generico_lab: null,
  };
}

export async function loadCabamedFromXlsx(
  xlsxPath: string,
): Promise<{ inserted: number; skipped: number }> {
  const buf = await readFile(xlsxPath);
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  if (sheetName === undefined) {
    throw new Error("XLSX에 시트가 없습니다.");
  }
  const sheet = wb.Sheets[sheetName];
  const rowsUnknown: unknown = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });
  if (!Array.isArray(rowsUnknown)) {
    throw new Error("시트 행 파싱 실패");
  }
  const rows = rowsUnknown as unknown[][];

  let inserted = 0;
  let skipped = 0;
  const crawledAt = new Date().toISOString();

  for (const row of rows) {
    if (!Array.isArray(row)) {
      skipped += 1;
      continue;
    }
    const descRaw = row[COL.descripcion];
    const descripcion =
      typeof descRaw === "string" ? descRaw.trim() : String(descRaw ?? "").trim();
    if (isHeaderOrEmpty(descripcion)) {
      skipped += 1;
      continue;
    }

    const itemRaw = row[COL.no];
    let itemNo: number | null = null;
    if (typeof itemRaw === "number" && Number.isFinite(itemRaw)) {
      itemNo = itemRaw;
    } else if (typeof itemRaw === "string") {
      const n = Number.parseInt(itemRaw.trim(), 10);
      itemNo = Number.isFinite(n) ? n : null;
    }

    const refP = parseNumericCell(row[COL.refPromedio]);
    const genP = parseNumericCell(row[COL.genPromedio]);
    const price = pickRetailPrice(refP, genP);
    if (price === null) {
      skipped += 1;
      continue;
    }

    const match = matchCabamedRow(descripcion);
    if (match === null) {
      skipped += 1;
      continue;
    }

    const paSource =
      match.kind === "self"
        ? "acodeco_cabamed_self"
        : "acodeco_cabamed_competitor";

    const productId =
      match.kind === "self"
        ? match.product.product_id
        : match.targetProduct.product_id;

    const inn =
      match.kind === "self"
        ? match.product.who_inn_en
        : match.competitorInnToken;

    const notes = buildNotes(match, descripcion, itemNo, price);

    const rowInsert: PanamaPhase1InsertRow = {
      product_id: productId,
      market_segment: "private",
      fob_estimated_usd: null,
      confidence: 0.88,
      crawled_at: crawledAt,
      pa_source: paSource,
      pa_source_url: PA_URL_BASE,
      pa_product_name_local: descripcion.slice(0, 500),
      pa_ingredient_inn: inn.slice(0, 200),
      pa_price_local: price,
      pa_currency_unit: "USD",
      pa_price_type: "retail_average_published",
      pa_decree_listed: false,
      pa_notes: JSON.stringify(notes),
    };

    const r = await insertRow(rowInsert);
    if (r.ok) {
      inserted += 1;
    } else {
      skipped += 1;
    }
  }

  return { inserted, skipped };
}

async function main(): Promise<void> {
  const arg = process.argv.find((a) => a.startsWith("--file="));
  const path = arg !== undefined ? arg.slice("--file=".length) : DEFAULT_XLSX;
  const result = await loadCabamedFromXlsx(path);
  process.stdout.write(`${JSON.stringify({ ok: true, ...result })}\n`);
}

const invoked = process.argv[1];
if (invoked !== undefined) {
  const a = normalize(fileURLToPath(import.meta.url));
  const b = normalize(invoked);
  if (a === b) {
    main().catch((e: unknown) => {
      process.stderr.write(
        `${e instanceof Error ? e.message : String(e)}\n`,
      );
      process.exit(1);
    });
  }
}
