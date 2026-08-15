import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-shell flex min-h-[70vh] items-center justify-center py-20 text-center">
      <div className="glass-panel max-w-xl rounded-lg p-10">
        <p className="section-kicker">404</p>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight">This page drifted out of orbit.</h1>
        <p className="mt-4 text-[color:var(--muted)]">Return to the dashboard or go back to the landing page.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn btn-primary">Home</Link>
          <Link href="/dashboard" className="btn btn-secondary">Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
