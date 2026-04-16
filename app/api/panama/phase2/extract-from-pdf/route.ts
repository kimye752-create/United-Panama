import { NextResponse } from "next/server";

export const runtime = "nodejs";

interface ExtractRequestBody {
  text: string;
}

interface ExtractPriceResult {
  detectedCurrency: "PAB" | "USD" | "unknown";
  extractedNumbers: number[];
  candidatePrice: number | null;
}

function extractNumbers(text: string): number[] {
  const matches = text.match(/\d+(?:[.,]\d{1,2})?/g) ?? [];
  const numbers: number[] = [];
  for (const token of matches) {
    const n = Number.parseFloat(token.replace(",", "."));
    if (Number.isFinite(n)) {
      numbers.push(n);
    }
  }
  return numbers.slice(0, 50);
}

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON 본문 파싱에 실패했습니다." }, { status: 400 });
  }
  if (body === null || typeof body !== "object" || typeof (body as ExtractRequestBody).text !== "string") {
    return NextResponse.json({ error: "text(string) 필드가 필요합니다." }, { status: 400 });
  }

  const text = (body as ExtractRequestBody).text;
  const numbers = extractNumbers(text);
  const lower = text.toLowerCase();
  const detectedCurrency: "PAB" | "USD" | "unknown" = lower.includes("pab")
    ? "PAB"
    : lower.includes("usd")
      ? "USD"
      : "unknown";

  const result: ExtractPriceResult = {
    detectedCurrency,
    extractedNumbers: numbers,
    candidatePrice: numbers.length > 0 ? numbers[0] : null,
  };
  return NextResponse.json(result);
}
