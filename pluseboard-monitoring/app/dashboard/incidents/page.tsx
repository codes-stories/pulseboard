import { incidentTimeline } from "../../../components/pulseboard-data";
import { GlassCard } from "../../../components/pulseboard-ui";

export default function IncidentsPage() {
  return (
    <GlassCard>
      <h1 className="text-3xl font-semibold tracking-tight">Incidents</h1>
      <p className="mt-2 text-[color:var(--muted)]">Timeline, resolution status, and elapsed duration.</p>
      <div className="mt-6 space-y-3">
        {incidentTimeline.map((incident) => (
          <div key={incident.title} className="flex items-start gap-4 rounded-md border border-[color:var(--border)] px-4 py-4">
            <span className="mt-1 h-3 w-3 rounded-full bg-[color:var(--primary)]" />
            <div className="flex-1">
              <p className="font-medium">{incident.title}</p>
              <p className="mt-1 text-sm text-[color:var(--muted)]">{incident.status} · {incident.duration}</p>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
