"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/* ── Dialog (native <dialog> for focus trapping + Escape) ──────────────── */

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line bg-surface p-0 text-ink shadow-pop open:animate-slide-up",
        size === "sm" ? "max-w-md" : size === "lg" ? "max-w-2xl" : "max-w-lg",
      )}
    >
      {open && (
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <h2 className="text-[16px] font-semibold tracking-[-0.01em]">{title}</h2>
              {description && <p className="mt-0.5 text-[13.5px] text-muted">{description}</p>}
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close" className="-mr-1.5 -mt-1">
              <X />
            </Button>
          </div>
          <div className="overflow-y-auto px-5 py-5">{children}</div>
          {footer && <div className="flex flex-col-reverse gap-2 border-t border-line bg-subtle px-5 py-3.5 sm:flex-row sm:justify-end">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  destructive,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-[14px] leading-relaxed text-ink-2">{description}</div>
    </Dialog>
  );
}

/* ── Toasts ─────────────────────────────────────────────────────────────── */

type Toast = { id: number; tone: "success" | "error"; message: string };
const ToastContext = createContext<{ success: (m: string) => void; error: (m: string) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const push = useCallback((tone: Toast["tone"], message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, tone, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 6000 : 3500);
  }, []);

  const value = useMemo(() => ({ success: (m: string) => push("success", m), error: (m: string) => push("error", m) }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted &&
        createPortal(
          <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6">
            {toasts.map((t) => (
              <div
                key={t.id}
                className="pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-2.5 rounded-xl border border-line bg-surface px-4 py-3 text-[13.5px] text-ink shadow-pop"
              >
                {t.tone === "success" ? (
                  <CheckCircle2 className="mt-px size-4 shrink-0 text-brand-ink" />
                ) : (
                  <AlertCircle className="mt-px size-4 shrink-0 text-brand-ink" />
                )}
                <p className="flex-1 leading-snug">{t.message}</p>
                <button
                  onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}
                  className="-mr-1 rounded p-0.5 text-faint hover:text-ink"
                  aria-label="Dismiss"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

/* ── Segmented tabs ─────────────────────────────────────────────────────── */

export function Tabs<T extends string>({
  value,
  onChange,
  items,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: React.ReactNode; count?: number }[];
  className?: string;
}) {
  return (
    <div role="tablist" className={cn("inline-flex max-w-full gap-1 overflow-x-auto rounded-lg border border-line bg-panel p-1", className)}>
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.value)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
              active ? "bg-surface text-ink shadow-xs" : "text-muted hover:bg-subtle hover:text-ink",
            )}
          >
            {it.label}
            {typeof it.count === "number" && (
              <span className={cn("rounded px-1 text-[11.5px] tabular-nums", active ? "bg-black text-yellow" : "text-faint")}>{it.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
