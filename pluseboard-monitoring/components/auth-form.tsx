"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";

type Mode = "login" | "register";

function AuthField({ label, type = "text", placeholder, value, onChange, error }: Readonly<{ label: string; type?: string; placeholder: string; value: string; onChange: (value: string) => void; error?: string }>) {
  return (
    <label className="grid gap-2 text-sm text-[color:var(--muted)]">
      {label}
      <input className="input-field" type={type} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
      {error ? <span className="text-xs text-red-300">{error}</span> : null}
    </label>
  );
}

export function AuthForm({ mode }: Readonly<{ mode: Mode }>) {
  const [values, setValues] = useState({ name: "", email: "", password: "", confirm: "", remember: true, terms: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isRegister = mode === "register";

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (isRegister && values.name.trim().length < 2) nextErrors.name = "Enter your full name.";
    if (!values.email.includes("@")) nextErrors.email = "Enter a valid email address.";
    if (values.password.length < 8) nextErrors.password = "Use at least 8 characters.";
    if (isRegister && values.password !== values.confirm) nextErrors.confirm = "Passwords do not match.";
    if (isRegister && !values.terms) nextErrors.terms = "Accept the terms to continue.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (validate()) {
      window.alert(isRegister ? "Account created. Verify your email to continue." : "Login submitted.");
    }
  }

  return (
    <form className="glass-panel space-y-5 rounded-[32px] p-6 md:p-8" onSubmit={submit}>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{isRegister ? "Create your PulseBoard account" : "Welcome back"}</h1>
        <p className="mt-2 text-sm text-[color:var(--muted)]">{isRegister ? "Start monitoring APIs in minutes." : "Sign in to keep your systems under watch."}</p>
      </div>

      {isRegister ? <AuthField label="Full Name" placeholder="Avery Chen" value={values.name} onChange={(name) => setValues((current) => ({ ...current, name }))} error={errors.name} /> : null}
      <AuthField label="Email" type="email" placeholder="you@company.com" value={values.email} onChange={(email) => setValues((current) => ({ ...current, email }))} error={errors.email} />
      <AuthField label="Password" type="password" placeholder="••••••••" value={values.password} onChange={(password) => setValues((current) => ({ ...current, password }))} error={errors.password} />
      {isRegister ? <AuthField label="Confirm Password" type="password" placeholder="••••••••" value={values.confirm} onChange={(confirm) => setValues((current) => ({ ...current, confirm }))} error={errors.confirm} /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <label className="flex items-center gap-2 text-[color:var(--muted)]">
          <input checked={values.remember} type="checkbox" onChange={(event) => setValues((current) => ({ ...current, remember: event.target.checked }))} />
          Remember me
        </label>
        {!isRegister ? <Link href="/forgot-password" className="nav-link">Forgot password?</Link> : null}
      </div>

      {isRegister ? (
        <label className="flex items-start gap-3 text-sm text-[color:var(--muted)]">
          <input checked={values.terms} type="checkbox" onChange={(event) => setValues((current) => ({ ...current, terms: event.target.checked }))} />
          <span>I accept the terms and privacy policy.</span>
        </label>
      ) : null}
      {errors.terms ? <p className="text-xs text-red-300">{errors.terms}</p> : null}

      <button className="btn btn-primary w-full" type="submit">{isRegister ? "Create Account" : "Login"}</button>

      <div className="grid gap-3 md:grid-cols-2">
        <button className="btn btn-secondary" type="button">Continue with Google</button>
        <button className="btn btn-secondary" type="button">Continue with GitHub</button>
      </div>

      <p className="text-center text-sm text-[color:var(--muted)]">
        {isRegister ? "Already have an account? " : "Need an account? "}
        <Link href={isRegister ? "/login" : "/register"} className="font-semibold text-white underline decoration-blue-500/70 underline-offset-4">
          {isRegister ? "Sign in" : "Create one"}
        </Link>
      </p>
    </form>
  );
}
