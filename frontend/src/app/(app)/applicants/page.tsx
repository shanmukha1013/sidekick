"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ExternalLink, Mail, MapPin, MessageSquare, Phone, Users } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Avatar, Badge, Card, PageHeader, StatusBadge } from "@/components/ui/display";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/feedback";
import { Select } from "@/components/ui/form";
import { Tabs, useToast } from "@/components/ui/overlay";
import { api, errorMessage, qs } from "@/lib/api";
import { formatDate, formatRate } from "@/lib/format";
import { emitCountsChanged, useApi } from "@/lib/hooks";
import type { Application, ApplicationStatus, Job } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "all" | "pending" | "reviewing" | "shortlisted" | "accepted" | "rejected";

const ACTIONS: { status: Exclude<ApplicationStatus, "pending" | "withdrawn">; label: string; variant: "secondary" | "primary" | "danger-ghost" }[] = [
  { status: "reviewing", label: "Mark in review", variant: "secondary" },
  { status: "shortlisted", label: "Shortlist", variant: "secondary" },
  { status: "accepted", label: "Accept", variant: "primary" },
  { status: "rejected", label: "Decline", variant: "danger-ghost" },
];

export default function ApplicantsPage() {
  return (
    <Applicants />
  );
}

function Applicants() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const jobId = params.get("job") || "";
  const jobs = useApi<Job[]>("/jobs/mine");
  const apps = useApi<Application[]>(`/applications/received${qs({ job_id: jobId })}`);
  const initial = params.get("status");
  const [filter, setFilter] = useState<Filter>(
    initial && ["pending", "reviewing", "shortlisted", "accepted", "rejected"].includes(initial) ? (initial as Filter) : "all",
  );
  const list = apps.data || [];
  const visible = list.filter((a) => (filter === "all" ? a.status !== "withdrawn" : a.status === filter));
  const count = (s: ApplicationStatus) => list.filter((a) => a.status === s).length;

  return (
    <div>
      <PageHeader
        title="Manage Applicants"
        description="Review candidates for your listings, update their status and message them."
        actions={
          <Select
            aria-label="Filter by job"
            value={jobId}
            onChange={(e) => router.replace(`${pathname}${qs({ job: e.target.value })}`)}
            className="h-9 w-full text-[13px] sm:w-64"
          >
            <option value="">All listings</option>
            {(jobs.data || []).map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
                {j.status !== "open" ? " (closed)" : ""}
              </option>
            ))}
          </Select>
        }
      />
      <Tabs
        className="mb-4"
        value={filter}
        onChange={setFilter}
        items={[
          { value: "all", label: "All", count: list.filter((a) => a.status !== "withdrawn").length },
          { value: "pending", label: "New", count: count("pending") },
          { value: "reviewing", label: "In review", count: count("reviewing") },
          { value: "shortlisted", label: "Shortlisted", count: count("shortlisted") },
          { value: "accepted", label: "Accepted", count: count("accepted") },
          { value: "rejected", label: "Declined", count: count("rejected") },
        ]}
      />
      {apps.loading ? (
        <SkeletonRows count={3} />
      ) : apps.error ? (
        <ErrorState error={apps.error} onRetry={apps.reload} />
      ) : !visible.length ? (
        <EmptyState
          icon={<Users />}
          title={list.length ? "No applicants in this stage" : "No applicants yet"}
          description={list.length ? "Try another filter." : "Applications to your listings will appear here."}
          action={!list.length && !(jobs.data || []).length && <ButtonLink href="/post-job">Post a job</ButtonLink>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((a) => (
            <ApplicantCard key={a.id} app={a} onUpdated={(u) => apps.setData((cur) => cur?.map((x) => (x.id === u.id ? { ...x, status: u.status } : x)))} />
          ))}
        </div>
      )}
    </div>
  );
}

function ApplicantCard({ app, onUpdated }: { app: Application; onUpdated: (a: Application) => void }) {
  const toast = useToast();
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const p = app.applicant;

  const setStatus = async (status: string) => {
    setBusy(status);
    try {
      const updated = await api.patch<Application>(`/applications/${app.id}/status`, { status });
      onUpdated(updated);
      toast.success(`${p?.full_name || "Applicant"} moved to ${status === "rejected" ? "declined" : status === "reviewing" ? "in review" : status}`);
      emitCountsChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start gap-3.5">
        <Avatar name={p?.full_name} src={p?.avatar_url} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[15px] font-semibold">{p?.full_name || "Applicant"}</p>
              <p className="mt-0.5 text-[13px] text-muted">
                {p?.headline || `@${p?.username}`} · Applied {formatDate(app.created_at)} for{" "}
                <Link href={`/jobs/${app.job_id}`} className="font-medium text-ink-2 hover:text-brand">{app.job?.title}</Link>
              </p>
            </div>
            <StatusBadge status={app.status} />
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-ink-2">
            {p?.email && (
              <a href={`mailto:${p.email}`} className="inline-flex items-center gap-1.5 hover:text-brand">
                <Mail className="size-3.5 text-faint" /> {p.email}
              </a>
            )}
            {app.phone && (
              <a href={`tel:${app.phone}`} className="inline-flex items-center gap-1.5 hover:text-brand">
                <Phone className="size-3.5 text-faint" /> {app.phone}
              </a>
            )}
            {p?.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5 text-faint" /> {p.location}
              </span>
            )}
          </div>

          {!!p?.skills.length && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.skills.slice(0, 8).map((s) => (
                <Badge key={s}>{s}</Badge>
              ))}
            </div>
          )}

          {app.cover_letter && (
            <div className="mt-4 rounded-lg border border-line bg-canvas p-3.5">
              <p className={cn("whitespace-pre-line text-[13.5px] leading-relaxed text-ink-2", !expanded && "line-clamp-3")}>{app.cover_letter}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted">
                {app.expected_rate != null && <span>Expects {formatRate(app.expected_rate)}</span>}
                {app.availability && <span>Available: {app.availability}</span>}
                {app.portfolio_links && /^https?:\/\//.test(app.portfolio_links) && (
                  <a href={app.portfolio_links} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-brand hover:text-brand-hover">
                    Portfolio <ExternalLink className="size-3" />
                  </a>
                )}
                {app.cover_letter.length > 220 && (
                  <button onClick={() => setExpanded((e) => !e)} className="ml-auto inline-flex items-center gap-1 font-medium text-ink-2 hover:text-ink">
                    {expanded ? "Show less" : "Read more"} <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {app.status === "withdrawn" ? (
              <p className="text-[13px] text-muted">The applicant withdrew this application.</p>
            ) : (
              ACTIONS.filter((a) => a.status !== app.status).map((a) => (
                <Button key={a.status} variant={a.variant} size="sm" loading={busy === a.status} disabled={!!busy} onClick={() => setStatus(a.status)}>
                  {a.label}
                </Button>
              ))
            )}
            <div className="ml-auto flex gap-1.5">
              <ButtonLink href={`/messages?thread=${app.id}`} variant="ghost" size="sm">
                <MessageSquare /> Message
              </ButtonLink>
              {p && (
                <ButtonLink href={`/people/${p.id}`} variant="ghost" size="sm">
                  Profile
                </ButtonLink>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
