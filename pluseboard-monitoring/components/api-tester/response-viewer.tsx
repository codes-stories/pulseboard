"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Braces, Check, ChevronsDownUp, ChevronsUpDown, Copy, Eraser, Eye, Radio, Search, Wand2 } from "lucide-react";
import type { HTTPMethod, ProxyResponse } from "@/lib/types";
import { SEND_SHORTCUT, byteLength, formatBytes, formatClock, isJSON, methodTone, prettyJSON, shortURL, statusTone } from "./helpers";
import { type ExpansionSignal, JSONViewer } from "./json-viewer";

type ResponseTab = "body" | "headers" | "cookies" | "raw" | "preview";

function looksLikeHTML(body: string): boolean {
  const trimmed = body.trimStart();
  if (!trimmed) return false;
  return /<!doctype\s+html/i.test(trimmed) || /<html[\s>]/i.test(trimmed) || /<(?:h1|div|p|table|ul|ol|li|a|img|form|head|body|meta|title)\b/i.test(trimmed);
}

interface ResponseViewerProps {
  response: ProxyResponse | null;
  sending: boolean;
  requestMethod: HTTPMethod;
  requestURL: string;
  receivedAt: number | null;
  tab: ResponseTab;
  onTabChange: (tab: ResponseTab) => void;
}

function useCopy(): [string, (text: string, label: string) => void] {
  const [copiedKey, setCopiedKey] = useState("");
  useEffect(() => {
    if (!copiedKey) return;
    const timer = window.setTimeout(() => setCopiedKey(""), 1400);
    return () => window.clearTimeout(timer);
  }, [copiedKey]);

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopiedKey(label);
        toast.success("Copied to clipboard");
      },
      () => toast.error("Failed to copy"),
    );
  }

  return [copiedKey, copy];
}

