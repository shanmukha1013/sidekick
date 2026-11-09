"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Bell, Bookmark, Briefcase, CheckCircle2, Circle, FileText, Inbox, Plus, Search, Users } from "lucide-react";
import { JobCard } from "@/components/jobs/JobCard";
import { ButtonLink } from "@/components/ui/button";
import { Avatar, Card, CardHeader, PageHeader, Stat, StatusBadge } from "@/components/ui/display";
import { EmptyState, ErrorState, Skeleton, SkeletonRows } from "@/components/ui/feedback";
import { Tabs } from "@/components/ui/overlay";
import { useAuth } from "@/lib/auth";
import { firstName, greeting, timeAgo } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import type { Application, Job, Notification, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { user, hasRole } = useAuth();
  const both = hasRole("seeker") && hasRole("employer");
  const [view, setView] = useState<"seeker" | "employer">(hasRole("seeker") ? "seeker" : "employer");
  if (!user) return null;
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${firstName(user.full_name)}`}
        description={today}
        actions={
          both && (
            <Tabs
              value={view}
              onChange={setView}
              items={[
                { value: "seeker", label: "Job seeking" },
                { value: "employer", label: "Hiring" },
              ]}
            />
          )
        }
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">{view === "seeker" ? <SeekerDashboard /> : <EmployerDashboard />}</div>
        <aside className="flex flex-col gap-5">
          {view === "seeker" && <ProfileCompletion />}
          <RecentNotifications />
        </aside>
      </div>
    </div>
  );
}

function SeekerDashboard() {
  const apps = useApi<Application[]>("/applications/mine");
  const saved = useApi<Job[]>("/saved-jobs");
  const rec = useApi<Job[]>("/jobs/recommended");
  const profile = useApi<Profile>("/profiles/me");
  const list = apps.data || [];
  const active = list.filter((a) => ["pending", "reviewing", "shortlisted"].includes(a.status)).length;
  const accepted = list.filter((a) => a.status === "accepted").length;
  const hasSkills = (profile.data?.skills.length || 0) > 0 || (profile.data?.preferred_categories.length || 0) > 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Applications" value={apps.loading ? "–" : list.length} icon={<FileText />} />
        <Stat label="In progress" value={apps.loading ? "–" : active} icon={<Inbox />} />
        <Stat label="Accepted" value={apps.loading ? "–" : accepted} icon={<CheckCircle2 />} />
        <Stat label="Saved jobs" value={saved.loading ? "–" : (saved.data?.length ?? 0)} icon={<Bookmark />} />
      </div>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[16px] font-semibold tracking-[-0.01em]">{hasSkills ? "Recommended for you" : "Latest openings"}</h2>
            <p className="text-[13px] text-muted">
              {hasSkills ? "Ranked by your skills and interests." : "Add skills to your profile for personalised recommendations."}
            </p>
          </div>
          <Link href="/jobs" className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-brand-ink hover:underline">
            Browse all <ArrowRight className="size-3.5" />
          </Link>
        </div>
        {rec.loading ? (
          <SkeletonRows count={3} />
        ) : rec.error ? (
          <ErrorState error={rec.error} onRetry={rec.reload} />
        ) : !rec.data?.length ? (
          <EmptyState
            icon={<Search />}
            title="No new jobs to recommend"
            description="You've seen everything that's open right now. Check back soon or browse all jobs."
            action={<ButtonLink href="/jobs" variant="secondary">Browse jobs</ButtonLink>}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {rec.data.map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
          </div>
        )}
      </section>

      <Card>
        <CardHeader
          title="Recent applications"
          action={<Link href="/applications" className="text-[13px] font-medium text-brand-ink hover:underline">View all</Link>}
        />
        {apps.loading ? (
          <div className="space-y-3 p-5"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
        ) : !list.length ? (
          <p className="px-5 py-8 text-center text-[13.5px] text-muted">You haven&apos;t applied to any jobs yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {list.slice(0, 5).map((a) => (
              <li key={a.id}>
                <Link href={a.job ? `/jobs/${a.job.id}` : "/applications"} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-subtle">
                  <Avatar name={a.job?.company_name || a.job?.title} size={34} square />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium">{a.job?.title || "Job no longer available"}</p>
                    <p className="truncate text-[12.5px] text-muted">{a.job?.company_name} · Applied {timeAgo(a.created_at)}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function EmployerDashboard() {
  const jobs = useApi<Job[]>("/jobs/mine");
  const apps = useApi<Application[]>("/applications/received");
  const list = jobs.data || [];
  const received = apps.data || [];
  const open = list.filter((j) => j.status === "open").length;
  const newApps = received.filter((a) => a.status === "pending").length;
  const hired = received.filter((a) => a.status === "accepted").length;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Active listings" value={jobs.loading ? "–" : open} icon={<Briefcase />} />
        <Stat label="Total applicants" value={apps.loading ? "–" : received.filter((a) => a.status !== "withdrawn").length} icon={<Users />} />
        <Stat label="Awaiting review" value={apps.loading ? "–" : newApps} icon={<Inbox />} />
        <Stat label="Hired" value={apps.loading ? "–" : hired} icon={<CheckCircle2 />} />
      </div>

      <Card>
        <CardHeader
          title="Recent applicants"
          description="The newest applications across your listings."
          action={<Link href="/employer/applicants" className="text-[13px] font-medium text-brand-ink hover:underline">Manage</Link>}
        />
        {apps.loading ? (
          <div className="space-y-3 p-5"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
        ) : apps.error ? (
          <ErrorState className="m-5" error={apps.error} onRetry={apps.reload} />
        ) : !received.length ? (
          <p className="px-5 py-8 text-center text-[13.5px] text-muted">No applications yet. They&apos;ll appear here as candidates apply.</p>
        ) : (
          <ul className="divide-y divide-line">
            {received.slice(0, 6).map((a) => (
              <li key={a.id}>
                <Link href={`/employer/applicants?job=${a.job_id}`} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-subtle">
                  <Avatar name={a.applicant?.full_name} src={a.applicant?.avatar_url} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium">{a.applicant?.full_name || "Applicant"}</p>
                    <p className="truncate text-[12.5px] text-muted">{a.job?.title} · {timeAgo(a.created_at)}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Your listings"
          action={
            <ButtonLink href="/employer/jobs/new" size="sm">
              <Plus /> New job
            </ButtonLink>
          }
        />
        {jobs.loading ? (
          <div className="space-y-3 p-5"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
        ) : !list.length ? (
          <EmptyState
            className="m-5"
            icon={<Briefcase />}
            title="Post your first job"
            description="Listings go live immediately and appear in search for job seekers."
            action={<ButtonLink href="/employer/jobs/new"><Plus /> Post a job</ButtonLink>}
          />
        ) : (
          <ul className="divide-y divide-line">
            {list.slice(0, 5).map((j) => (
              <li key={j.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <Link href={`/jobs/${j.id}`} className="block truncate text-[14px] font-medium hover:text-brand-ink">{j.title}</Link>
                  <p className="text-[12.5px] text-muted">Posted {timeAgo(j.created_at)}</p>
                </div>
                <span className={cn("text-[12.5px] font-medium", j.status === "open" ? "text-ink" : "text-muted")}>
                  {j.status === "open" ? "Open" : "Closed"}
                </span>
                <Link href={`/employer/applicants?job=${j.id}`} className="w-24 text-right text-[13px] text-ink-2 hover:text-brand-ink">
                  {j.applicant_count ?? 0} applicant{j.applicant_count === 1 ? "" : "s"}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function ProfileCompletion() {
  const { data: p, loading } = useApi<Profile>("/profiles/me");
  if (loading) return <Skeleton className="h-48 rounded-xl" />;
  if (!p) return null;
  const items = [
    { done: !!p.headline, label: "Add a headline" },
    { done: !!p.bio, label: "Write a short bio" },
    { done: !!p.location, label: "Add your location" },
    { done: p.skills.length > 0, label: "List your skills" },
    { done: !!p.experience, label: "Describe your experience" },
    { done: !!p.education, label: "Add education" },
    { done: !!p.availability, label: "Set your availability" },
  ];
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold">Profile strength</h2>
        <span className="text-[13px] font-medium tabular-nums text-ink-2">{pct}%</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-subtle" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${pct}%` }} />
      </div>
      {pct < 100 ? (
        <>
          <ul className="mt-4 space-y-2">
            {items.filter((i) => !i.done).slice(0, 4).map((i) => (
              <li key={i.label} className="flex items-center gap-2 text-[13px] text-ink-2">
                <Circle className="size-3.5 text-line-strong" /> {i.label}
              </li>
            ))}
          </ul>
          <ButtonLink href="/profile" variant="secondary" size="sm" className="mt-4 w-full">
            Complete profile
          </ButtonLink>
        </>
      ) : (
        <p className="mt-3 text-[13px] text-muted">Your profile is complete. Employers see the full picture.</p>
      )}
    </Card>
  );
}

function RecentNotifications() {
  const { data, loading } = useApi<Notification[]>("/notifications?limit=5");
  return (
    <Card>
      <CardHeader title="Activity" action={<Link href="/notifications" className="text-[13px] font-medium text-brand-ink hover:underline">See all</Link>} />
      {loading ? (
        <div className="space-y-3 p-5"><Skeleton className="h-8" /><Skeleton className="h-8" /></div>
      ) : !data?.length ? (
        <div className="flex flex-col items-center px-5 py-8 text-center">
          <Bell className="size-5 text-faint" />
          <p className="mt-2 text-[13px] text-muted">No activity yet.</p>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {data.map((n) => (
            <li key={n.id}>
              <Link href={n.link || "/notifications"} className="flex gap-3 px-5 py-3 transition-colors hover:bg-subtle">
                <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", n.is_read ? "bg-transparent" : "bg-brand")} />
                <div className="min-w-0">
                  <p className={cn("text-[13px] leading-snug", n.is_read ? "text-ink-2" : "font-medium text-ink")}>{n.title}</p>
                  <p className="mt-0.5 text-[12px] text-faint">{timeAgo(n.created_at)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
