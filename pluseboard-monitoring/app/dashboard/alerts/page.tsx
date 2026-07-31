import { dashboardAlerts } from "../../../components/pulseboard-data";
import { GlassCard } from "../../../components/pulseboard-ui";

export default function AlertsPage() {
  return (
    <GlassCard>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Alerts</h1>
          <p className="mt-2 text-[color:var(--muted)]">Alert history with filtering, search, and pagination-ready structure.</p>
        </div>
        <div className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm text-[color:var(--muted)]">Search alerts</div>
      </div>
      <div className="mt-6 grid gap-3">
        {dashboardAlerts.map((alert) => (
          <div key={alert.title} className="flex items-center justify-between gap-4 rounded-[24px] border border-[color:var(--border)] px-4 py-4">
            <div>
              <p className="font-medium">{alert.title}</p>
              <p className="mt-1 text-sm text-[color:var(--muted)]">{alert.time}</p>
            </div>
            <span className={`chip ${alert.severity === "danger" ? "chip-danger" : alert.severity === "warning" ? "chip-warning" : "chip-success"}`}>{alert.severity}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
