interface Phase2FormulaBlockProps {
  formulaText: string;
  reasonText: string;
}

export function Phase2FormulaBlock({ formulaText, reasonText }: Phase2FormulaBlockProps) {
  return (
    <section className="rounded-[14px] bg-inner p-4 shadow-sh2">
      <h4 className="text-[12px] font-extrabold text-navy">산정 공식</h4>
      <p className="mt-2 text-[11px] font-semibold text-[#2a3c58]">{formulaText}</p>
      <p className="mt-2 text-[10px] text-muted">{reasonText}</p>
    </section>
  );
}
