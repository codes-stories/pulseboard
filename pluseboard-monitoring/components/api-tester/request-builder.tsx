"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Braces, Check, Copy, Eraser, Eye, EyeOff, Loader2, Plus, Send, Wand2, X } from "lucide-react";
import type { AuthState, BodyState, BodyType, KVRow, RequestState } from "./workspace-types";
import { COMMON_HEADERS, METHODS, SEND_SHORTCUT, emptyKV, methodText, prettyJSON, classifyTarget } from "./helpers";
import { KeyValueTable } from "./key-value-table";
import { CookieEditor } from "./cookie-editor";
import { LineEditor } from "./line-editor";

export type RequestTab = "params" | "query" | "headers" | "body" | "content-type" | "auth" | "cookies";

interface RequestBuilderProps {
  request: RequestState;
  update: (patch: Partial<RequestState>) => void;
  updateQuery: (rows: KVRow[]) => void;
  updatePathParams: (rows: KVRow[]) => void;
  setURL: (url: string) => void;
  tab: RequestTab;
  onTabChange: (tab: RequestTab) => void;
  sending: boolean;
  sendError: string | null;
  onSend: () => void;
  onCancel: () => void;
  onDismissError: () => void;
}

function activeCount(rows: KVRow[]): number {
  return rows.filter((row) => row.enabled && row.key.trim()).length;
}

