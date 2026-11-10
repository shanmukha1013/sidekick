"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Bookmark,
  Briefcase,
  CheckCircle2,
  Circle,
  FileText,
  Inbox,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { JobCard } from "@/components/jobs/JobCard";
import { ButtonLink } from "@/components/ui/button";
import { Avatar, Card, CardHeader, PageHeader, StatusBadge } from "@/components/ui/display";
import { EmptyState, ErrorState, Skeleton, SkeletonRows } from "@/components/ui/feedback";
import { useAuth } from "@/lib/auth";
import { firstName, greeting, timeAgo } from "@/lib/format";
import { type ApiState, useApi } from "@/lib/hooks";
import type { Application, Job, Notification, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * One overview for one account. Finding work and hiring are two workspaces of the same dashboard —
 * both are always shown, whatever the user picked when they signed up.
 */
export default function DashboardPage() {
  const { user } = useAuth();
  const myApps = useApi<Application[]>("/applications/mine");
  const saved = useApi<Job[]>("/saved-jobs");
  const myJobs = useApi<Job[]>("/jobs/mine");
  const received = useApi<Application[]>("/applications/received");
  if (!user) return null;
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${firstName(user.full_name)}`}
        description={`${today} · Your work and hiring, in one place.`}
        actions={
          <>
            <ButtonLink href="/jobs" variant="secondary">
              <Search /> Find jobs
            </ButtonLink>
            <ButtonLink href="/post-job">
              <Plus /> Post a job
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <FindWorkPanel apps={myApps} saved={saved} />
        <HirePanel jobs={myJobs} received={received} />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Recommended />
          <YourListings jobs={myJobs} />
        </div>
        <aside className="flex flex-col gap-5">
          <ProfileCompletion />
          <RecentNotifications />
        </aside>
      </div>
    </div>
  );
}

function WorkspaceHeader({ tone, title, description, href, linkLabel }: { tone: "red" | "green"; title: string; description: string; href: string; linkLabel: string }) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-5">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">
          <span aria-hidden="true" className={cn("size-1.5 rounded-full", tone === "red" ? "bg-brand" : "bg-accent")} />
          Workspace
        </p>
        <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-ink">{title}</h2>
        <p className="mt-0.5 text-[13px] text-muted">{description}</p>
      </div>
      <Link
        href={href}
        className={cn(
          "inline-flex shrink-0 items-center gap-1 text-[13px] font-medium",
          tone === "red" ? "text-brand-ink hover:text-brand" : "text-accent-ink hover:text-accent-hover",
        )}
      >
        {linkLabel} <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}

function MiniStat({ label, value, icon, href, tone }: { label: string; value: React.ReactNode; icon: React.ReactNode; href: string; tone: "red" | "green" }) {
  return (
    <Link
      href={href}
      className="group rounded-lg border border-line bg-subtle p-3 transition-colors hover:border-line-strong hover:bg-raised"
    >
      <div className="flex items-center justify-between text-[12px] text-muted">
        <span className="truncate">{label}</span>
        <span className={cn("[&_svg]:size-3.5", tone === "red" ? "text-brand-ink" : "text-accent-ink")}>{icon}</span>
      </div>
      <div className="mt-1.5 text-[22px] font-semibold leading-none tracking-[-0.02em] text-ink tabular-nums">{value}</div>
    </Link>
  );
}

function FindWorkPanel({ apps, saved }: { apps: ApiState<Application[]>; saved: ApiState<Job[]> }) {
  const list = apps.data || [];
  const active = list.filter((a) => ["pending", "reviewing", "shortlisted"].includes(a.status)).length;
  const accepted = list.filter((a) => a.status === "accepted").length;
  const dash = (loading: boolean, v: number) => (loading ? "–" : v);
  return (
    <Card className="relative overflow-hidden">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-brand/0 via-brand to-brand/0" />
      <WorkspaceHeader tone="red" title="Find work" description="Applications, saved jobs and their status." href="/jobs" linkLabel="Find jobs" />
      <div className="grid grid-cols-2 gap-2.5 p-5 sm:grid-cols-4">
        <MiniStat tone="red" label="Applied" value={dash(apps.loading, list.length)} icon={<FileText />} href="/applications" />
        <MiniStat tone="red" label="In progress" value={dash(apps.loading, active)} icon={<Inbox />} href="/applications" />
        <MiniStat tone="red" label="Accepted" value={dash(apps.loading, accepted)} icon={<CheckCircle2 />} href="/applications" />
        <MiniStat tone="red" label="Saved" value={dash(saved.loading, saved.data?.length ?? 0)} icon={<Bookmark />} href="/saved" />
      </div>
      <div className="border-t border-line">
        <p className="px-5 pb-1 pt-3 text-[12px] font-medium uppercase tracking-[0.08em] text-faint">My applications</p>
        {apps.loading ? (
          <div className="space-y-2 p-5 pt-2"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
        ) : apps.error ? (
          <ErrorState className="m-5" error={apps.error} onRetry={apps.reload} />
        ) : !list.length ? (
          <p className="px-5 pb-5 pt-2 text-[13.5px] text-muted">
            You haven&apos;t applied to any jobs yet. <Link href="/jobs" className="font-medium text-brand-ink hover:text-brand">Browse open roles</Link>.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {list.slice(0, 4).map((a) => (
              <li key={a.id}>
                <Link href={a.job ? `/jobs/${a.job.id}` : "/applications"} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-subtle">
                  <Avatar name={a.job?.company_name || a.job?.title} size={32} square />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium">{a.job?.title || "Job no longer available"}</p>
                    <p className="truncate text-[12px] text-muted">{a.job?.company_name} · Applied {timeAgo(a.created_at)}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function HirePanel({ jobs, received }: { jobs: ApiState<Job[]>; received: ApiState<Application[]> }) {
  const list = jobs.data || [];
  const apps = received.data || [];
  const open = list.filter((j) => j.status === "open").length;
  const awaiting = apps.filter((a) => a.status === "pending").length;
  const hired = apps.filter((a) => a.status === "accepted").length;
  const dash = (loading: boolean, v: number) => (loading ? "–" : v);
  return (
    <Card className="relative overflow-hidden">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-accent/0 via-accent to-accent/0" />
      <WorkspaceHeader tone="green" title="Hire talent" description="Your listings, applicants and hiring activity." href="/applicants" linkLabel="Manage applicants" />
      <div className="grid grid-cols-2 gap-2.5 p-5 sm:grid-cols-4">
        <MiniStat tone="green" label="Live listings" value={dash(jobs.loading, open)} icon={<Briefcase />} href="/listings" />
        <MiniStat tone="green" label="Applicants" value={dash(received.loading, apps.filter((a) => a.status !== "withdrawn").length)} icon={<Users />} href="/applicants" />
        <MiniStat tone="green" label="To review" value={dash(received.loading, awaiting)} icon={<Inbox />} href="/applicants?status=pending" />
        <MiniStat tone="green" label="Hired" value={dash(received.loading, hired)} icon={<CheckCircle2 />} href="/applicants?status=accepted" />
      </div>
      <div className="border-t border-line">
        <p className="px-5 pb-1 pt-3 text-[12px] font-medium uppercase tracking-[0.08em] text-faint">Recent applicants</p>
        {received.loading ? (
          <div className="space-y-2 p-5 pt-2"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
        ) : received.error ? (
          <ErrorState className="m-5" error={received.error} onRetry={received.reload} />
        ) : !apps.length ? (
          <p className="px-5 pb-5 pt-2 text-[13.5px] text-muted">
            No applicants yet.{" "}
            {list.length ? "They'll appear here as candidates apply." : <><Link href="/post-job" className="font-medium text-accent-ink hover:text-accent-hover">Post your first job</Link> to start hiring.</>}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {apps.slice(0, 4).map((a) => (
              <li key={a.id}>
                <Link href={`/applicants?job=${a.job_id}`} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-subtle">
                  <Avatar name={a.applicant?.full_name} src={a.applicant?.avatar_url} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium">{a.applicant?.full_name || "Applicant"}</p>
                    <p className="truncate text-[12px] text-muted">{a.job?.title} · {timeAgo(a.created_at)}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function Recommended() {
  const rec = useApi<Job[]>("/jobs/recommended");
  const profile = useApi<Profile>("/profiles/me");
  const hasSkills = (profile.data?.skills.length || 0) > 0 || (profile.data?.preferred_categories.length || 0) > 0;
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-semibold tracking-[-0.01em]">{hasSkills ? "Recommended for you" : "Latest openings"}</h2>
          <p className="text-[13px] text-muted">
            {hasSkills ? "Ranked by your skills and interests." : "Add skills to your profile for personalised recommendations."}
          </p>
        </div>
        <Link href="/jobs" className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-brand-ink hover:text-brand">
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
  );
}

function YourListings({ jobs }: { jobs: ApiState<Job[]> }) {
  const list = jobs.data || [];
  return (
    <Card>
      <CardHeader
        title="My listings"
        description="Jobs you've posted from this account."
        action={
          <ButtonLink href="/post-job" size="sm" variant="brand">
            <Plus /> New job
          </ButtonLink>
        }
      />
      {jobs.loading ? (
        <div className="space-y-3 p-5"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
      ) : jobs.error ? (
        <ErrorState className="m-5" error={jobs.error} onRetry={jobs.reload} />
      ) : !list.length ? (
        <EmptyState
          className="m-5"
          icon={<Briefcase />}
          title="Post your first job"
          description="Listings go live immediately and appear in search and on the map."
          action={<ButtonLink href="/post-job"><Plus /> Post a job</ButtonLink>}
        />
      ) : (
        <ul className="divide-y divide-line">
          {list.slice(0, 5).map((j) => (
            <li key={j.id} className="flex items-center gap-3 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <Link href={`/jobs/${j.id}`} className="block truncate text-[14px] font-medium hover:text-brand-ink">{j.title}</Link>
                <p className="text-[12.5px] text-muted">Posted {timeAgo(j.created_at)}</p>
              </div>
              <span className={cn("inline-flex items-center gap-1.5 text-[12.5px] font-medium", j.status === "open" ? "text-accent-ink" : "text-muted")}>
                <span className={cn("size-1.5 rounded-full", j.status === "open" ? "bg-accent" : "bg-faint")} />
                {j.status === "open" ? "Open" : "Closed"}
              </span>
              <Link href={`/applicants?job=${j.id}`} className="w-24 text-right text-[13px] text-ink-2 hover:text-accent-ink">
                {j.applicant_count ?? 0} applicant{j.applicant_count === 1 ? "" : "s"}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
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
    { done: !!p.availability, label: "Set your availability" },
    { done: !!p.company_name, label: "Add a company or organization (for hiring)" },
  ];
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / items.length) * 100);
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold">Profile strength</h2>
        <span className="text-[13px] font-semibold tabular-nums text-accent-ink">{pct}%</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-raised" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Profile strength">
        <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
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
        <p className="mt-3 text-[13px] text-muted">Your profile is complete — employers and applicants see the full picture.</p>
      )}
    </Card>
  );
}

function RecentNotifications() {
  const { data, loading } = useApi<Notification[]>("/notifications?limit=5");
  return (
    <Card>
      <CardHeader title="Activity" action={<Link href="/notifications" className="text-[13px] font-medium text-brand-ink hover:text-brand">See all</Link>} />
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
