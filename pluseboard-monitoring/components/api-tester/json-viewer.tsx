"use client";

import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";

type JSONPrimitive = string | number | boolean | null;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function typeOf(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (isObject(value)) return "object";
  return typeof value;
}

export interface ExpansionSignal {
  key: number;
  mode: "expanded" | "collapsed";
}

function hasMatch(value: unknown, search: string, key?: string): boolean {
  const needle = search.toLowerCase();
  if (key && key.toLowerCase().includes(needle)) return true;
  if (typeof value === "string") return value.toLowerCase().includes(needle);
  if (typeof value === "number" || typeof value === "boolean") return String(value).toLowerCase().includes(needle);
  if (value === null) return needle === "null";
  if (isObject(value)) return Object.entries(value).some(([childKey, child]) => hasMatch(child, needle, childKey));
  if (Array.isArray(value)) return value.some((child) => hasMatch(child, needle));
  return false;
}

interface JSONNodeProps {
  value: unknown;
  depth: number;
  search: string;
  openDefault: boolean;
}

function JSONNode({ value, depth, search, openDefault }: Readonly<JSONNodeProps>) {
  const isContainer = isObject(value) || Array.isArray(value);
  const [open, setOpen] = useState(openDefault);

  const matched = useMemo(() => !search || hasMatch(value, search), [value, search]);

  if (search && !matched) return null;

  if (!isContainer) {
    return (
      <div className="whitespace-pre-wrap break-all" style={{ paddingLeft: depth * 16 }}>
        <PrimitiveValue value={value as JSONPrimitive} search={search} />
      </div>
    );
  }

  const entries = Array.isArray(value) ? value.map((child, index) => [String(index), child] as const) : Object.entries(value);
  const kindLabel = Array.isArray(value) ? "items" : "keys";
  const isOpen = open || (search ? matched : false);

  return (
    <div>
      <div className="flex items-start" style={{ paddingLeft: depth * 16 }}>
        <button
          className="mt-[3px] inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          type="button"
          aria-expanded={isOpen}
          title={isOpen ? "Collapse" : "Expand"}
          onClick={() => setOpen((current) => !current)}
        >
          <ChevronRight className={`h-3 w-3 transition-transform ${isOpen ? "rotate-90" : ""}`} />
        </button>
        <span className="text-slate-400">{Array.isArray(value) ? "[" : "{"}</span>
        {isOpen ? null : (
          <span className="text-slate-400">
            {" … "}
            <span className="text-slate-500">{entries.length} {kindLabel}</span> {Array.isArray(value) ? "]" : "}"}
          </span>
        )}
      </div>

      {isOpen ? (
        <div>
          {entries.map(([key, child]) => (
            <div key={key}>
              <div className="whitespace-pre-wrap break-all" style={{ paddingLeft: (depth + 1) * 16 }}>
                {isObject(value) ? (
                  <>
                    <SearchText text={JSON.stringify(key)} search={search} className="text-amber-300" />
                    <span className="text-slate-400">: </span>
                  </>
                ) : null}
                {isObject(child) || Array.isArray(child) ? (
                  <JSONNode value={child} depth={0} search={search} openDefault={openDefault} />
                ) : (
                  <PrimitiveValue value={child as JSONPrimitive} search={search} />
                )}
              </div>
            </div>
          ))}
          <div className="text-slate-400" style={{ paddingLeft: depth * 16 }}>
            {Array.isArray(value) ? "]" : "}"}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SearchText({ text, search, className }: Readonly<{ text: string; search: string; className?: string }>) {
  if (!search) return <span className={className}>{text}</span>;
  const needle = search.toLowerCase();
  const lower = text.toLowerCase();
  const start = lower.indexOf(needle);
  if (start < 0) return <span className={className}>{text}</span>;
  return (
    <span className={className}>
      {text.slice(0, start)}
      <mark className="rounded-sm bg-yellow-400/25 px-0.5 text-yellow-100">{text.slice(start, start + needle.length)}</mark>
      {text.slice(start + needle.length)}
    </span>
  );
}

function PrimitiveValue({ value, search }: Readonly<{ value: JSONPrimitive; search: string }>) {
  const kind = typeOf(value);
  if (kind === "string") {
    return <SearchText text={JSON.stringify(value)} search={search} className="text-emerald-300" />;
  }
  if (kind === "number") {
    return <SearchText text={String(value)} search={search} className="text-sky-300" />;
  }
  if (kind === "boolean") {
    return <SearchText text={String(value)} search={search} className="text-violet-300" />;
  }
  return <SearchText text="null" search={search} className="text-violet-300 italic" />;
}

function countMatches(value: unknown, search: string, key?: string): number {
  if (!search) return 0;
  const needle = search.toLowerCase();
  let count = 0;
  if (key && key.toLowerCase().includes(needle)) count += 1;
  if (typeof value === "string" && value.toLowerCase().includes(needle)) count += 1;
  if ((typeof value === "number" || typeof value === "boolean") && String(value).toLowerCase().includes(needle)) count += 1;
  if (value === null && needle === "null") count += 1;
  if (isObject(value)) {
    for (const [childKey, child] of Object.entries(value)) {
      count += countMatches(child, needle, childKey);
    }
  } else if (Array.isArray(value)) {
    for (const child of value) {
      count += countMatches(child, needle);
    }
  }
  return count;
}

interface JSONViewerProps {
  value: unknown;
  search?: string;
  expansion?: ExpansionSignal | null;
}

export function JSONViewer({ value, search = "", expansion = null }: Readonly<JSONViewerProps>) {
  const matchCount = useMemo(() => countMatches(value, search), [value, search]);

  return (
    <div className="code-area thin-scroll overflow-auto px-3 py-3">
      {isObject(value) || Array.isArray(value) ? (
        <JSONNode
          key={expansion ? expansion.key : "default"}
          value={value}
          depth={0}
          search={search}
          openDefault={expansion ? expansion.mode === "expanded" : true}
        />
      ) : (
        <PrimitiveValue value={value as JSONPrimitive} search={search} />
      )}
      {search ? (
        <p className="mt-2 border-t border-white/10 pt-2 text-[0.68rem] text-slate-500">
          {matchCount > 0 ? `${matchCount} match${matchCount === 1 ? "" : "es"}` : "No matches found"}
        </p>
      ) : null}
    </div>
  );
}