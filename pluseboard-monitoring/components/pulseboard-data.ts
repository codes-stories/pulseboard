export const navLinks = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: "/docs" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export const trustedBy = ["Nordship", "ForgeStack", "Cinder", "Arcadia", "Northstar", "AstraPay"];

export const heroBullets = [
  "Fault-tolerant API monitoring powered by Erlang",
  "Real-time alerts across Slack, Discord, email, and webhooks",
  "Global checks with beautiful public status pages",
];

export const featureHighlights = [
  { title: "Global Monitoring", description: "Run checks from multiple regions and catch latency regressions before customers do.", badge: "Worldwide" },
  { title: "30 Second Checks", description: "Track critical endpoints on a tight interval with resilient retries and smart alerting.", badge: "Fast checks" },
  { title: "Real-time Alerts", description: "Escalate through the channels your team already uses without noisy false positives.", badge: "Instant" },
  { title: "Public Status Pages", description: "Publish incident history, uptime, and component health in a polished branded page.", badge: "Trust" },
  { title: "API-first Monitoring", description: "Automate monitor creation, alert routing, and team workflows from your API layer.", badge: "Automation" },
  { title: "Distributed Erlang Agents", description: "Deploy lightweight agents close to your workloads for reliable heartbeats and checks.", badge: "Erlang" },
];

export const howItWorks = [
  { step: "01", title: "Connect API", description: "Create monitors manually or sync them from your own deployment workflows." },
  { step: "02", title: "Deploy Agent", description: "Install a regional Erlang agent to collect latency, health, and heartbeat data." },
  { step: "03", title: "Monitor", description: "Observe uptime, response time, status history, and incident timelines in one place." },
  { step: "04", title: "Get Alerts", description: "Escalate instantly when checks fail or response time drifts beyond the threshold." },
];

export const testimonials = [
  { quote: "PulseBoard replaced three tools for us. The alert signal is cleaner, the status page is sharper, and the dashboard feels executive-ready.", name: "Maya Chen", role: "VP Engineering, Nordship" },
  { quote: "We needed uptime monitoring that felt credible enough for customers and technical enough for our team. PulseBoard nails both.", name: "Jordan Lee", role: "Platform Lead, ForgeStack" },
  { quote: "The Erlang agent model gives us confidence in regions where our infrastructure has to stay boring and invisible.", name: "Aisha Patel", role: "SRE Manager, Cinder" },
];

export const pricingPlans = [
  { name: "Starter", price: "$19", detail: "For small teams shipping critical APIs.", features: ["10 monitors", "2 regions", "Email alerts", "Basic status page"], accent: "from-blue-500/20 to-cyan-500/20" },
  { name: "Growth", price: "$49", detail: "For teams running multiple services.", features: ["50 monitors", "5 regions", "Slack, Discord, webhooks", "Custom domains"], accent: "from-sky-500/25 to-indigo-500/25", featured: true },
  { name: "Enterprise", price: "Custom", detail: "For regulated organizations and global platforms.", features: ["Unlimited monitors", "SLA support", "Dedicated regions", "SSO and audit logs"], accent: "from-cyan-500/20 to-emerald-500/20" },
];

export const faqItems = [
  { question: "How fast are checks?", answer: "Checks run as frequently as every 30 seconds, with retries and region-aware routing for reliability." },
  { question: "Can I use my own API?", answer: "Yes. PulseBoard is API-first and supports creating monitors, alerts, and teams programmatically." },
  { question: "Do you support status pages?", answer: "Public status pages, custom branding, and custom domains are included in the product design." },
  { question: "What channels are supported for alerts?", answer: "Email, Slack, Discord, and webhooks are all represented in the product flows." },
];

export const docsGuides = ["Quickstart", "Install the Erlang agent", "Create your first monitor", "Configure alerts", "Publish a status page", "API reference"];

export const blogPosts = [
  { title: "What good uptime monitoring actually looks like", category: "Product", time: "7 min read" },
  { title: "Designing alert workflows teams trust", category: "Engineering", time: "5 min read" },
  { title: "Why distributed agents still matter", category: "Architecture", time: "8 min read" },
  { title: "Making incident history readable", category: "UX", time: "4 min read" },
];

export const aboutPoints = [
  "We build for operators who need confidence more than noise.",
  "We believe monitoring should be API-first, visual, and boring in the best way.",
  "We design every surface to help teams move faster when things break.",
];

export const contactChannels = ["hello@pulseboard.dev", "discord.gg/pulseboard", "github.com/pulseboard"];

export const dashboardMetrics = [
  { label: "Total Monitors", value: "128", delta: "+12" },
  { label: "Healthy", value: "124", delta: "+3" },
  { label: "Down", value: "4", delta: "-1" },
  { label: "Avg Latency", value: "182ms", delta: "-24ms" },
];

export const dashboardMonitors = [
  { name: "API Gateway", url: "api.pulseboard.dev", interval: "30s", latency: "42ms", region: "us-east-1", status: "Operational" },
  { name: "Billing API", url: "billing.pulseboard.dev", interval: "30s", latency: "88ms", region: "eu-west-1", status: "Degraded" },
  { name: "Public Site", url: "pulseboard.dev", interval: "60s", latency: "24ms", region: "global", status: "Operational" },
  { name: "Webhook Worker", url: "hooks.pulseboard.dev", interval: "30s", latency: "—", region: "ap-south-1", status: "Down" },
];

export const dashboardAgents = [
  { hostname: "agent-nyc-01", version: "1.8.2", lastHeartbeat: "12s ago", region: "us-east-1", status: "Healthy" },
  { hostname: "agent-fra-02", version: "1.8.2", lastHeartbeat: "21s ago", region: "eu-central-1", status: "Healthy" },
  { hostname: "agent-sg-01", version: "1.8.1", lastHeartbeat: "2m ago", region: "ap-southeast-1", status: "Lagging" },
];

export const dashboardAlerts = [
  { title: "Billing API latency above threshold", time: "2m ago", severity: "warning" },
  { title: "Webhook Worker missed heartbeat", time: "14m ago", severity: "danger" },
  { title: "Public Site recovered", time: "32m ago", severity: "success" },
];

export const incidentTimeline = [
  { title: "Investigating elevated response times", status: "Investigating", duration: "18m" },
  { title: "Resolved: Checkout API timeout spike", status: "Resolved", duration: "41m" },
  { title: "Monitoring: Intermittent regional checks", status: "Monitoring", duration: "2h 14m" },
];

export const statusPages = [
  { name: "Core API", url: "status.pulseboard.dev/core", domain: "status.pulseboard.dev", branding: "Blue steel" },
  { name: "Public Platform", url: "status.pulseboard.dev/public", domain: "status.pulseboard.dev", branding: "Midnight" },
];

export const analyticsPanels = [
  { label: "Response Time", value: "182ms", change: "-12%" },
  { label: "Availability", value: "99.97%", change: "+0.03%" },
  { label: "Downtime", value: "8m", change: "-5m" },
  { label: "Top Slow Endpoint", value: "/v1/billing", change: "241ms" },
];
