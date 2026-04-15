export interface StoredReportItem {
  id: string;
  productId: string;
  brand: string;
  inn: string;
  caseGrade: "A" | "B" | "C";
  generatedAt: string;
}

const REPORTS_KEY = "pa_upharma_reports_v1";
const MAX_REPORTS = 30;

export function loadStoredReports(): StoredReportItem[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    if (raw === null) {
      return [];
    }
    const parsed = JSON.parse(raw) as StoredReportItem[];
    return parsed.slice(0, MAX_REPORTS);
  } catch {
    return [];
  }
}

export function saveStoredReports(items: StoredReportItem[]): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(REPORTS_KEY, JSON.stringify(items.slice(0, MAX_REPORTS)));
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
    },
    ...deduped,
  ].slice(0, MAX_REPORTS);
  saveStoredReports(next);
  return next;
}
