import { ThemeToggle } from "../design-system/theme/theme-toggle";

const ArrowUpRight = () => (
  <svg aria-hidden="true" viewBox="0 0 20 20" fill="none">
    <path d="M5 15 15 5M7 5h8v8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PulseMark = () => (
  <svg aria-hidden="true" viewBox="0 0 28 28" fill="none">
    <path d="M3 15h5l2.5-7 5 13 2.5-6H25" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function Home() {
  return (
    <main className="landing-shell">
      <nav className="site-nav" aria-label="Main navigation">
        <a className="brand" href="#top" aria-label="Pulseboard home">
          <span className="brand-mark"><PulseMark /></span>
          <span>pulseboard</span>
        </a>
        <div className="nav-actions">
          <a className="nav-link" href="#features">Platform</a>
          <a className="nav-link" href="#how-it-works">How it works</a>
          <ThemeToggle />
          <a className="button button-small button-primary" href="#get-started">Get started <ArrowUpRight /></a>
        </div>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span className="live-dot" /> Infrastructure, in focus</p>
          <h1>Know your systems are <em>alive.</em></h1>
          <p className="hero-description">Pulseboard gives your team one calm, dependable view of every service, endpoint, and heartbeat that matters.</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#get-started">Start monitoring <ArrowUpRight /></a>
            <a className="button button-secondary" href="#dashboard">Explore the dashboard</a>
          </div>
          <div className="trust-row"><span>Built for teams that run</span><strong>critical services</strong><span className="trust-line" /></div>
        </div>

        <div className="dashboard-preview" id="dashboard" aria-label="Pulseboard monitoring dashboard preview">
          <div className="preview-topbar"><span className="preview-title">Overview</span><span className="preview-date">Last 24 hours <span className="chevron">⌄</span></span></div>
          <div className="preview-content">
            <div className="uptime-card">
              <div><p>Global uptime</p><strong>99.98<span>%</span></strong></div>
              <div className="uptime-meta"><span className="positive">↑ 0.12%</span><small>vs previous period</small></div>
              <div className="bars" aria-hidden="true">{Array.from({ length: 31 }).map((_, index) => <i key={index} className={index === 8 || index === 21 ? "bar-soft" : ""} />)}</div>
            </div>
            <div className="monitor-list">
              <div className="monitor-heading"><span>Monitors</span><span>Response time</span><span>Status</span></div>
              {[
                ["API Gateway", "42 ms", "Operational"],
                ["Customer portal", "118 ms", "Operational"],
                ["Billing worker", "—", "Investigating"],
                ["EU database", "24 ms", "Operational"],
              ].map(([name, time, status]) => <div className="monitor-row" key={name}><span className="monitor-name"><i className={status === "Operational" ? "status-dot" : "status-dot warning"} />{name}</span><span>{time}</span><span className={status === "Operational" ? "status-text" : "status-text warning-text"}>{status}</span></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="feature-strip" id="features">
        <article><span className="feature-number">01</span><h2>Watch every signal</h2><p>HTTP checks, heartbeats, and service health in one clear operational picture.</p></article>
        <article><span className="feature-number">02</span><h2>Act before impact</h2><p>Spot slowdowns and failed checks early, with the context your team needs to respond.</p></article>
        <article><span className="feature-number">03</span><h2>Share confidence</h2><p>Turn real-time health into a simple, honest status your whole organization can trust.</p></article>
      </section>

      <section className="closing" id="how-it-works">
        <p className="eyebrow">Clarity is a feature</p>
        <h2>A quieter way to keep watch.</h2>
        <a className="button button-primary" id="get-started" href="mailto:hello@pulseboard.dev">Build with Pulseboard <ArrowUpRight /></a>
      </section>

      <footer><span>© {new Date().getFullYear()} Pulseboard</span><span>Always listening. Never noisy.</span></footer>
    </main>
  );
}