export function RequestBuilder({
  request,
  update,
  updateQuery,
  updatePathParams,
  setURL,
  tab,
  onTabChange,
  sending,
  sendError,
  onSend,
  onCancel,
  onDismissError,
}: Readonly<RequestBuilderProps>) {
  const [showToken, setShowToken] = useState(false);
  const [showBasicPassword, setShowBasicPassword] = useState(false);
  const [showAPIKey, setShowAPIKey] = useState(false);

  const pathParamCount = activeCount(request.pathParams);
  const queryCount = activeCount(request.query);
  const headerCount = activeCount(request.headers);
  const cookieCount = activeCount(request.cookies);
  const authActive = request.auth.type !== "none";
  const targetType = useMemo(() => classifyTarget(request.url), [request.url]);
  const isInternalTarget = targetType !== "public";

  return (
    <div className="flex h-full min-h-0 flex-col bg-[color:var(--bg)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-[color:var(--border)] px-2.5 py-2">
        <select
          className={`select-field w-auto py-2! font-mono text-xs font-bold ${methodText[request.method]}`}
          value={request.method}
          aria-label="HTTP method"
          onChange={(event) => update({ method: event.target.value as RequestState["method"] })}
        >
          {METHODS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <input
          className="input-field min-w-0 flex-1 font-mono text-[0.82rem]"
          value={request.url}
          onChange={(event) => setURL(event.target.value)}
          placeholder="https://api.example.com/v1/endpoint"
          spellCheck={false}
        />

        {sending ? (
          <button className="btn btn-secondary px-3!" type="button" onClick={onCancel} title="Cancel request">
            <X className="h-4 w-4" />
            <span className="hidden md:inline">Cancel</span>
          </button>
        ) : null}

        <button
          className="btn btn-primary shrink-0 px-4!"
          type="button"
          onClick={onSend}
          disabled={sending}
          title={`Send request (${SEND_SHORTCUT})`}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send
          <span className="kbd hidden lg:inline-flex">{SEND_SHORTCUT}</span>
        </button>
      </div>

      {sendError ? (
        <div className="flex items-start justify-between gap-2 border-b border-[color:var(--border)] bg-[color:var(--danger)]/10 px-3 py-2">
          <p className="font-mono text-[0.78rem] text-[color:var(--danger)]">{sendError}</p>
          <button className="icon-btn shrink-0 text-[color:var(--danger)]" type="button" title="Dismiss" onClick={onDismissError}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <div className="workspace-tabs" role="tablist" aria-label="Request configuration">
        <Tab label="Params" count={pathParamCount} active={tab === "params"} onClick={() => onTabChange("params")} />
        <Sep />
        <Tab label="Query" count={queryCount} active={tab === "query"} onClick={() => onTabChange("query")} />
        <Sep />
        <Tab label="Headers" count={headerCount} active={tab === "headers"} onClick={() => onTabChange("headers")} />
        <Sep />
        <Tab label="Body" active={tab === "body"} onClick={() => onTabChange("body")} />
        <Sep />
        <Tab label="Content-Type" active={tab === "content-type"} onClick={() => onTabChange("content-type")} />
        <Sep />
        <Tab label="Authorization" dot={authActive} active={tab === "auth"} onClick={() => onTabChange("auth")} />
        <Sep />
        <Tab label="Cookies" count={cookieCount} active={tab === "cookies"} onClick={() => onTabChange("cookies")} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto thin-scroll p-2.5">
        {tab === "params" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[0.72rem] text-[color:var(--faint)]">
                Path parameters replace <span className="font-mono">:key</span> or <span className="font-mono">{`{key}`}</span> placeholders in the URL.
              </p>
              <button className="btn btn-ghost text-sm" type="button" onClick={() => updatePathParams([...request.pathParams, emptyKV()])}>
                <Plus className="h-3.5 w-3.5" /> Add parameter
              </button>
            </div>
            <KeyValueTable rows={request.pathParams} onChange={updatePathParams} accent="path" keyPlaceholder=":parameter" valuePlaceholder="value" />
          </div>
        ) : null}

        {tab === "query" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[0.72rem] text-[color:var(--faint)]">Query parameters are appended to the URL as a query string.</p>
              <button className="btn btn-ghost text-sm" type="button" onClick={() => updateQuery([...request.query, emptyKV()])}>
                <Plus className="h-3.5 w-3.5" /> Add parameter
              </button>
            </div>
            <KeyValueTable rows={request.query} onChange={updateQuery} accent="query" keyPlaceholder="parameter" valuePlaceholder="value" />
          </div>
        ) : null}

        {tab === "headers" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[0.72rem] text-[color:var(--faint)]">Standard header names autocomplete as you type.</p>
              <button className="btn btn-ghost text-sm" type="button" onClick={() => update({ headers: [...request.headers, emptyKV()] })}>
                <Plus className="h-3.5 w-3.5" /> Add header
              </button>
            </div>
            <KeyValueTable
              rows={request.headers}
              onChange={(rows) => update({ headers: rows })}
              accent="headers"
              autocomplete={COMMON_HEADERS}
              keyPlaceholder="Header"
              valuePlaceholder="Value"
            />
          </div>
        ) : null}

        {tab === "content-type" ? (
          <ContentTypePanel body={request.body} onChange={(body) => update({ body })} onGoToBody={() => onTabChange("body")} />
        ) : null}

        {tab === "auth" ? (
          <AuthEditor
            auth={request.auth}
            showToken={showToken}
            showBasicPassword={showBasicPassword}
            showAPIKey={showAPIKey}
            setShowToken={setShowToken}
            setShowBasicPassword={setShowBasicPassword}
            setShowAPIKey={setShowAPIKey}
            onChange={(auth) => update({ auth })}
          />
        ) : null}

        {tab === "cookies" ? <CookieEditor rows={request.cookies} onChange={(cookies) => update({ cookies })} /> : null}

        {tab === "body" ? <BodyEditor body={request.body} onChange={(body) => update({ body })} /> : null}
      </div>
    </div>
  );
}

function Tab({ label, count, dot, active, onClick }: Readonly<{ label: string; count?: number; dot?: boolean; active: boolean; onClick: () => void }>) {
  return (
    <button className="workspace-tab" type="button" role="tab" aria-selected={active} onClick={onClick}>
      {label}
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--primary)]" aria-label="active" /> : null}
      {typeof count === "number" && count > 0 ? <span className="tab-count">{count}</span> : null}
    </button>
  );
}

function Sep() {
  return <span className="tab-sep" aria-hidden="true" />;
}

