interface ScoreCellProps {
  label: string;
  score: number | null;
}

export function ScoreCell({ label, score }: ScoreCellProps) {
  return (
    <div className="rounded-[8px] border border-[#e3e9f2] bg-[#f8fbff] px-2 py-1.5 text-center">
      <p className="text-[10px] text-[#607a98]">{label}</p>
      <p className="text-[11px] font-bold text-[#1f3e64]">
        {score === null ? "(미수집)" : score.toFixed(1)}
      </p>
    </div>
  );
}

