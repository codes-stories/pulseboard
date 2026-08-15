"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ThemeToggle } from "../design-system/theme/theme-toggle";
import { useAuth } from "./auth-provider";
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

function SmileSwoosh() {
  return (
    <svg width="86" height="9" viewBox="0 0 86 9" fill="none" aria-hidden="true" className="block">
      <path
        d="M2 6.2C9 2.2 16 1.8 23 3.4c6 1.4 12 1.6 18 .4s12-1.4 18-.4c6 1 11 1.2 15.6-.6"
        stroke="#f08804"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Wordmark() {
  return (
    <Link href="/" className="flex flex-col justify-center leading-none" aria-label="PulseBoard home">
      <span className="text-lg font-bold tracking-tight text-[color:var(--nav-text)]">PulseBoard</span>
      <SmileSwoosh />
    </Link>
  );
}

function AuthCluster({ mobile = false }: Readonly<{ mobile?: boolean }>) {
  const { user, status, logout } = useAuth();
  const authenticated = status === "authenticated";

  if (mobile) {
    return (
      <div className="grid gap-2 border-t border-[color:var(--nav-border)] pt-3">
        {authenticated && user ? (
          <>
            <p className="px-2 text-sm text-[color:var(--nav-muted)]">Hello, {user.name.split(" ")[0]}</p>
            <Link href="/dashboard" className="btn btn-primary w-full justify-center">Dashboard</Link>
            <button className="btn btn-secondary w-full justify-center" type="button" onClick={() => void logout()}>Logout</button>
          </>
        ) : (
          <>
            <Link href="/login" className="btn btn-secondary w-full justify-center">Sign in</Link>
            <Link href="/register" className="btn btn-primary w-full justify-center">Start free</Link>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="hidden items-center gap-3 md:flex">
      {authenticated && user ? (
        <>
          <Link
            href="/dashboard"
            className="group flex flex-col rounded border border-transparent px-2 py-1 leading-tight hover:border-[color:var(--nav-border)]"
          >
            <span className="text-xs text-[color:var(--nav-muted)]">Hello, {user.name.split(" ")[0]}</span>
            <span className="text-sm font-bold text-[color:var(--nav-text)]">Dashboard</span>
          </Link>
          <button className="btn btn-ghost text-[color:var(--nav-muted)] hover:text-[color:var(--nav-text)]" type="button" onClick={() => void logout()}>Logout</button>
        </>
      ) : (
        <>
          <Link
            href="/login"
            className="group flex flex-col rounded border border-transparent px-2 py-1 leading-tight hover:border-[color:var(--nav-border)]"
          >
            <span className="text-xs text-[color:var(--nav-muted)]">Hello, sign in</span>
            <span className="text-sm font-bold text-[color:var(--nav-text)]">Accounts &amp; Lists</span>
          </Link>
          <Link href="/register" className="btn btn-primary hidden lg:inline-flex">Start free</Link>
        </>
      )}
    </div>
  );
}

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const activeLabel = useMemo(() => navLinks.find((link) => link.href === pathname)?.label ?? "", [pathname]);

  return (
    <header className="nav-top sticky top-0 z-50">
      <div className="page-shell flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Wordmark />
          <span className="hidden rounded border border-[color:var(--nav-border)] px-2 py-1 text-xs font-medium text-[color:var(--nav-muted)] lg:block">
            {activeLabel || "Monitoring"}
          </span>
        </div>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
              className="nav-link-top"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <AuthCluster />
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded border border-[color:var(--nav-border)] text-[color:var(--nav-text)] lg:hidden"
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
        <div className="page-shell pb-4 lg:hidden">
          <div className="nav-top grid gap-1 rounded-md border border-[color:var(--nav-border)] bg-[color:var(--nav-bar)] p-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={pathname === link.href ? "page" : undefined}
                onClick={() => setMobileOpen(false)}
                className="nav-link-top"
              >
                {link.label}
              </Link>
            ))}
            <AuthCluster mobile />
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="nav-top mt-8">
      <div className="page-shell flex flex-col gap-6 py-10 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-lg font-bold tracking-tight text-[color:var(--nav-text)]">PulseBoard</p>
          <p className="mt-2 max-w-xs text-sm text-[color:var(--nav-muted)]">Monitoring that feels trustworthy. © {new Date().getFullYear()} PulseBoard.</p>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-[color:var(--nav-muted)]">
          <Link href="/docs" className="hover:text-[color:var(--nav-text)]">Documentation</Link>
          <Link href="/pricing" className="hover:text-[color:var(--nav-text)]">Pricing</Link>
          <Link href="/status" className="hover:text-[color:var(--nav-text)]">Status</Link>
          <Link href="/blog" className="hover:text-[color:var(--nav-text)]">Blog</Link>
          <Link href="/contact" className="hover:text-[color:var(--nav-text)]">Privacy</Link>
          <Link href="/contact" className="hover:text-[color:var(--nav-text)]">Terms</Link>
          <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-[color:var(--nav-text)]">GitHub</a>
        </div>
      </div>
    </footer>
  );
}

export function AppFrame({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="app-frame">{children}</div>;
}