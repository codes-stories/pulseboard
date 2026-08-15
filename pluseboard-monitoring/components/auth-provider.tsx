"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import * as api from "@/lib/api";
import type { User } from "@/lib/types";

const TOKEN_KEY = "pulseboard-access-token";

type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const clearSession = useCallback(() => {
    api.setAccessToken(null);
    window.localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setStatus("anonymous");
  }, []);

  const handleUnauthorized = useCallback(async (): Promise<boolean> => {
    const token = await api.refreshSession();
    if (token) {
      setStatus("authenticated");
      return true;
    }
    clearSession();
    return false;
  }, [clearSession]);

  useEffect(() => {
    api.setUnauthorizedHandler(handleUnauthorized);
    return () => api.setUnauthorizedHandler(null);
  }, [handleUnauthorized]);

  useEffect(() => {
    const storedToken = window.localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      api.setAccessToken(null);
      queueMicrotask(() => setStatus("anonymous"));
      return;
    }

    api.setAccessToken(storedToken);
    api
      .me()
      .then((currentUser) => {
        setUser(currentUser);
        setStatus("authenticated");
      })
      .catch(() => {
        clearSession();
      });
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.login(email, password);
    api.setAccessToken(response.access_token);
    window.localStorage.setItem(TOKEN_KEY, response.access_token);
    setUser(response.user);
    setStatus("authenticated");
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const response = await api.register(name, email, password);
    api.setAccessToken(response.access_token);
    window.localStorage.setItem(TOKEN_KEY, response.access_token);
    setUser(response.user);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // The refresh cookie may already be gone; clear locally regardless.
    }
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({ user, status, login, register, logout }),
    [user, status, login, register, logout],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider.");
  return context;
}