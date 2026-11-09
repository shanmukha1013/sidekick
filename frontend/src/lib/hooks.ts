"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError, errorMessage } from "@/lib/api";

export interface ApiState<T> {
  data: T | undefined;
  error: ApiError | null;
  loading: boolean;
  reload: () => void;
  setData: (updater: T | undefined | ((prev: T | undefined) => T | undefined)) => void;
}

export function toApiError(err: unknown): ApiError {
  return err instanceof ApiError ? err : new ApiError(errorMessage(err), 0);
}

/**
 * Fetch a GET endpoint. Pass `null` to skip. Re-fetches when `path` changes or `reload()` is called.
 * Previous data stays available while a refetch is in flight (no flicker); `loading` reflects the request.
 */
export function useApi<T>(path: string | null): ApiState<T> {
  const [nonce, setNonce] = useState(0);
  const key = path === null ? null : `${nonce}\u0000${path}`;
  const [state, setState] = useState<{ key: string | null; data: T | undefined; error: ApiError | null }>({
    key: null,
    data: undefined,
    error: null,
  });

  useEffect(() => {
    if (path === null || key === null) return;
    const ctrl = new AbortController();
    api
      .get<T>(path, { signal: ctrl.signal })
      .then((data) => setState({ key, data, error: null }))
      .catch((err) => {
        if (!ctrl.signal.aborted) setState((s) => ({ key, data: s.data, error: toApiError(err) }));
      });
    return () => ctrl.abort();
  }, [key, path]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setData = useCallback<ApiState<T>["setData"]>(
    (updater) =>
      setState((s) => ({
        ...s,
        data: typeof updater === "function" ? (updater as (p: T | undefined) => T | undefined)(s.data) : updater,
      })),
    [],
  );

  const loading = key !== null && state.key !== key;
  return { data: state.data, error: loading ? null : state.error, loading, reload, setData };
}

export const COUNTS_EVENT = "sidekick:counts-changed";
export function emitCountsChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(COUNTS_EVENT));
}
