"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "메인 프리뷰" },
  { href: "/reports", label: "보고서" },
] as const;

export function TabNavigation() {
  const pathname = usePathname();
  return (
    <nav className="relative mb-6 flex h-[52px] items-center justify-center border-y border-navy/10">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative inline-flex h-full select-none items-center px-6 text-[13.5px] font-bold leading-none tracking-[-0.01em] transition-colors duration-200 ${
              isActive ? "font-extrabold text-navy" : "text-muted hover:text-navy"
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
