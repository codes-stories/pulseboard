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
  allow_private?: boolean;
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

// ---- Agent Logs ----

export interface AgentLog {
  id: string;
  agent_id: string;
  level: string;
  message: string;
  context: Record<string, unknown>;
  created_at: string;
}

// ---- Check Results ----

export interface CheckResult {
  id: string;
  monitor_id: string;
  agent_id: string;
  status_code: number;
  latency_ms: number;
  success: boolean;
  error_message: string;
  checked_at: string;
  created_at: string;
}

// ---- System Metrics ----

export interface SystemMetric {
  id: string;
  agent_id: string;
  metrics: {
    go_routines: number;
    memory_alloc_bytes: number;
    memory_sys_bytes: number;
    heap_alloc_bytes: number;
    heap_sys_bytes: number;
    heap_objects: number;
    gc_cycles: number;
    gc_pause_total_ns: number;
    num_cpu: number;
    uptime_seconds: number;
    db_pool?: {
      total_conns: number;
      idle_conns: number;
      acquired_conns: number;
      max_conns: number;
    };
    collected_at: string;
  };
  collected_at: string;
  created_at: string;
}

// ---- Notifications ----

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "success" | "warning" | "error" | "info";
  read: boolean;
  created_at: string;
}