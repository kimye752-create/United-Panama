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
        <h1 className="text-[15px] font-extrabold leading-[1.2] tracking-[-0.03em] text-navy">
          한국유나이티드제약(주) 해외 영업·마케팅 대시보드
        </h1>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="inline-flex h-[42px] items-center gap-2 rounded-full bg-white px-3.5 pl-2.5 text-[13px] font-extrabold text-navy shadow-sh2">
          <span className="text-[22px] leading-none">🇵🇦</span>
          <span>Panama</span>
        </div>
      </div>
    </header>
  );
}
