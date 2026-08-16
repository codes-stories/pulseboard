import type { HTTPMethod, ProxyResponse } from "./types";
import { proxyRequest } from "./api";

export type ExecutionMode = "direct" | "proxy";

export const EXECUTION_MODES: ExecutionMode[] = ["direct", "proxy"];

export interface ApiRequest {
  method: HTTPMethod;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
}

export class RequestExecutionError extends Error {
  constructor(
    message: string,
    public readonly corsBlocked = false,
  ) {
    super(message);
    this.name = "RequestExecutionError";
  }
}

export async function executeApiRequest(request: ApiRequest, mode: ExecutionMode, signal?: AbortSignal): Promise<ProxyResponse> {
  if (mode === "direct") return executeDirectRequest(request, signal);
  return executeProxyRequest(request, signal);
}

async function executeProxyRequest(request: ApiRequest, signal?: AbortSignal): Promise<ProxyResponse> {
  return proxyRequest(request, signal);
}

async function executeDirectRequest(request: ApiRequest, signal?: AbortSignal): Promise<ProxyResponse> {
  const started = performance.now();
  let response: Response;
  try {
    response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: directBody(request.body),
      signal,
    });
  } catch {
    if (signal?.aborted) {
      throw new RequestExecutionError("Request cancelled.");
    }
    throw new RequestExecutionError(
      "Request blocked by browser CORS policy. This API does not allow requests from the PulseBoard web application. Try Proxy Mode instead.",
      true,
    );
  }

  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const body = await response.text();
  return {
    status: response.status,
    status_text: response.statusText,
    headers,
    body,
    duration_ms: Math.round(performance.now() - started),
  };
}

function directBody(body: unknown): string | undefined {
  if (body === undefined) return undefined;
  return typeof body === "string" ? body : JSON.stringify(body);
}