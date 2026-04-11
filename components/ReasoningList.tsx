/**
 * 블록 3 — 두괄식 근거 3줄 (각 30자 이내)
 */
type Props = {
  items: readonly string[];
};

export function ReasoningList({ items }: Props) {
  const three = items.slice(0, 3);
  return (
    <ol className="list-inside list-decimal space-y-2 text-base leading-relaxed text-slate-800">
      {three.map((line, i) => (
        <li key={i} className="pl-1">
          {line.length > 30 ? `${line.slice(0, 29)}…` : line}
        </li>
      ))}
    </ol>
  );
}
