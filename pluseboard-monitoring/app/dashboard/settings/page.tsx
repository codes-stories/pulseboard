import { GlassCard } from "../../../components/pulseboard-ui";

export default function SettingsPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {[
        ["Profile", "Manage name, email, and avatar."],
        ["Password", "Rotate credentials and enforce security."],
        ["Notifications", "Tune alert channels and thresholds."],
        ["Billing", "Review plan and usage."],
        ["API Keys", "Generate and revoke keys."],
        ["Danger Zone", "Close workspace or delete resources."],
      ].map((item) => (
        <GlassCard key={item[0]}>
          <h1 className="text-2xl font-semibold tracking-tight">{item[0]}</h1>
          <p className="mt-3 text-[color:var(--muted)]">{item[1]}</p>
          <div className="mt-6 rounded-[20px] border border-[color:var(--border)] px-4 py-4 text-sm text-[color:var(--muted)]">Section form placeholder</div>
        </GlassCard>
      ))}
    </div>
  );
}
