import { Suspense } from "react";

import { PanamaReportRoute } from "./PanamaReportRoute";

export default function PanamaReportPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-4xl px-4 py-10">
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <p className="text-lg text-gray-700">페이지 준비 중…</p>
          </div>
        </main>
      }
    >
      <PanamaReportRoute />
    </Suspense>
  );
}
