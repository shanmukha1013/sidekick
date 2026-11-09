"use client";

import { Bookmark } from "lucide-react";
import { RequireRole } from "@/components/app/RequireRole";
import { JobCard } from "@/components/jobs/JobCard";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/display";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/feedback";
import { useApi } from "@/lib/hooks";
import type { Job } from "@/lib/types";

export default function SavedJobsPage() {
  return (
    <RequireRole role="seeker">
      <SavedJobs />
    </RequireRole>
  );
}

function SavedJobs() {
  const { data, error, loading, reload, setData } = useApi<Job[]>("/saved-jobs");
  return (
    <div className="max-w-3xl">
      <PageHeader title="Saved jobs" description="Jobs you've bookmarked to come back to." />
      {loading ? (
        <SkeletonRows count={3} />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data?.length ? (
        <EmptyState
          icon={<Bookmark />}
          title="No saved jobs"
          description="Tap the bookmark on any job to keep it here."
          action={<ButtonLink href="/jobs">Browse jobs</ButtonLink>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((job) => (
            <JobCard key={job.id} job={job} onSavedChange={(saved) => !saved && setData((cur) => cur?.filter((j) => j.id !== job.id))} />
          ))}
        </div>
      )}
    </div>
  );
}
