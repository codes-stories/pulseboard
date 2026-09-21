"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BarChart3,
  Bell,
  CreditCard,
  FileText,
  KeyRound,
  LayoutDashboard,
  Radio,
  Server,
  Settings,
  TriangleAlert,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import * as api from "@/lib/api";
import { dashboardAlerts, dashboardMetrics, incidentTimeline, statusPages, analyticsPanels } from "./pulseboard-data";
import { CardGrid, GlassCard, InlineChart, StatCard } from "./pulseboard-ui";
import { ThemeToggle } from "../design-system/theme/theme-toggle";
import { useAuth } from "./auth-provider";
import { OnboardingWizard } from "./onboarding-wizard";
import { NotificationsBell } from "./notifications-bell";

const sidebarLinks = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Monitors", href: "/dashboard/monitors", icon: Radio },
  { label: "Agents", href: "/dashboard/agents", icon: Server },
  { label: "Checks", href: "/dashboard/monitors", icon: Activity },
  { label: "Alerts", href: "/dashboard/alerts", icon: Bell },
  { label: "Incidents", href: "/dashboard/incidents", icon: TriangleAlert },
  { label: "Status Pages", href: "/dashboard/status-pages", icon: FileText },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Billing", href: "/dashboard/settings", icon: CreditCard },
  { label: "Team", href: "/dashboard/settings", icon: Users },
  { label: "API Keys", href: "/dashboard/settings", icon: KeyRound },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
] as const;

