import { dashboardAgents } from "../../../components/pulseboard-data";
import { GlassCard } from "../../../components/pulseboard-ui";

export default function AgentsPage() {
  return (
    <GlassCard>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Agents</h1>
          <p className="mt-2 text-[color:var(--muted)]">Installed agents, heartbeat health, and install command access.</p>
        </div>
        <button className="btn btn-secondary" type="button">Copy install command</button>
      </div>
      <div className="mt-6 grid gap-4">
        {dashboardAgents.map((agent) => (
          <div key={agent.hostname} className="grid gap-2 rounded-[28px] border border-[color:var(--border)] px-4 py-4 md:grid-cols-5 md:items-center">
            <p className="font-medium">{agent.hostname}</p>
            <p className="text-sm text-[color:var(--muted)]">{agent.version}</p>
            <p className="text-sm text-[color:var(--muted)]">{agent.lastHeartbeat}</p>
            <p className="text-sm text-[color:var(--muted)]">{agent.region}</p>
            <span className="chip chip-success w-fit">{agent.status}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
