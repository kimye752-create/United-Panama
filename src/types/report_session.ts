export type ReportType =
  | "market"
  | "pricing_public"
  | "pricing_private"
  | "partner"
  | "combined";

export interface ReportSession {
  id: string;
  product_id: string;
  country: string;

  market_report_id: string | null;
  pricing_public_report_id: string | null;
  pricing_private_report_id: string | null;
  partner_report_id: string | null;
  combined_report_id: string | null;

  market_completed_at: string | null;
  pricing_completed_at: string | null;
  partner_completed_at: string | null;
  combined_generated_at: string | null;

  can_download_combined: boolean;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  session_id: string;
  type: ReportType;
  pdf_storage_path: string | null;
  report_data: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface GeneratedReportListItem {
  id: string;
  type: ReportType;
  title: string;
  marketSegment?: "public" | "private";
  createdAt: string;
  hasPdf: boolean;
  isFinal: boolean;
}
