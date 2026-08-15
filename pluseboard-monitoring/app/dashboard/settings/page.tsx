"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import { GlassCard } from "@/components/pulseboard-ui";

function message(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "Something went wrong. Please try again.";
}

function PlaceholderCard({ title, copy, children }: Readonly<{ title: string; copy: string; children?: React.ReactNode }>) {
  return (
    <GlassCard>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 text-[color:var(--muted)]">{copy}</p>
      <div className="mt-6">{children ?? <div className="rounded-md border border-[color:var(--border)] px-4 py-4 text-sm text-[color:var(--muted)]">Section form placeholder</div>}</div>
    </GlassCard>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const profileQuery = useQuery({ queryKey: ["profile"], queryFn: api.getProfile });

  const updateMutation = useMutation({
    mutationFn: (payload: { name: string; phone: string; avatar_url: string }) =>
      api.updateProfile({
        name: payload.name.trim() || undefined,
        phone: payload.phone.trim() || undefined,
        avatar_url: payload.avatar_url.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated");
    },
    onError: (error) => toast.error(message(error)),
  });

  const profile = profileQuery.data;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GlassCard>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-3 text-[color:var(--muted)]">Manage name, email, and avatar.</p>

        {profileQuery.isLoading ? (
          <div className="skeleton mt-6 h-48 rounded-md" />
        ) : profileQuery.isError ? (
          <p className="mt-6 text-sm text-[color:var(--danger)]">{message(profileQuery.error)}</p>
        ) : profile ? (
          <form
            className="mt-6 grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              updateMutation.mutate({
                name: String(form.get("name") ?? ""),
                phone: String(form.get("phone") ?? ""),
                avatar_url: String(form.get("avatar_url") ?? ""),
              });
            }}
          >
            <label className="grid gap-2 text-sm text-[color:var(--muted)]">
              Email
              <input className="input-field" defaultValue={profile.email} disabled readOnly />
            </label>
            <label className="grid gap-2 text-sm text-[color:var(--muted)]">
              Full name
              <input className="input-field" name="name" defaultValue={profile.name} required />
            </label>
            <label className="grid gap-2 text-sm text-[color:var(--muted)]">
              Phone
              <input className="input-field" name="phone" defaultValue={profile.phone ?? ""} placeholder="+1 555 000 1234" />
            </label>
            <label className="grid gap-2 text-sm text-[color:var(--muted)]">
              Avatar URL
              <input className="input-field" name="avatar_url" defaultValue={profile.avatar_url ?? ""} placeholder="https://…/avatar.png" />
            </label>
            <span className={`chip w-fit ${profile.email_verified ? "chip-success" : "chip-warning"}`}>{profile.email_verified ? "Email verified" : "Email not verified"}</span>
            <button className="btn btn-primary w-fit" type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving…" : "Save changes"}
            </button>
          </form>
        ) : null}
      </GlassCard>

      <PlaceholderCard title="Password" copy="Rotate credentials and enforce security." />

      <PlaceholderCard title="Notifications" copy="Tune alert channels and thresholds." />

      <PlaceholderCard title="Billing" copy="Review plan and usage." />

      <GlassCard>
        <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
        <p className="mt-3 text-[color:var(--muted)]">Generate and revoke keys for your agents.</p>
        <div className="mt-6">
          <Link href="/dashboard/agents" className="btn btn-secondary">Manage agent API keys</Link>
        </div>
      </GlassCard>

      <PlaceholderCard title="Danger Zone" copy="Close workspace or delete resources." />
    </div>
  );
}