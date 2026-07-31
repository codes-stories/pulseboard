import Link from "next/link";
import { aboutPoints, blogPosts, contactChannels, dashboardAlerts, dashboardMetrics, faqItems, featureHighlights, heroBullets, howItWorks, incidentTimeline, pricingPlans, testimonials, trustedBy, docsGuides } from "./pulseboard-data";
import { CardGrid, GlassCard, InlineChart, PageHero, SectionShell, StatCard } from "./pulseboard-ui";

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path d="M5 15 15 5M7 5h8v8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DashboardMockup() {
  return (
    <div className="relative overflow-hidden rounded-[32px] border border-[color:var(--border)] bg-[color:var(--card-solid)] p-4 shadow-2xl shadow-black/40">
      <div className="absolute right-8 top-8 h-36 w-36 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="absolute left-2 top-16 h-28 w-28 rounded-full bg-cyan-400/15 blur-3xl" />
      <div className="glass-panel relative rounded-[28px] p-5">
        <div className="flex items-center justify-between text-sm text-[color:var(--muted)]">
          <span>PulseBoard overview</span>
          <span>Last 24 hours</span>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <GlassCard className="bg-gradient-to-br from-blue-500/20 to-slate-950/5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-[color:var(--muted)]">Global uptime</p>
                <p className="mt-2 text-4xl font-semibold tracking-tight">99.98%</p>
              </div>
              <span className="chip chip-success">+0.12%</span>
            </div>
            <div className="mt-6 grid grid-cols-12 items-end gap-2">
              {[66, 70, 55, 76, 84, 78, 92, 95, 74, 82, 88, 96].map((height, index) => (
                <span key={index} className="rounded-full bg-gradient-to-t from-[color:var(--primary-strong)] to-[color:var(--primary)]" style={{ height: `${height}%` }} />
              ))}
            </div>
          </GlassCard>
          <GlassCard>
            <div className="flex items-center justify-between">
              <p className="text-sm text-[color:var(--muted)]">Live incidents</p>
              <span className="chip chip-warning">2 active</span>
            </div>
            <div className="mt-4 space-y-3">
              {dashboardAlerts.map((alert) => (
                <div key={alert.title} className="rounded-2xl border border-[color:var(--border)] px-4 py-3">
                  <p className="text-sm font-medium">{alert.title}</p>
                  <p className="mt-1 text-xs text-[color:var(--muted)]">{alert.time}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function ChartFrame({ title, value, bars }: Readonly<{ title: string; value: string; bars: number[] }>) {
  return <InlineChart title={title} value={value} rows={bars} />;
}

export function LandingPage() {
  return (
    <>
      <PageHero
        eyebrow="API-first uptime monitoring"
        title="Monitor APIs Before Your Customers Notice"
        copy="Fault-tolerant API monitoring powered by Erlang. Real-time alerts. Global monitoring. Beautiful public status pages."
        actions={
          <>
            <Link href="/register" className="btn btn-primary">Start Free <ArrowIcon /></Link>
            <Link href="/contact" className="btn btn-secondary">Book Demo</Link>
          </>
        }
        image={<DashboardMockup />}
      />

      <section className="section-shell pt-0">
        <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <GlassCard>
            <p className="section-kicker">Trusted by</p>
            <div className="mt-5 flex flex-wrap gap-3">
              {trustedBy.map((item) => (
                <span key={item} className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm text-[color:var(--muted)]">{item}</span>
              ))}
            </div>
          </GlassCard>
          <GlassCard>
            <p className="section-kicker">What teams get</p>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {heroBullets.map((bullet) => (
                <div key={bullet} className="rounded-2xl border border-[color:var(--border)] px-4 py-4 text-sm text-[color:var(--muted)]">{bullet}</div>
              ))}
            </div>
          </GlassCard>
        </div>
      </section>

      <SectionShell eyebrow="Platform" title="A monitoring stack that feels precise, calm, and credible." copy="Purpose-built surfaces for uptime, latency, incidents, and status pages." >
        <CardGrid>
          {featureHighlights.map((feature) => (
            <GlassCard key={feature.title}>
              <span className="chip chip-success">{feature.badge}</span>
              <h3 className="mt-5 text-2xl font-semibold tracking-tight">{feature.title}</h3>
              <p className="mt-3 text-[color:var(--muted)]">{feature.description}</p>
            </GlassCard>
          ))}
        </CardGrid>
      </SectionShell>

      <SectionShell eyebrow="How it works" title="Get signal from deployment to alerting in four steps." copy="A simple operational loop that stays fast when your backend is under stress.">
        <CardGrid columns={4}>
          {howItWorks.map((item) => (
            <GlassCard key={item.step}>
              <p className="section-kicker">{item.step}</p>
              <h3 className="mt-5 text-xl font-semibold tracking-tight">{item.title}</h3>
              <p className="mt-3 text-[color:var(--muted)]">{item.description}</p>
            </GlassCard>
          ))}
        </CardGrid>
      </SectionShell>

      <SectionShell eyebrow="Dashboard preview" title="Everything you need to understand service health at a glance." copy="Real-time charts, incident summaries, and a status timeline that stays readable in every mode.">
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartFrame title="Response Time" value="182ms" bars={[48, 53, 58, 60, 62, 55, 74, 80, 86, 74, 68, 78]} />
          <ChartFrame title="Uptime" value="99.97%" bars={[82, 84, 83, 91, 90, 94, 92, 93, 95, 97, 98, 99]} />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <GlassCard>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">Status timeline</h3>
              <span className="chip chip-warning">Investigating</span>
            </div>
            <div className="mt-5 space-y-4">
              {incidentTimeline.map((item) => (
                <div key={item.title} className="flex items-start gap-4 rounded-2xl border border-[color:var(--border)] px-4 py-3">
                  <span className="mt-1 h-3 w-3 rounded-full bg-[color:var(--primary)]" />
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-[color:var(--muted)]">{item.status} · {item.duration}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
          <GlassCard>
            <h3 className="text-xl font-semibold">Latest alerts</h3>
            <div className="mt-5 space-y-3">
              {dashboardAlerts.map((alert) => (
                <div key={alert.title} className="rounded-2xl border border-[color:var(--border)] px-4 py-3">
                  <p className="font-medium">{alert.title}</p>
                  <p className="text-sm text-[color:var(--muted)]">{alert.time}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </SectionShell>

      <SectionShell eyebrow="Testimonials" title="Teams want less noise and more confidence." align="center">
        <CardGrid>
          {testimonials.map((testimonial) => (
            <GlassCard key={testimonial.name}>
              <p className="text-lg leading-8 text-[color:var(--text)]">“{testimonial.quote}”</p>
              <div className="mt-6">
                <p className="font-semibold">{testimonial.name}</p>
                <p className="text-sm text-[color:var(--muted)]">{testimonial.role}</p>
              </div>
            </GlassCard>
          ))}
        </CardGrid>
      </SectionShell>

      <SectionShell eyebrow="Pricing preview" title="Simple pricing with a path to enterprise control." copy="Choose the tier that matches your monitoring footprint.">
        <CardGrid>
          {pricingPlans.map((plan) => (
            <GlassCard key={plan.name} className={plan.featured ? "border-blue-500/40" : ""}>
              {plan.featured ? <span className="chip chip-success">Most popular</span> : null}
              <h3 className="mt-5 text-2xl font-semibold">{plan.name}</h3>
              <p className="mt-2 text-sm text-[color:var(--muted)]">{plan.detail}</p>
              <p className="mt-6 text-4xl font-semibold tracking-tight">{plan.price}<span className="text-base text-[color:var(--muted)]">/month</span></p>
              <ul className="mt-6 space-y-3 text-sm text-[color:var(--muted)]">
                {plan.features.map((feature) => <li key={feature}>• {feature}</li>)}
              </ul>
            </GlassCard>
          ))}
        </CardGrid>
      </SectionShell>

      <SectionShell eyebrow="FAQ" title="A few questions teams usually ask before they switch.">
        <CardGrid>
          {faqItems.map((item) => (
            <GlassCard key={item.question}>
              <h3 className="text-xl font-semibold tracking-tight">{item.question}</h3>
              <p className="mt-3 text-[color:var(--muted)]">{item.answer}</p>
            </GlassCard>
          ))}
        </CardGrid>
      </SectionShell>

      <SectionShell eyebrow="Call to action" title="Keep watch with confidence." align="center">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 rounded-[32px] border border-[color:var(--border)] bg-gradient-to-br from-blue-500/20 via-transparent to-cyan-500/10 p-8 text-center">
          <p className="max-w-2xl text-[color:var(--muted)]">Start free, book a demo, or review the product docs. PulseBoard stays legible under pressure and polished in front of customers.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/register" className="btn btn-primary">Start Free <ArrowIcon /></Link>
            <Link href="/contact" className="btn btn-secondary">Book Demo</Link>
          </div>
        </div>
      </SectionShell>
    </>
  );
}

export function PricingPage() {
  return (
    <>
      <PageHero eyebrow="Pricing" title="Plans that scale with your monitoring surface." copy="Simple monthly pricing for teams that need dependable uptime signal." actions={<><Link href="/register" className="btn btn-primary">Start Free <ArrowIcon /></Link><Link href="/contact" className="btn btn-secondary">Talk to Sales</Link></>} image={<GlassCard><div className="grid gap-4 md:grid-cols-3">{pricingPlans.map((plan) => <div key={plan.name} className={`rounded-3xl border border-[color:var(--border)] p-5 bg-gradient-to-br ${plan.accent} ${plan.featured ? "ring-1 ring-blue-500/40" : ""}`}><h3 className="text-xl font-semibold">{plan.name}</h3><p className="mt-2 text-sm text-[color:var(--muted)]">{plan.detail}</p><p className="mt-5 text-4xl font-semibold">{plan.price}</p></div>)}</div></GlassCard>} />

      <SectionShell eyebrow="Plans" title="Built for teams at every stage.">
        <CardGrid>
          {pricingPlans.map((plan) => (
            <GlassCard key={plan.name} className={plan.featured ? "border-blue-500/40" : ""}>
              {plan.featured ? <span className="chip chip-success">Recommended</span> : null}
              <h3 className="mt-5 text-2xl font-semibold">{plan.name}</h3>
              <p className="mt-2 text-sm text-[color:var(--muted)]">{plan.detail}</p>
              <p className="mt-6 text-4xl font-semibold tracking-tight">{plan.price}<span className="text-base text-[color:var(--muted)]">/month</span></p>
              <ul className="mt-6 space-y-3 text-sm text-[color:var(--muted)]">
                {plan.features.map((feature) => <li key={feature}>• {feature}</li>)}
              </ul>
            </GlassCard>
          ))}
        </CardGrid>
      </SectionShell>

      <SectionShell eyebrow="Comparison" title="Feature coverage stays strong as you scale.">
        <GlassCard className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[color:var(--muted)]">
              <tr>
                <th className="py-3 pr-6">Capability</th>
                <th className="py-3 pr-6">Starter</th>
                <th className="py-3 pr-6">Growth</th>
                <th className="py-3 pr-6">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Monitors", "10", "50", "Unlimited"],
                ["Regions", "2", "5", "Dedicated"],
                ["Alert channels", "Email", "Slack, Discord, webhooks", "All + SSO"],
                ["Status pages", "Basic", "Custom domain", "White-label"],
              ].map((row) => (
                <tr key={row[0]} className="border-t border-[color:var(--border)]">
                  {row.map((cell) => <td key={cell} className="py-4 pr-6 text-[color:var(--muted)]">{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      </SectionShell>

      <SectionShell eyebrow="FAQ" title="Pricing questions, answered.">
        <CardGrid>
          {faqItems.map((item) => (
            <GlassCard key={item.question}>
              <h3 className="text-xl font-semibold tracking-tight">{item.question}</h3>
              <p className="mt-3 text-[color:var(--muted)]">{item.answer}</p>
            </GlassCard>
          ))}
        </CardGrid>
      </SectionShell>
    </>
  );
}

export function FeaturesPage() {
  return (
    <>
      <PageHero eyebrow="Features" title="Everything PulseBoard does, explained clearly." copy="High-signal feature surfaces for monitoring, analytics, alerts, and status pages." actions={<><Link href="/register" className="btn btn-primary">Start Free <ArrowIcon /></Link><Link href="/docs" className="btn btn-secondary">Read Docs</Link></>} image={<GlassCard><div className="grid gap-4 md:grid-cols-2">{dashboardMetrics.map((metric) => <StatCard key={metric.label} {...metric} />)}</div></GlassCard>} />

      <SectionShell eyebrow="Feature grid" title="The product is designed to stay usable under pressure.">
        <CardGrid>
          {featureHighlights.map((feature) => (
            <GlassCard key={feature.title}>
              <span className="chip chip-success">{feature.badge}</span>
              <h3 className="mt-5 text-2xl font-semibold tracking-tight">{feature.title}</h3>
              <p className="mt-3 text-[color:var(--muted)]">{feature.description}</p>
            </GlassCard>
          ))}
        </CardGrid>
      </SectionShell>

      <SectionShell eyebrow="Screenshots" title="Visual surfaces for every operational task." copy="The dashboard, status pages, and docs all follow the same premium visual language.">
        <div className="grid gap-4 lg:grid-cols-2">
          <GlassCard className="min-h-[280px]" />
          <GlassCard className="min-h-[280px]" />
        </div>
      </SectionShell>
    </>
  );
}

export function DocsPage() {
  return (
    <>
      <PageHero eyebrow="Documentation" title="Documentation designed like a product, not a file tree." copy="Search, browse, and launch with confidence from a docs homepage that feels modern and organized." actions={<><Link href="/docs#guides" className="btn btn-primary">Popular guides <ArrowIcon /></Link><Link href="/docs#api" className="btn btn-secondary">API reference</Link></>} image={<GlassCard><div className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--bg-elevated)] p-4"><div className="flex items-center gap-3 rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm text-[color:var(--muted)]">Search docs</div><div className="mt-4 grid gap-3 md:grid-cols-2"><div className="rounded-2xl border border-[color:var(--border)] p-4"><p className="text-sm text-[color:var(--muted)]">Popular guides</p><div className="mt-3 space-y-2 text-sm">{docsGuides.slice(0, 3).map((guide) => <div key={guide}>{guide}</div>)}</div></div><div className="rounded-2xl border border-[color:var(--border)] p-4"><p className="text-sm text-[color:var(--muted)]">SDKs</p><p className="mt-3 text-sm text-[color:var(--muted)]">TypeScript, Go, and Erlang client stubs.</p></div></div></div></GlassCard>} />

      <SectionShell eyebrow="Popular guides" title="Find the right path quickly." copy="Common entry points for teams launching PulseBoard.">
        <CardGrid>
          {docsGuides.map((guide) => (
            <GlassCard key={guide}>
              <h3 className="text-xl font-semibold tracking-tight">{guide}</h3>
              <p className="mt-3 text-[color:var(--muted)]">Step-by-step guidance for setting up and operating the product.</p>
            </GlassCard>
          ))}
        </CardGrid>
      </SectionShell>

      <SectionShell eyebrow="API reference" title="Everything exposed cleanly for automation.">
        <GlassCard>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["POST /monitors", "Create monitors from your own workflows."],
              ["GET /alerts", "Query alert history and routing state."],
              ["POST /status-pages", "Publish branded public status pages."],
            ].map((item) => (
              <div key={item[0]} className="rounded-3xl border border-[color:var(--border)] p-5">
                <p className="font-mono text-sm text-blue-300">{item[0]}</p>
                <p className="mt-3 text-sm text-[color:var(--muted)]">{item[1]}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </SectionShell>
    </>
  );
}

export function BlogPage() {
  return (
    <>
      <PageHero eyebrow="Blog" title="Product thinking, engineering notes, and monitoring patterns." copy="A blog listing with a featured story, categories, search, and newsletter prompt." actions={<><Link href="/blog#featured" className="btn btn-primary">Featured article <ArrowIcon /></Link><Link href="/contact" className="btn btn-secondary">Subscribe</Link></>} image={<GlassCard><div className="h-72 rounded-[24px] border border-[color:var(--border)] bg-gradient-to-br from-blue-500/20 to-transparent p-5"><p className="section-kicker">Featured article</p><h3 className="mt-5 text-3xl font-semibold tracking-tight">How to design an alert system people actually trust</h3><p className="mt-4 text-[color:var(--muted)]">A practical breakdown of signal quality, routing, escalation, and the line between useful and noisy.</p></div></GlassCard>} />

      <SectionShell eyebrow="Categories" title="A focused reading list.">
        <div className="flex flex-wrap gap-3">
          {['Product', 'Engineering', 'Architecture', 'UX', 'Reliability'].map((item) => <span key={item} className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm text-[color:var(--muted)]">{item}</span>)}
        </div>
      </SectionShell>

      <SectionShell eyebrow="Featured reading" title="Recent writing from the PulseBoard team.">
        <CardGrid>
          {blogPosts.map((post) => (
            <GlassCard key={post.title}>
              <p className="text-sm text-[color:var(--muted)]">{post.category} · {post.time}</p>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight">{post.title}</h3>
            </GlassCard>
          ))}
        </CardGrid>
      </SectionShell>

      <SectionShell eyebrow="Newsletter" title="Get the next post by email.">
        <GlassCard className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <label className="grid gap-2 text-sm text-[color:var(--muted)]">
            Email address
            <input className="input-field" type="email" placeholder="you@company.com" />
          </label>
          <button className="btn btn-primary" type="button">Subscribe</button>
        </GlassCard>
      </SectionShell>
    </>
  );
}

export function AboutPage() {
  return (
    <>
      <PageHero eyebrow="About" title="Built to make uptime feel legible and trustworthy." copy="Mission, vision, architecture, and the rationale behind Erlang-based agents." actions={<><Link href="/contact" className="btn btn-primary">Talk to us <ArrowIcon /></Link><Link href="/docs" className="btn btn-secondary">Read more</Link></>} image={<GlassCard><div className="space-y-4">{aboutPoints.map((point) => <div key={point} className="rounded-2xl border border-[color:var(--border)] px-4 py-4 text-sm text-[color:var(--muted)]">{point}</div>)}</div></GlassCard>} />

      <SectionShell eyebrow="Mission" title="Reduce uncertainty for teams that ship critical APIs.">
        <GlassCard>
          <p className="max-w-3xl text-lg leading-8 text-[color:var(--muted)]">We design PulseBoard as an opinionated monitoring platform that keeps operators informed without making the interface feel busy or fragile.</p>
        </GlassCard>
      </SectionShell>

      <SectionShell eyebrow="Why Erlang" title="A distributed agent model that is comfortable under pressure.">
        <CardGrid>
          {[
            ["Fault tolerance", "Agents stay resilient when network conditions are uneven."],
            ["Distributed state", "Heartbeats and regional checks can be aggregated without a single point of failure."],
            ["Operational clarity", "The platform is built to surface steady, reliable signal rather than chatter."],
          ].map((item) => (
            <GlassCard key={item[0]}>
              <h3 className="text-xl font-semibold">{item[0]}</h3>
              <p className="mt-3 text-[color:var(--muted)]">{item[1]}</p>
            </GlassCard>
          ))}
        </CardGrid>
      </SectionShell>
    </>
  );
}

export function ContactPage() {
  return (
    <>
      <PageHero eyebrow="Contact" title="Talk to the team building PulseBoard." copy="A premium contact surface with email, Discord, and GitHub references plus a clear form." actions={<><Link href="mailto:hello@pulseboard.dev" className="btn btn-primary">Email us <ArrowIcon /></Link><Link href="https://github.com" className="btn btn-secondary">GitHub</Link></>} image={<GlassCard><div className="space-y-3">{contactChannels.map((channel) => <div key={channel} className="rounded-2xl border border-[color:var(--border)] px-4 py-4 text-sm text-[color:var(--muted)]">{channel}</div>)}</div></GlassCard>} />

      <SectionShell eyebrow="Message us" title="Send a note and we’ll route it to the right team.">
        <GlassCard>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-[color:var(--muted)]">Name<input className="input-field" placeholder="Your name" /></label>
            <label className="grid gap-2 text-sm text-[color:var(--muted)]">Email<input className="input-field" type="email" placeholder="you@company.com" /></label>
          </div>
          <label className="mt-4 grid gap-2 text-sm text-[color:var(--muted)]">Message<textarea className="textarea-field min-h-40" placeholder="How can we help?" /></label>
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="btn btn-primary" type="button">Send message</button>
            <Link href="mailto:hello@pulseboard.dev" className="btn btn-secondary">hello@pulseboard.dev</Link>
          </div>
        </GlassCard>
      </SectionShell>
    </>
  );
}

export function VerifyEmailPage() {
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-2xl items-center px-4 py-16">
      <GlassCard className="w-full text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-3xl text-emerald-300">✓</div>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight">Email verified</h1>
        <p className="mt-3 text-[color:var(--muted)]">Your account is ready. You can now continue to the dashboard.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard" className="btn btn-primary">Go to dashboard</Link>
          <Link href="/login" className="btn btn-secondary">Back to login</Link>
        </div>
      </GlassCard>
    </div>
  );
}

export function ForgotPasswordPage() {
  return (
    <PageHero eyebrow="Reset password" title="Send a reset link to your inbox." copy="A simple, beautiful recovery form with one field and a clear call to action." actions={<><Link href="/login" className="btn btn-secondary">Back to login</Link><Link href="mailto:hello@pulseboard.dev" className="btn btn-primary">Need help? <ArrowIcon /></Link></>} image={<GlassCard><label className="grid gap-2 text-sm text-[color:var(--muted)]">Email<input className="input-field mt-1" type="email" placeholder="you@company.com" /></label><button className="btn btn-primary mt-4 w-full" type="button">Send reset link</button></GlassCard>} />
  );
}
