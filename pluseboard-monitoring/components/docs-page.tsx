"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  Check,
  Server,
  Terminal,
  Shield,
  Settings,
  BookOpen,
  Zap,
  ExternalLink,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { docsSections, systemRequirements, envVars, apiEndpoints } from "./docs-data";

function SidebarLink({
  section,
  isActive,
  onClick,
}: {
  section: (typeof docsSections)[number];
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <a
      href={`#${section.id}`}
      onClick={(e) => {
        e.preventDefault();
        onClick();
        document.getElementById(section.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
      className={`docs-sidebar-link flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "docs-sidebar-link-active bg-[color:rgba(240,136,4,0.1)] text-[color:var(--text)]"
          : "text-[color:var(--muted)] hover:bg-[color:var(--card-soft)] hover:text-[color:var(--text)]"
      }`}
    >
      <ChevronRight
        className={`h-3.5 w-3.5 transition-transform ${isActive ? "rotate-90 text-[color:var(--primary)]" : ""}`}
      />
      {section.sidebarLabel}
    </a>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded border border-[color:var(--border)] bg-[color:var(--card)] px-2 py-1 text-xs font-medium text-[color:var(--muted)] transition-all hover:border-[color:var(--border-strong)] hover:text-[color:var(--text)]"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-[color:var(--success)]" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          Copy
        </>
      )}
    </button>
  );
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-[color:var(--chip-success-bg)] text-[color:var(--chip-success-text)]",
    POST: "bg-[color:rgba(59,130,246,0.12)] text-[color:#3b82f6]",
    PUT: "bg-[color:var(--chip-warning-bg)] text-[color:var(--chip-warning-text)]",
    DELETE: "bg-[color:var(--chip-danger-bg)] text-[color:var(--chip-danger-text)]",
    PATCH: "bg-[color:var(--chip-warning-bg)] text-[color:var(--chip-warning-text)]",
  };
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[0.65rem] font-bold font-mono ${colors[method] || ""}`}>
      {method}
    </span>
  );
}

export function DocsPageComponent() {
  const [activeSection, setActiveSection] = useState(docsSections[0].id);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const headings = docsSections
      .map((s) => document.getElementById(s.id))
      .filter(Boolean) as HTMLElement[];

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );

    headings.forEach((h) => observerRef.current!.observe(h));

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return (
    <div className="docs-layout">
      {/* Top bar */}
      <header className="docs-topbar sticky top-0 z-30 flex items-center justify-between border-b border-[color:var(--border)] bg-[color:var(--bg)] px-6 py-3">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-[color:var(--muted)] transition-colors hover:text-[color:var(--text)]"
          >
            <ArrowLeft className="h-4 w-4" />
            PulseBoard
          </Link>
          <div className="h-4 w-px bg-[color:var(--border)]" />
          <span className="text-sm font-semibold text-[color:var(--text)]">
            Documentation
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="btn-secondary hidden rounded-md px-3 py-1.5 text-xs font-semibold sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="btn-primary hidden rounded-md px-3 py-1.5 text-xs font-semibold sm:inline-flex"
          >
            Get started
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex items-center justify-center rounded-md border border-[color:var(--border)] p-1.5 text-[color:var(--muted)] lg:hidden"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </header>

      <div className="docs-body flex">
        {/* Sidebar */}
        <aside
          className={`docs-sidebar thin-scroll fixed top-[53px] bottom-0 left-0 z-20 w-60 overflow-y-auto border-r border-[color:var(--border)] bg-[color:var(--bg)] px-3 py-5 transition-transform lg:sticky lg:translate-x-0 ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <p className="mb-3 px-3 text-[0.65rem] font-bold uppercase tracking-widest text-[color:var(--faint)]">
            Getting Started
          </p>
          <nav className="flex flex-col gap-0.5">
            {docsSections.slice(0, 3).map((section) => (
              <SidebarLink
                key={section.id}
                section={section}
                isActive={activeSection === section.id}
                onClick={() => setMobileMenuOpen(false)}
              />
            ))}
          </nav>

          <p className="mb-3 mt-6 px-3 text-[0.65rem] font-bold uppercase tracking-widest text-[color:var(--faint)]">
            Reference
          </p>
          <nav className="flex flex-col gap-0.5">
            {docsSections.slice(3).map((section) => (
              <SidebarLink
                key={section.id}
                section={section}
                isActive={activeSection === section.id}
                onClick={() => setMobileMenuOpen(false)}
              />
            ))}
          </nav>

          <div className="mt-8 rounded-lg border border-[color:var(--border)] bg-[color:var(--card-soft)] p-4">
            <p className="text-xs font-semibold text-[color:var(--text)]">Need help?</p>
            <p className="mt-1 text-xs leading-relaxed text-[color:var(--muted)]">
              Join our Discord or open an issue on GitHub.
            </p>
            <div className="mt-3 flex gap-2">
              <a
                href="https://discord.gg/pulseboard"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded border border-[color:var(--border)] px-2 py-1 text-[0.65rem] font-medium text-[color:var(--muted)] hover:text-[color:var(--text)]"
              >
                Discord <ExternalLink className="h-2.5 w-2.5" />
              </a>
              <a
                href="https://github.com/pulseboard"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 rounded border border-[color:var(--border)] px-2 py-1 text-[0.65rem] font-medium text-[color:var(--muted)] hover:text-[color:var(--text)]"
              >
                GitHub <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
          </div>
        </aside>

        {/* Mobile overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-10 bg-black/40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="docs-content min-w-0 flex-1 px-6 py-10 lg:px-12">
          <div className="mx-auto max-w-3xl">

            {/* Quickstart */}
            <section id="quickstart" className="docs-section mb-16">
              <div className="mb-8">
                <div className="mb-3 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-[color:var(--primary)]" />
                  <span className="text-xs font-bold uppercase tracking-widest text-[color:var(--primary)]">
                    Quickstart
                  </span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-[color:var(--text)]">
                  Get running in 2 minutes
                </h1>
                <p className="mt-3 text-base leading-relaxed text-[color:var(--muted)]">
                  PulseBoard monitors your APIs from lightweight Erlang agents deployed on your infrastructure.
                  Install the agent, enroll it, and start seeing data in your dashboard.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    step: 1,
                    icon: <Terminal className="h-5 w-5" />,
                    title: "Create an account",
                    desc: "Sign up at pulseboard.dev and create a workspace.",
                  },
                  {
                    step: 2,
                    icon: <Server className="h-5 w-5" />,
                    title: "Create an agent",
                    desc: "In the dashboard, go to Agents and click Create Agent.",
                  },
                  {
                    step: 3,
                    icon: <Shield className="h-5 w-5" />,
                    title: "Install on your server",
                    desc: "Copy the install command and run it on your server.",
                  },
                  {
                    step: 4,
                    icon: <Settings className="h-5 w-5" />,
                    title: "Verify connection",
                    desc: "The agent appears online in your dashboard within seconds.",
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="group rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-5 transition-all hover:border-[color:var(--primary)] hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:rgba(240,136,4,0.1)] text-[color:var(--primary)] transition-colors group-hover:bg-[color:var(--primary)] group-hover:text-[color:var(--cta-text)]">
                        {item.icon}
                      </div>
                      <span className="text-xs font-bold text-[color:var(--faint)]">
                        Step {item.step}
                      </span>
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-[color:var(--text)]">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-[color:var(--muted)]">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-lg border border-[color:var(--border)] bg-[color:var(--card-soft)] p-4">
                <p className="text-xs font-semibold text-[color:var(--text)]">
                  Quick install
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 rounded-md bg-[color:var(--code-bg)] px-3 py-2 font-mono text-[0.78rem] text-[color:var(--nav-text)]">
                    curl -fsSL https://install.pulseboard.dev | sh -s
                  </code>
                  <CopyButton text="curl -fsSL https://install.pulseboard.dev | sh -s" />
                </div>
              </div>
            </section>

            {/* Install the Agent */}
            <section id="install" className="docs-section mb-16">
              <div className="mb-8">
                <div className="mb-3 flex items-center gap-2">
                  <Server className="h-5 w-5 text-[color:var(--primary)]" />
                  <span className="text-xs font-bold uppercase tracking-widest text-[color:var(--primary)]">
                    Installation
                  </span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-[color:var(--text)]">
                  Install the Agent
                </h2>
                <p className="mt-3 text-base leading-relaxed text-[color:var(--muted)]">
                  The PulseBoard agent is a single binary with no external dependencies.
                  It collects heartbeats, runs checks, and reports metrics back to your workspace.
                </p>
              </div>

              {/* System requirements */}
              <h3 className="mb-3 text-sm font-semibold text-[color:var(--text)]">
                System requirements
              </h3>
              <div className="mb-6 overflow-hidden rounded-lg border border-[color:var(--border)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[color:var(--border)] bg-[color:var(--card-soft)]">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-[color:var(--muted)]">
                        Platform
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-[color:var(--muted)]">
                        Architecture
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-[color:var(--muted)]">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {systemRequirements.map((req) => (
                      <tr
                        key={req.os}
                        className="border-b border-[color:var(--border)] last:border-0"
                      >
                        <td className="px-4 py-2.5 font-medium text-[color:var(--text)]">
                          {req.os}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-[color:var(--muted)]">
                          {req.arch}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-[color:var(--muted)]">
                          {req.notes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="mb-3 text-sm font-semibold text-[color:var(--text)]">
                Quick install (recommended)
              </h3>
              <p className="mb-3 text-sm text-[color:var(--muted)]">
                The install script downloads the latest binary for your platform and sets up the agent as a system service.
              </p>
              <div className="mb-6 rounded-lg border border-[color:var(--border)] bg-[color:var(--code-bg)] p-4">
                <div className="flex items-center justify-between">
                  <pre className="code-area text-[0.78rem]">
                    <code>{`curl -fsSL https://install.pulseboard.dev | sh -s`}</code>
                  </pre>
                  <CopyButton text="curl -fsSL https://install.pulseboard.dev | sh -s" />
                </div>
              </div>

              <h3 className="mb-3 text-sm font-semibold text-[color:var(--text)]">
                Install with enrollment token
              </h3>
              <p className="mb-3 text-sm text-[color:var(--muted)]">
                To automatically bind the agent to your workspace, pass the enrollment token generated from the dashboard.
              </p>
              <div className="mb-6 rounded-lg border border-[color:var(--border)] bg-[color:var(--code-bg)] p-4">
                <div className="flex items-center justify-between">
                  <pre className="code-area text-[0.78rem]">
                    <code>{`curl -fsSL https://install.pulseboard.dev | sh -s -- --token YOUR_ENROLLMENT_TOKEN`}</code>
                  </pre>
                  <CopyButton text="curl -fsSL https://install.pulseboard.dev | sh -s -- --token YOUR_ENROLLMENT_TOKEN" />
                </div>
              </div>

              <h3 className="mb-3 text-sm font-semibold text-[color:var(--text)]">
                Manual install
              </h3>
              <p className="mb-3 text-sm text-[color:var(--muted)]">
                Download the binary directly and configure it yourself.
              </p>
              <div className="mb-6 space-y-3">
                <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--code-bg)] p-4">
                  <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-widest text-[color:var(--faint)]">
                    Download
                  </p>
                  <div className="flex items-center justify-between">
                    <pre className="code-area text-[0.78rem]">
                      <code>{`# Linux amd64
curl -L https://downloads.pulseboard.dev/pulse-agent-linux-amd64 -o /usr/local/bin/pulse-agent
chmod +x /usr/local/bin/pulse-agent`}</code>
                    </pre>
                    <CopyButton text={`# Linux amd64\ncurl -L https://downloads.pulseboard.dev/pulse-agent-linux-amd64 -o /usr/local/bin/pulse-agent\nchmod +x /usr/local/bin/pulse-agent`} />
                  </div>
                </div>
                <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--code-bg)] p-4">
                  <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-widest text-[color:var(--faint)]">
                    Configure
                  </p>
                  <div className="flex items-center justify-between">
                    <pre className="code-area text-[0.78rem]">
                      <code>{`# Create config directory
mkdir -p /etc/pulse-agent

# Create agent.json
cat > /etc/pulse-agent/agent.json << 'EOF'
{
  "api_url": "https://api.pulseboard.dev",
  "api_key": "YOUR_API_KEY",
  "name": "my-agent",
  "region": "us-east-1"
}
EOF`}</code>
                    </pre>
                    <CopyButton text={`# Create config directory\nmkdir -p /etc/pulse-agent\n\n# Create agent.json\ncat > /etc/pulse-agent/agent.json << 'EOF'\n{\n  "api_url": "https://api.pulseboard.dev",\n  "api_key": "YOUR_API_KEY",\n  "name": "my-agent",\n  "region": "us-east-1"\n}\nEOF`} />
                  </div>
                </div>
                <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--code-bg)] p-4">
                  <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-widest text-[color:var(--faint)]">
                    Run
                  </p>
                  <div className="flex items-center justify-between">
                    <pre className="code-area text-[0.78rem]">
                      <code>{`# Start the agent
pulse-agent run --config /etc/pulse-agent/agent.json`}</code>
                    </pre>
                    <CopyButton text="pulse-agent run --config /etc/pulse-agent/agent.json" />
                  </div>
                </div>
              </div>

              {/* Callout */}
              <div className="flex gap-3 rounded-lg border border-[color:rgba(59,130,246,0.2)] bg-[color:rgba(59,130,246,0.06)] p-4">
                <Shield className="h-5 w-5 flex-shrink-0 text-[color:#3b82f6]" />
                <div>
                  <p className="text-sm font-semibold text-[color:var(--text)]">
                    Minimum resources
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[color:var(--muted)]">
                    The agent uses approximately 30MB of RAM and less than 1% CPU at idle. It scales linearly with the number of monitors configured.
                  </p>
                </div>
              </div>
            </section>

            {/* Connect to Your Server */}
            <section id="connect" className="docs-section mb-16">
              <div className="mb-8">
                <div className="mb-3 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-[color:var(--primary)]" />
                  <span className="text-xs font-bold uppercase tracking-widest text-[color:var(--primary)]">
                    Connection
                  </span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-[color:var(--text)]">
                  Connect to Your Server
                </h2>
                <p className="mt-3 text-base leading-relaxed text-[color:var(--muted)]">
                  The enrollment process binds your agent to your workspace and provisions a unique API key. The token is single-use and expires after 24 hours.
                </p>
              </div>

              <div className="space-y-0">
                {[
                  {
                    num: 1,
                    title: "Create an agent in the dashboard",
                    content: (
                      <>
                        <p>
                          Navigate to <strong>Agents</strong> in the sidebar and click <strong>Create Agent</strong>. Give it a name and optional region.
                        </p>
                      </>
                    ),
                  },
                  {
                    num: 2,
                    title: "Generate an enrollment token",
                    content: (
                      <>
                        <p>
                          Click <strong>Enroll</strong> next to your new agent. The dashboard generates a short-lived, single-use enrollment token. Copy the install command shown in the modal.
                        </p>
                        <div className="mt-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--code-bg)] p-4">
                          <div className="flex items-center justify-between">
                            <pre className="code-area text-[0.78rem]">
                              <code>{`curl -fsSL https://install.pulseboard.dev | sh -s -- --token pb_enroll_xxxxxxxxxxxx`}</code>
                            </pre>
                            <CopyButton text="curl -fsSL https://install.pulseboard.dev | sh -s -- --token pb_enroll_xxxxxxxxxxxx" />
                          </div>
                        </div>
                      </>
                    ),
                  },
                  {
                    num: 3,
                    title: "Run the install command on your server",
                    content: (
                      <>
                        <p>
                          SSH into your server and paste the command. The agent binary downloads, enrolls with your workspace, and starts as a system service.
                        </p>
                        <div className="mt-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--code-bg)] p-4">
                          <div className="flex items-center justify-between">
                            <pre className="code-area text-[0.78rem]">
                              <code>{`$ curl -fsSL https://install.pulseboard.dev | sh -s -- --token pb_enroll_xxxxxxxxxxxx

Downloading pulse-agent v1.8.2...
Installing to /usr/local/bin/pulse-agent
Enrolling with workspace...
Agent enrolled successfully. API key saved to /etc/pulse-agent/credentials
Starting pulse-agent service...
Service started. Sending heartbeat every 30s.`}</code>
                            </pre>
                            <CopyButton text={`$ curl -fsSL https://install.pulseboard.dev | sh -s -- --token pb_enroll_xxxxxxxxxxxx\n\nDownloading pulse-agent v1.8.2...\nInstalling to /usr/local/bin/pulse-agent\nEnrolling with workspace...\nAgent enrolled successfully. API key saved to /etc/pulse-agent/credentials\nStarting pulse-agent service...\nService started. Sending heartbeat every 30s.`} />
                          </div>
                        </div>
                      </>
                    ),
                  },
                  {
                    num: 4,
                    title: "Verify the connection",
                    content: (
                      <>
                        <p>
                          Back in the dashboard, the agent status changes from <span className="chip chip-warning">Pending</span> to <span className="chip chip-success">Online</span> within a few seconds. You should see heartbeat data flowing.
                        </p>
                        <div className="mt-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--code-bg)] p-4">
                          <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-widest text-[color:var(--faint)]">
                            Verify from the command line
                          </p>
                          <div className="flex items-center justify-between">
                            <pre className="code-area text-[0.78rem]">
                              <code>{`# Check agent status
pulse-agent status

# View agent logs
pulse-agent logs --tail 50`}</code>
                            </pre>
                            <CopyButton text={`# Check agent status\npulse-agent status\n\n# View agent logs\npulse-agent logs --tail 50`} />
                          </div>
                        </div>
                      </>
                    ),
                  },
                ].map((step) => (
                  <div key={step.num} className="docs-step flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[color:var(--primary)] bg-[color:var(--primary)] text-xs font-bold text-[color:var(--cta-text)]">
                        {step.num}
                      </div>
                      {step.num < 4 && <div className="mt-2 w-px flex-1 bg-[color:var(--border)]" />}
                    </div>
                    <div className="pb-8">
                      <h3 className="text-base font-semibold text-[color:var(--text)]">
                        {step.title}
                      </h3>
                      <div className="mt-2 text-sm leading-relaxed text-[color:var(--muted)]">
                        {step.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Configuration Reference */}
            <section id="configuration" className="docs-section mb-16">
              <div className="mb-8">
                <div className="mb-3 flex items-center gap-2">
                  <Settings className="h-5 w-5 text-[color:var(--primary)]" />
                  <span className="text-xs font-bold uppercase tracking-widest text-[color:var(--primary)]">
                    Reference
                  </span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-[color:var(--text)]">
                  Configuration Reference
                </h2>
                <p className="mt-3 text-base leading-relaxed text-[color:var(--muted)]">
                  The agent reads configuration from environment variables or a JSON config file.
                  Environment variables take precedence over config file values.
                </p>
              </div>

              <h3 className="mb-3 text-sm font-semibold text-[color:var(--text)]">
                Environment variables
              </h3>
              <div className="mb-6 overflow-hidden rounded-lg border border-[color:var(--border)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[color:var(--border)] bg-[color:var(--card-soft)]">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-[color:var(--muted)]">
                        Variable
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-[color:var(--muted)]">
                        Required
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-[color:var(--muted)]">
                        Default
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-[color:var(--muted)]">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {envVars.map((v) => (
                      <tr
                        key={v.var}
                        className="border-b border-[color:var(--border)] last:border-0"
                      >
                        <td className="px-4 py-2.5 font-mono text-xs font-medium text-[color:var(--primary)]">
                          {v.var}
                        </td>
                        <td className="px-4 py-2.5">
                          {v.required ? (
                            <span className="chip chip-danger">Required</span>
                          ) : (
                            <span className="text-xs text-[color:var(--faint)]">Optional</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-[color:var(--muted)]">
                          {v.default}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-[color:var(--muted)]">
                          {v.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="mb-3 text-sm font-semibold text-[color:var(--text)]">
                Config file format
              </h3>
              <p className="mb-3 text-sm text-[color:var(--muted)]">
                The agent looks for <code className="rounded bg-[color:var(--bg-elevated)] px-1.5 py-0.5 text-xs font-mono">/etc/pulse-agent/agent.json</code> by default.
              </p>
              <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--code-bg)] p-4">
                <div className="flex items-center justify-between">
                  <pre className="code-area text-[0.78rem]">
                    <code>{`{
  "api_url": "https://api.pulseboard.dev",
  "api_key": "pb_agent_xxxxxxxxxxxxxxxx",
  "name": "production-api-agent",
  "region": "us-east-1",
  "heartbeat_interval": 30,
  "check_interval": 30,
  "log_level": "info",
  "tls_verify": true,
  "http_proxy": null
}`}</code>
                  </pre>
                  <CopyButton text={`{\n  "api_url": "https://api.pulseboard.dev",\n  "api_key": "pb_agent_xxxxxxxxxxxxxxxx",\n  "name": "production-api-agent",\n  "region": "us-east-1",\n  "heartbeat_interval": 30,\n  "check_interval": 30,\n  "log_level": "info",\n  "tls_verify": true,\n  "http_proxy": null\n}`} />
                </div>
              </div>
            </section>

            {/* Agent Settings */}
            <section id="agent-settings" className="docs-section mb-16">
              <div className="mb-8">
                <div className="mb-3 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-[color:var(--primary)]" />
                  <span className="text-xs font-bold uppercase tracking-widest text-[color:var(--primary)]">
                    Settings
                  </span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-[color:var(--text)]">
                  Agent Settings
                </h2>
                <p className="mt-3 text-base leading-relaxed text-[color:var(--muted)]">
                  Fine-tune how the agent operates on your infrastructure.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    title: "Heartbeat interval",
                    desc: "How often the agent pings the backend to confirm it is alive. Default: 30 seconds. Lower values give faster detection of agent failures but increase API traffic.",
                    code: `PULSE_HEARTBEAT_INTERVAL=15`,
                  },
                  {
                    title: "Check interval",
                    desc: "Default interval for monitor checks. Can be overridden per-monitor. Default: 30 seconds. Minimum: 10 seconds.",
                    code: `PULSE_CHECK_INTERVAL=30`,
                  },
                  {
                    title: "Log level",
                    desc: "Controls the verbosity of agent logs. Use debug for troubleshooting, info for production.",
                    code: `PULSE_LOG_LEVEL=info`,
                  },
                  {
                    title: "TLS verification",
                    desc: "Disable TLS certificate verification only for testing. Never disable in production.",
                    code: `PULSE_TLS_VERIFY=true`,
                  },
                  {
                    title: "HTTP proxy",
                    desc: "Route all outbound agent traffic through a proxy. Supports HTTP and SOCKS5 proxies.",
                    code: `PULSE_HTTP_PROXY=http://proxy.example.com:8080`,
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-5"
                  >
                    <h3 className="text-sm font-semibold text-[color:var(--text)]">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-[color:var(--muted)]">
                      {item.desc}
                    </p>
                    <div className="mt-3 rounded-md border border-[color:var(--border)] bg-[color:var(--code-bg)] p-3">
                      <div className="flex items-center justify-between">
                        <pre className="code-area text-[0.75rem]">
                          <code>{item.code}</code>
                        </pre>
                        <CopyButton text={item.code} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* API Reference */}
            <section id="api-reference" className="docs-section mb-16">
              <div className="mb-8">
                <div className="mb-3 flex items-center gap-2">
                  <Terminal className="h-5 w-5 text-[color:var(--primary)]" />
                  <span className="text-xs font-bold uppercase tracking-widest text-[color:var(--primary)]">
                    API
                  </span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-[color:var(--text)]">
                  API Reference
                </h2>
                <p className="mt-3 text-base leading-relaxed text-[color:var(--muted)]">
                  Key endpoints used by the agent and available for automation.
                </p>
              </div>

              <div className="space-y-3">
                {apiEndpoints.map((ep) => (
                  <div
                    key={ep.path}
                    className="flex items-start gap-3 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] p-4 transition-all hover:border-[color:var(--border-strong)]"
                  >
                    <MethodBadge method={ep.method} />
                    <div className="min-w-0 flex-1">
                      <code className="text-xs font-semibold text-[color:var(--text)]">
                        {ep.path}
                      </code>
                      <p className="mt-1 text-xs text-[color:var(--muted)]">
                        {ep.description}
                      </p>
                    </div>
                    <span className="flex-shrink-0 rounded bg-[color:var(--bg-elevated)] px-2 py-0.5 text-[0.65rem] font-medium text-[color:var(--faint)]">
                      {ep.auth}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-lg border border-[color:var(--border)] bg-[color:var(--card-soft)] p-4">
                <p className="text-xs font-semibold text-[color:var(--text)]">
                  Base URL
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="rounded bg-[color:var(--code-bg)] px-3 py-1.5 font-mono text-[0.78rem] text-[color:var(--nav-text)]">
                    https://api.pulseboard.dev/api/v1
                  </code>
                  <CopyButton text="https://api.pulseboard.dev/api/v1" />
                </div>
              </div>
            </section>

            {/* Footer nav */}
            <div className="flex items-center justify-between border-t border-[color:var(--border)] pt-6">
              <div />
              <Link
                href="/register"
                className="btn-primary inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm"
              >
                Get started free
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
