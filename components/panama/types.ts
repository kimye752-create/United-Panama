import type { Report1Payload } from "@/src/llm/report1_schema";
import type { PerplexityPaper } from "@/src/logic/perplexity_insights";
import type { ProductMaster } from "@/src/utils/product-dictionary";

export type SourceBreakdown = {
  panamacompra_v3: {
    count: number;
    avgPrice: number | null;
    minPrice: number | null;
    maxPrice: number | null;
    topProveedor: string | null;
  };
  acodeco: {
    count: number;
    avgPrice: number | null;
  };
  superxtra: {
    count: number;
    price: number | null;
    hasStock: boolean | null;
  };
  colombia_secop: {
    count: number;
    avgPrice: number | null;
    erpBasis: string;
  };
};

export type ConfidenceBreakdown = {
  publicProcurement: boolean;
  privatePrice: boolean;
  eml: boolean;
  erpReference: boolean;
  distributors: boolean;
  regulation: boolean;
  prevalence: boolean;
  total: number;
  max: number;
  percent: number;
};

export type DashboardBundle = {
  product: ProductMaster;
  caseGrade: "A" | "B" | "C";
  confidence: number;
  verdict: string;
  llmPayload: Report1Payload;
  sourceBreakdown: SourceBreakdown;
  confidenceBreakdown: ConfidenceBreakdown;
  perplexityPapers: PerplexityPaper[];
  perplexitySource: string;
  collectedAt: string;
};
