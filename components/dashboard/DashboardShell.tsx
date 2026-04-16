import type { ReactNode } from "react";

import { TabNavigation } from "./TabNavigation";
import { Topbar } from "./Topbar";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-shell font-pretendard">
      <Topbar />
      <main className="pb-8 pt-4">
        <div className="mx-auto w-full max-w-[1410px] px-4 sm:px-6 lg:px-8">
          <TabNavigation />
          {children}
        </div>
      </main>
    </div>
  );
}
