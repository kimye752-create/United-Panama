import Image from "next/image";
import Link from "next/link";

import { TopbarTabs } from "./TopbarTabs";

export function Topbar() {
  return (
    <header className="flex h-[66px] items-center justify-between gap-3.5 bg-white px-6 shadow-[0_1px_0_0_rgba(0,0,0,0.07)]">
      {/* 좌측: 로고 + 회사명 */}
      <Link
        href="/"
        className="flex min-w-0 shrink items-center rounded-md py-3.5 outline-none ring-navy/25 transition-opacity hover:opacity-90 focus-visible:ring-2"
        aria-label="홈으로 — 한국유나이티드제약(주) 해외 영업·마케팅 대시보드"
      >
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src="/images/united-favicon.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 flex-shrink-0 object-contain"
            priority
            aria-hidden
          />
          <span className="whitespace-nowrap text-[15px] font-extrabold tracking-[-0.02em] text-navy">
            한국유나이티드제약(주) 해외 영업·마케팅 대시보드
          </span>
        </div>
      </Link>

      {/* 우측: 탭 + 국가 배지 */}
      <div className="flex items-center gap-0">
        {/* 메인 프리뷰 / 시장 분석 탭 */}
        <TopbarTabs />

        {/* 구분선 */}
        <div className="mx-3 h-5 w-px bg-[#dce4ef]" />

        {/* Panama 배지 */}
        <div className="inline-flex h-[42px] items-center gap-2 rounded-full border border-[#d9e2ef] bg-white px-3.5 pl-2.5 text-[13px] font-extrabold text-navy shadow-sh2">
          <Image
            src="/images/flags/panama_round.svg"
            alt="파나마 국기"
            width={20}
            height={20}
            className="h-5 w-5 rounded-full object-cover"
            priority
          />
          <span>Panama</span>
        </div>
      </div>
    </header>
  );
}
