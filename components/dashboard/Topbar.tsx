import Image from "next/image";
import Link from "next/link";

export function Topbar() {
  return (
    <header className="flex items-center justify-between gap-3.5 bg-white px-6 py-3.5">
      <Link
        href="/"
        className="flex min-w-0 max-w-[min(100%,calc(100vw-10rem))] shrink items-center rounded-md outline-none ring-navy/25 transition-opacity hover:opacity-90 focus-visible:ring-2"
        aria-label="홈으로 — 한국유나이티드제약(주) 해외 영업·마케팅 대시보드"
      >
        {/* 좌측: 픽셀 로고 아이콘 + 회사명(상)·대시보드명(하) 2줄 */}
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src="/images/logo.png"
            alt=""
            width={38}
            height={38}
            className="h-[38px] w-[38px] flex-shrink-0 object-contain"
            priority
            aria-hidden
          />
          <div className="flex min-w-0 flex-col gap-0.5 leading-[1.2]">
            <span className="text-[13px] font-medium tracking-[-0.02em] text-slate-600">
              한국유나이티드제약(주)
            </span>
            <span className="text-[15px] font-extrabold tracking-[-0.03em] text-navy">
              해외 영업·마케팅 대시보드
            </span>
          </div>
        </div>
      </Link>
      <div className="flex items-center gap-2.5">
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
