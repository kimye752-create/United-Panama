import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "UPharma — 파나마 1단계 · 시장조사",
  description: "파나마 의약품 시장 분석",
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
