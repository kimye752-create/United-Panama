export interface StoredReportItem {
  id: string;
  productId: string;
  brand: string;
  inn: string;
  caseGrade: "A" | "B" | "C";
  generatedAt: string;
  pdfBase64: string | null;
  pdfFilename: string | null;
  reportVersion: "v1" | "v3";
}

const REPORTS_KEY = "pa_upharma_reports_v2";
const LEGACY_REPORTS_KEY = "pa_upharma_reports_v1";
const MAX_REPORTS = 30;

export function loadStoredReports(): StoredReportItem[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = sessionStorage.getItem(REPORTS_KEY);
    if (raw === null) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    const out: StoredReportItem[] = [];
    for (const row of parsed) {
      if (typeof row !== "object" || row === null || Array.isArray(row)) {
        continue;
      }
      const item = row as Record<string, unknown>;
      if (
        typeof item.id !== "string" ||
        typeof item.productId !== "string" ||
        typeof item.brand !== "string" ||
        typeof item.inn !== "string" ||
        typeof item.caseGrade !== "string" ||
        typeof item.generatedAt !== "string"
      ) {
        continue;
      }
      if (item.caseGrade !== "A" && item.caseGrade !== "B" && item.caseGrade !== "C") {
        continue;
      }
      out.push({
        id: item.id,
        productId: item.productId,
        brand: item.brand,
        inn: item.inn,
        caseGrade: item.caseGrade,
        generatedAt: item.generatedAt,
        pdfBase64:
          typeof item.pdfBase64 === "string" && item.pdfBase64.trim() !== ""
            ? item.pdfBase64
            : null,
        pdfFilename:
          typeof item.pdfFilename === "string" && item.pdfFilename.trim() !== ""
            ? item.pdfFilename
            : null,
        reportVersion: item.reportVersion === "v3" ? "v3" : "v1",
      });
    }
    return out.slice(0, MAX_REPORTS);
  } catch {
    return [];
  }
}

export function saveStoredReports(items: StoredReportItem[]): void {
  if (typeof window === "undefined") {
    return;
  }
  sessionStorage.setItem(REPORTS_KEY, JSON.stringify(items.slice(0, MAX_REPORTS)));
}

export function upsertStoredReport(
  item: Omit<StoredReportItem, "id" | "generatedAt">,
): StoredReportItem[] {
  const now = new Date().toISOString();
  const existing = loadStoredReports();
  const deduped = existing.filter((r) => r.productId !== item.productId);
  const next: StoredReportItem[] = [
    {
      id: `${item.productId}-${Date.now()}`,
      productId: item.productId,
      brand: item.brand,
      inn: item.inn,
      caseGrade: item.caseGrade,
      generatedAt: now,
      pdfBase64: item.pdfBase64,
      pdfFilename: item.pdfFilename,
      reportVersion: item.reportVersion,
    },
    ...deduped,
  ].slice(0, MAX_REPORTS);
  saveStoredReports(next);
  return next;
}

export function purgeLegacyStoredReports(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.removeItem(LEGACY_REPORTS_KEY);
  } catch {
    return;
  }
}
