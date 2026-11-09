/**
 * Data mode: "live" talks to the Sidekick API (MongoDB); "demo" runs the app against an isolated,
 * browser-local store (see lib/demo). Demo mode is a temporary fallback for when the live server or its
 * database is unavailable — it never writes to, or pretends to be, the production backend.
 *
 * NEXT_PUBLIC_DATA_MODE:
 *   "auto" (default) — probe GET /health once per tab; use live if it answers OK, otherwise demo.
 *   "demo"           — always demo.
 *   "live"           — always live (demo mode disabled).
 */
import { useSyncExternalStore } from "react";

export type DataMode = "live" | "demo";

function resolveApiBase(raw: string | undefined): string {
  let base = (raw || "http://localhost:8000").trim().replace(/\/+$/, "");
  // A missing "/api/v1" suffix in NEXT_PUBLIC_API_URL previously made every auth call 404.
  if (!/\/api\/v\d+$/.test(base)) base = `${base}/api/v1`;
  return base;
}

export const API_BASE = resolveApiBase(process.env.NEXT_PUBLIC_API_URL);

const CONFIG = (process.env.NEXT_PUBLIC_DATA_MODE || "auto").trim().toLowerCase();
export const DEMO_SWITCHABLE = CONFIG !== "demo" && CONFIG !== "live";
export const DEMO_ALLOWED = CONFIG !== "live";

const MODE_KEY = "sidekick.mode";
const PROBE_TIMEOUT_MS = 12_000;

let current: DataMode | null = null;
let probing: Promise<DataMode> | null = null;
const listeners = new Set<() => void>();

function readStored(): DataMode | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.sessionStorage.getItem(MODE_KEY);
    return v === "demo" || v === "live" ? v : null;
  } catch {
    return null;
  }
}

/** The mode for this tab if already known (synchronous), otherwise null. */
export function getCachedMode(): DataMode | null {
  if (CONFIG === "demo") return "demo";
  if (CONFIG === "live") return "live";
  if (!current) current = readStored();
  return current;
}

export function setMode(mode: DataMode) {
  if (!DEMO_SWITCHABLE) return;
  current = mode;
  try {
    window.sessionStorage.setItem(MODE_KEY, mode);
  } catch {
    /* storage unavailable — mode lasts for this page only */
  }
  listeners.forEach((l) => l());
}

async function probe(): Promise<DataMode> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/health`, { cache: "no-store", signal: ctrl.signal });
    return res.ok ? "live" : "demo"; // 503 = API up but database unreachable
  } catch {
    return "demo";
  } finally {
    clearTimeout(timer);
  }
}

/** Resolves the mode for this tab, probing the live API once if needed. */
export function resolveMode(): Promise<DataMode> {
  const cached = getCachedMode();
  if (cached) return Promise.resolve(cached);
  if (typeof window === "undefined") return Promise.resolve("live");
  probing ??= probe().then((m) => {
    if (!getCachedMode()) setMode(m);
    return getCachedMode() ?? m;
  });
  return probing;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useDataMode(): DataMode | null {
  return useSyncExternalStore(subscribe, getCachedMode, () => null);
}

/** Re-checks whether the live API and its database are reachable right now. */
export async function checkLive(): Promise<boolean> {
  return (await probe()) === "live";
}

/** Switch this tab's mode and reload so every screen starts from the right data source. */
export function switchMode(mode: DataMode, to?: string) {
  setMode(mode);
  if (to) window.location.assign(to);
  else window.location.reload();
}
