import type { HTTPMethod } from "@/lib/types";

export interface KVRow {
  id: string;
  enabled: boolean;
  key: string;
  value: string;
}

export type AuthType = "none" | "bearer" | "basic" | "apikey";

export interface AuthState {
  type: AuthType;
  bearerToken: string;
  basicUsername: string;
  basicPassword: string;
  apiKeyName: string;
  apiKeyValue: string;
  apiKeyIn: "header" | "query";
}

export type BodyType = "none" | "json" | "text" | "form";

export interface BodyState {
  type: BodyType;
  text: string;
}

export interface RequestState {
  method: HTTPMethod;
  url: string;
  pathParams: KVRow[];
  query: KVRow[];
  headers: KVRow[];
  auth: AuthState;
  cookies: KVRow[];
  body: BodyState;
  allowPrivate: boolean;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  method: HTTPMethod;
  url: string;
  status?: number;
  duration_ms?: number;
  size?: number;
  request: RequestState;
}