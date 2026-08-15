import { statusPages } from "../../../components/pulseboard-data";
import { GlassCard } from "../../../components/pulseboard-ui";

export default function StatusPagesPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <GlassCard>
        <h1 className="text-3xl font-semibold tracking-tight">Status pages</h1>
        <p className="mt-2 text-[color:var(--muted)]">Public URL, custom domain, and branding controls.</p>
        <div className="mt-6 space-y-3">
          {statusPages.map((page) => (
            <div key={page.name} className="rounded-md border border-[color:var(--border)] px-4 py-4">
              <p className="font-medium">{page.name}</p>
              <p className="mt-1 text-sm text-[color:var(--muted)]">{page.url}</p>
              <p className="mt-2 text-xs text-[color:var(--muted)]">{page.domain} · {page.branding}</p>
            </div>
          ))}
        </div>
      </GlassCard>
      <GlassCard className="min-h-[380px] bg-gradient-to-br from-amber-500/15 to-orange-500/5" />
    </div>
  );
}
