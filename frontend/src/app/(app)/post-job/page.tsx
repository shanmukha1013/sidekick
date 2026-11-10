"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { JobForm } from "@/components/jobs/JobForm";
import { PageHeader } from "@/components/ui/display";
import { useToast } from "@/components/ui/overlay";
import { api } from "@/lib/api";
import type { Job } from "@/lib/types";

export default function NewJobPage() {
  const router = useRouter();
  const toast = useToast();
  return (
    <div className="max-w-3xl">
      <Link href="/listings" className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> My Listings
      </Link>
      <PageHeader title="Post a job" description="Your listing goes live as soon as you publish it." />
      <JobForm
        submitLabel="Publish job"
        onCancel={() => router.push("/listings")}
        onSubmit={async (payload) => {
          const job = await api.post<Job>("/jobs", payload);
          toast.success("Job published");
          router.push(`/jobs/${job.id}`);
        }}
      />
    </div>
  );
}
