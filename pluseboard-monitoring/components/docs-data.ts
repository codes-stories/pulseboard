export interface DocsSection {
  id: string;
  title: string;
  sidebarLabel: string;
}

export const docsSections: DocsSection[] = [
  { id: "quickstart", title: "Quickstart", sidebarLabel: "Quickstart" },
  { id: "install", title: "Install the Agent", sidebarLabel: "Install Agent" },
  { id: "connect", title: "Connect to Your Server", sidebarLabel: "Connect" },
  { id: "configuration", title: "Configuration Reference", sidebarLabel: "Configuration" },
  { id: "agent-settings", title: "Agent Settings", sidebarLabel: "Agent Settings" },
  { id: "api-reference", title: "API Reference", sidebarLabel: "API Reference" },
];

export const systemRequirements = [
  { os: "Linux", arch: "amd64, arm64", notes: "Ubuntu 20.04+, Debian 11+, CentOS 8+, Alpine 3.14+" },
  { os: "macOS", arch: "amd64 (Intel), arm64 (Apple Silicon)", notes: "macOS 12 Monterey or later" },
  { os: "FreeBSD", arch: "amd64", notes: "FreeBSD 13+" },
];

export const envVars = [
  { var: "PULSE_API_URL", required: false, default: "https://api.pulseboard.dev", description: "Backend API URL. Override for self-hosted instances." },
  { var: "PULSE_API_KEY", required: true, default: "—", description: "Agent API key. Assigned during enrollment." },
  { var: "PULSE_AGENT_NAME", required: false, default: "hostname", description: "Display name for this agent in the dashboard." },
  { var: "PULSE_LOG_LEVEL", required: false, default: "info", description: "Log verbosity: debug, info, warning, error." },
  { var: "PULSE_HEARTBEAT_INTERVAL", required: false, default: "30", description: "Heartbeat interval in seconds." },
  { var: "PULSE_CHECK_INTERVAL", required: false, default: "30", description: "Default monitor check interval in seconds." },
  { var: "PULSE_REGION", required: false, default: "auto", description: "Region identifier for multi-region deployments." },
  { var: "PULSE_TLS_VERIFY", required: false, default: "true", description: "Verify TLS certificates on outbound requests." },
  { var: "PULSE_HTTP_PROXY", required: false, default: "—", description: "HTTP proxy URL for environments behind a proxy." },
];

export const apiEndpoints = [
  { method: "POST", path: "/api/v1/agent/enroll", description: "Enroll an agent using a single-use token. Returns the agent API key.", auth: "Enrollment token" },
  { method: "POST", path: "/api/v1/agent/heartbeat", description: "Send a heartbeat from the agent to confirm it is alive.", auth: "API key" },
  { method: "POST", path: "/api/v1/agent/logs", description: "Ingest a log entry from the agent into the backend database.", auth: "API key" },
  { method: "GET", path: "/api/v1/backend/metrics", description: "Retrieve the Go backend's runtime metrics (goroutines, memory, DB pool).", auth: "API key" },
  { method: "POST", path: "/api/v1/agent/system-metrics", description: "Report scraped system metrics from the Go backend.", auth: "API key" },
  { method: "POST", path: "/api/v1/agent/check-results", description: "Submit check results (status code, latency, pass/fail).", auth: "API key" },
  { method: "GET", path: "/api/v1/agents/{agentID}/logs", description: "List stored agent logs with cursor-based pagination.", auth: "JWT" },
  { method: "GET", path: "/api/v1/agents/{agentID}/system-metrics", description: "List system metrics for an agent.", auth: "JWT" },
];
