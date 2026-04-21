import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase-server";
import { findProductById } from "@/src/utils/product-dictionary";
import type { Report } from "@/src/types/report_session";
import { renderCombinedPDF } from "@/src/logic/reports/render_combined_pdf";

interface GenerateCombinedResult {
  id: string;
  session_id: string;
  type: "combined";
  pdf_storage_path: string;
  created_at: string;
}

async function fetchReportById(
  supabase: ReturnType<typeof createSupabaseServer>,
  reportId: string,
): Promise<Report> {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", reportId)
    .single();

  if (error !== null || data === null) {
    throw new Error(
      error !== null
        ? `보고서 조회 실패: ${error.message}`
        : "보고서를 찾을 수 없습니다.",
    );
  }

  const row = data as Record<string, unknown>;
  return {
    id: String(row["id"]),
    session_id: String(row["session_id"]),
    type: row["type"] as Report["type"],
    pdf_storage_path:
      row["pdf_storage_path"] === null || row["pdf_storage_path"] === undefined
        ? null
        : String(row["pdf_storage_path"]),
    report_data:
      row["report_data"] !== null &&
      row["report_data"] !== undefined &&
      typeof row["report_data"] === "object" &&
      !Array.isArray(row["report_data"])
        ? (row["report_data"] as Record<string, unknown>)
        : null,
    metadata:
      row["metadata"] !== null &&
      row["metadata"] !== undefined &&
      typeof row["metadata"] === "object" &&
      !Array.isArray(row["metadata"])
        ? (row["metadata"] as Record<string, unknown>)
        : null,
    created_at: String(row["created_at"]),
  };
}

/**
 * LLM 없이 4개 보고서 데이터를 합쳐 PDF 업로드 + reports(combined) 행 생성
 */
export async function generateCombinedReport(
  sessionId: string,
): Promise<GenerateCombinedResult> {
  const supabase = createSupabaseServer();

  const { data: sessionRow, error: sessionErr } = await supabase
    .from("panama_report_session")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (sessionErr !== null || sessionRow === null) {
    throw new Error(
      sessionErr !== null
        ? `세션 조회 실패: ${sessionErr.message}`
        : "세션을 찾을 수 없습니다.",
    );
  }

  const session = sessionRow as Record<string, unknown>;
  const mid = session["market_report_id"];
  const pid = session["pricing_public_report_id"];
  const privId = session["pricing_private_report_id"];
  const partId = session["partner_report_id"];
  const productId = session["product_id"];

  if (
    typeof mid !== "string" ||
    typeof pid !== "string" ||
    typeof privId !== "string" ||
    typeof partId !== "string"
  ) {
    throw new Error("결합에 필요한 단계별 보고서 id가 모두 채워지지 않았습니다.");
  }

  const [marketRpt, publicRpt, privateRpt, partnerRpt] = await Promise.all([
    fetchReportById(supabase, mid),
    fetchReportById(supabase, pid),
    fetchReportById(supabase, privId),
    fetchReportById(supabase, partId),
  ]);

  const pm =
    typeof productId === "string" ? findProductById(productId) : undefined;
  if (pm === undefined) {
    throw new Error("제품 마스터를 찾을 수 없습니다.");
  }

  const product = {
    id: pm.product_id,
    name: pm.kr_brand_name,
    ingredient: pm.who_inn_en,
  };

  const country =
    typeof session["country"] === "string" ? session["country"] : "panama";

  const pdfBuffer = await renderCombinedPDF({
    product,
    country,
    generatedAt: new Date(),
    marketReport: marketRpt,
    publicPricingReport: publicRpt,
    privatePricingReport: privateRpt,
    partnerReport: partnerRpt,
  });

  const storagePath = `combined/${sessionId}-${Date.now()}.pdf`;
  const adminClient = createSupabaseAdmin();
  const { error: uploadError } = await adminClient.storage
    .from("reports")
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError !== null) {
    throw new Error(
      `Storage 업로드 실패: ${uploadError.message}. 버킷 reports 권한·용량을 확인하세요.`,
    );
  }

  const { data: reportRecord, error: insertError } = await supabase
    .from("reports")
    .insert({
      session_id: sessionId,
      type: "combined",
      pdf_storage_path: storagePath,
      report_data: { kind: "combined_v1" },
      metadata: {
        source_reports: {
          market: mid,
          pricing_public: pid,
          pricing_private: privId,
          partner: partId,
        },
        product_id: product.id,
        country,
      },
    })
    .select()
    .single();

  if (insertError !== null || reportRecord === null) {
    throw new Error(
      insertError !== null
        ? `결합 보고서 메타 저장 실패: ${insertError.message}`
        : "결합 보고서 행이 생성되지 않았습니다.",
    );
  }

  const rec = reportRecord as Record<string, unknown>;
  return {
    id: String(rec["id"]),
    session_id: sessionId,
    type: "combined",
    pdf_storage_path: storagePath,
    created_at: String(rec["created_at"]),
  };
}
