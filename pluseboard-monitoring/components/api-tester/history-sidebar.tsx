"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ChevronRight, FolderOpen, History, Play, Search, Trash2, X } from "lucide-react";
import type { APITest } from "@/lib/types";
import type { HistoryEntry } from "./workspace-types";
import { methodTone, relativeTime, shortURL, statusTone, timeGroup } from "./helpers";

type SidebarTab = "history" | "saved";

interface HistorySidebarProps {
  history: HistoryEntry[];
  activeId: string | null;
  onSelect: (entry: HistoryEntry) => void;
  authenticated: boolean;
  savedTests: APITest[];
  savedLoading: boolean;
  onLoadSaved: (test: APITest) => void;
  onDeleteSaved: (id: string) => void;
  onClearHistory: () => void;
  onCloseMobile: () => void;
}

export function HistorySidebar({
  history,
  activeId,
  onSelect,
  authenticated,
  savedTests,
  savedLoading,
  onLoadSaved,
  onDeleteSaved,
  onClearHistory,
  onCloseMobile,
}: Readonly<HistorySidebarProps>) {
  const [tab, setTab] = useState<SidebarTab>("history");
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = history.filter(
      (entry) =>
        !needle ||
        entry.method.toLowerCase().includes(needle) ||
        entry.url.toLowerCase().includes(needle) ||
        String(entry.status ?? "").includes(needle),
    );
    const result: Array<{ label: string; entries: HistoryEntry[] }> = [];
    for (const entry of filtered) {
      const label = timeGroup(entry.timestamp);
      const group = result.find((item) => item.label === label);
      if (group) group.entries.push(entry);
      else result.push({ label, entries: [entry] });
    }
    return result;
  }, [history, query]);

  return (
    <div className="flex h-full min-h-0 flex-col border-r border-[color:var(--border)] bg-[color:var(--bg)]">
      <div className="flex items-center justify-between gap-2 border-b border-[color:var(--border)] px-2 py-1.5">
        <div className="flex items-center gap-1 rounded-md bg-[color:var(--card-soft)] p-0.5">
          <SidebarTabButton label="History" icon={<History className="h-3.5 w-3.5" />} active={tab === "history"} onClick={() => setTab("history")} />
          <SidebarTabButton label="Saved" icon={<FolderOpen className="h-3.5 w-3.5" />} active={tab === "saved"} onClick={() => setTab("saved")} />
        </div>
        <button className="icon-btn lg:hidden" type="button" title="Close history" onClick={onCloseMobile}>
          <X className="h-4 w-4" />
        </button>
      </div>

      {tab === "history" ? (
        <>
          <div className="border-b border-[color:var(--border)] p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--faint)]" />
              <input
                className="input-field py-1.5! pl-8 font-mono text-[0.74rem]"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search history…"
                spellCheck={false}
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto thin-scroll">
            {history.length === 0 ? (
              <div className="kv-empty m-3 min-h-40">
                <History className="h-5 w-5" />
                <span>No requests yet. Send one to build history.</span>
              </div>
            ) : groups.length === 0 ? (
              <div className="kv-empty m-3 min-h-40">
                <Search className="h-5 w-5" />
                <span>No history matches “{query}”.</span>
              </div>
            ) : (
              <div className="space-y-3 p-2">
                {groups.map((group) => (
                  <div key={group.label}>
                    <p className="px-1.5 pb-1 text-[0.66rem] font-bold uppercase tracking-wider text-[color:var(--faint)]">{group.label}</p>
                    <div className="space-y-0.5">
                      {group.entries.map((entry) => {
                        const isActive = entry.id === activeId;
                        return (
                          <button
                            key={entry.id}
                            type="button"
                            aria-current={isActive ? "true" : undefined}
                            className={`group flex w-full items-center gap-2 rounded-md border px-1.5 py-1.5 text-left transition-colors ${
                              isActive
                                ? "border-[color:var(--primary)]/40 bg-[rgba(240,136,4,0.08)]"
                                : "border-transparent hover:border-[color:var(--border)] hover:bg-[color:var(--card-soft)]"
                            }`}
                            onClick={() => onSelect(entry)}
                            title={`${entry.method} ${entry.url}`}
                          >
                            <span className={`method-chip ${methodTone[entry.method]}`}>{entry.method}</span>
                            <span className="min-w-0 flex-1">
                              <span className={`block truncate font-mono text-[0.74rem] ${isActive ? "font-bold text-[color:var(--text)]" : "text-[color:var(--text)]"}`}>
                                {shortURL(entry.url) || entry.url}
                              </span>
                              <span className="mt-0.5 flex items-center gap-1.5 font-mono text-[0.66rem] text-[color:var(--faint)]">
                                {entry.status !== undefined ? (
                                  <>
                                    <span className={`font-bold ${statusTone(entry.status)}`}>{entry.status}</span>
                                    <span aria-hidden="true">·</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="font-bold text-[color:var(--danger)]">ERR</span>
                                    <span aria-hidden="true">·</span>
                                  </>
                                )}
                                {entry.duration_ms !== undefined ? <span>{Number(entry.duration_ms).toFixed(0)} ms</span> : null}
                                <span aria-hidden="true">·</span>
                                <span>{relativeTime(entry.timestamp)}</span>
                              </span>
                            </span>
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[color:var(--faint)] opacity-0 transition-opacity group-hover:opacity-100" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-[color:var(--border)] p-2">
            <button
              className="btn btn-ghost w-full justify-center text-sm text-[color:var(--danger)] hover:bg-[color:var(--danger)]/10"
              type="button"
              disabled={history.length === 0}
              onClick={onClearHistory}
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear history
            </button>
          </div>
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto thin-scroll p-2">
          {!authenticated ? (
            <div className="kv-empty m-1 min-h-44">
              <FolderOpen className="h-5 w-5" />
              <span>Sign in to save API tests and replay them later.</span>
              <div className="mt-2 grid w-full gap-2">
                <a href="/login" className="btn btn-primary w-full justify-center text-sm">Sign in</a>
                <a href="/register" className="btn btn-secondary w-full justify-center text-sm">Create account</a>
              </div>
            </div>
          ) : savedLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="skeleton h-14 rounded-md" />
              ))}
            </div>
          ) : savedTests.length === 0 ? (
            <div className="kv-empty m-1 min-h-44">
              <FolderOpen className="h-5 w-5" />
              <span>No saved tests yet. Run a request, then use Save in the toolbar.</span>
            </div>
          ) : (
            <div className="space-y-1">
              {savedTests.map((test) => (
                <div key={test.id} className="group rounded-md border border-transparent px-1.5 py-1.5 transition-colors hover:border-[color:var(--border)] hover:bg-[color:var(--card-soft)]">
                  <div className="flex items-center gap-2">
                    <span className={`method-chip ${methodTone[test.method]}`}>{test.method}</span>
                    <span className="min-w-0 flex-1 truncate font-mono text-[0.74rem] text-[color:var(--text)]">{test.name}</span>
                    <button className="icon-btn opacity-0 transition-opacity group-hover:opacity-100" type="button" title="Load" onClick={() => onLoadSaved(test)}>
                      <Play className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="icon-btn text-[color:var(--danger)] opacity-0 transition-opacity group-hover:opacity-100"
                      type="button"
                      title="Delete"
                      onClick={() => onDeleteSaved(test.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="mt-1 truncate pl-[calc(3.4rem+0.5rem)] font-mono text-[0.66rem] text-[color:var(--faint)]">{shortURL(test.url) || test.url}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SidebarTabButton({ label, icon, active, onClick }: Readonly<{ label: string; icon: ReactNode; active: boolean; onClick: () => void }>) {
  return (
    <button
      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[0.72rem] font-semibold transition-colors ${active ? "bg-[color:var(--card)] text-[color:var(--text)] shadow-sm" : "text-[color:var(--muted)] hover:text-[color:var(--text)]"}`}
      type="button"
      aria-pressed={active}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}