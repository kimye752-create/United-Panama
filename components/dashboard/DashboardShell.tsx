import type { ReactNode } from "react";

import { TabNavigation } from "./TabNavigation";
import { Topbar } from "./Topbar";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-shell font-pretendard">
      <Topbar />
      <main className="px-8 pb-8 pt-4">
        <TabNavigation />
        {children}
      </main>
    </div>
  );
}
