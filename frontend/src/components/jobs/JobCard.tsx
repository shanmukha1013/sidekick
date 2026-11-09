"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck, Globe, MapPin } from "lucide-react";
import { Avatar, Badge } from "@/components/ui/display";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/overlay";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatRate, timeAgo } from "@/lib/format";
import type { Job } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SaveButton({
  job,
  onChange,
  variant = "icon",
}: {
  job: Pick<Job, "id" | "is_saved">;
  onChange?: (saved: boolean) => void;
  variant?: "icon" | "full";
}) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [saved, setSaved] = useState(!!job.is_saved);
  const [busy, setBusy] = useState(false);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (status !== "authenticated") {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    const next = !saved;
    setSaved(next);
    setBusy(true);
    try {
      if (next) await api.put(`/saved-jobs/${job.id}`);
      else await api.delete(`/saved-jobs/${job.id}`);
      onChange?.(next);
      toast.success(next ? "Job saved" : "Removed from saved jobs");
    } catch (err) {
      setSaved(!next);
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const Icon = saved ? BookmarkCheck : Bookmark;
  if (variant === "full")
    return (
      <Button variant="secondary" onClick={toggle} disabled={busy} aria-pressed={saved}>
        <Icon className={cn(saved && "text-brand-ink")} /> {saved ? "Saved" : "Save"}
      </Button>
    );
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved jobs" : "Save job"}
      title={saved ? "Saved" : "Save job"}
      className={cn(saved && "text-brand-ink hover:text-brand-ink")}
    >
      <Icon />
    </Button>
  );
}

export function JobLocation({ job, className }: { job: Pick<Job, "is_remote" | "location_name">; className?: string }) {
  const Icon = job.is_remote ? Globe : MapPin;
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1", className)}>
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate">{job.is_remote ? (job.location_name && job.location_name !== "Remote" ? `Remote · ${job.location_name}` : "Remote") : job.location_name}</span>
    </span>
  );
}

export function JobCard({
  job,
  showSave = true,
  onSavedChange,
  footer,
  highlight,
}: {
  job: Job;
  showSave?: boolean;
  onSavedChange?: (saved: boolean) => void;
  footer?: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <article
      className={cn(
        "group relative rounded-xl border bg-surface p-4 shadow-card hover:ring-2 hover:ring-brand/60 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-lift sm:p-5",
        highlight ? "border-brand ring-2 ring-brand/40" : "border-black/10",
      )}
    >
      <div className="flex items-start gap-3.5">
        <Avatar name={job.company_name || job.title} size={42} square />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 text-[15px] font-semibold leading-snug tracking-[-0.01em] text-ink">
              <Link href={`/jobs/${job.id}`} className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none group-hover:text-brand-ink">
                {job.title}
              </Link>
            </h3>
            {showSave && job.is_owner !== true && (
              <div className="relative z-10 -mr-1.5 -mt-1">
                <SaveButton job={job} onChange={onSavedChange} />
              </div>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
            {job.company_name && <span className="font-medium text-ink-2">{job.company_name}</span>}
            {job.company_name && <span aria-hidden="true" className="text-line-strong">·</span>}
            <JobLocation job={job} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Badge tone="outline" className="font-semibold text-ink">
              {formatRate(job.hourly_rate)}
            </Badge>
            {job.job_type && <Badge>{job.job_type}</Badge>}
            {job.category && <Badge>{job.category}</Badge>}
            {job.has_applied && <Badge tone="success">Applied</Badge>}
            {job.status === "closed" && <Badge tone="warning">Closed</Badge>}
            <span className="ml-auto text-[12.5px] text-faint">{timeAgo(job.created_at)}</span>
          </div>
          {footer && <div className="relative z-10 mt-4 border-t border-line pt-3">{footer}</div>}
        </div>
      </div>
    </article>
  );
}
