"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { RequireRole } from "@/components/app/RequireRole";
import { JobForm } from "@/components/jobs/JobForm";
import { PageHeader } from "@/components/ui/display";
import { ErrorState, SkeletonRows } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/overlay";
import { api, ApiError } from "@/lib/api";
import { useApi } from "@/lib/hooks";
import type { Job } from "@/lib/types";

export default function EditJobPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { data: job, error, loading, reload } = useApi<Job>(`/jobs/${id}`);

  return (
    <RequireRole role="employer">
      <div className="max-w-3xl">
        <Link href="/employer/jobs" className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> Job listings
        </Link>
        <PageHeader title="Edit listing" description={job?.title} />
        {loading ? (
          <SkeletonRows count={2} />
        ) : error || !job ? (
          <ErrorState error={error} onRetry={reload} />
        ) : !job.is_owner ? (
          <ErrorState error={new ApiError("You can only edit jobs that you posted.", 403)} />
        ) : (
          <JobForm
            job={job}
            submitLabel="Save changes"
            onCancel={() => router.push("/employer/jobs")}
            onSubmit={async (payload) => {
              await api.put<Job>(`/jobs/${job.id}`, payload);
              toast.success("Listing updated");
              router.push(`/jobs/${job.id}`);
            }}
          />
        )}
      </div>
    </RequireRole>
  );
}
