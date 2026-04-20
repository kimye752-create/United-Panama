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
        <Image
          src="/images/logo.png"
          alt="한국유나이티드제약(주) 해외 영업·마케팅 대시보드"
          width={446}
          height={75}
          sizes="(max-width: 640px) 240px, (max-width: 1024px) 300px, 446px"
          className="h-8 w-auto max-h-10 object-contain object-left sm:h-9 lg:h-10"
          priority
        />
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
