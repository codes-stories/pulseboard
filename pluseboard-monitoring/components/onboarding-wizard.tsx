"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  Rocket,
  Server,
  Terminal,
} from "lucide-react";
import * as api from "@/lib/api";
import type { EnrollmentToken, Installation } from "@/lib/types";

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  } catch {
    toast.error("Copy failed");
  }
}

export function OnboardingWizard({
  installation,
}: {
  installation?: Installation;
}) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [agentName, setAgentName] = useState("");
  const [createdAgent, setCreatedAgent] = useState<{ id: string; name: string } | null>(null);
  const [token, setToken] = useState<EnrollmentToken | null>(null);

  const createMutation = useMutation({
    mutationFn: (name: string) => api.createAgent({ name, hostname: name }),
    onSuccess: (agent) => {
      setCreatedAgent({ id: agent.id, name: agent.name });
      setStep(1);
      toast.success(`Agent "${agent.name}" created`);
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create agent"),
  });

  const tokenMutation = useMutation({
    mutationFn: (agentID: string) => api.createEnrollmentToken(agentID),
    onSuccess: (enrollment) => {
      setToken(enrollment);
      setStep(2);
      toast.success("Enrollment token generated");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to generate token"),
  });

  const installUrl = installation?.install_url ?? "https://install.pulseboard.dev";
  const enrollCommand = token
    ? `curl -fsSL ${installUrl} | sh -s -- --token ${token.token}`
    : "";

  return (
    <div className="animate-fade-in-up rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] p-6 shadow-sm">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color:rgba(240,136,4,0.1)]">
          <Rocket className="h-5 w-5 text-[color:var(--primary)]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[color:var(--text)]">
            Get your first agent online
          </h2>
          <p className="text-sm text-[color:var(--muted)]">
            Deploy an agent in under 2 minutes
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-8 flex items-center gap-2">
        {[
          { n: 0, label: "Name agent" },
          { n: 1, label: "Generate token" },
          { n: 2, label: "Install & run" },
          { n: 3, label: "Verify" },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                step > s.n
                  ? "bg-[color:var(--success)] text-white"
                  : step === s.n
                    ? "bg-[color:var(--primary)] text-[color:var(--cta-text)]"
                    : "bg-[color:var(--bg-elevated)] text-[color:var(--faint)]"
              }`}
            >
              {step > s.n ? <Check className="h-3.5 w-3.5" /> : s.n + 1}
            </div>
            <span
              className={`hidden text-xs font-medium sm:block ${
                step >= s.n ? "text-[color:var(--text)]" : "text-[color:var(--faint)]"
              }`}
            >
              {s.label}
            </span>
            {i < 3 && (
              <div
                className={`mx-1 h-px w-6 sm:w-10 ${
                  step > s.n ? "bg-[color:var(--success)]" : "bg-[color:var(--border)]"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Name agent */}
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[color:var(--text)]">
              Agent name
            </label>
            <p className="mb-2 text-xs text-[color:var(--muted)]">
              A friendly name to identify this agent in your dashboard.
            </p>
            <input
              className="input-field font-mono"
              placeholder="e.g. production-api, staging-worker"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && agentName.trim()) {
                  createMutation.mutate(agentName.trim());
                }
              }}
              autoFocus
            />
          </div>
          <button
            className="btn btn-primary w-full"
            type="button"
            disabled={!agentName.trim() || createMutation.isPending}
            onClick={() => createMutation.mutate(agentName.trim())}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Creating…
              </>
            ) : (
              <>
                Continue <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      )}

      {/* Step 1: Generate token */}
      {step === 1 && createdAgent && (
        <div className="space-y-4">
          <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card-soft)] p-4">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-[color:var(--success)]" />
              <span className="text-sm font-semibold text-[color:var(--text)]">
                {createdAgent.name}
              </span>
              <span className="chip chip-success">Created</span>
            </div>
          </div>
          <p className="text-sm text-[color:var(--muted)]">
            Now generate a one-time enrollment token. This binds the agent to your workspace.
          </p>
          <button
            className="btn btn-primary w-full"
            type="button"
            disabled={tokenMutation.isPending}
            onClick={() => tokenMutation.mutate(createdAgent.id)}
          >
            {tokenMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Generating…
              </>
            ) : (
              <>
                Generate enrollment token <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      )}

      {/* Step 2: Install */}
      {step === 2 && token && (
        <div className="space-y-4">
          <p className="text-sm text-[color:var(--muted)]">
            Copy and run this command on your server. It downloads the agent, enrolls it with your workspace, and starts the service.
          </p>
          <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--code-bg)] p-4">
            <div className="flex items-start justify-between gap-3">
              <pre className="code-area min-w-0 flex-1 overflow-x-auto text-[0.78rem]">
                <code>{enrollCommand}</code>
              </pre>
              <button
                className="btn btn-ghost shrink-0 text-sm text-[color:var(--nav-text)]"
                type="button"
                onClick={() => copyText(enrollCommand)}
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-[color:rgba(59,130,246,0.2)] bg-[color:rgba(59,130,246,0.06)] p-3">
            <Terminal className="h-4 w-4 flex-shrink-0 text-[color:#3b82f6]" />
            <p className="text-xs text-[color:var(--muted)]">
              Requires <span className="font-mono font-medium text-[color:var(--text)]">curl</span> and{" "}
              <span className="font-mono font-medium text-[color:var(--text)]">bash</span>. Works on Linux, macOS, and FreeBSD.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              className="btn btn-secondary flex-1"
              type="button"
              onClick={() => copyText(enrollCommand)}
            >
              <Copy className="h-4 w-4" /> Copy command
            </button>
            <button
              className="btn btn-primary flex-1"
              type="button"
              onClick={() => setStep(3)}
            >
              I&apos;ve run it <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <button
            className="btn btn-ghost w-full text-sm"
            type="button"
            onClick={() => setStep(3)}
          >
            Skip — I&apos;ll set it up later
          </button>
        </div>
      )}

      {/* Step 3: Verify */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-lg border border-[color:rgba(21,128,61,0.2)] bg-[color:rgba(21,128,61,0.06)] p-4 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-[color:var(--success)]" />
            <p className="mt-2 text-sm font-semibold text-[color:var(--text)]">
              You&apos;re all set!
            </p>
            <p className="mt-1 text-xs text-[color:var(--muted)]">
              {createdAgent
                ? `Agent "${createdAgent.name}" will appear in your dashboard once it connects.`
                : "Your agent will appear in the dashboard once it connects."}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href={createdAgent ? `/dashboard/agents/${createdAgent.id}` : "/dashboard/agents"}
              className="btn btn-primary w-full justify-center"
            >
              View agent dashboard
            </a>
            <a
              href="/docs"
              className="btn btn-secondary w-full justify-center"
            >
              Read the docs
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
