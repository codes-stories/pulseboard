import { AppFrame, SiteFooter, SiteHeader } from "../../components/site-shell";
import { GlassCard } from "../../components/pulseboard-ui";

export default function PrivacyPage() {
  return (
    <AppFrame>
      <SiteHeader />
      <main className="page-shell section-shell">
        <GlassCard>
          <p className="section-kicker">Privacy</p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight">Privacy policy</h1>
          <p className="mt-4 max-w-3xl text-[color:var(--muted)]">PulseBoard respects user data, auditability, and operational transparency. This placeholder page is ready for a full policy copy.</p>
        </GlassCard>
      </main>
      <SiteFooter />
    </AppFrame>
  );
}
