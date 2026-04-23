import type { ReactNode } from "react";

import { ReportsFloatingButton } from "./ReportsFloatingButton";
import { Topbar } from "./Topbar";

interface Props {
  children: ReactNode;
  /** 분석탭 전용 — 탑바 아래 전체 높이, 내부 스크롤 */
  fullHeight?: boolean;
}

export function DashboardShell({ children, fullHeight = false }: Props) {
  return (
    <div className="h-screen w-full overflow-hidden bg-shell font-pretendard">
      <Topbar />
      {fullHeight ? (
        <main className="h-[calc(100vh-66px)] overflow-hidden px-5 pt-8 sm:px-7 lg:px-10">
          {children}
        </main>
      ) : (
        <main className="h-[calc(100vh-66px)] overflow-y-auto pb-8 pt-8">
          <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-7 lg:px-10">
            {children}
          </div>
        </main>
      )}
      {/* 우하단 보고서 탭 플로팅 버튼 */}
      <ReportsFloatingButton />
    </div>
  );
}
