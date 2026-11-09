/**
 * Sidekick API client.
 *
 * The base URL is normalized so that both `https://api.example.com` and
 * `https://api.example.com/api/v1` work. (A missing `/api/v1` suffix in the
 * deployed NEXT_PUBLIC_API_URL previously caused every auth call to 404.)
 */
function resolveApiBase(raw: string | undefined): string {
  let base = (raw || "http://localhost:8000").trim().replace(/\/+$/, "");
  if (!/\/api\/v\d+$/.test(base)) base = `${base}/api/v1`;
  return base;
}

export const API_BASE = resolveApiBase(process.env.NEXT_PUBLIC_API_URL);

const TOKEN_KEY = "sidekick.token";
export const UNAUTHORIZED_EVENT = "sidekick:unauthorized";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem("token"); // legacy key from the previous client
  } catch {
    /* storage unavailable (private mode) — session lasts for this page only */
  }
}

export class ApiError extends Error {
  status: number;
  errors: Record<string, string>;
  constructor(message: string, status: number, errors: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
  get isNetwork() {
    return this.status === 0;
  }
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
}

async function request<T>(method: Method, path: string, opts: RequestOptions = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  let body: BodyInit | undefined;
  if (opts.body instanceof FormData) {
    body = opts.body;
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), opts.timeoutMs ?? 70_000);
  const onAbort = () => controller.abort(opts.signal?.reason);
  opts.signal?.addEventListener("abort", onAbort);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { method, headers, body, signal: controller.signal, cache: "no-store" });
  } catch (err) {
    if (opts.signal?.aborted) throw err;
    if (controller.signal.aborted) {
      throw new ApiError("The server is taking too long to respond. Please try again.", 0);
    }
    throw new ApiError("Can't reach Sidekick right now. Check your connection and try again.", 0);
  } finally {
    clearTimeout(timeout);
    opts.signal?.removeEventListener("abort", onAbort);
  }

  if (res.status === 204) return undefined as T;

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text };
    }
  }

  if (!res.ok) {
    const d = (data || {}) as { detail?: unknown; errors?: Record<string, string> };
    let message = typeof d.detail === "string" ? d.detail : "";
    if (!message) {
      message =
        res.status >= 500
          ? "Something went wrong on our side. Please try again."
          : res.status === 404
            ? "Not found."
            : "Request failed.";
    }
    if (res.status === 401 && token && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT, { detail: message }));
    }
    throw new ApiError(message, res.status, d.errors || {});
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>("GET", path, opts),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("POST", path, { ...opts, body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("PUT", path, { ...opts, body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("PATCH", path, { ...opts, body }),
  delete: <T>(path: string, opts?: RequestOptions) => request<T>("DELETE", path, opts),
};

export function errorMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
