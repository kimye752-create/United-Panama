/**
 * 파나마 1품목 분석 파이프라인 — API·서버 컴포넌트 공용 ( LLM 없음 )
 */
/// <reference types="node" />

import { detectOutliersIQR, type PriceRow } from "../cleansing/sand_outlier";
import { findProductById, type ProductMaster } from "../utils/product-dictionary";
import {
  judgeCase,
  type JudgmentResult,
} from "./case_judgment";
import { matchDistributorsForProduct } from "./distributor_matcher";
import {
  countPanamaBySource,
  countPrivateRetail,
  countPublicOrBothDistributors,
  getDistributors,
  getEmlStatus,
  coerceFiniteNumber,
  getMacroSummary,
  getPriceRowsByProduct,
  getSourceAggregation,
  hasCabamedRegulated,
  type DistributorRow,
  type PanamaRow,
  type SourceAggRow,
} from "./fetch_panama_data";

const ANALYSIS_TIMEOUT_MS = 10_000;

export type AnalyzePanamaResult = {
  product: ProductMaster;
  judgment: JudgmentResult;
  macroRows: PanamaRow[];
  distributors: DistributorRow[];
  matchedDistributors: DistributorRow[];
  priceRows: PanamaRow[];
  sandCleaned: PriceRow[];
  emlWho: boolean;
  emlPaho: boolean;
  emlMinsa: boolean;
  sourceAggregation: SourceAggRow[];
  /** PanamaCompra 출처 적재 건수 (판정·LLM 컨텍스트용) */
  panamacompraCount: number;
  /** 민간 소매가 표본 건수 */
  privateRetailCount: number;
};

function toPriceRows(rows: PanamaRow[]): PriceRow[] {
  return rows.map((r) => ({
    id: r.id,
    pa_price_local: coerceFiniteNumber(r.pa_price_local),
    pa_ingredient_inn: null,
  }));
}

async function runCore(
  productId: string,
): Promise<AnalyzePanamaResult> {
  const product = findProductById(productId);
  if (product === undefined) {
    throw new Error("유효하지 않은 product_id입니다.");
  }

  const [
    macroRows,
    eml,
    distributors,
    priceRows,
    sourceAggregation,
    pc,
    priv,
    cabamed,
  ] = await Promise.all([
    getMacroSummary(),
    getEmlStatus(productId),
    getDistributors(),
    getPriceRowsByProduct(productId),
    getSourceAggregation(),
    countPanamaBySource(productId, "panamacompra"),
    countPrivateRetail(productId),
    hasCabamedRegulated(productId),
  ]);

  const distCount = countPublicOrBothDistributors(distributors);

  const judgmentInput = {
    productId,
    emlWho: eml.emlWho,
    emlPaho: eml.emlPaho,
    emlMinsa: eml.emlMinsa,
    panamacompraCount: pc,
    privateRetailCount: priv,
    cabamedRegulated: cabamed,
    distributorCount: distCount,
  };

  const judgment = judgeCase(judgmentInput);
  const sand = detectOutliersIQR(toPriceRows(priceRows));
  const matchedDistributors = matchDistributorsForProduct(
    judgment.case,
    distributors,
  );

  return {
    product,
    judgment,
    macroRows,
    distributors,
    matchedDistributors,
    priceRows,
    sandCleaned: sand.cleaned,
    emlWho: eml.emlWho,
    emlPaho: eml.emlPaho,
    emlMinsa: eml.emlMinsa,
    sourceAggregation,
    panamacompraCount: pc,
    privateRetailCount: priv,
  };
}

export async function analyzePanamaProduct(
  productId: string,
): Promise<AnalyzePanamaResult> {
  const raced = await Promise.race([
    runCore(productId),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error("분석 시간 초과(10초)"));
      }, ANALYSIS_TIMEOUT_MS);
    }),
  ]);
  return raced;
}