const CONTENT_TYPES: Array<{ value: BodyType; label: string; header: string | null; hint: string }> = [
  { value: "none", label: "No body", header: null, hint: "Send without a request body." },
  { value: "json", label: "JSON", header: "application/json", hint: "Structured data; formatted with the body editor." },
  { value: "form", label: "URL-encoded", header: "application/x-www-form-urlencoded", hint: "key=value pairs, one per line." },
  { value: "text", label: "Plain text", header: "text/plain", hint: "Send the body verbatim as text." },
];

function ContentTypePanel({ body, onChange, onGoToBody }: Readonly<{ body: BodyState; onChange: (body: BodyState) => void; onGoToBody: () => void }>) {
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-[0.72rem] font-bold uppercase tracking-wider text-[color:var(--faint)]">Request body type</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {CONTENT_TYPES.map((type) => (
            <button
              key={type.value}
              className="content-type-option"
              type="button"
              aria-pressed={body.type === type.value}
              onClick={() => onChange({ ...body, type: type.value })}
            >
              <span>{type.label}</span>
              {type.header ? <code>{type.header}</code> : null}
              <span className="mt-0.5 text-[0.68rem] font-normal text-[color:var(--muted)]">{type.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-[color:var(--border)] bg-[color:var(--card-soft)] px-3 py-2 text-[0.74rem] text-[color:var(--muted)]">
        {body.type === "none" ? (
          <>This request is sent without a body. Choose a type to add one.</>
        ) : (
          <>
            The selected type is sent as the <span className="font-mono text-[color:var(--text)]">Content-Type</span> header. Edit the payload in the{" "}
            <button className="nav-link font-semibold" type="button" onClick={onGoToBody}>Body</button> tab.
          </>
        )}
      </div>
    </div>
  );
}

function AuthEditor({
  auth,
  showToken,
  showBasicPassword,
  showAPIKey,
  setShowToken,
  setShowBasicPassword,
  setShowAPIKey,
  onChange,
}: Readonly<{
  auth: AuthState;
  showToken: boolean;
  showBasicPassword: boolean;
  showAPIKey: boolean;
  setShowToken: (value: boolean) => void;
  setShowBasicPassword: (value: boolean) => void;
  setShowAPIKey: (value: boolean) => void;
  onChange: (auth: AuthState) => void;
}>) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-[0.72rem] font-bold uppercase tracking-wider text-[color:var(--faint)]" htmlFor="auth-type">Authorization type</label>
        <select id="auth-type" className="select-field w-full" value={auth.type} onChange={(event) => onChange({ ...auth, type: event.target.value as AuthState["type"] })}>
          <option value="none">No authorization</option>
          <option value="bearer">Bearer token</option>
          <option value="basic">Basic auth</option>
          <option value="apikey">API key</option>
        </select>
      </div>

      {auth.type === "bearer" ? (
        <SecretField
          label="Token"
          value={auth.bearerToken}
          placeholder="Bearer token…"
          show={showToken}
          onToggle={() => setShowToken(!showToken)}
          onChange={(bearerToken) => onChange({ ...auth, bearerToken })}
        />
      ) : null}

      {auth.type === "basic" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-[0.72rem] font-bold uppercase tracking-wider text-[color:var(--faint)]" htmlFor="basic-user">Username</label>
            <input id="basic-user" className="input-field font-mono text-[0.82rem]" value={auth.basicUsername} onChange={(event) => onChange({ ...auth, basicUsername: event.target.value })} spellCheck={false} />
          </div>
          <SecretField
            label="Password"
            value={auth.basicPassword}
            placeholder="••••••••"
            show={showBasicPassword}
            onToggle={() => setShowBasicPassword(!showBasicPassword)}
            onChange={(basicPassword) => onChange({ ...auth, basicPassword })}
          />
        </div>
      ) : null}

      {auth.type === "apikey" ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[0.72rem] font-bold uppercase tracking-wider text-[color:var(--faint)]" htmlFor="apikey-name">Key name</label>
              <input id="apikey-name" className="input-field font-mono text-[0.82rem]" value={auth.apiKeyName} placeholder="X-API-Key" onChange={(event) => onChange({ ...auth, apiKeyName: event.target.value })} spellCheck={false} />
            </div>
            <div className="space-y-1.5">
              <label className="text-[0.72rem] font-bold uppercase tracking-wider text-[color:var(--faint)]" htmlFor="apikey-in">Send as</label>
              <select id="apikey-in" className="select-field w-full" value={auth.apiKeyIn} onChange={(event) => onChange({ ...auth, apiKeyIn: event.target.value as AuthState["apiKeyIn"] })}>
                <option value="header">Header</option>
                <option value="query">Query parameter</option>
              </select>
            </div>
          </div>
          <SecretField
            label="API key value"
            value={auth.apiKeyValue}
            placeholder="secret…"
            show={showAPIKey}
            onToggle={() => setShowAPIKey(!showAPIKey)}
            onChange={(apiKeyValue) => onChange({ ...auth, apiKeyValue })}
          />
        </div>
      ) : null}

      {auth.type === "none" ? (
        <p className="rounded-md border border-dashed border-[color:var(--border)] p-4 text-center text-[0.8rem] text-[color:var(--faint)]">
          This request is sent without authentication.
        </p>
      ) : null}
    </div>
  );
}

