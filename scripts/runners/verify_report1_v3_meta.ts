/**
 * Report1 본문 내 PanamaCompra V3 메타 노출 검증
 */
/// <reference types="node" />

type VerifyTarget = {
  name: string;
  productId: string;
};

const TARGETS: VerifyTarget[] = [
  { name: "Rosumeg Combigel", productId: "2504d79b-c2ce-4660-9ea7-5576c8bb755f" },
  { name: "Hydrine", productId: "bdfc9883-6040-438a-8e7a-df01f1230682" },
  { name: "Sereterol Activair", productId: "014fd4d2-dc66-4fc1-8d4f-59695183387f" },
];

function pickText(v: unknown): string {
  return typeof v === "string" ? v : "";
}

async function main(): Promise<void> {
  const baseUrl = process.env.REPORT_CAPTURE_BASE_URL ?? "http://localhost:3022";
  const endpoint = `${baseUrl}/api/panama/analyze`;

  for (const target of TARGETS) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: target.productId }),
    });

    const json = (await res.json()) as Record<string, unknown>;
    const llm = (json["llm"] ?? {}) as Record<string, unknown>;
    const payload = (llm["payload"] ?? {}) as Record<string, unknown>;
    const block42 = pickText(payload["block4_2_pricing"]);
    const block43 = pickText(payload["block4_3_partners"]);
    const body = `${block42}\n${block43}`;

    const hasV3Source = body.includes("PanamaCompra V3 - DGCP (Ley 419 de 2024)");
    const hasProveedor = /(SEVEN PHARMA|COMPAÑÍA ASTOR|유통|proveedor)/.test(body);
    const hasFabricante = /(제조|fabricante|Hetero|Servier)/.test(body);
    const hasPaisOrigen = /(INDIA|PANAMA|ESPAÑA|Colombia|pais_origen)/.test(body);

    const summary = {
      name: target.name,
      status: res.status,
      source: pickText(llm["source"]),
      hasV3Source,
      hasProveedor,
      hasFabricante,
      hasPaisOrigen,
      block42Head: block42.slice(0, 180),
    };
    process.stdout.write(`${JSON.stringify(summary)}\n`);
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});

export {};
