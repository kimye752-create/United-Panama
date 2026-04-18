import { PSI_BASIC_WEIGHTS } from "./types";

export interface DefaultPSIInput {
  revenue_tier_score: number;
  pipeline_tier_score: number;
  manufacturing_score: number;
  import_experience_score: number;
  pharmacy_chain_score: number;
}

export function computeDefaultPSI(input: DefaultPSIInput): number {
  const psi =
    PSI_BASIC_WEIGHTS.revenue * input.revenue_tier_score +
    PSI_BASIC_WEIGHTS.pipeline * input.pipeline_tier_score +
    PSI_BASIC_WEIGHTS.manufacture * input.manufacturing_score +
    PSI_BASIC_WEIGHTS.import * input.import_experience_score +
    PSI_BASIC_WEIGHTS.pharmacy * input.pharmacy_chain_score;

  return Math.round(psi * 100) / 100;
}
