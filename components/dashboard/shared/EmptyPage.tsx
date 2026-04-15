export function EmptyPage({ message, sub }: { message: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="mb-4 text-5xl">🚧</div>
      <div className="mb-2 text-[16px] font-extrabold text-navy">{message}</div>
      {sub ? <div className="text-[13px] text-muted">{sub}</div> : null}
    </div>
  );
}
