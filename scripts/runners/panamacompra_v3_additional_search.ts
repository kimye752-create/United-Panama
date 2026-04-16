/**
 * PanamaCompra V3 추가 수동 검색 가이드 (콘솔 출력)
 */

interface AdditionalSearchItem {
  product: string;
  keywords: string[];
  url: string;
  instruction: string;
}

const ADDITIONAL_SEARCHES: AdditionalSearchItem[] = [
  {
    product: "Gadvoa",
    keywords: ["Gadobutrol", "Gadovist", "medio de contraste", "agente de contraste MRI"],
    url: "https://www.panamacompra.gob.pa/Inicio/#/busqueda-avanzada",
    instruction: "위 키워드로 PanamaCompra V3 검색. 결과 PDF 다운로드 후 Claude에 전달.",
  },
  {
    product: "Gastiin CR",
    keywords: ["Mosaprida", "Mosapride", "procinetico", "dispepsia funcional"],
    url: "https://www.panamacompra.gob.pa/Inicio/#/busqueda-avanzada",
    instruction: "위 키워드로 검색. 0건이면 '0건 확인' 기록 (이것도 1차 출처).",
  },
  {
    product: "Omethyl",
    keywords: ["이미 0건 확인 완료 (세션 20)"],
    url: "N/A",
    instruction: "추가 검색 불필요. PanamaCompra V3 0건 = 1차 출처로 확정.",
  },
];

async function main(): Promise<void> {
  console.log("=== PanamaCompra V3 추가 수동 검색 가이드 ===\n");

  for (const item of ADDITIONAL_SEARCHES) {
    console.log(`## ${item.product}`);
    console.log(`키워드: ${item.keywords.join(", ")}`);
    console.log(`URL: ${item.url}`);
    console.log(`지시: ${item.instruction}`);
    console.log("");
  }
}

if (process.argv[1] !== undefined && process.argv[1].endsWith("panamacompra_v3_additional_search.ts")) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[panamacompra_v3_additional_search][fatal] ${message}`);
    process.exitCode = 1;
  });
}

export {};
