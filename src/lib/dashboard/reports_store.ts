export interface StoredReportItem {
  id: string;
  productId: string;
  brand: string;
  /** 드롭다운 라벨용 브랜드명 (구버전은 brand와 동일하게 복구) */
  productBrandName: string;
  inn: string;
  caseGrade: "A" | "B" | "C";
  generatedAt: string;
  /** 분석 완료 시각 (ISO 8601, 라벨에 표시) */
  analyzedAt: string;
  pdfBase64: string | null;
  pdfFilename: string | null;
  reportVersion: "v1" | "v3";
}

const REPORTS_KEY = "pa_upharma_reports_v2";
const LEGACY_REPORTS_KEY = "pa_upharma_reports_v1";
const MAX_REPORTS = 30;

/** 세션 전용 보고서 목록 (Phase2 드롭다운 등에서 사용) */
export function getStoredReports(): StoredReportItem[] {
  return loadStoredReports();
}

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
      const productBrandName =
        typeof item.productBrandName === "string" && item.productBrandName.trim() !== ""
          ? item.productBrandName
          : item.brand;
      const analyzedAt =
        typeof item.analyzedAt === "string" && item.analyzedAt.trim() !== ""
          ? item.analyzedAt
          : item.generatedAt;
      out.push({
        id: item.id,
        productId: item.productId,
        brand: item.brand,
        productBrandName,
        inn: item.inn,
        caseGrade: item.caseGrade,
        generatedAt: item.generatedAt,
        analyzedAt,
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

/** 세션에서 보고서 한 건 제거 (유효하지 않은 ID 정리 등) */
export function removeStoredReport(reportId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  const reports = getStoredReports();
  const filtered = reports.filter((r) => r.id !== reportId);
  saveStoredReports(filtered);
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
      productBrandName: item.productBrandName,
      inn: item.inn,
      caseGrade: item.caseGrade,
      generatedAt: now,
      analyzedAt: item.analyzedAt,
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
