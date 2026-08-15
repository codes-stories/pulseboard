"use client";

import { Circle, Cookie, Plus, Trash2 } from "lucide-react";
import type { KVRow } from "./workspace-types";

interface CookieEditorProps {
  rows: KVRow[];
  onChange: (rows: KVRow[]) => void;
}

interface CookieRow extends KVRow {
  domain: string;
  path: string;
}

function newCookie(): CookieRow {
  return { id: Math.random().toString(36).slice(2, 10), enabled: true, key: "", value: "", domain: "", path: "" };
}

export function CookieEditor({ rows, onChange }: Readonly<CookieEditorProps>) {
  function asCookieRows(list: KVRow[]): CookieRow[] {
    return list.map((row) => ({
      id: row.id,
      enabled: row.enabled,
      key: row.key,
      value: row.value,
      domain: (row as CookieRow).domain ?? "",
      path: (row as CookieRow).path ?? "",
    }));
  }

  function updateRow(id: string, patch: Partial<CookieRow>) {
    const current = asCookieRows(rows);
    onChange(current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function removeRow(id: string) {
    const next = asCookieRows(rows).filter((row) => row.id !== id);
    if (next.length === 0) next.push(newCookie());
    onChange(next);
  }

  const cookieRows = asCookieRows(rows);

  if (cookieRows.length === 0) {
    return (
      <div className="kv-empty">
        <Cookie className="h-4 w-4" />
        <span>No cookies yet — add one below.</span>
        <button className="btn btn-secondary text-sm" type="button" onClick={() => onChange([newCookie()])}>
          <Plus className="h-3.5 w-3.5" /> Add cookie
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="cookie-row mb-1 grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_1.75rem] px-1 text-[0.68rem] font-bold uppercase tracking-wider text-[color:var(--faint)]">
        <span aria-hidden="true" />
        <span>Name</span>
        <span>Value</span>
        <span>Domain</span>
        <span>Path</span>
        <span aria-hidden="true" />
      </div>

      <div className="space-y-1">
        {cookieRows.map((row, index) => {
          const enabled = row.enabled && row.key.trim() !== "";
          return (
            <div key={row.id} className={`cookie-row rounded-md border px-1.5 py-1 transition-colors ${enabled ? "border-[color:var(--border)] bg-[color:var(--card)]" : "border-dashed border-[color:var(--border)] bg-transparent opacity-80"}`}>
              <button
                className={`icon-btn ${enabled ? "text-[#7c3aed]" : "text-[color:var(--faint)]"}`}
                type="button"
                title={row.enabled ? "Disable" : "Enable"}
                aria-pressed={row.enabled}
                onClick={() => updateRow(row.id, { enabled: !row.enabled })}
              >
                <Circle className={`h-3.5 w-3.5 ${enabled ? "fill-current" : ""}`} />
              </button>

              <input className="kv-input" value={row.key} placeholder="name" spellCheck={false} disabled={!row.enabled} onChange={(event) => updateRow(row.id, { key: event.target.value })} />
              <input className="kv-input kv-key" value={row.value} placeholder="value" spellCheck={false} disabled={!row.enabled} onChange={(event) => updateRow(row.id, { value: event.target.value })} />
              <input className="kv-input kv-key" value={row.domain} placeholder="example.com" spellCheck={false} disabled={!row.enabled} onChange={(event) => updateRow(row.id, { domain: event.target.value })} />
              <input
                className="kv-input kv-key"
                value={row.path}
                placeholder="/"
                spellCheck={false}
                disabled={!row.enabled}
                onChange={(event) => updateRow(row.id, { path: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && index === cookieRows.length - 1) onChange([...cookieRows, newCookie()]);
                }}
              />
              <button className="icon-btn text-[color:var(--danger)] hover:bg-[color:var(--danger)]/10" type="button" title="Remove" onClick={() => removeRow(row.id)}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-2 flex items-center gap-1.5 px-1 text-[0.7rem] text-[color:var(--faint)]">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#7c3aed]" aria-hidden="true" />
        Enabled cookies are sent as a single <span className="font-mono">Cookie</span> header (name=value). Domain and path are kept for reference only.
      </p>
    </div>
  );
}