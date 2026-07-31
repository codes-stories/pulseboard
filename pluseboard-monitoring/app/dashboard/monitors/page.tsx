import { dashboardMonitors } from "../../../components/pulseboard-data";
import { GlassCard } from "../../../components/pulseboard-ui";

export default function MonitorsPage() {
  return (
    <GlassCard>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Monitors</h1>
          <p className="mt-2 text-[color:var(--muted)]">Monitor status, URL, interval, latency, region, and actions.</p>
        </div>
        <button className="btn btn-primary" type="button">Create monitor</button>
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-[color:var(--muted)]">
            <tr>
              <th className="py-3 pr-6">Status</th>
              <th className="py-3 pr-6">Name</th>
              <th className="py-3 pr-6">URL</th>
              <th className="py-3 pr-6">Interval</th>
              <th className="py-3 pr-6">Latency</th>
              <th className="py-3 pr-6">Region</th>
              <th className="py-3 pr-6">Actions</th>
            </tr>
          </thead>
          <tbody>
            {dashboardMonitors.map((monitor) => (
              <tr key={monitor.name} className="border-t border-[color:var(--border)]">
                <td className="py-4 pr-6"><span className={`chip ${monitor.status === "Down" ? "chip-danger" : monitor.status === "Degraded" ? "chip-warning" : "chip-success"}`}>{monitor.status}</span></td>
                <td className="py-4 pr-6 font-medium">{monitor.name}</td>
                <td className="py-4 pr-6 text-[color:var(--muted)]">{monitor.url}</td>
                <td className="py-4 pr-6 text-[color:var(--muted)]">{monitor.interval}</td>
                <td className="py-4 pr-6 text-[color:var(--muted)]">{monitor.latency}</td>
                <td className="py-4 pr-6 text-[color:var(--muted)]">{monitor.region}</td>
                <td className="py-4 pr-6 text-[color:var(--muted)]">Edit · Pause</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassCard>
  );
}