function relativeTime(value: string): string {
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function SidebarNav({ onNavigate }: Readonly<{ onNavigate?: () => void }>) {
  const pathname = usePathname();
  return (
    <div className="grid gap-0.5">
      {sidebarLinks.map((link) => (
        <Link
          key={link.label}
          href={link.href}
          aria-current={pathname === link.href ? "page" : undefined}
          onClick={onNavigate}
          className="sidebar-link text-sm"
        >
          <link.icon className="h-4 w-4" aria-hidden="true" />
          {link.label}
        </Link>
      ))}
    </div>
  );
}

export function DashboardShell({ children }: Readonly<{ children: ReactNode }>) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div className="page-shell py-4 md:py-6">
      <div className="nav-top flex h-14 items-center justify-between gap-3 rounded-md px-3 md:px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-base font-bold tracking-tight text-[color:var(--nav-text)]">PulseBoard</Link>
          <span className="hidden rounded border border-[color:var(--nav-border)] px-2 py-1 text-xs font-medium text-[color:var(--nav-muted)] md:block">
            Control plane
          </span>
        </div>

        <div className="hidden rounded border border-[color:var(--nav-border)] bg-[color:var(--nav-bar)] px-3 py-1.5 text-sm text-[color:var(--nav-muted)] md:flex md:flex-1 md:max-w-md lg:max-w-lg">
          Search monitors, agents, alerts…
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <NotificationsBell />
          {user ? (
            <>
              <span className="hidden text-sm text-[color:var(--nav-muted)] sm:block">Hello, {user.name.split(" ")[0]}</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--primary)] text-sm font-bold text-white">
                {user.name.trim().charAt(0).toUpperCase() || "U"}
              </span>
              <button className="hidden rounded border border-[color:var(--nav-border)] px-3 py-1.5 text-sm text-[color:var(--nav-muted)] hover:text-[color:var(--nav-text)] md:block" type="button" onClick={() => void logout()}>
                Logout
              </button>
            </>
          ) : null}
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded border border-[color:var(--nav-border)] text-[color:var(--nav-text)] lg:hidden"
            type="button"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((value) => !value)}
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav className="sticky top-24" aria-label="Dashboard navigation">
            <p className="mb-2 px-2 text-xs font-bold uppercase tracking-wider text-[color:var(--faint)]">Workspace</p>
            <SidebarNav />
          </nav>
        </aside>

        <main className="space-y-5">
          {mobileOpen ? (
            <div className="rounded-md border border-[color:var(--border)] bg-[color:var(--card)] p-3 lg:hidden">
              <SidebarNav onNavigate={() => setMobileOpen(false)} />
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}

export function DashboardOverview() {
  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: api.listAgents });
  const agents = agentsQuery.data ?? [];
  const { user } = useAuth();
  const hasNoAgents = !agentsQuery.isLoading && agents.length === 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-[color:var(--muted)]">{user?.name ? `Welcome back, ${user.name.split(" ")[0]}.` : "Production overview"}</p>
        </div>
        <Link href="/dashboard/agents" className="btn btn-secondary">Manage agents</Link>
      </div>

      {hasNoAgents ? (
        <OnboardingWizard installation={undefined} />
      ) : (
        <>
          <CardGrid columns={4}>
            {dashboardMetrics.map((metric) => <StatCard key={metric.label} {...metric} />)}
          </CardGrid>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <InlineChart title="Latency" value="182ms" rows={[48, 52, 61, 58, 72, 75, 69, 80, 86, 74, 68, 78]} />
            <InlineChart title="Availability" value="99.97%" rows={[82, 84, 83, 91, 90, 94, 92, 93, 95, 97, 98, 99]} accent="from-emerald-500/15 to-emerald-500/5" />
          </div>
        </>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Recent incidents</h2>
            <span className="chip chip-warning">Investigating</span>
          </div>
          <div className="mt-4 space-y-3">
            {incidentTimeline.map((item) => (
              <div key={item.title} className="flex items-start gap-4 rounded-md border border-[color:var(--border)] px-4 py-3">
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
          <h2 className="text-lg font-bold">Latest alerts</h2>
          <div className="mt-4 space-y-3">
            {dashboardAlerts.map((alert) => (
              <div key={alert.title} className="rounded-md border border-[color:var(--border)] px-4 py-3">
                <p className="font-medium">{alert.title}</p>
                <p className="text-sm text-[color:var(--muted)]">{alert.time}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Installed agents</h2>
            <Link href="/dashboard/agents" className="text-sm font-semibold text-[color:var(--link)] hover:text-[color:var(--link-hover)]">View all</Link>
          </div>
          <div className="mt-4 space-y-3">
            {agentsQuery.isLoading ? (
              <div className="skeleton h-16 rounded-md" />
            ) : agents.length === 0 ? (
              <p className="rounded-md border border-dashed border-[color:var(--border)] px-4 py-8 text-center text-sm text-[color:var(--muted)]">
                No agents installed yet.
              </p>
            ) : (
              agents.slice(0, 3).map((agent) => (
                <div key={agent.id} className="grid gap-2 rounded-md border border-[color:var(--border)] px-4 py-3 md:grid-cols-5 md:items-center">
                  <p className="font-medium">{agent.name}</p>
                  <p className="text-sm text-[color:var(--muted)]">{agent.version || "—"}</p>
                  <p className="text-sm text-[color:var(--muted)]">{agent.last_seen_at ? relativeTime(agent.last_seen_at) : "never"}</p>
                  <p className="text-sm text-[color:var(--muted)]">{agent.region || "—"}</p>
                  <span className={`chip w-fit ${agent.status === "online" ? "chip-success" : agent.status === "pending" ? "chip-warning" : "chip-danger"}`}>{agent.status}</span>
                </div>
              ))
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="text-lg font-bold">Status pages</h2>
          <div className="mt-4 space-y-3">
            {statusPages.map((page) => (
              <div key={page.name} className="rounded-md border border-[color:var(--border)] px-4 py-3">
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
          <h2 className="text-lg font-bold">Analytics snapshot</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {analyticsPanels.map((panel) => (
              <div key={panel.label} className="rounded-md border border-[color:var(--border)] px-4 py-3">
                <p className="text-sm text-[color:var(--muted)]">{panel.label}</p>
                <p className="mt-2 text-2xl font-bold tracking-tight">{panel.value}</p>
                <p className="mt-2 text-sm text-[color:var(--muted)]">{panel.change}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      ) : null}
    </div>
  );
}