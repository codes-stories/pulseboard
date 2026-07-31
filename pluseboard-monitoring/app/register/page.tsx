import Link from "next/link";
import { AppFrame, SiteFooter, SiteHeader } from "../../components/site-shell";
import { AuthForm } from "../../components/auth-form";
import { GlassCard } from "../../components/pulseboard-ui";

export default function RegisterRoute() {
  return (
    <AppFrame>
      <SiteHeader />
      <main className="page-shell section-shell">
        <div className="grid items-center gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <GlassCard className="relative overflow-hidden min-h-[620px] order-2 lg:order-1">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.25),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.14),transparent_32%)]" />
            <div className="relative flex h-full flex-col justify-between p-4 md:p-8">
              <div>
                <p className="section-kicker">Start free</p>
                <h2 className="mt-5 max-w-xl text-5xl font-semibold tracking-tight">Create your workspace and publish a status page before customers ask.</h2>
                <p className="mt-5 max-w-lg text-[color:var(--muted)]">Set up monitors, install Erlang agents, and wire alerts in a calm, polished experience.</p>
              </div>
              <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--card-solid)]/70 p-5">
                <p className="text-sm text-[color:var(--muted)]">Included in all plans</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {[
                    "Public status pages",
                    "Real-time alerting",
                    "API keys",
                    "Team management",
                  ].map((item) => <div key={item} className="rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm">{item}</div>)}
                </div>
              </div>
            </div>
          </GlassCard>

          <div className="order-1 lg:order-2">
            <AuthForm mode="register" />
            <div className="mt-4 flex justify-center text-sm text-[color:var(--muted)]">
              <Link href="/login" className="nav-link">Already have an account?</Link>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </AppFrame>
  );
}
