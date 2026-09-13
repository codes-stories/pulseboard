"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock, Globe, Server, Activity, FileText } from "lucide-react";
import * as api from "@/lib/api";
import type { Agent } from "@/lib/types";
import { GlassCard } from "@/components/pulseboard-ui";

function relativeTime(value?: string): string {
  if (!value) return "never";
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function StatusChip({ status }: Readonly<{ status: Agent["status"] }>) {
  const chipClass = status === "online" ? "chip-success" : status === "pending" ? "chip-warning" : "chip-danger";
  return <span className={`chip ${chipClass}`}>{status}</span>;
}

function LevelBadge({ level }: Readonly<{ level: string }>) {
  const colorMap: Record<string, string> = {
    error: "text-[color:var(--danger)]",
    warning: "text-[color:var(--warning)]",
    info: "text-[color:var(--success)]",
    debug: "text-[color:var(--muted)]",
  };
  return (
    <span className={`text-xs font-medium ${colorMap[level] ?? "text-[color:var(--muted)]"}`}>
      {level.toUpperCase()}
    </span>
  );
}

function AgentOverview({ agent }: Readonly<{ agent: Agent }>) {
  return (
    <GlassCard>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{agent.name}</h1>
            <StatusChip status={agent.status} />
          </div>
          <p className="mt-1 font-mono text-sm text-[color:var(--muted)]">
            {agent.hostname || agent.device_id || agent.id.slice(0, 8)}
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-[color:var(--muted)]">
          {agent.version && (
            <span className="flex items-center gap-1.5">
              <Server className="h-4 w-4" /> v{agent.version}
            </span>
          )}
          {agent.region && (
            <span className="flex items-center gap-1.5">
              <Globe className="h-4 w-4" /> {agent.region}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" /> {relativeTime(agent.last_seen_at)}
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-md border border-[color:var(--border)] p-3">
          <p className="text-xs text-[color:var(--muted)]">CPU Usage</p>
          <p className="mt-1 text-lg font-semibold">{agent.cpu_usage.toFixed(1)}%</p>
        </div>
        <div className="rounded-md border border-[color:var(--border)] p-3">
          <p className="text-xs text-[color:var(--muted)]">Memory Usage</p>
          <p className="mt-1 text-lg font-semibold">{agent.memory_usage.toFixed(1)}%</p>
        </div>
        <div className="rounded-md border border-[color:var(--border)] p-3">
          <p className="text-xs text-[color:var(--muted)]">Status</p>
          <p className="mt-1 text-lg font-semibold capitalize">{agent.status}</p>
        </div>
        <div className="rounded-md border border-[color:var(--border)] p-3">
          <p className="text-xs text-[color:var(--muted)]">Created</p>
          <p className="mt-1 text-lg font-semibold">{new Date(agent.created_at).toLocaleDateString()}</p>
        </div>
      </div>
    </GlassCard>
  );
}

function LogsPanel({ agentID }: Readonly<{ agentID: string }>) {
  const logsQuery = useQuery({
    queryKey: ["agent-logs", agentID],
    queryFn: () => api.listAgentLogs(agentID),
    refetchInterval: 10000,
  });

  const logs = logsQuery.data?.logs ?? [];

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-[color:var(--muted)]" />
        <h2 className="text-lg font-semibold">Logs</h2>
      </div>

      {logsQuery.isLoading ? (
        <div className="skeleton h-48 rounded-md" />
      ) : logsQuery.isError ? (
        <p className="text-sm text-[color:var(--danger)]">Failed to load logs</p>
      ) : logs.length === 0 ? (
        <p className="rounded-md border border-[color:var(--border)] px-4 py-8 text-center text-sm text-[color:var(--muted)]">
          No logs yet. Logs will appear here when the agent submits log entries.
        </p>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          <div className="space-y-1">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 rounded-md border border-[color:var(--border)] px-3 py-2"
              >
                <LevelBadge level={log.level} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm break-words">{log.message}</p>
                  {log.context && Object.keys(log.context).length > 0 && (
                    <pre className="mt-1 text-xs text-[color:var(--muted)] overflow-x-auto">
                      {JSON.stringify(log.context, null, 2)}
                    </pre>
                  )}
                </div>
                <span className="text-xs text-[color:var(--muted)] whitespace-nowrap">
                  {relativeTime(log.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  );
}

function CheckResultsPanel({ agentID }: Readonly<{ agentID: string }>) {
  const resultsQuery = useQuery({
    queryKey: ["agent-results", agentID],
    queryFn: () => api.listAgentCheckResults(agentID),
    refetchInterval: 10000,
  });

  const results = resultsQuery.data?.results ?? [];

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5 text-[color:var(--muted)]" />
        <h2 className="text-lg font-semibold">Check Results</h2>
      </div>

      {resultsQuery.isLoading ? (
        <div className="skeleton h-48 rounded-md" />
      ) : resultsQuery.isError ? (
        <p className="text-sm text-[color:var(--danger)]">Failed to load check results</p>
      ) : results.length === 0 ? (
        <p className="rounded-md border border-[color:var(--border)] px-4 py-8 text-center text-sm text-[color:var(--muted)]">
          No check results yet. Results will appear here when the agent runs monitoring checks.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--border)] text-left text-[color:var(--muted)]">
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Monitor</th>
                <th className="pb-2 font-medium">Latency</th>
                <th className="pb-2 font-medium">Result</th>
                <th className="pb-2 font-medium">Checked At</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result.id} className="border-b border-[color:var(--border)] last:border-0">
                  <td className="py-2">
                    <span
                      className={`font-mono text-xs ${
                        result.success ? "text-[color:var(--success)]" : "text-[color:var(--danger)]"
                      }`}
                    >
                      {result.status_code}
                    </span>
                  </td>
                  <td className="py-2 font-mono text-xs">{result.monitor_id.slice(0, 8)}...</td>
                  <td className="py-2">{result.latency_ms}ms</td>
                  <td className="py-2">
                    <span className={`text-xs ${result.success ? "text-[color:var(--success)]" : "text-[color:var(--danger)]"}`}>
                      {result.success ? "Pass" : "Fail"}
                    </span>
                  </td>
                  <td className="py-2 text-[color:var(--muted)]">{relativeTime(result.checked_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  );
}

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const agentID = params.id as string;

  const agentQuery = useQuery({
    queryKey: ["agent", agentID],
    queryFn: () => api.listAgents().then((agents) => agents.find((a) => a.id === agentID)),
  });

  if (agentQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-12 rounded-md" />
        <div className="skeleton h-64 rounded-md" />
      </div>
    );
  }

  if (agentQuery.isError || !agentQuery.data) {
    return (
      <GlassCard>
        <p className="text-sm text-[color:var(--danger)]">Agent not found</p>
        <button className="btn btn-secondary mt-4" onClick={() => router.push("/dashboard/agents")}>
          Back to agents
        </button>
      </GlassCard>
    );
  }

  const agent = agentQuery.data;

  return (
    <div className="space-y-6">
      <button
        className="flex items-center gap-2 text-sm text-[color:var(--muted)] hover:text-[color:var(--text)] transition-colors"
        onClick={() => router.push("/dashboard/agents")}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to agents
      </button>

      <AgentOverview agent={agent} />

      <div className="grid gap-6 lg:grid-cols-2">
        <LogsPanel agentID={agentID} />
        <CheckResultsPanel agentID={agentID} />
      </div>
    </div>
  );
}
