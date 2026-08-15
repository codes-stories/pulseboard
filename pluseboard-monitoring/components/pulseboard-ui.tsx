import type { ReactNode } from "react";

export function SectionShell({
  eyebrow,
  title,
  copy,
  children,
  align = "left",
}: Readonly<{
  eyebrow?: string;
  title: string;
  copy?: string;
  children?: ReactNode;
  align?: "left" | "center";
}>) {
  return (
    <section className="section-shell">
      <div className={align === "center" ? "mx-auto max-w-4xl text-center" : "max-w-4xl"}>
        {eyebrow ? <p className="section-kicker">{eyebrow}</p> : null}
        <h2 className="section-title mt-3">{title}</h2>
        {copy ? <p className="section-copy mt-3 max-w-2xl">{copy}</p> : null}
      </div>
      {children ? <div className="mt-8">{children}</div> : null}
    </section>
  );
}

export function CardGrid({ children, columns = 3 }: Readonly<{ children: ReactNode; columns?: 2 | 3 | 4 }>) {
  const gridClass = columns === 4 ? "lg:grid-cols-4" : columns === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3";

  return <div className={`grid gap-4 md:grid-cols-2 ${gridClass}`}>{children}</div>;
}

export function GlassCard({ children, className = "" }: Readonly<{ children?: ReactNode; className?: string }>) {
  return <div className={`glass-panel p-5 ${className}`}>{children}</div>;
}

export function StatCard({ label, value, delta }: Readonly<{ label: string; value: string; delta: string }>) {
  return (
    <GlassCard>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[color:var(--muted)]">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
        </div>
        <span className="chip chip-success">{delta}</span>
      </div>
    </GlassCard>
  );
}

export function InlineChart({
  title,
  value,
  rows,
  accent = "from-amber-500/15 to-orange-500/5",
}: Readonly<{ title: string; value: string; rows: number[]; accent?: string }>) {
  return (
    <GlassCard className={`bg-gradient-to-br ${accent}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-[color:var(--muted)]">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
        </div>
        <span className="chip chip-success">Live</span>
      </div>
      <div className="mt-5 grid grid-cols-[repeat(12,minmax(0,1fr))] items-end gap-2">
        {rows.map((row, index) => (
          <span
            key={`${title}-${index}`}
            className={`rounded-sm bg-[color:var(--primary)] ${row > 72 ? "opacity-100" : "opacity-60"}`}
            style={{ height: `${row}%` }}
          />
        ))}
      </div>
    </GlassCard>
  );
}

export function PageHero({
  eyebrow,
  title,
  copy,
  actions,
  image,
}: Readonly<{ eyebrow: string; title: string; copy: string; actions: ReactNode; image?: ReactNode }>) {
  return (
    <section className="section-shell pt-8 md:pt-12">
      <div className="grid items-center gap-8 lg:grid-cols-[1.02fr_0.98fr]">
        <div>
          <p className="section-kicker">{eyebrow}</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl lg:text-[3.25rem] lg:leading-[1.05]">{title}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-7 text-[color:var(--muted)]">{copy}</p>
          <div className="mt-7 flex flex-wrap gap-3">{actions}</div>
        </div>
        {image ? <div className="relative">{image}</div> : null}
      </div>
    </section>
  );
}

export function EmptyState({ title, copy, action }: Readonly<{ title: string; copy: string; action?: ReactNode }>) {
  return (
    <GlassCard className="flex min-h-[260px] flex-col items-center justify-center text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md border border-[color:var(--border)] bg-[color:var(--card-soft)] text-xl text-[color:var(--primary)]">
        ◌
      </div>
      <h3 className="mt-4 text-xl font-bold tracking-tight">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-[color:var(--muted)]">{copy}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </GlassCard>
  );
}