"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "메인 프리뷰" },
  { href: "/analysis", label: "시장조사 분석" },
] as const;

export function TopbarTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative inline-flex h-[42px] select-none items-center px-4 text-[13.5px] font-bold leading-none tracking-[-0.01em] transition-colors duration-200 ${
              isActive ? "font-extrabold text-navy" : "text-[#7a8fa8] hover:text-navy"
            }`}
          >
            {tab.label}
            {isActive ? (
              <span className="absolute bottom-0 left-1/2 h-[2px] w-4/5 -translate-x-1/2 rounded-t-[2px] bg-navy" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