function SecretField({
  label,
  value,
  placeholder,
  show,
  onToggle,
  onChange,
}: Readonly<{ label: string; value: string; placeholder: string; show: boolean; onToggle: () => void; onChange: (value: string) => void }>) {
  return (
    <div className="space-y-1.5">
      <label className="text-[0.72rem] font-bold uppercase tracking-wider text-[color:var(--faint)]">{label}</label>
      <div className="relative">
        <input
          className="input-field pr-10 font-mono text-[0.82rem]"
          type={show ? "text" : "password"}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
        />
        <button className="icon-btn absolute right-1 top-1/2 -translate-y-1/2" type="button" title={show ? "Hide" : "Show"} onClick={onToggle}>
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function BodyEditor({ body, onChange }: Readonly<{ body: BodyState; onChange: (body: BodyState) => void }>) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(body.text).then(
      () => {
        setCopied(true);
        toast.success("Body copied to clipboard");
        window.setTimeout(() => setCopied(false), 1400);
      },
      () => toast.error("Failed to copy"),
    );
  }

  return (
    <div className="flex h-full flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[0.72rem] text-[color:var(--faint)]">
          {body.type === "none"
            ? "No body selected — set one in the Content-Type tab."
            : body.type === "json"
              ? "application/json — payload is parsed as JSON."
              : body.type === "form"
                ? "application/x-www-form-urlencoded — one key=value pair per line."
                : "text/plain — sent verbatim."}
        </p>

        <div className="flex items-center gap-1">
          <button
            className="btn btn-ghost text-sm"
            type="button"
            title="Prettify JSON"
            disabled={body.type !== "json" || !prettyJSON(body.text)}
            onClick={() => onChange({ ...body, text: prettyJSON(body.text) })}
          >
            <Wand2 className="h-3.5 w-3.5" /> Format
          </button>
          <button className="icon-btn" type="button" title="Copy body" disabled={!body.text} onClick={copy}>
            {copied ? <Check className="h-4 w-4 text-[color:var(--success)]" /> : <Copy className="h-4 w-4" />}
          </button>
          <button
            className="btn btn-ghost text-sm"
            type="button"
            title="Clear body"
            disabled={!body.text}
            onClick={() => onChange({ ...body, text: "" })}
          >
            <Eraser className="h-3.5 w-3.5" /> Clear
          </button>
        </div>
      </div>

      {body.type === "none" ? (
        <div className="kv-empty min-h-40">
          <Braces className="h-5 w-5" />
          <span>This request has no body.</span>
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          <LineEditor
            value={body.text}
            onChange={(text) => onChange({ ...body, text })}
            placeholder={body.type === "form" ? "key=value" : body.type === "json" ? '{ "key": "value" }' : "Raw request body…"}
          />
        </div>
      )}
    </div>
  );
}
