import Link from "next/link";
import { AppFrame, SiteFooter, SiteHeader } from "../../components/site-shell";
import { AuthForm } from "../../components/auth-form";
import { GlassCard } from "../../components/pulseboard-ui";

export default function LoginRoute() {
  return (
    <AppFrame>
      <SiteHeader />
      <main className="page-shell section-shell">
        <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <GlassCard className="relative overflow-hidden min-h-[620px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(240,136,4,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(247,202,0,0.12),transparent_32%)]" />
            <div className="relative flex h-full flex-col justify-between p-4 md:p-8">
              <div>
                <p className="section-kicker">PulseBoard</p>
                <h2 className="mt-5 max-w-xl text-5xl font-semibold tracking-tight">Monitor APIs, latency, and incidents from one premium control plane.</h2>
                <p className="mt-5 max-w-lg text-[color:var(--muted)]">Beautiful dashboards, trusted alerts, and public status pages built for teams that cannot afford noisy tooling.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  ["Global checks", "Worldwide uptime coverage"],
                  ["Erlang agents", "Fault-tolerant regional monitoring"],
                ].map((item) => (
                  <div key={item[0]} className="rounded-md border border-[color:var(--border)] bg-[color:var(--card-solid)]/70 p-5">
                    <p className="text-lg font-semibold">{item[0]}</p>
                    <p className="mt-2 text-sm text-[color:var(--muted)]">{item[1]}</p>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>

          <div>
            <AuthForm mode="login" />
            <div className="mt-4 flex justify-center text-sm text-[color:var(--muted)]">
              <Link href="/register" className="nav-link">Create account</Link>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </AppFrame>
  );
}
