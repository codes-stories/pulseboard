import type { HTTPMethod } from "@/lib/types";
import type { ApiRequest } from "@/lib/api-execution";
import type { AuthState, BodyState, KVRow, RequestState } from "./workspace-types";

export const METHODS: HTTPMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

export const methodTone: Record<string, string> = {
  GET: "bg-[rgba(21,128,61,0.12)] text-[#15803d]",
  POST: "bg-[rgba(180,83,9,0.14)] text-[#b45309]",
  PUT: "bg-[rgba(29,78,216,0.12)] text-[#1d4ed8]",
  PATCH: "bg-[rgba(124,58,237,0.12)] text-[#7c3aed]",
  DELETE: "bg-[rgba(185,28,28,0.12)] text-[#b91c1c]",
  HEAD: "bg-[rgba(86,89,89,0.14)] text-[#565959]",
  OPTIONS: "bg-[rgba(86,89,89,0.14)] text-[#565959]",
};

export const methodText: Record<string, string> = {
  GET: "text-[#15803d]",
  POST: "text-[#b45309]",
  PUT: "text-[#1d4ed8]",
  PATCH: "text-[#7c3aed]",
  DELETE: "text-[#b91c1c]",
  HEAD: "text-[#565959]",
  OPTIONS: "text-[#565959]",
};

export const COMMON_HEADERS = [
  "Accept",
  "Accept-Encoding",
  "Authorization",
  "Cache-Control",
  "Connection",
  "Content-Length",
  "Content-Type",
  "Cookie",
  "Host",
  "If-Match",
  "If-None-Match",
  "Origin",
  "Referer",
  "User-Agent",
  "X-API-Key",
  "X-CSRF-Token",
  "X-Request-Id",
];

export function newID(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function emptyKV(enabled = true): KVRow {
  return { id: newID(), enabled, key: "", value: "" };
}

export const defaultRequest: RequestState = {
  method: "POST",
  url: "https://jsonplaceholder.typicode.com/posts",
  pathParams: [],
  query: [emptyKV(false)],
  headers: [emptyKV(false)],
  auth: { type: "none", bearerToken: "", basicUsername: "", basicPassword: "", apiKeyName: "", apiKeyValue: "", apiKeyIn: "header" },
  cookies: [],
  body: {
    type: "json",
    text: '{\n  "title": "Hello PulseBoard",\n  "body": "testing the api tester",\n  "userId": 1\n}',
  },
};

export const SEND_SHORTCUT: string =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform) ? "⌘ ↵" : "Ctrl ↵";

export function encodeBody(text: string): unknown | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

export function isJSON(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

export function prettyJSON(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2);
  } catch {
    return trimmed;
  }
}

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function base64(input: string): string {
  return btoa(unescape(encodeURIComponent(input)));
}

