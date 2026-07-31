import { AppFrame, SiteFooter, SiteHeader } from "../../components/site-shell";
import { GlassCard } from "../../components/pulseboard-ui";

export default function TermsPage() {
  return (
    <AppFrame>
      <SiteHeader />
      <main className="page-shell section-shell">
        <GlassCard>
          <p className="section-kicker">Terms</p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight">Terms of service</h1>
          <p className="mt-4 max-w-3xl text-[color:var(--muted)]">This placeholder page is ready for the full agreement copy covering use, limits, and support obligations.</p>
        </GlassCard>
      </main>
      <SiteFooter />
    </AppFrame>
  );
}
