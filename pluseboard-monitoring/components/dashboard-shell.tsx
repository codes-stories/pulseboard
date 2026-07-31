"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { dashboardAlerts, dashboardAgents, dashboardMetrics, incidentTimeline, statusPages, analyticsPanels } from "./pulseboard-data";
import { CardGrid, GlassCard, InlineChart, StatCard } from "./pulseboard-ui";

const sidebarLinks = [
  ["Dashboard", "/dashboard"],
  ["Monitors", "/dashboard/monitors"],
  ["Agents", "/dashboard/agents"],
  ["Checks", "/dashboard/monitors"],
  ["Alerts", "/dashboard/alerts"],
  ["Incidents", "/dashboard/incidents"],
  ["Status Pages", "/dashboard/status-pages"],
  ["Analytics", "/dashboard/analytics"],
  ["Billing", "/dashboard/settings"],
  ["Team", "/dashboard/settings"],
  ["API Keys", "/dashboard/settings"],
  ["Settings", "/dashboard/settings"],
] as const;

export function DashboardShell({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="page-shell py-6 md:py-8">
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="glass-panel sticky top-28 rounded-[32px] p-4">
            <div className="px-3 py-3">
              <p className="text-sm font-semibold tracking-tight">PulseBoard</p>
              <p className="text-xs text-[color:var(--muted)]">Control plane</p>
            </div>
            <div className="mt-3 grid gap-1">
              {sidebarLinks.map(([label, href]) => (
                <Link key={label} href={href} aria-current={pathname === href ? "page" : undefined} className="sidebar-link">
                  <span className="h-2 w-2 rounded-full bg-[color:var(--primary)]" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </aside>

        <main className="space-y-6">
          <div className="glass-panel flex items-center justify-between rounded-[28px] px-4 py-4 md:px-6">
            <div>
              <p className="text-sm text-[color:var(--muted)]">Workspace</p>
              <p className="text-xl font-semibold tracking-tight">Production overview</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden rounded-full border border-[color:var(--border)] px-4 py-2 text-sm text-[color:var(--muted)] md:block">Search</div>
              <button className="btn btn-secondary lg:hidden" onClick={() => setMobileOpen((value) => !value)} type="button">Menu</button>
            </div>
          </div>

          {mobileOpen ? (
            <div className="glass-panel rounded-[28px] p-4 lg:hidden">
              <div className="grid gap-1">
                {sidebarLinks.map(([label, href]) => (
                  <Link key={label} href={href} onClick={() => setMobileOpen(false)} className="sidebar-link">
                    <span className="h-2 w-2 rounded-full bg-[color:var(--primary)]" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {children}
        </main>
      </div>
    </div>
  );
}

export function DashboardOverview() {
  return (
    <div className="space-y-6">
      <CardGrid columns={4}>
        {dashboardMetrics.map((metric) => <StatCard key={metric.label} {...metric} />)}
      </CardGrid>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <InlineChart title="Latency" value="182ms" rows={[48, 52, 61, 58, 72, 75, 69, 80, 86, 74, 68, 78]} />
        <InlineChart title="Availability" value="99.97%" rows={[82, 84, 83, 91, 90, 94, 92, 93, 95, 97, 98, 99]} accent="from-emerald-500/20 to-cyan-500/10" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent incidents</h2>
            <span className="chip chip-warning">Investigating</span>
          </div>
          <div className="mt-5 space-y-3">
            {incidentTimeline.map((item) => (
              <div key={item.title} className="flex items-start gap-4 rounded-2xl border border-[color:var(--border)] px-4 py-4">
                <span className="mt-1 h-3 w-3 rounded-full bg-[color:var(--primary)]" />
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-[color:var(--muted)]">{item.status} · {item.duration}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="text-xl font-semibold">Latest alerts</h2>
          <div className="mt-5 space-y-3">
            {dashboardAlerts.map((alert) => (
              <div key={alert.title} className="rounded-2xl border border-[color:var(--border)] px-4 py-4">
                <p className="font-medium">{alert.title}</p>
                <p className="text-sm text-[color:var(--muted)]">{alert.time}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <h2 className="text-xl font-semibold">Installed agents</h2>
          <div className="mt-5 space-y-3">
            {dashboardAgents.map((agent) => (
              <div key={agent.hostname} className="grid gap-2 rounded-2xl border border-[color:var(--border)] px-4 py-4 md:grid-cols-5 md:items-center">
                <p className="font-medium">{agent.hostname}</p>
                <p className="text-sm text-[color:var(--muted)]">{agent.version}</p>
                <p className="text-sm text-[color:var(--muted)]">{agent.lastHeartbeat}</p>
                <p className="text-sm text-[color:var(--muted)]">{agent.region}</p>
                <span className="chip chip-success w-fit">{agent.status}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="text-xl font-semibold">Status pages</h2>
          <div className="mt-5 space-y-3">
            {statusPages.map((page) => (
              <div key={page.name} className="rounded-2xl border border-[color:var(--border)] px-4 py-4">
                <p className="font-medium">{page.name}</p>
                <p className="text-sm text-[color:var(--muted)]">{page.url}</p>
                <p className="mt-2 text-xs text-[color:var(--muted)]">{page.branding}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {analyticsPanels.length ? (
        <GlassCard>
          <h2 className="text-xl font-semibold">Analytics snapshot</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {analyticsPanels.map((panel) => (
              <div key={panel.label} className="rounded-2xl border border-[color:var(--border)] px-4 py-4">
                <p className="text-sm text-[color:var(--muted)]">{panel.label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">{panel.value}</p>
                <p className="mt-2 text-sm text-[color:var(--muted)]">{panel.change}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      ) : null}
    </div>
  );
}
