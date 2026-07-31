import { AppFrame, SiteFooter, SiteHeader } from "../../components/site-shell";
import { GlassCard } from "../../components/pulseboard-ui";

export default function StatusPage() {
  return (
    <AppFrame>
      <SiteHeader />
      <main className="page-shell section-shell">
        <GlassCard>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-kicker">Public status</p>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight">All systems operational</h1>
              <p className="mt-3 text-[color:var(--muted)]">Public-facing uptime, incidents, and component health.</p>
            </div>
            <span className="chip chip-success">99.98% uptime</span>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              ["API Gateway", "Operational"],
              ["Billing API", "Degraded"],
              ["Public Site", "Operational"],
            ].map((item) => (
              <div key={item[0]} className="rounded-[24px] border border-[color:var(--border)] px-4 py-4">
                <p className="font-medium">{item[0]}</p>
                <p className="mt-2 text-sm text-[color:var(--muted)]">{item[1]}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </main>
      <SiteFooter />
    </AppFrame>
  );
}
