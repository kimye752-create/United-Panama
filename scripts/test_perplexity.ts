import { fetchPerplexityInsight } from "../src/logic/perplexity_insights";

async function main(): Promise<void> {
  const result = await fetchPerplexityInsight("Aceclofenac");
  console.log("INN:", result.inn);
  console.log("Source:", result.source);
  console.log("Papers count:", result.papers.length);
  console.log("First paper:", result.papers[0] ?? null);
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
});
