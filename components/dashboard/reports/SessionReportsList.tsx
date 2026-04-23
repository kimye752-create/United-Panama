"use client";

import { useCallback, useEffect, useState } from "react";

import type { SessionListItem } from "@/app/api/panama/report/sessions/route";

/** ISO → "MM. DD. 오전/오후 HH:MM" */
function fmtDate(iso: string): string {
  try {
    const d    = new Date(iso);
    const mm   = String(d.getMonth() + 1).padStart(2, "0");
    const dd   = String(d.getDate()).padStart(2, "0");
    const h    = d.getHours();
    const ampm = h < 12 ? "오전" : "오후";
    const hh   = String(h % 12 || 12).padStart(2, "0");
    const min  = String(d.getMinutes()).padStart(2, "0");
    return `${mm}. ${dd}. ${ampm} ${hh}:${min}`;
  } catch {
    return iso.slice(0, 10);
  }
}

/**
 * 팀장 양식에 맞춰 세션 안에 있는 "개별 보고서"를 하나씩 카드로 전개.
 * (기존에는 세션 1개 = 카드 1개였으나, 팀장 사이트는 개별 보고서 단위 카드.)
 */
type FlatReportCard = {
  key: string;
  sessionId: string;
  productName: string;
  kindLabel: string;         // 예: "시장조사 보고서" / "수출가격 전략" / "바이어 발굴 보고서"
  subtitle: string;          // 제품명/INN
  createdAt: string;
  tag: "시장" | "가격" | "바이어" | "최종";
  tagColor: string;          // amber 계열 통일 (팀장 양식 일치)
  caseBadge?: "조건부" | "가능" | "검토" | null;
  pdfHref: string;
  reportId: string;          // 삭제 API
  reportType: "market" | "pricing_public" | "pricing_private" | "partner" | "combined";
};

const TAG_COLOR: Record<FlatReportCard["tag"], string> = {
  시장:   "bg-amber-100 text-amber-800",
  가격:   "bg-amber-100 text-amber-800",
  바이어: "bg-amber-100 text-amber-800",
  최종:   "bg-amber-200 text-amber-900",
};

function flattenSessions(sessions: SessionListItem[]): FlatReportCard[] {
  const out: FlatReportCard[] = [];
  for (const s of sessions) {
    // ── 최종 통합 보고서 (combined) — 세션 기반 URL로 의미 있는 파일명 유지
    if (s.combinedReportId !== null) {
      out.push({
        key: `combined-${s.combinedReportId}`,
        sessionId: s.sessionId,
        productName: s.productName,
        kindLabel: "최종 통합 보고서",
        subtitle: s.productName,
        createdAt: s.createdAt,
        tag: "최종",
        tagColor: TAG_COLOR["최종"],
        caseBadge: null,
        pdfHref: `/api/panama/report/combined?session_id=${s.sessionId}`,
        reportId: s.combinedReportId,
        reportType: "combined",
      });
    }

    // ── 바이어 발굴 보고서 (partner) — 개별 PDF 온디맨드
    if (s.partnerReportId !== null) {
      out.push({
        key: `partner-${s.partnerReportId}`,
        sessionId: s.sessionId,
        productName: s.productName,
        kindLabel: "바이어 발굴 보고서",
        subtitle: s.productName,
        createdAt: s.createdAt,
        tag: "바이어",
        tagColor: TAG_COLOR["바이어"],
        caseBadge: null,
        pdfHref: `/api/panama/report/partner/${s.partnerReportId}/pdf`,
        reportId: s.partnerReportId,
        reportType: "partner",
      });
    }

    // ── 수출가격 전략 보고서 (공공 + 민간 통합 한 장) — 공공 ID로 온디맨드 렌더
    //    pricing_private 는 별도 카드 없이 pricing_public PDF 에 함께 포함됨
    if (s.pricingPublicReportId !== null) {
      out.push({
        key: `pricing-${s.pricingPublicReportId}`,
        sessionId: s.sessionId,
        productName: s.productName,
        kindLabel: "수출가격 전략 보고서",
        subtitle: s.productName,
        createdAt: s.createdAt,
        tag: "가격",
        tagColor: TAG_COLOR["가격"],
        caseBadge: null,
        pdfHref: `/api/panama/report/pricing_public/${s.pricingPublicReportId}/pdf`,
        reportId: s.pricingPublicReportId,
        reportType: "pricing_public",
      });
    }

    // ── 시장조사 보고서 (market) — 개별 PDF 온디맨드
    if (s.marketReportId !== null) {
      out.push({
        key: `market-${s.marketReportId}`,
        sessionId: s.sessionId,
        productName: s.productName,
        kindLabel: "시장조사 보고서",
        subtitle: s.productName,
        createdAt: s.createdAt,
        tag: "시장",
        tagColor: TAG_COLOR["시장"],
        caseBadge: "조건부",
        pdfHref: `/api/panama/report/market/${s.marketReportId}/pdf`,
        reportId: s.marketReportId,
        reportType: "market",
      });
    }
  }
  // 최신순 정렬 (팝오버 상단이 최근)
  out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return out;
}

