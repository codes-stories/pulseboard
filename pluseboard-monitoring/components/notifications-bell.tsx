"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Check, CheckCheck, X } from "lucide-react";
import type { Notification } from "@/lib/types";

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    title: "Agent connected",
    message: "production-api agent came online",
    type: "success",
    read: false,
    created_at: new Date(Date.now() - 120_000).toISOString(),
  },
  {
    id: "2",
    title: "High latency alert",
    message: "API response time exceeded 500ms threshold",
    type: "warning",
    read: false,
    created_at: new Date(Date.now() - 3_600_000).toISOString(),
  },
  {
    id: "3",
    title: "Agent disconnected",
    message: "staging-worker agent went offline",
    type: "error",
    read: true,
    created_at: new Date(Date.now() - 86_400_000).toISOString(),
  },
];

function relativeTime(value: string): string {
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const typeStyles: Record<string, string> = {
  success: "border-l-4 border-[color:var(--success)] bg-[color:rgba(21,128,61,0.06)]",
  warning: "border-l-4 border-[color:#d97706] bg-[color:rgba(217,119,6,0.06)]",
  error: "border-l-4 border-[color:var(--danger)] bg-[color:rgba(220,38,38,0.06)]",
  info: "border-l-4 border-[color:#3b82f6] bg-[color:rgba(59,130,246,0.06)]",
};

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  function dismiss(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        className="relative flex h-8 w-8 items-center justify-center rounded border border-[color:var(--nav-border)] text-[color:var(--nav-muted)] transition-colors hover:text-[color:var(--nav-text)]"
        type="button"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--danger)] text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="animate-scale-in absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] shadow-xl">
          <div className="flex items-center justify-between border-b border-[color:var(--border)] px-3 py-2">
            <h3 className="text-sm font-bold text-[color:var(--text)]">Notifications</h3>
            {unreadCount > 0 ? (
              <button
                className="flex items-center gap-1 text-xs font-medium text-[color:var(--primary)] hover:underline"
                type="button"
                onClick={markAllRead}
              >
                <CheckCheck className="h-3 w-3" /> Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-[color:var(--muted)]">No notifications</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-2.5 border-b border-[color:var(--border)] px-3 py-2.5 transition-colors hover:bg-[color:var(--card-soft)] ${n.read ? "opacity-60" : ""} ${typeStyles[n.type] ?? typeStyles.info}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[color:var(--text)]">{n.title}</p>
                    <p className="mt-0.5 text-xs text-[color:var(--muted)]">{n.message}</p>
                    <p className="mt-1 text-[10px] text-[color:var(--faint)]">{relativeTime(n.created_at)}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {!n.read ? (
                      <button
                        className="rounded p-0.5 text-[color:var(--muted)] hover:text-[color:var(--primary)]"
                        type="button"
                        title="Mark as read"
                        onClick={() => markRead(n.id)}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                    <button
                      className="rounded p-0.5 text-[color:var(--faint)] hover:text-[color:var(--danger)]"
                      type="button"
                      title="Dismiss"
                      onClick={() => dismiss(n.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
