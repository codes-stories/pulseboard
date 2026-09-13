import type {
  Agent,
  AgentLog,
  APIKey,
  APIKeyCreated,
  APITest,
  AuthResponse,
  CheckResult,
  CreateAgentRequest,
  EnrollmentToken,
  Installation,
  PayloadRequest,
  PayloadResponse,
  Profile,
  ProxyRequest,
  ProxyResponse,
  RefreshResponse,
  SaveAPITestRequest,
  UpdateProfileRequest,
  User,
} from "./types";

const API_BASE_URL = `${(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080").replace(/\/+$/, "")}/api/v1`;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let accessToken: string | null = null;
let refreshInFlight: Promise<string | null> | null = null;
let onUnauthorized: (() => Promise<boolean>) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function setUnauthorizedHandler(handler: (() => Promise<boolean>) | null): void {
  onUnauthorized = handler;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  signal?: AbortSignal;
}

async function doFetch(path: string, options: RequestOptions, token: string | null): Promise<Response> {
  const { method = "GET", body, auth = true, signal } = options;
  return fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    credentials: "include",
    signal,
  });
}

async function parseError(response: Response): Promise<ApiError> {
  try {
    const payload = (await response.json()) as { error?: string };
    return new ApiError(response.status, payload.error ?? response.statusText);
  } catch {
    return new ApiError(response.status, response.statusText);
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true } = options;
  let response = await doFetch(path, options, accessToken);

  if (response.status === 401 && auth && onUnauthorized) {
    const refreshed = await onUnauthorized();
    if (refreshed) {
      response = await doFetch(path, options, accessToken);
    }
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function refreshSession(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) return null;
      const payload = (await response.json()) as RefreshResponse;
      setAccessToken(payload.access_token);
      return payload.access_token;
    } catch {
      return null;
    } finally {
      setTimeout(() => {
        refreshInFlight = null;
      }, 0);
    }
  })();

  return refreshInFlight;
}

// ---- Auth ----

export function register(name: string, email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    auth: false,
    body: { name, email, password },
  });
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    auth: false,
    body: { email, password },
  });
}

export function logout(): Promise<void> {
  return request<void>("/auth/logout", { method: "POST", auth: false });
}

export function me(): Promise<User> {
  return request<User>("/auth/me");
}

// ---- Profile ----

export function getProfile(): Promise<Profile> {
  return request<Profile>("/profile");
}

export function updateProfile(payload: UpdateProfileRequest): Promise<Profile> {
  return request<Profile>("/profile", { method: "PATCH", body: payload });
}

// ---- Agents ----

export function listAgents(): Promise<Agent[]> {
  return request<Agent[]>("/agents");
}

export function createAgent(payload: CreateAgentRequest): Promise<Agent> {
  return request<Agent>("/agents", { method: "POST", body: payload });
}

export function deleteAgent(agentID: string): Promise<void> {
  return request<void>(`/agents/${encodeURIComponent(agentID)}`, { method: "DELETE" });
}

export function getInstallation(): Promise<Installation> {
  return request<Installation>("/agents/installation");
}

export function createEnrollmentToken(agentID: string): Promise<EnrollmentToken> {
  return request<EnrollmentToken>(`/agents/${encodeURIComponent(agentID)}/enrollment-token`, {
    method: "POST",
  });
}

export function listAPIKeys(agentID: string): Promise<APIKey[]> {
  return request<APIKey[]>(`/agents/${encodeURIComponent(agentID)}/api-keys`);
}

export function createAPIKey(agentID: string, name: string): Promise<APIKeyCreated> {
  return request<APIKeyCreated>(`/agents/${encodeURIComponent(agentID)}/api-keys`, {
    method: "POST",
    body: { name },
  });
}

export function revokeAPIKey(agentID: string, keyID: string): Promise<void> {
  return request<void>(`/agents/${encodeURIComponent(agentID)}/api-keys/${encodeURIComponent(keyID)}/revoke`, {
    method: "POST",
  });
}

export function rotateAPIKey(agentID: string, keyID: string): Promise<APIKeyCreated> {
  return request<APIKeyCreated>(`/agents/${encodeURIComponent(agentID)}/api-keys/${encodeURIComponent(keyID)}/rotate`, {
    method: "POST",
  });
}

export function listAgentLogs(agentID: string): Promise<{ logs: AgentLog[] }> {
  return request<{ logs: AgentLog[] }>(`/agents/${encodeURIComponent(agentID)}/logs`);
}

export function listAgentCheckResults(agentID: string): Promise<{ results: CheckResult[] }> {
  return request<{ results: CheckResult[] }>(`/agents/${encodeURIComponent(agentID)}/results`);
}

// ---- API Tester (public tools) ----

export function proxyRequest(payload: ProxyRequest, signal?: AbortSignal): Promise<ProxyResponse> {
  return request<ProxyResponse>("/tools/proxy", { method: "POST", auth: false, body: payload, signal });
}

export function generatePayloads(payload: PayloadRequest): Promise<PayloadResponse> {
  return request<PayloadResponse>("/tools/ai/payload", { method: "POST", auth: false, body: payload });
}

// ---- API Tester (saved tests, auth required) ----

export function listAPITests(): Promise<APITest[]> {
  return request<APITest[]>("/api-tests");
}

export function createAPITest(payload: SaveAPITestRequest): Promise<APITest> {
  return request<APITest>("/api-tests", { method: "POST", body: payload });
}

export function updateAPITest(testID: string, payload: SaveAPITestRequest): Promise<APITest> {
  return request<APITest>(`/api-tests/${encodeURIComponent(testID)}`, { method: "PUT", body: payload });
}

export function deleteAPITest(testID: string): Promise<void> {
  return request<void>(`/api-tests/${encodeURIComponent(testID)}`, { method: "DELETE" });
}