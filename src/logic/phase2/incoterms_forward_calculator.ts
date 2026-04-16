export interface IncotermsInput {
  fobUsd: number;
  freightUsd?: number;
  insuranceRate?: number;
  customsUsd?: number;
  tariffRate?: number;
}

export interface IncotermsOutput {
  fobUsd: number;
  cfrUsd: number;
  cifUsd: number;
  ddpUsd: number;
}

function roundUsd(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateIncotermsForward(input: IncotermsInput): IncotermsOutput {
  const freightUsd = input.freightUsd ?? 0.8;
  const insuranceRate = input.insuranceRate ?? 0.0011;
  const customsUsd = input.customsUsd ?? 0.25;
  const tariffRate = input.tariffRate ?? 0;
  const fobUsd = Math.max(0, input.fobUsd);

  const cfrUsd = fobUsd + freightUsd;
  const cifUsd = cfrUsd + cfrUsd * insuranceRate;
  const ddpUsd = cifUsd + cifUsd * tariffRate + customsUsd;

  return {
    fobUsd: roundUsd(fobUsd),
    cfrUsd: roundUsd(cfrUsd),
    cifUsd: roundUsd(cifUsd),
    ddpUsd: roundUsd(ddpUsd),
  };
}
