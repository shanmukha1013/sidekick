"use client";

import { useEffect, useRef, useState } from "react";
import { HardDrive, RefreshCw, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resetDemoData } from "@/lib/demo/store";
import { checkLive, DEMO_SWITCHABLE, switchMode, useDataMode } from "@/lib/mode";
import { cn } from "@/lib/utils";

/**
 * Subtle "DEMO MODE — Local data" indicator. Renders nothing in live mode.
 * Opens a small panel explaining where data lives, with reset / try-live actions.
 */
export function DemoBadge({ align = "right", className }: { align?: "left" | "right"; className?: string }) {
  const mode = useDataMode();
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [checking, setChecking] = useState(false);
  const [liveMsg, setLiveMsg] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (mode !== "demo") return null;

  const tryLive = async () => {
    setChecking(true);
    setLiveMsg(null);
    if (await checkLive()) {
      switchMode("live", "/");
    } else {
      setLiveMsg("The live server or its database is still unavailable, so you're staying in demo mode.");
      setChecking(false);
    }
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setConfirmReset(false);
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full border border-silver-500 bg-silver-200 px-2.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-silver-800 shadow-xs transition-colors hover:bg-silver-400/70"
      >
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-silver-600 opacity-60" />
          <span className="relative inline-flex size-1.5 rounded-full bg-silver-700" />
        </span>
        Demo mode
        <span className="hidden font-medium normal-case tracking-normal text-silver-600 sm:inline">— Local data</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="About demo mode"
          className={cn(
            "absolute top-full z-50 mt-2 w-[min(340px,calc(100vw-2rem))] animate-slide-up rounded-xl border border-line bg-surface p-4 text-left shadow-pop",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          <div className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-subtle text-silver-700">
              <HardDrive className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-ink">Demo mode — local data</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">
                The live Sidekick server or its database isn&apos;t reachable, so this tab runs on a demo store kept only in this
                browser. Accounts, jobs, applications and saved jobs persist across refreshes here. Nothing is sent to the production
                database.
              </p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1 text-faint hover:bg-subtle hover:text-ink" aria-label="Close">
              <X className="size-4" />
            </button>
          </div>
          {liveMsg && <p className="mt-3 rounded-lg bg-subtle px-3 py-2 text-[12.5px] text-ink-2">{liveMsg}</p>}
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button
              variant={confirmReset ? "danger" : "ghost"}
              size="sm"
              onClick={() => {
                if (!confirmReset) {
                  setConfirmReset(true);
                  return;
                }
                resetDemoData();
                window.location.assign("/");
              }}
            >
              <RotateCcw /> {confirmReset ? "Erase all demo data?" : "Reset demo data"}
            </Button>
            {DEMO_SWITCHABLE && (
              <Button variant="secondary" size="sm" onClick={tryLive} loading={checking}>
                {!checking && <RefreshCw />} Try live server
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** True when an error means the live server or its database can't be reached. */
export function isServerUnavailable(err: unknown): boolean {
  if (!err || typeof err !== "object" || !("status" in err)) return false;
  const status = (err as { status: number }).status;
  return status === 0 || status === 503;
}
