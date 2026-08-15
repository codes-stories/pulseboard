"use client";

import { Circle, Plus, Trash2 } from "lucide-react";
import type { KVRow } from "./workspace-types";

interface KeyValueTableProps {
  rows: KVRow[];
  onChange: (rows: KVRow[]) => void;
  accent?: "path" | "query" | "headers" | "cookies";
  autocomplete?: string[];
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

const accentTone: Record<string, string> = {
  path: "text-[#d97706]",
  query: "text-[#0d9488]",
  headers: "text-[#2563eb]",
  cookies: "text-[#7c3aed]",
};

const accentStrip: Record<string, string> = {
  path: "bg-[#d97706]",
  query: "bg-[#0d9488]",
  headers: "bg-[#2563eb]",
  cookies: "bg-[#7c3aed]",
};

export function KeyValueTable({
  rows,
  onChange,
  accent = "headers",
  autocomplete,
  keyPlaceholder = "Key",
  valuePlaceholder = "Value",
}: Readonly<KeyValueTableProps>) {
  function updateRow(id: string, patch: Partial<KVRow>) {
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function removeRow(id: string) {
    const next = rows.filter((row) => row.id !== id);
    if (next.length === 0) next.push(emptyRow());
    onChange(next);
  }

  function addRow() {
    onChange([...rows, emptyRow()]);
  }

  if (rows.length === 0) {
    return (
      <div className="kv-empty">
        <Plus className="h-4 w-4" />
        <span>No entries yet — add one below.</span>
        <button className="btn btn-secondary text-sm" type="button" onClick={addRow}>
          Add {accent}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-1 grid grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1fr)_1.75rem] gap-2 px-1 text-[0.68rem] font-bold uppercase tracking-wider text-[color:var(--faint)]">
        <span aria-hidden="true" />
        <span>Key</span>
        <span>Value</span>
        <span aria-hidden="true" />
      </div>

      <div className="space-y-1">
        {rows.map((row, index) => {
          const enabled = row.enabled && row.key.trim() !== "";
          return (
            <div key={row.id} className={`kv-row rounded-md border px-1.5 py-1 transition-colors ${enabled ? "border-[color:var(--border)] bg-[color:var(--card)]" : "border-dashed border-[color:var(--border)] bg-transparent opacity-80"}`}>
              <button
                className={`icon-btn ${enabled ? accentTone[accent] : "text-[color:var(--faint)]"}`}
                type="button"
                title={row.enabled ? "Disable" : "Enable"}
                aria-pressed={row.enabled}
                onClick={() => updateRow(row.id, { enabled: !row.enabled })}
              >
                <Circle className={`h-3.5 w-3.5 ${enabled ? "fill-current" : ""}`} />
              </button>

              <input
                className={`kv-input ${accent === "cookies" ? "kv-key" : ""}`}
                list={autocomplete ? `autocomplete-${accent}` : undefined}
                value={row.key}
                placeholder={keyPlaceholder}
                spellCheck={false}
                disabled={!row.enabled}
                onChange={(event) => updateRow(row.id, { key: event.target.value })}
              />

              <input
                className="kv-input kv-key"
                value={row.value}
                placeholder={valuePlaceholder}
                spellCheck={false}
                disabled={!row.enabled}
                onChange={(event) => updateRow(row.id, { value: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && index === rows.length - 1) addRow();
                }}
              />

              <button
                className="icon-btn text-[color:var(--danger)] hover:bg-[color:var(--danger)]/10"
                type="button"
                title="Remove"
                onClick={() => removeRow(row.id)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      {rows.some((row) => !row.enabled) ? (
        <p className="mt-2 flex items-center gap-1.5 px-1 text-[0.7rem] text-[color:var(--faint)]">
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${accentStrip[accent]}`} aria-hidden="true" />
          Disabled entries are excluded from the request.
        </p>
      ) : null}

      {autocomplete ? (
        <datalist id={`autocomplete-${accent}`}>
          {autocomplete.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      ) : null}
    </div>
  );
}

function emptyRow(): KVRow {
  return { id: Math.random().toString(36).slice(2, 10), enabled: true, key: "", value: "" };
}