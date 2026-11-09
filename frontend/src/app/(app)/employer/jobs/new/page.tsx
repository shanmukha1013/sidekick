"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { RequireRole } from "@/components/app/RequireRole";
import { JobForm } from "@/components/jobs/JobForm";
import { PageHeader } from "@/components/ui/display";
import { useToast } from "@/components/ui/overlay";
import { api } from "@/lib/api";
import type { Job } from "@/lib/types";

export default function NewJobPage() {
  const router = useRouter();
  const toast = useToast();
  return (
    <RequireRole role="employer">
      <div className="max-w-3xl">
        <Link href="/employer/jobs" className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> Job listings
        </Link>
        <PageHeader title="Post a job" description="Your listing goes live as soon as you publish it." />
        <JobForm
          submitLabel="Publish job"
          onCancel={() => router.push("/employer/jobs")}
          onSubmit={async (payload) => {
            const job = await api.post<Job>("/jobs", payload);
            toast.success("Job published");
            router.push(`/jobs/${job.id}`);
          }}
        />
      </div>
    </RequireRole>
  );
}