function CopyButton({ copied, onCopy }: Readonly<{ copied: boolean; onCopy: () => void }>) {
  return (
    <button className="icon-btn" type="button" title={copied ? "Copied" : "Copy"} onClick={onCopy}>
      {copied ? <Check className="h-4 w-4 text-[color:var(--success)]" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

export function ResponseViewer({ response, sending, requestMethod, requestURL, receivedAt, tab, onTabChange }: Readonly<ResponseViewerProps>) {
  const [search, setSearch] = useState("");
  const [expansion, setExpansion] = useState<ExpansionSignal | null>(null);
  const [copiedKey, copy] = useCopy();
  const [prettyRaw, setPrettyRaw] = useState(true);

  const json = useMemo(() => (response ? isJSON(response.body) : false), [response]);
  const size = useMemo(() => (response ? byteLength(response.body) : 0), [response]);
  const setCookies = useMemo(() => {
    if (!response) return [];
    const raw = Object.entries(response.headers).find(([key]) => key.toLowerCase() === "set-cookie")?.[1] ?? "";
    if (!raw) return [];
    return raw.split(",").map((part) => part.trim()).filter(Boolean);
  }, [response]);

  if (sending) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-[color:var(--bg)]">
        <div className="workspace-panel-header">
          <p className="font-mono text-[0.72rem] font-bold uppercase tracking-wider text-[color:var(--faint)]">Response</p>
          <span className="flex items-center gap-1.5 text-[0.72rem] text-[color:var(--muted)]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[color:var(--primary)]" />
            Sending request…
          </span>
        </div>
        <div className="space-y-2.5 p-3">
          {Array.from({ length: 7 }, (_, index) => (
            <div key={index} className="skeleton h-3.5 rounded" style={{ width: `${92 - index * 9}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-[color:var(--bg)]">
        <div className="workspace-panel-header">
          <p className="font-mono text-[0.72rem] font-bold uppercase tracking-wider text-[color:var(--faint)]">Response</p>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:var(--card-soft)]">
            <Radio className="h-5 w-5 text-[color:var(--faint)]" />
          </div>
          <div>
            <p className="text-sm font-bold">No response yet</p>
            <p className="mt-1 max-w-60 text-[0.8rem] text-[color:var(--muted)]">
              Configure your request on the left and press <span className="kbd">{SEND_SHORTCUT}</span> to see the response here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const tone = statusTone(response.status);
  const headerCount = Object.keys(response.headers).length;
  const cookieCount = setCookies.length;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[color:var(--bg)]">
      <div className={`h-0.5 shrink-0 ${tone} bg-current`} />

      <div className="workspace-panel-header">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex items-baseline gap-1.5">
            <span className={`font-mono text-2xl font-bold leading-none ${tone}`}>{response.status}</span>
            <span className="font-mono text-[0.8rem] text-[color:var(--muted)]">{response.status_text}</span>
          </div>
          <span className="hidden h-4 w-px bg-[color:var(--border)] sm:block" />
          <div className="hidden min-w-0 items-center gap-2 sm:flex">
            <span className={`method-chip ${methodTone[requestMethod]}`}>{requestMethod}</span>
            <span className="truncate font-mono text-[0.72rem] text-[color:var(--muted)]">{shortURL(requestURL)}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 font-mono text-[0.7rem] text-[color:var(--faint)]">
          <span>{Number(response.duration_ms).toFixed(0)} ms</span>
          <span>{formatBytes(size)}</span>
          <span>{receivedAt ? formatClock(receivedAt) : "—"}</span>
        </div>
      </div>

      <div className="workspace-tabs" role="tablist" aria-label="Response view">
        <Tab label="Body" active={tab === "body"} onClick={() => onTabChange("body")} />
        <Sep />
        <Tab label="Headers" count={headerCount} active={tab === "headers"} onClick={() => onTabChange("headers")} />
        <Sep />
        <Tab label="Cookies" count={cookieCount} active={tab === "cookies"} onClick={() => onTabChange("cookies")} />
        <Sep />
        <Tab label="Raw" active={tab === "raw"} onClick={() => onTabChange("raw")} />
        <Sep />
        <Tab label="Preview" active={tab === "preview"} onClick={() => onTabChange("preview")} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto thin-scroll">
        {tab === "body" ? (
          json ? (
            <div className="flex h-full flex-col">
              <div className="flex items-center gap-1.5 border-b border-[color:var(--border)] bg-[color:var(--card-soft)] p-1.5">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--faint)]" />
                  <input
                    className="input-field py-1.5! pl-8 font-mono text-[0.74rem]"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search in response…"
                    spellCheck={false}
                  />
                </div>
                <button className="icon-btn" type="button" title="Expand all" onClick={() => setExpansion({ key: Date.now(), mode: "expanded" })}>
                  <ChevronsUpDown className="h-4 w-4" />
                </button>
                <button className="icon-btn" type="button" title="Collapse all" onClick={() => setExpansion({ key: Date.now(), mode: "collapsed" })}>
                  <ChevronsDownUp className="h-4 w-4" />
                </button>
                <CopyButton copied={copiedKey === "body"} onCopy={() => copy(response.body, "body")} />
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                <JSONViewer value={JSON.parse(response.body)} search={search} expansion={expansion} />
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between gap-2 border-b border-[color:var(--border)] bg-[color:var(--card-soft)] p-1.5">
                <p className="px-1 font-mono text-[0.68rem] font-bold uppercase tracking-wider text-[color:var(--faint)]">Text body</p>
                <CopyButton copied={copiedKey === "body"} onCopy={() => copy(response.body, "body")} />
              </div>
              <pre className="code-area min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-all px-4 py-3">
                {response.body || "(empty body)"}
              </pre>
            </div>
          )
        ) : null}

        {tab === "raw" ? (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-2 border-b border-[color:var(--border)] bg-[color:var(--card-soft)] p-1.5">
              <p className="px-1 font-mono text-[0.68rem] font-bold uppercase tracking-wider text-[color:var(--faint)]">Raw response</p>
              <div className="flex items-center gap-1">
                {json ? (
                  <button
                    className="btn btn-ghost text-sm"
                    type="button"
                    title={prettyRaw ? "Show raw bytes" : "Prettify JSON"}
                    onClick={() => setPrettyRaw((value) => !value)}
                  >
                    {prettyRaw ? <Eraser className="h-3.5 w-3.5" /> : <Wand2 className="h-3.5 w-3.5" />}
                    {prettyRaw ? "Raw" : "Pretty"}
                  </button>
                ) : null}
                <CopyButton copied={copiedKey === "raw"} onCopy={() => copy(response.body, "raw")} />
              </div>
            </div>
            <pre className="code-area min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-all px-4 py-3">
              {json && prettyRaw ? prettyJSON(response.body) : response.body || "(empty body)"}
            </pre>
          </div>
        ) : null}

        {tab === "headers" ? (
          <table className="w-full border-collapse">
            <tbody>
              {Object.entries(response.headers).map(([key, value]) => (
                <tr key={key} className="border-b border-[color:var(--border)] last:border-0">
                  <td className="w-1/3 px-3 py-2 align-top font-mono text-[0.74rem] font-semibold text-[color:var(--muted)]">{key}</td>
                  <td className="px-3 py-2 font-mono text-[0.74rem] break-all text-[color:var(--text)]">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        {tab === "cookies" ? (
          cookieCount > 0 ? (
            <div className="space-y-1.5 p-3">
              {setCookies.map((cookie, index) => (
                <div key={index} className="rounded-md border border-[color:var(--border)] px-3 py-2">
                  <p className="font-mono text-[0.74rem] font-semibold text-[#7c3aed]">{cookie}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="kv-empty m-3 min-h-40">
              <Braces className="h-5 w-5" />
              <span>The response did not set any cookies.</span>
            </div>
          )
        ) : null}

        {tab === "preview" ? (
          looksLikeHTML(response.body) ? (
            <iframe
              className="min-h-0 w-full flex-1 border-0 bg-white"
              sandbox=""
              srcDoc={response.body}
              title="Response preview"
            />
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex items-center gap-2 border-b border-[color:var(--border)] bg-[color:var(--card-soft)] p-1.5">
                <Eye className="h-3.5 w-3.5 text-[color:var(--faint)]" />
                <p className="px-1 font-mono text-[0.68rem] font-bold uppercase tracking-wider text-[color:var(--faint)]">
                  No visual preview for this content type
                </p>
              </div>
              <pre className="code-area min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-all px-4 py-3">
                {response.body || "(empty body)"}
              </pre>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}

function Tab({ label, count, active, onClick }: Readonly<{ label: string; count?: number; active: boolean; onClick: () => void }>) {
  return (
    <button className="workspace-tab" type="button" role="tab" aria-selected={active} onClick={onClick}>
      {label}
      {typeof count === "number" && count > 0 ? <span className="tab-count">{count}</span> : null}
    </button>
  );
}

function Sep() {
  return <span className="tab-sep" aria-hidden="true" />;
}