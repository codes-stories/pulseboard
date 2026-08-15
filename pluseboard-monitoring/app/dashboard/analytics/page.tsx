import { analyticsPanels } from "../../../components/pulseboard-data";
import { GlassCard, InlineChart } from "../../../components/pulseboard-ui";

export default function AnalyticsPage() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {analyticsPanels.map((panel) => (
          <GlassCard key={panel.label}>
            <p className="text-sm text-[color:var(--muted)]">{panel.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{panel.value}</p>
            <p className="mt-2 text-sm text-[color:var(--muted)]">{panel.change}</p>
          </GlassCard>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <InlineChart title="Response Time" value="182ms" rows={[50, 55, 61, 65, 70, 76, 68, 74, 82, 78, 70, 80]} />
        <InlineChart title="Availability" value="99.97%" rows={[80, 82, 84, 88, 90, 92, 93, 94, 96, 97, 98, 99]} accent="from-emerald-500/15 to-emerald-500/5" />
      </div>
      <GlassCard>
        <h2 className="text-xl font-semibold">Top slow endpoints</h2>
        <div className="mt-5 space-y-3">
          {[
            ["/v1/billing", "241ms"],
            ["/v1/status", "188ms"],
            ["/v1/auth/session", "156ms"],
          ].map((item) => (
            <div key={item[0]} className="flex items-center justify-between rounded-[24px] border border-[color:var(--border)] px-4 py-4">
              <p className="font-medium">{item[0]}</p>
              <p className="text-[color:var(--muted)]">{item[1]}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
