import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "한국유나이티드제약(주) 해외 영업·마케팅 대시보드",
  description: "파나마 의약품 시장 분석 · 수출가격 전략 · 바이어 발굴",
  icons: {
    icon: "/images/united-favicon.png",
    shortcut: "/images/united-favicon.png",
    apple: "/images/united-favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-white text-slate-800 antialiased">
        {children}
      </body>
    </html>
  );
}
