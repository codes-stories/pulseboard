import { type ReactNode } from "react";

export function StepCard({
  number,
  title,
  children,
  isLast = false,
}: {
  number: number;
  title: string;
  children: ReactNode;
  isLast?: boolean;
}) {
  return (
    <div className="docs-step flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[color:var(--primary)] bg-[color:var(--primary)] text-xs font-bold text-[color:var(--cta-text)]">
          {number}
        </div>
        {!isLast && (
          <div className="mt-2 w-px flex-1 bg-[color:var(--border)]" />
        )}
      </div>
      <div className="pb-8">
        <h3 className="text-base font-semibold text-[color:var(--text)]">
          {title}
        </h3>
        <div className="mt-2 text-sm leading-relaxed text-[color:var(--muted)]">
          {children}
        </div>
      </div>
    </div>
  );
}
