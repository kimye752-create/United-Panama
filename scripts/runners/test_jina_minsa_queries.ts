import { promises as fs } from "node:fs";
import path from "node:path";

const TERMS = [
  "Rosuvastatina",
  "Atorvastatina",
  "Cilostazol",
  "Mosaprida",
  "Salmeterol+Fluticasona",
  "Hidroxiurea",
  "Gadobutrol",
  "Omega-3",
] as const;

const PARAMS = ["medicamento", "nombre"] as const;
const BASE_URL = "https://consultamedicamentos.minsa.gob.pa/";

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function safeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9]+/g, "_");
}

async function main(): Promise<void> {
  const outDir = path.join("data", "raw", "jina_minsa", "queries");
  await fs.mkdir(outDir, { recursive: true });

  for (const term of TERMS) {
    for (const param of PARAMS) {
      const target = `${BASE_URL}?${param}=${encodeURIComponent(term)}`;
      const jinaUrl = `https://r.jina.ai/${target}`;
      try {
        const response = await fetch(jinaUrl, {
          headers: {
            Accept: "text/plain",
            "User-Agent": "Mozilla/5.0 (compatible; UPharma/1.0)",
          },
        });
        const text = await response.text();
        const fileName = `${safeName(term)}_${param}.txt`;
        const outPath = path.join(outDir, fileName);
        await fs.writeFile(outPath, text, "utf-8");
        const hasTerm = text.toLowerCase().includes(term.toLowerCase());
        console.log(
          `${term} ${param} status=${response.status} len=${text.length} hasTerm=${hasTerm} -> ${outPath}`,
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`${term} ${param} ERROR ${message}`);
      }
      await sleep(2000);
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[fatal] ${message}`);
  process.exitCode = 1;
});
