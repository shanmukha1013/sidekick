"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, ApiError, getToken, hasLiveToken, setToken, UNAUTHORIZED_EVENT } from "@/lib/api";
import { getCachedMode, resolveMode } from "@/lib/mode";
import type { AuthResponse, Role, User } from "@/lib/types";

/**
 * "error" means we have a stored session but couldn't verify it (network/server down).
 * We deliberately keep the token in that case so a backend hiccup never logs the user out.
 */
type Status = "loading" | "authenticated" | "unauthenticated" | "error";

export interface RegisterInput {
  full_name: string;
  username: string;
  email: string;
  phone: string;
  password: string;
}

interface AuthContextValue {
  status: Status;
  user: User | null;
  sessionMessage: string | null;
  login: (identifier: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: User) => void;
  acceptSession: (res: AuthResponse) => void;
  hasRole: (role: Role) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Set when the user signs out on purpose, so the route gate sends them to /login without a `next` page.
let explicitSignOut = false;
export function consumeExplicitSignOut() {
  const v = explicitSignOut;
  explicitSignOut = false;
  return v;
}

/** Checks the stored token against the API without touching React state. */
async function verifySession(): Promise<{ status: Status; user: User | null }> {
  if (!getCachedMode()) {
    // Mode not decided yet for this tab. Only a stored live session needs to wait for the probe.
    if (!hasLiveToken()) {
      void resolveMode();
      return { status: "unauthenticated", user: null };
    }
    await resolveMode();
  }
  if (!getToken()) return { status: "unauthenticated", user: null };
  try {
    return { status: "authenticated", user: await api.get<User>("/auth/me") };
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      setToken(null);
      return { status: "unauthenticated", user: null };
    }
    // Network/server problem: keep the stored session so a backend hiccup never signs the user out.
    return { status: "error", user: null };
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUserState] = useState<User | null>(null);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  const applyResult = useCallback((r: { status: Status; user: User | null }) => {
    setUserState(r.user);
    setStatus(r.status);
  }, []);

  const refresh = useCallback(() => verifySession().then(applyResult), [applyResult]);

  useEffect(() => {
    let alive = true;
    verifySession().then((r) => alive && applyResult(r));
    return () => {
      alive = false;
    };
  }, [applyResult]);

  useEffect(() => {
    const onUnauthorized = (e: Event) => {
      setToken(null);
      setUserState(null);
      setSessionMessage((e as CustomEvent<string>).detail || "Your session has ended. Please sign in again.");
      setStatus("unauthenticated");
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "sidekick.token") refresh();
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
      window.removeEventListener("storage", onStorage);
    };
  }, [refresh]);

  const acceptSession = useCallback((res: AuthResponse) => {
    setToken(res.access_token);
    setUserState(res.user);
    setSessionMessage(null);
    setStatus("authenticated");
  }, []);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const res = await api.post<AuthResponse>("/auth/login", { identifier, password });
      acceptSession(res);
      return res.user;
    },
    [acceptSession],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const res = await api.post<AuthResponse>("/auth/register", input);
      acceptSession(res);
      return res.user;
    },
    [acceptSession],
  );

  const logout = useCallback(async () => {
    explicitSignOut = true;
    try {
      if (getToken()) await api.post("/auth/logout", undefined, { timeoutMs: 8000 });
    } catch {
      /* the token is discarded locally regardless */
    }
    setToken(null);
    setUserState(null);
    setSessionMessage(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      sessionMessage,
      login,
      register,
      logout,
      refresh,
      setUser: setUserState,
      acceptSession,
      // One marketplace: every signed-in account can both find work and hire.
      hasRole: (role: Role) => !!user && (role === "seeker" || role === "employer"),
    }),
    [status, user, sessionMessage, login, register, logout, refresh, acceptSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Where a signed-in user should land. */
export function homeFor(user: User, next?: string | null) {
  if (!user.onboarded) return "/onboarding";
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/dashboard";
}
