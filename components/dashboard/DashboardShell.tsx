import type { ReactNode } from "react";

import { ReportsFloatingButton } from "./ReportsFloatingButton";
import { Topbar } from "./Topbar";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-shell font-pretendard">
      <Topbar />
      <main className="pb-8 pt-4">
        <div className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      {/* 우하단 보고서 탭 플로팅 버튼 */}
      <ReportsFloatingButton />
    </div>
  );
}
