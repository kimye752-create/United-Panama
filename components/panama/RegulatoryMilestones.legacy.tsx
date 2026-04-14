/**
 * 레거시 보관: 과거 `app/panama/page.tsx`에 인라인으로 있던
 * 「진출 호재 (Regulatory Milestones)」 섹션 참고용입니다.
 * 2026-04-15 랜딩 단순화로 화면에서 제거됨 — 복구 시 `getRegulatoryMilestones` +
 * `milestoneCardBgClass` / `milestoneTypeLabelKo` 를 다시 연결하세요.
 */
/*
import {
  getRegulatoryMilestones,
} from "@/src/logic/fetch_panama_data";
import {
  milestoneCardBgClass,
  milestoneTypeLabelKo,
} from "@/lib/milestone_labels";

export async function RegulatoryMilestonesSection() {
  const milestones = await getRegulatoryMilestones();
  if (milestones.length === 0) {
    return null;
  }
  return (
    <section
      className="rounded-xl border border-rose-100 bg-white px-4 py-4 shadow-sm"
      aria-labelledby="milestones-heading"
    >
      <h2
        id="milestones-heading"
        className="text-lg font-semibold text-slate-900"
      >
        진출 호재 (Regulatory Milestones)
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {milestones.map((row, i) => (
          <article
            key={row.id ?? `milestone-${String(i)}`}
            className={`rounded-lg border border-rose-100 p-4 ${milestoneCardBgClass(
              row.pa_milestone_type,
            )}`}
          >
            <p className="text-sm font-medium text-slate-800">
              <span aria-hidden>🎯 </span>
              {milestoneTypeLabelKo(row.pa_milestone_type)}
            </p>
            <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
              {row.pa_notes ?? ""}
            </p>
            <p className="mt-3 text-xs text-slate-400">
              출처: {row.pa_source ?? "—"} · {row.pa_released_at ?? "—"}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
*/
