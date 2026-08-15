export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  phone?: string;
  email_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface RefreshResponse {
  user: User;
  access_token: string;
  token_type: string;
  expires_in: number;
}

export type Profile = User;

export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
  avatar_url?: string;
}

export type AgentStatus = "pending" | "online" | "offline" | "disabled";

export interface Agent {
  id: string;
  user_id: string;
  name: string;
  hostname: string;
  device_id: string;
  server_id: string;
  version: string;
  region: string;
  status: AgentStatus;
  last_seen_at?: string;
  cpu_usage: number;
  memory_usage: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAgentRequest {
  name: string;
  hostname?: string;
  server_id?: string;
  region?: string;
}

export interface APIKey {
  id: string;
  agent_id: string;
  name: string;
  prefix: string;
  last_used_at?: string;
  expires_at?: string;
  revoked_at?: string;
  created_at: string;
}

export interface APIKeyCreated {
  id: string;
  name: string;
  key: string;
  prefix: string;
  expires_at?: string;
  created_at: string;
}

export interface EnrollmentToken {
  token: string;
  expires_at: string;
}

export interface Installation {
  install_url: string;
  download_base_url: string;
  version: string;
}

// ---- API Tester ----

export type HTTPMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export interface ProxyRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeout_ms?: number;
}

export interface ProxyResponse {
  status: number;
  status_text: string;
  headers: Record<string, string>;
  body: string;
  duration_ms: number;
}

export interface PayloadRequest {
  method?: string;
  url?: string;
  example?: unknown;
  count?: number;
}

export interface PayloadExample {
  name: string;
  payload: unknown;
}

export interface PayloadResponse {
  provider: "ai" | "local";
  examples: PayloadExample[];
}

export interface APITest {
  id: string;
  user_id: string;
  name: string;
  method: HTTPMethod;
  url: string;
  headers: Record<string, string>;
  body: string;
  response_status?: number;
  response_body: string;
  response_time_ms?: number;
  created_at: string;
  updated_at: string;
}

export interface SaveAPITestRequest {
  name: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  response_status?: number;
  response_body?: string;
  response_time_ms?: number;
}