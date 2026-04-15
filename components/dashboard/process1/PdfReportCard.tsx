import Link from "next/link";

import { Card } from "../shared/Card";

export function PdfReportCard() {
  return (
    <Card title="PDF 보고서" subtitle="파나마 1공정 시장조사 보고서">
      <div className="rounded-[13px] bg-inner p-4">
        <p className="text-[12px] leading-relaxed text-muted">
          현재 대시보드 리뉴얼 단계에서는 PDF 다운로드 버튼을 비활성화하고, 기존 보고서 화면으로
          이동해 동일 기능을 사용합니다.
        </p>
      </div>
      <Link
        href="/panama/report"
        className="mt-3 inline-flex h-10 items-center rounded-[10px] bg-navy/10 px-4 text-[12px] font-extrabold text-navy"
      >
        기존 보고서 화면 열기
      </Link>
    </Card>
  );
}