interface Props {
  /** "popover": 플로팅 팝오버 안에서 사용(컴팩트) | 기본: 독립 페이지 */
  variant?: "popover" | "page";
}

export function SessionReportsList({ variant = "page" }: Props) {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(new Set());

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/panama/report/sessions");
      if (!res.ok) return;
      const data = (await res.json()) as { items?: SessionListItem[] };
      setSessions(data.items ?? []);
    } catch { /* 무시 */ }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { void fetchSessions(); }, [fetchSessions]);

  // 30초마다 자동 갱신
  useEffect(() => {
    const id = window.setInterval(() => { void fetchSessions(); }, 30_000);
    return () => { window.clearInterval(id); };
  }, [fetchSessions]);

  // "모두 지우기" 이벤트 수신 — 팝오버 헤더 버튼과 연동
  useEffect(() => {
    const handler = () => {
      setHiddenKeys(new Set(flattenSessions(sessions).map((c) => c.key)));
    };
    window.addEventListener("panama:reports:clearAll", handler);
    return () => { window.removeEventListener("panama:reports:clearAll", handler); };
  }, [sessions]);

  async function handleGenerateFinal(session: SessionListItem) {
    setGeneratingId(session.sessionId);
    try {
      const res = await fetch(
        `/api/panama/report/combined?session_id=${encodeURIComponent(session.sessionId)}`,
      );
      if (!res.ok) {
        const err = (await res.json()) as { error?: string; detail?: string };
        window.alert(`최종 보고서 생성 실패: ${err.detail ?? err.error ?? "알 수 없는 오류"}`);
        return;
      }
      const blob     = await res.blob();
      const url      = URL.createObjectURL(blob);
      const anchor   = document.createElement("a");
      anchor.href    = url;
      anchor.download = `파나마_최종보고서_${session.productName}_${session.sessionId.slice(0, 8)}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
      await fetchSessions();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      window.alert(`오류: ${msg}`);
    } finally {
      setGeneratingId(null);
    }
  }

  const flatCards = flattenSessions(sessions).filter((c) => !hiddenKeys.has(c.key));

  if (loading && sessions.length === 0) {
    return (
      <div className="py-8 text-center text-[12px] text-[#7a8fa8]">
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#d9e2ef] border-t-navy" />
        {" "}불러오는 중…
      </div>
    );
  }

  if (flatCards.length === 0 && sessions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#d9e2ef] py-8 text-center text-[13px] text-[#7a8fa8]">
        생성된 보고서가 없습니다.
        <br />
        <span className="text-[11px]">시장 분석 탭에서 품목 선택 후 분석을 실행하세요.</span>
      </div>
    );
  }

  // ── 팝오버 모드: 팀장 양식 (개별 보고서 카드 나열) ────────────────────────
  if (variant === "popover") {
    return (
      <div className="space-y-2">
        {flatCards.map((card) => (
          <article
            key={card.key}
            className="rounded-[16px] bg-white p-3 shadow-sh2 transition-shadow hover:shadow-sh"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1 text-[13px] font-bold text-navy">
                  <span className="truncate">{card.kindLabel} - {card.productName}</span>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-extrabold ${card.tagColor}`}>
                    [{card.tag}]
                  </span>
                </div>
                {card.caseBadge !== null && card.caseBadge !== undefined ? (
                  <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                    {card.caseBadge}
                  </span>
                ) : null}
                <p className="mt-1 text-[11px] text-[#7a8fa8]">{fmtDate(card.createdAt)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <a
                  href={card.pdfHref}
                  download
                  className="flex h-7 items-center gap-1 rounded-md border border-[#d9e2ef] bg-[#f6f9fc] px-2 text-[11px] font-bold text-[#59708d] hover:bg-[#eef4fb]"
                  title="PDF 다운로드"
                >
                  <span aria-hidden>≡</span> PDF
                </a>
                <button
                  type="button"
                  onClick={() => { setHiddenKeys((prev) => new Set([...prev, card.key])); }}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-[#9aafc5] hover:bg-[#f6f9fc] hover:text-[#59708d]"
                  aria-label="이 보고서 숨기기"
                >
                  ×
                </button>
              </div>
            </div>
          </article>
        ))}

        {/* "최종 보고서 생성" 가능 세션 표시 (P1·P2·P3 완료, combined 없음) */}
        {sessions.filter((s) => s.marketCompleted && s.pricingCompleted && s.partnerCompleted && s.combinedReportId === null).map((s) => (
          <button
            key={`gen-${s.sessionId}`}
            type="button"
            disabled={generatingId === s.sessionId}
            onClick={() => { void handleGenerateFinal(s); }}
            className="w-full rounded-xl border border-dashed border-amber-400 bg-amber-50 px-3 py-2 text-[12px] font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
          >
            {generatingId === s.sessionId
              ? `⟳ 최종 보고서 생성 중… (${s.productName})`
              : `▶ 최종 보고서 생성 (${s.productName})`}
          </button>
        ))}

        {/* 미완료 세션 — 어떤 단계가 남았는지 안내 (최종 보고서 생성 전제 조건) */}
        {sessions
          .filter((s) => s.marketCompleted && (!s.pricingCompleted || !s.partnerCompleted) && s.combinedReportId === null)
          .map((s) => {
            const missing: string[] = [];
            if (!s.pricingCompleted) missing.push("가격 분석");
            if (!s.partnerCompleted) missing.push("바이어 발굴");
            return (
              <div
                key={`pending-${s.sessionId}`}
                className="w-full rounded-xl border border-dashed border-[#d9e2ef] bg-[#f6f9fc] px-3 py-2 text-[11px] text-[#59708d]"
              >
                <span className="font-bold text-navy">{s.productName}</span> — 최종 보고서 생성하려면{" "}
                <span className="font-semibold text-amber-700">{missing.join(" + ")}</span> 완료 필요
              </div>
            );
          })}
      </div>
    );
  }

  // ── 페이지 모드: 기존 세션 단위 카드 ────────────────────────────────────
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#9aafc5]">
          보고서 목록
        </p>
        <button
          type="button"
          onClick={() => { void fetchSessions(); }}
          disabled={loading}
          className="text-[11px] text-[#7a8fa8] hover:text-navy disabled:opacity-40"
        >
          ↻ 새로고침
        </button>
      </div>

      {sessions.map((s) => {
        const allDone  = s.marketCompleted && s.pricingCompleted && s.partnerCompleted;
        const isGenerating = generatingId === s.sessionId;

        return (
          <article
            key={s.sessionId}
            className="rounded-[20px] bg-white p-4 shadow-sh"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-extrabold text-navy">
                  {s.productName}
                </p>
                <p className="mt-0.5 text-[11px] text-[#7a8fa8]">{fmtDate(s.createdAt)}</p>
              </div>
              {s.combinedCompleted && (
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                  최종 완료
                </span>
              )}
            </div>

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <PhaseBadge label="P1 시장조사" done={s.marketCompleted} />
              <PhaseBadge label="P2 가격전략" done={s.pricingCompleted} />
              <PhaseBadge label="P3 바이어"   done={s.partnerCompleted} />
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {s.marketCompleted && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">✓ 시장조사</span>
              )}
              {s.pricingCompleted && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">✓ 가격전략</span>
              )}
              {s.partnerCompleted && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">✓ 바이어</span>
              )}
            </div>

            <div className="mt-3 border-t border-dashed border-[#e8eef5] pt-3">
              {s.combinedReportId !== null ? (
                <a
                  href={`/api/panama/report/combined?session_id=${s.sessionId}`}
                  download
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-[13px] font-extrabold text-white shadow-sm hover:bg-amber-600"
                >
                  ⬇ 최종 보고서 PDF 다운로드
                </a>
              ) : allDone ? (
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => { void handleGenerateFinal(s); }}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-[13px] font-extrabold text-white shadow-sm transition-opacity hover:bg-[#1a3356] disabled:opacity-50"
                >
                  {isGenerating ? (
                    <>
                      <span className="animate-spin">⟳</span> 최종 보고서 생성 중…
                    </>
                  ) : (
                    <>▶ 최종 보고서 생성</>
                  )}
                </button>
              ) : (
                <div className="rounded-lg border border-dashed border-[#d9e2ef] px-4 py-2 text-center text-[11px] text-[#9aafc5]">
                  P1·P2·P3 완료 후 최종 보고서를 생성할 수 있습니다
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function PhaseBadge({
  label,
  done,
}: {
  label: string;
  done: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
        done
          ? "bg-emerald-100 text-emerald-700"
          : "bg-[#f0f4f9] text-[#9aafc5]"
      }`}
    >
      {done ? "✓" : "○"} {label}
    </span>
  );
}
