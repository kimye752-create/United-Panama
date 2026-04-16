import Image from "next/image";

export function Topbar() {
  return (
    <header className="flex items-center justify-between gap-3.5 bg-white px-6 py-3.5">
      <div className="flex items-center gap-3">
        <Image
          src="/images/logo.png"
          alt="한국유나이티드제약 로고"
          width={38}
          height={38}
          className="h-[38px] w-auto flex-shrink-0 object-contain"
          priority
        />
        <div className="leading-[1.15]">
          <p className="text-[11px] font-semibold tracking-[-0.02em] text-[#4f6079]">
            한국유나이티드제약(주)
          </p>
          <h1 className="mt-0.5 text-[16px] font-extrabold tracking-[-0.03em] text-navy">
            해외 영업·마케팅 대시보드
          </h1>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="inline-flex h-[42px] items-center gap-2 rounded-full bg-white px-3.5 pl-2.5 text-[13px] font-extrabold text-navy shadow-sh2">
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
