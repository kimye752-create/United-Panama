import type { ReactNode } from "react";

interface CardProps {
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Card({
  title,
  subtitle,
  rightSlot,
  children,
  className = "",
}: CardProps) {
  return (
    <article className={`rounded-[20px] bg-card p-5 shadow-sh ${className}`}>
      <div className="mb-3.5 flex items-start justify-between gap-2.5">
        <div>
          <h3 className="text-[15px] font-extrabold tracking-[-0.03em] text-navy">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-1 text-[11.5px] text-muted">{subtitle}</p>
          ) : null}
        </div>
        {rightSlot}
      </div>
      {children}
    </article>
  );
}

export function IRow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mb-2 rounded-[13px] bg-inner px-3.5 py-3 last:mb-0 ${className}`}>
      {children}
    </div>
  );
}