export function relativeTime(timestamp: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function timeGroup(timestamp: number): string {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;
  if (timestamp >= startOfToday) return "Today";
  if (timestamp >= startOfYesterday) return "Yesterday";
  return "Earlier";
}

export function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// Parse the query portion of a URL into editable param rows.
export function parseQueryIntoParams(url: string): KVRow[] {
  const queryIndex = url.indexOf("?");
  if (queryIndex < 0 || queryIndex === url.length - 1) return [];
  const query = url.slice(queryIndex + 1);
  const rows: KVRow[] = [];
  for (const segment of query.split("&")) {
    if (!segment) continue;
    const eq = segment.indexOf("=");
    const key = eq < 0 ? segment : segment.slice(0, eq);
    const value = eq < 0 ? "" : segment.slice(eq + 1);
    if (!key) continue;
    rows.push({ id: newID(), enabled: true, key: decodeURIComponent(key), value: decodeURIComponent(value) });
  }
  return rows;
}

// Rebuild the URL bar from the query table (enabled rows only).
export function urlFromQuery(url: string, query: KVRow[]): string {
  const base = url.split("?")[0];
  const pairs = query.filter((row) => row.enabled && row.key).map((row) => {
    const key = encodeURIComponent(row.key);
    return row.value === "" ? key : `${key}=${encodeURIComponent(row.value)}`;
  });
  return pairs.length > 0 ? `${base}?${pairs.join("&")}` : base;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Extract :key / {key} placeholders from a URL, preserving existing row values.
export function parsePathParamsFromURL(url: string, existing: KVRow[]): KVRow[] {
  const placeholders = new Set<string>();
  const colon = /:([A-Za-z0-9_]+)/g;
  let match: RegExpExecArray | null;
  while ((match = colon.exec(url)) !== null) placeholders.add(match[1]);
  const brace = /\{([A-Za-z0-9_]+)\}/g;
  while ((match = brace.exec(url)) !== null) placeholders.add(match[1]);

  const byKey = new Map(existing.filter((row) => placeholders.has(row.key)).map((row) => [row.key, row]));
  return Array.from(placeholders).map((key) => {
    const previous = byKey.get(key);
    return previous ? { ...previous } : { id: newID(), enabled: true, key, value: "" };
  });
}

// Substitute enabled path param values into :key / {key} placeholders.
export function applyPathParams(url: string, rows: KVRow[]): string {
  let result = url;
  for (const row of rows) {
    if (!row.enabled || !row.key || row.value === "") continue;
    const value = encodeURIComponent(row.value);
    result = result
      .replace(new RegExp(`:${escapeRegExp(row.key)}(?=/|\\?|$)`, "g"), value)
      .replace(new RegExp(`\\{${escapeRegExp(row.key)}\\}`, "g"), value);
  }
  return result;
}

export function headersObject(headers: KVRow[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const row of headers) {
    if (!row.enabled || !row.key.trim()) continue;
    result[row.key.trim()] = row.value;
  }
  return result;
}

export function objectToRows(object: Record<string, string> | undefined | null): KVRow[] {
  if (!object) return [];
  return Object.entries(object).map(([key, value]) => ({ id: newID(), enabled: true, key, value }));
}

export function cookieHeader(cookies: KVRow[]): string {
  return cookies
    .filter((row) => row.enabled && row.key.trim())
    .map((row) => `${row.key.trim()}=${row.value}`)
    .join("; ");
}

interface AuthResult {
  headers: Record<string, string>;
  url: string;
}

export function applyAuth(auth: AuthState, url: string): AuthResult {
  const headers: Record<string, string> = {};
  if (auth.type === "bearer" && auth.bearerToken) {
    headers.Authorization = `Bearer ${auth.bearerToken}`;
  } else if (auth.type === "basic" && auth.basicUsername) {
    headers.Authorization = `Basic ${base64(`${auth.basicUsername}:${auth.basicPassword}`)}`;
  } else if (auth.type === "apikey" && auth.apiKeyName && auth.apiKeyValue) {
    if (auth.apiKeyIn === "query") {
      const separator = url.includes("?") ? "&" : "?";
      return { headers, url: `${url}${separator}${encodeURIComponent(auth.apiKeyName)}=${encodeURIComponent(auth.apiKeyValue)}` };
    }
    headers[auth.apiKeyName.trim()] = auth.apiKeyValue;
  }
  return { headers, url };
}

interface BodyResult {
  body?: unknown;
  headers?: Record<string, string>;
}

export function bodyForSend(body: BodyState): BodyResult {
  if (body.type === "none" || !body.text.trim()) return {};
  if (body.type === "json") return { body: encodeBody(body.text), headers: { "Content-Type": "application/json" } };
  if (body.type === "form") {
    const params = new URLSearchParams();
    for (const line of body.text.split("\n")) {
      const eq = line.indexOf("=");
      if (eq <= 0) continue;
      params.append(line.slice(0, eq).trim(), line.slice(eq + 1).trim());
    }
    return { body: params.toString(), headers: { "Content-Type": "application/x-www-form-urlencoded" } };
  }
  return { body: body.text, headers: { "Content-Type": "text/plain" } };
}

export function buildApiRequest(request: RequestState): ApiRequest {
  const headers = headersObject(request.headers);
  const cookie = cookieHeader(request.cookies);
  const { headers: authHeaders, url } = applyAuth(request.auth, applyPathParams(request.url, request.pathParams));
  const { body, headers: bodyHeaders } = bodyForSend(request.body);
  return {
    method: request.method,
    url,
    headers: {
      ...headers,
      ...authHeaders,
      ...bodyHeaders,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body,
  };
}

export function statusTone(status: number): string {
  if (status < 300) return "text-[color:var(--success)]";
  if (status < 400) return "text-[color:var(--warning)]";
  return "text-[color:var(--danger)]";
}

export function shortURL(url: string): string {
  return url.replace(/^https?:\/\//, "");
}