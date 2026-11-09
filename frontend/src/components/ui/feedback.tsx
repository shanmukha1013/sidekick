"use client";

import { AlertCircle, CheckCircle2, Info, Loader2, RefreshCw, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEMO_SWITCHABLE, getCachedMode, switchMode } from "@/lib/mode";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/lib/api";

export function Spinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  return (
    <span role="status" className="inline-flex items-center">
      <Loader2 className={cn("size-5 animate-spin text-faint", className)} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-subtle", className)} aria-hidden="true" />;
}

export function SkeletonRows({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-line bg-surface p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="size-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Alert({
  tone = "error",
  title,
  children,
  className,
}: {
  tone?: "error" | "success" | "info" | "warning";
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const styles = {
    error: "border-danger/60 bg-brand-soft text-ink [&>svg]:text-danger",
    success: "border-line-strong bg-subtle text-ink [&>svg]:text-accent",
    info: "border-line bg-subtle text-ink [&>svg]:text-accent",
    warning: "border-accent/60 bg-subtle text-ink [&>svg]:text-accent",
  }[tone];
  const Icon = tone === "success" ? CheckCircle2 : tone === "info" ? Info : AlertCircle;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex gap-2.5 rounded-lg border px-3.5 py-3 text-[13.5px]", styles, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 space-y-0.5">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className="leading-relaxed opacity-90">{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-xl border border-dashed border-line-strong/70 bg-surface px-6 py-12 text-center", className)}>
      {icon && (
        <div className="mb-4 flex size-11 items-center justify-center rounded-xl border border-line bg-subtle text-accent shadow-xs [&_svg]:size-5">
          {icon}
        </div>
      )}
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-[13.5px] leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }: { error: ApiError | Error | null; onRetry?: () => void; className?: string }) {
  const network = !!error && "status" in error && (error.status === 0 || error.status === 503);
  const offerDemo = network && DEMO_SWITCHABLE && getCachedMode() !== "demo";
  return (
    <EmptyState
      className={className}
      icon={network ? <WifiOff /> : <AlertCircle />}
      title={network ? "Can't reach Sidekick" : "Something went wrong"}
      description={error?.message || "Please try again."}
      action={
        (onRetry || offerDemo) && (
          <div className="flex flex-wrap justify-center gap-2">
            {onRetry && (
              <Button variant="secondary" onClick={onRetry}>
                <RefreshCw /> Try again
              </Button>
            )}
            {offerDemo && <Button onClick={() => switchMode("demo")}>Continue in demo mode</Button>}
          </div>
        )
      }
    />
  );
}
