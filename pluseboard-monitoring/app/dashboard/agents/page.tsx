"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import type { Agent, APIKeyCreated, CreateAgentRequest, EnrollmentToken, Installation } from "@/lib/types";
import { EmptyState, GlassCard } from "@/components/pulseboard-ui";
import type { ReactNode } from "react";

function message(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Something went wrong. Please try again.";
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  } catch {
    toast.error("Copy failed");
  }
}

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

function Modal({ title, onClose, children }: Readonly<{ title: string; onClose: () => void; children: ReactNode }>) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button className="absolute inset-0 bg-black/60 backdrop-blur-sm" type="button" aria-label="Close" onClick={onClose} />
      <div className="glass-panel relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-md p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <button className="btn btn-ghost" type="button" onClick={onClose}>Close</button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

function RevealedSecret({ label, value, onDismiss }: Readonly<{ label: string; value: string; onDismiss: () => void }>) {
  return (
    <div className="rounded-md border border-[color:var(--success)]/30 bg-[color:var(--chip-success-bg)] p-4">
      <p className="text-sm font-semibold text-[color:var(--success)]">{label}</p>
      <p className="mt-2 break-all rounded-md border border-[color:var(--border)] bg-[color:var(--code-bg)] px-4 py-3 font-mono text-sm">{value}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn btn-secondary" type="button" onClick={() => void copyText(value)}>Copy</button>
        <button className="btn btn-ghost" type="button" onClick={onDismiss}>Dismiss</button>
      </div>
      <p className="mt-3 text-xs text-[color:var(--muted)]">This secret is shown only once. Store it somewhere safe before closing.</p>
    </div>
  );
}

