"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="page-shell flex min-h-[70vh] items-center justify-center py-20 text-center">
      <div className="glass-panel max-w-xl rounded-lg p-10">
        <p className="section-kicker">Error</p>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight">Something interrupted the render.</h1>
        <p className="mt-4 text-[color:var(--muted)]">Try again or return to a safe page.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button className="btn btn-primary" onClick={reset} type="button">Retry</button>
          <Link href="/" className="btn btn-secondary">Home</Link>
        </div>
      </div>
    </div>
  );
}
