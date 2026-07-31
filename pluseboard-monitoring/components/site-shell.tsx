"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ThemeToggle } from "../design-system/theme/theme-toggle";
import { navLinks } from "./pulseboard-data";

function MenuIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4">
      <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const activeLabel = useMemo(() => navLinks.find((link) => link.href === pathname)?.label ?? "", [pathname]);

  return (
    <header className="page-shell sticky top-0 z-50 pt-4">
      <div className="glass-panel flex items-center justify-between rounded-full px-4 py-3 shadow-2xl shadow-black/20 md:px-6">
        <Link href="/" className="flex items-center gap-3 font-semibold tracking-tight">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[color:var(--primary)] to-[color:var(--primary-strong)] text-white shadow-lg shadow-blue-500/30">
            PB
          </span>
          <span>
            PulseBoard
            <span className="ml-2 text-xs font-medium text-[color:var(--muted)]">{activeLabel}</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-2 lg:flex" aria-label="Primary navigation">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={`rounded-full px-4 py-2 text-sm font-medium ${pathname === link.href ? "bg-white/8 text-white" : "text-[color:var(--muted)]"}`}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className="btn btn-secondary hidden md:inline-flex">Login</Link>
          <Link href="/register" className="btn btn-primary hidden md:inline-flex">Start Free <ChevronIcon /></Link>
          <button
            className="btn btn-secondary inline-flex lg:hidden"
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((value) => !value)}
          >
            {mobileOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="mt-3 rounded-[28px] border border-[color:var(--border)] bg-[color:var(--card-solid)] p-4 shadow-2xl shadow-black/30 lg:hidden">
          <div className="grid gap-2">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className="rounded-2xl border border-transparent px-4 py-3 text-sm font-medium text-[color:var(--muted)] hover:border-[color:var(--border)] hover:bg-white/5 hover:text-white">
                {link.label}
              </Link>
            ))}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link href="/login" onClick={() => setMobileOpen(false)} className="btn btn-secondary">Login</Link>
              <Link href="/register" onClick={() => setMobileOpen(false)} className="btn btn-primary">Start Free</Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="page-shell pb-10 pt-4 md:pb-12">
      <div className="flex flex-col gap-6 border-t border-[color:var(--border)] py-8 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-[color:var(--muted)]">© {new Date().getFullYear()} PulseBoard. Monitoring that feels trustworthy.</p>
        <div className="flex flex-wrap gap-5 text-sm text-[color:var(--muted)]">
          <Link href="/docs" className="nav-link">Documentation</Link>
          <Link href="/pricing" className="nav-link">Pricing</Link>
          <Link href="/status" className="nav-link">Status</Link>
          <Link href="/blog" className="nav-link">Blog</Link>
          <Link href="/contact" className="nav-link">Privacy</Link>
          <Link href="/contact" className="nav-link">Terms</Link>
          <a href="https://github.com" target="_blank" rel="noreferrer" className="nav-link">GitHub</a>
        </div>
      </div>
    </footer>
  );
}

export function AppFrame({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="app-frame">{children}</div>;
}