function EnrollModal({ agent, install }: Readonly<{ agent: Agent; install?: Installation }>) {
  const [token, setToken] = useState<EnrollmentToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function issueToken() {
    return api
      .createEnrollmentToken(agent.id)
      .then(setToken)
      .catch((err: unknown) => setError(message(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    void issueToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent.id]);

  const command = `curl -fsSL ${install?.install_url ?? "https://install.pulseboard.dev"} | sh -s -- --token ${token?.token ?? ""}`;

  return (
    <div className="grid gap-4">
      <p className="text-[color:var(--muted)]">
        Generate a short-lived, single-use enrollment token for <span className="font-semibold text-[color:var(--text)]">{agent.name}</span>.
        The agent uses it once during install to bind to your workspace and receive its first API key.
      </p>

      {loading ? (
        <div className="skeleton h-32 rounded-md" />
      ) : error ? (
        <div className="rounded-md border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 p-4">
          <p className="text-sm text-[color:var(--danger)]">{error}</p>
          <button className="btn btn-secondary mt-3" type="button" onClick={() => { setError(null); setLoading(true); void issueToken(); }}>Try again</button>
        </div>
      ) : token ? (
        <>
          <RevealedSecret
            label="Enrollment token"
            value={token.token}
            onDismiss={() => setToken(null)}
          />
          <div className="rounded-md border border-[color:var(--border)] p-4">
            <p className="text-sm text-[color:var(--muted)]">Install command</p>
            <p className="mt-2 break-all rounded-md border border-[color:var(--border)] bg-[color:var(--code-bg)] px-4 py-3 font-mono text-sm">{command}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn btn-secondary" type="button" onClick={() => void copyText(command)}>Copy command</button>
              <button className="btn btn-ghost" type="button" onClick={() => { setToken(null); setError(null); setLoading(true); void issueToken(); }}>Regenerate</button>
            </div>
          </div>
          <p className="text-xs text-[color:var(--muted)]">Expires {new Date(token.expires_at).toLocaleString()}. Each token can only be used once.</p>
        </>
      ) : null}
    </div>
  );
}

function KeysModal({ agent }: Readonly<{ agent: Agent }>) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [revealed, setRevealed] = useState<APIKeyCreated | null>(null);

  const keysQuery = useQuery({
    queryKey: ["api-keys", agent.id],
    queryFn: () => api.listAPIKeys(agent.id),
  });

  const createMutation = useMutation({
    mutationFn: (keyName: string) => api.createAPIKey(agent.id, keyName),
    onSuccess: (key) => {
      setName("");
      setRevealed(key);
      queryClient.invalidateQueries({ queryKey: ["api-keys", agent.id] });
    },
    onError: (error) => toast.error(message(error)),
  });

  const revokeMutation = useMutation({
    mutationFn: (keyID: string) => api.revokeAPIKey(agent.id, keyID),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys", agent.id] });
      toast.success("API key revoked");
    },
    onError: (error) => toast.error(message(error)),
  });

  const rotateMutation = useMutation({
    mutationFn: (keyID: string) => api.rotateAPIKey(agent.id, keyID),
    onSuccess: (key) => {
      setRevealed(key);
      queryClient.invalidateQueries({ queryKey: ["api-keys", agent.id] });
    },
    onError: (error) => toast.error(message(error)),
  });

  return (
    <div className="grid gap-5">
      {revealed ? (
        <RevealedSecret
          label="New API key — shown once"
          value={revealed.key}
          onDismiss={() => setRevealed(null)}
        />
      ) : null}

      <form
        className="grid gap-3 md:grid-cols-[1fr_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) createMutation.mutate(name.trim());
        }}
      >
        <input
          className="input-field"
          placeholder="Key name, e.g. production"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button className="btn btn-primary" type="submit" disabled={!name.trim() || createMutation.isPending}>
          {createMutation.isPending ? "Creating…" : "Create key"}
        </button>
      </form>

      {keysQuery.isLoading ? (
        <div className="skeleton h-24 rounded-md" />
      ) : keysQuery.isError ? (
        <p className="text-sm text-[color:var(--danger)]">{message(keysQuery.error)}</p>
      ) : (keysQuery.data ?? []).length === 0 ? (
        <p className="rounded-md border border-[color:var(--border)] px-4 py-6 text-center text-sm text-[color:var(--muted)]">
          No API keys yet. Create one to let the agent authenticate with your workspace.
        </p>
      ) : (
        <div className="grid gap-3">
          {(keysQuery.data ?? []).map((key) => (
            <div key={key.id} className="grid gap-2 rounded-md border border-[color:var(--border)] px-4 py-4 md:grid-cols-[1.2fr_1fr_1fr_auto] md:items-center">
              <div>
                <p className="font-medium">{key.name}</p>
                <p className="font-mono text-xs text-[color:var(--muted)]">{key.prefix}…</p>
              </div>
              <p className="text-sm text-[color:var(--muted)]">Used {relativeTime(key.last_used_at)}</p>
              <p className="text-sm text-[color:var(--muted)]">{key.revoked_at ? "Revoked" : key.expires_at ? `Expires ${new Date(key.expires_at).toLocaleDateString()}` : "No expiry"}</p>
              <div className="flex flex-wrap gap-2">
                {!key.revoked_at ? (
                  <>
                    <button
                      className="btn btn-secondary"
                      type="button"
                      disabled={rotateMutation.isPending}
                      onClick={() => rotateMutation.mutate(key.id)}
                    >
                      Rotate
                    </button>
                    <button
                      className="btn btn-ghost text-[color:var(--danger)]"
                      type="button"
                      disabled={revokeMutation.isPending}
                      onClick={() => void revokeMutation.mutate(key.id)}
                    >
                      Revoke
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AgentsPage() {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [enrolling, setEnrolling] = useState<Agent | null>(null);
  const [managingKeys, setManagingKeys] = useState<Agent | null>(null);

  const agentsQuery = useQuery({ queryKey: ["agents"], queryFn: api.listAgents });
  const installationQuery = useQuery({ queryKey: ["installation"], queryFn: api.getInstallation });

  const createMutation = useMutation({
    mutationFn: (payload: CreateAgentRequest) => api.createAgent(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      setAdding(false);
      toast.success("Agent created. Generate an enrollment token to install it.");
    },
    onError: (error) => toast.error(message(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteAgent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast.success("Agent deleted");
    },
    onError: (error) => toast.error(message(error)),
  });

  const agents = agentsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Agents</h1>
            <p className="mt-2 text-[color:var(--muted)]">Installed agents, heartbeat health, and install command access.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => void copyText(`curl -fsSL ${installationQuery.data?.install_url ?? "https://install.pulseboard.dev"} | sh -s`)}
            >
              Copy install command
            </button>
            <button className="btn btn-primary" type="button" onClick={() => setAdding((value) => !value)}>
              {adding ? "Cancel" : "Add agent"}
            </button>
          </div>
        </div>

        {adding ? (
          <form
            className="mt-6 grid gap-3 rounded-md border border-[color:var(--border)] p-4 md:grid-cols-[1fr_1fr_1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              createMutation.mutate({
                name: String(form.get("name") ?? ""),
                hostname: String(form.get("hostname") ?? ""),
                region: String(form.get("region") ?? ""),
              });
            }}
          >
            <input className="input-field" name="name" placeholder="Name (required)" required />
            <input className="input-field" name="hostname" placeholder="Hostname, e.g. agent-nyc-01" />
            <input className="input-field" name="region" placeholder="Region, e.g. us-east-1" />
            <button className="btn btn-primary" type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create"}
            </button>
          </form>
        ) : null}
      </GlassCard>

      {agentsQuery.isLoading ? (
        <div className="skeleton h-64 rounded-md" />
      ) : agentsQuery.isError ? (
        <GlassCard>
          <p className="text-sm text-[color:var(--danger)]">{message(agentsQuery.error)}</p>
        </GlassCard>
      ) : agents.length === 0 ? (
        <EmptyState
          title="No agents yet"
          copy="Create an agent, generate an enrollment token, and install the PulseBoard agent on a machine to start collecting heartbeats and checks."
          action={<button className="btn btn-primary" type="button" onClick={() => setAdding(true)}>Add your first agent</button>}
        />
      ) : (
        <GlassCard>
          <div className="grid gap-3">
            {agents.map((agent) => (
              <div key={agent.id} className="grid gap-2 rounded-md border border-[color:var(--border)] px-4 py-4 md:grid-cols-[1.4fr_0.8fr_1fr_0.9fr_1fr_auto] md:items-center">
                <div>
                  <Link
                    href={`/dashboard/agents/${agent.id}`}
                    className="font-medium hover:text-[color:var(--primary)] transition-colors"
                  >
                    {agent.name}
                  </Link>
                  <p className="font-mono text-xs text-[color:var(--muted)]">{agent.hostname || agent.device_id || agent.id.slice(0, 8)}</p>
                </div>
                <p className="text-sm text-[color:var(--muted)]">{agent.version || "—"}</p>
                <p className="text-sm text-[color:var(--muted)]">{agent.region || "—"}</p>
                <StatusChip status={agent.status} />
                <p className="text-sm text-[color:var(--muted)]">Seen {relativeTime(agent.last_seen_at)}</p>
                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-secondary" type="button" onClick={() => setEnrolling(agent)}>Enroll</button>
                  <button className="btn btn-secondary" type="button" onClick={() => setManagingKeys(agent)}>API keys</button>
                  <button
                    className="btn btn-ghost text-[color:var(--danger)]"
                    type="button"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (window.confirm(`Delete agent "${agent.name}"? Its API keys will be revoked.`)) {
                        deleteMutation.mutate(agent.id);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {enrolling ? (
        <Modal title={`Enroll ${enrolling.name}`} onClose={() => setEnrolling(null)}>
          <EnrollModal agent={enrolling} install={installationQuery.data} />
        </Modal>
      ) : null}

      {managingKeys ? (
        <Modal title={`API keys · ${managingKeys.name}`} onClose={() => setManagingKeys(null)}>
          <KeysModal agent={managingKeys} />
        </Modal>
      ) : null}
    </div>
  );
}