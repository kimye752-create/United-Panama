interface CriterionCheckboxProps {
  label: string;
  checked: boolean;
  onToggle: () => void;
}

export function CriterionCheckbox({
  label,
  checked,
  onToggle,
}: CriterionCheckboxProps) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-[8px] border border-[#dce4ef] bg-white px-2.5 py-2 text-[11px] text-[#2b4568]">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-3.5 w-3.5 accent-[#1E4E8C]"
      />
      <span>{label}</span>
    </label>
  );
}

