"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Briefcase, CalendarClock, Check, Clock, Copy, GraduationCap, Layers, MessageSquare, Navigation, Pencil, Share2, Users } from "lucide-react";
import { ApplyDialog } from "@/components/jobs/ApplyDialog";
import { JobLocation, SaveButton } from "@/components/jobs/JobCard";
import { Button, ButtonLink } from "@/components/ui/button";
import { Avatar, Badge, Card } from "@/components/ui/display";
import { Alert, ErrorState, Skeleton } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/overlay";
import { useAuth } from "@/lib/auth";
import { formatDate, formatRate, splitSkills, timeAgo } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import type { Job } from "@/lib/types";

const JobMap = dynamic(() => import("@/components/JobMap"), { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-subtle" /> });

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-6 first:border-0 first:pt-0">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      <div className="mt-3 whitespace-pre-line text-[14.5px] leading-[1.7] text-ink-2">{children}</div>
    </section>
  );
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const { status } = useAuth();
  const { data: job, error, loading, reload, setData } = useApi<Job>(`/jobs/${id}`);
  const [manualOpen, setManualOpen] = useState(false);
  const [autoDismissed, setAutoDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  const canApply = !!job && job.status === "open" && !job.is_owner && !job.has_applied;
  // `?apply=1` (e.g. after signing in from "Apply now") opens the dialog once.
  const autoOpen = params.get("apply") === "1" && canApply && status === "authenticated" && !autoDismissed;
  const applyOpen = manualOpen || autoOpen;
  const setApplyOpen = (open: boolean) => {
    setManualOpen(open);
    if (!open) setAutoDismissed(true);
  };

  const startApply = () => {
    if (status !== "authenticated") {
      router.push(`/login?next=${encodeURIComponent(`${pathname}?apply=1`)}`);
      return;
    }
    setApplyOpen(true);
  };

  const share = async () => {
    const url = window.location.origin + pathname;
    if (navigator.share) {
      try {
        await navigator.share({ title: job?.title, text: `${job?.title} at ${job?.company_name}`, url });
        return;
      } catch {
        /* user cancelled — fall back to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the link.");
    }
  };

  if (loading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  if (error || !job)
    return (
      <div>
        <Link href="/jobs" className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> All jobs
        </Link>
        <ErrorState error={error} onRetry={error?.status === 404 ? undefined : reload} />
      </div>
    );

  const skills = splitSkills(job.skills_required);
  const located = typeof job.lat === "number" && typeof job.lng === "number";

  const primaryAction = job.is_owner ? (
    <div className="flex flex-wrap gap-2">
      <ButtonLink href={`/applicants?job=${job.id}`} variant="secondary">
        <Users /> Applicants{typeof job.applicant_count === "number" ? ` (${job.applicant_count})` : ""}
      </ButtonLink>
      <ButtonLink href={`/listings/${job.id}/edit`}>
        <Pencil /> Edit listing
      </ButtonLink>
    </div>
  ) : job.has_applied ? (
    <div className="flex flex-wrap gap-2">
      <Badge tone="success" className="h-9 px-3 text-[13px]">
        <Check /> Applied
      </Badge>
      <ButtonLink href="/applications" variant="secondary">
        <MessageSquare /> View application
      </ButtonLink>
    </div>
  ) : job.status !== "open" ? (
    <Badge tone="warning" className="h-9 px-3 text-[13px]">No longer accepting applications</Badge>
  ) : (
    <Button size="lg" onClick={startApply}>
      Apply now
    </Button>
  );

  return (
    <div>
      <Link href="/jobs" className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> All jobs
      </Link>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card className="p-5 sm:p-7">
            <div className="flex items-start gap-4">
              <Avatar name={job.company_name || job.title} size={52} square />
              <div className="min-w-0 flex-1">
                <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] sm:text-[26px]">{job.title}</h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[14px] text-muted">
                  {job.company_name && <span className="font-medium text-ink-2">{job.company_name}</span>}
                  <JobLocation job={job} />
                  <span>Posted {timeAgo(job.created_at)}</span>
                </div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-1.5">
              <Badge tone="outline" className="font-semibold text-ink">{formatRate(job.hourly_rate)}</Badge>
              {job.job_type && <Badge>{job.job_type}</Badge>}
              {job.experience_level && <Badge>{job.experience_level} level</Badge>}
              {job.category && <Badge>{job.category}</Badge>}
              {job.status !== "open" && <Badge tone="warning">Closed</Badge>}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-5">
              {primaryAction}
              <div className="ml-auto flex gap-2">
                {!job.is_owner && <SaveButton job={job} variant="full" onChange={(s) => setData({ ...job, is_saved: s })} />}
                <Button variant="secondary" onClick={share} aria-label="Share job">
                  {copied ? <Copy /> : <Share2 />} <span className="hidden sm:inline">Share</span>
                </Button>
              </div>
            </div>
          </Card>

          <Card className="flex flex-col gap-6 p-5 sm:p-7">
            <Section title="About the role">{job.description}</Section>
            {job.responsibilities && <Section title="Responsibilities">{job.responsibilities}</Section>}
            {skills.length > 0 && (
              <section className="border-t border-line pt-6">
                <h2 className="text-[15px] font-semibold">Skills</h2>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {skills.map((s) => (
                    <Badge key={s} tone="neutral" className="px-2 py-0.5 text-[13px]">{s}</Badge>
                  ))}
                </div>
              </section>
            )}
            {job.benefits && <Section title="Benefits">{job.benefits}</Section>}
          </Card>
        </div>

        <aside className="flex flex-col gap-5">
          <Card className="p-5">
            <h2 className="text-[14px] font-semibold">Overview</h2>
            <dl className="mt-4 space-y-3.5 text-[13.5px]">
              {[
                { icon: Briefcase, label: "Pay", value: formatRate(job.hourly_rate) },
                { icon: Layers, label: "Type", value: job.job_type },
                { icon: GraduationCap, label: "Experience", value: job.experience_level },
                { icon: Clock, label: "Hours", value: job.working_hours },
                { icon: CalendarClock, label: "Apply by", value: job.deadline ? formatDate(job.deadline) : null },
              ]
                .filter((r) => r.value)
                .map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-start gap-3">
                    <Icon className="mt-0.5 size-4 shrink-0 text-faint" />
                    <dt className="w-20 shrink-0 text-muted">{label}</dt>
                    <dd className="min-w-0 font-medium text-ink">{value}</dd>
                  </div>
                ))}
            </dl>
          </Card>

          {located && (
            <Card className="overflow-hidden">
              <div className="h-56">
                <JobMap jobs={[job]} compact />
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-3 text-[13px] text-muted">
                <JobLocation job={job} />
                <a
                  href={`https://www.openstreetmap.org/directions?to=${job.lat}%2C${job.lng}#map=15/${job.lat}/${job.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 font-medium text-accent-ink hover:text-accent-hover"
                >
                  <Navigation className="size-3.5" /> Directions
                </a>
              </div>
            </Card>
          )}

          {job.company_name && (
            <Card className="p-5">
              <h2 className="text-[14px] font-semibold">About the employer</h2>
              <div className="mt-3 flex items-center gap-3">
                <Avatar name={job.company_name} size={36} square />
                <p className="text-[14px] font-medium">{job.company_name}</p>
              </div>
              {status === "authenticated" && !job.is_owner && (
                <ButtonLink href={`/people/${job.employer_id}`} variant="secondary" size="sm" className="mt-4 w-full">
                  View employer profile
                </ButtonLink>
              )}
            </Card>
          )}

          {status !== "authenticated" && (
            <Alert tone="info" title="Sign in to apply">
              <Link href={`/register`} className="font-medium underline">Create a free account</Link> to apply, save jobs and message employers.
            </Alert>
          )}
        </aside>
      </div>

      {applyOpen && job && (
        <ApplyDialog
          job={job}
          open={applyOpen}
          onClose={() => {
            setApplyOpen(false);
            if (params.get("apply")) router.replace(pathname, { scroll: false });
          }}
          onApplied={() => setData({ ...job, has_applied: true })}
        />
      )}
    </div>
  );
}
