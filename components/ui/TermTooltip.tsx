"use client";

import { useState, useRef, useEffect } from "react";

// ─── 용어 정의 사전 ────────────────────────────────────────────
export const TERM_DEFS: Record<string, string> = {
  FOB: "Free On Board — 수출국 지정 항구까지의 운임·보험료를 수출자가 부담하는 Incoterms 조건. 파나마 수입자는 FOB 이후 운임을 부담합니다.",
  PAB: "Panamanian Balboa (파나마 발보아) — USD와 1:1 법정 고정 환율로 운용됩니다. 실질적으로 USD와 동일하게 취급됩니다.",
  ALPS: "Autoridad de Licitaciones y Precios del Estado — 파나마 조달청. 27개 공공기관의 의약품을 통합 입찰·구매합니다.",
  VAT: "부가가치세 — 파나마 ITBMS 세율 7%. FOB 가격 역산 시 유통 마진에서 분리하여 계산합니다.",
  SAR: "Saudi Riyal (사우디 리얄) — 1 USD ≈ 3.75 SAR 고정 환율. 사우디아라비아 공식 통화입니다.",
  SFDA: "Saudi Food and Drug Authority — 사우디 식품의약청. 의약품 수입·유통 허가 기관입니다.",
  공공시장: "ALPS 조달청 채널 — 공공기관 통합 입찰가 기준으로 FOB를 역산합니다. 수량이 많고 단가 경쟁이 치열합니다.",
  민간시장: "병원·약국·체인 채널 — 소매가 기준으로 FOB를 역산합니다. 브랜드 마진 반영이 가능합니다.",
  KRW: "원화(한국 원) 환산가 — 보고서 기준 환율 적용. 실제 결제는 USD 또는 PAB로 이루어집니다.",
  마크다운: "FOB 가격이 경쟁 천장가(Ceiling) 대비 차지하는 비율. 낮을수록 가격 경쟁력이 높습니다.",
};

interface Props {
  term: keyof typeof TERM_DEFS | string;
  /** 용어 텍스트 대신 커스텀 렌더링 */
  children?: React.ReactNode;
  /** 툴팁 말풍선 위치 */
  position?: "top" | "bottom";
}

/**
 * 주요 무역·규제 용어에 마우스오버 툴팁을 표시합니다.
 * 정의가 없는 term은 그냥 렌더링합니다.
 */
export function TermTooltip({ term, children, position = "top" }: Props) {
  const def = TERM_DEFS[term];
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 터치 장치에서도 작동하도록 클릭 토글
  function toggle() {
    setVisible((v) => !v);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  if (def === undefined) {
    return <>{children ?? term}</>;
  }

  const posClass =
    position === "top"
      ? "bottom-full mb-1.5"
      : "top-full mt-1.5";

  return (
    <span className="relative inline-block">
      <span
        className="cursor-help border-b border-dotted border-[#7a8aa0] text-inherit"
        onMouseEnter={() => {
          if (timerRef.current !== null) clearTimeout(timerRef.current);
          setVisible(true);
        }}
        onMouseLeave={() => {
          timerRef.current = setTimeout(() => setVisible(false), 120);
        }}
        onClick={toggle}
        aria-describedby={`tooltip-${term}`}
      >
        {children ?? term}
      </span>
      {visible && (
        <span
          id={`tooltip-${term}`}
          role="tooltip"
          className={`
            absolute left-0 z-50 w-64 rounded-lg border border-[#d9e2ef]
            bg-[#1b2e4a] px-3 py-2 text-[11px] leading-relaxed text-white shadow-xl
            ${posClass}
          `}
        >
          <strong className="block text-[#93b8e0]">{term}</strong>
          {def}
        </span>
      )}
    </span>
  );
}
