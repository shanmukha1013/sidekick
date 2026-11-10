"use client";

import Link from "next/link";
import { useState } from "react";
import { Briefcase, Eye, Pencil, Plus, Power, Trash2, Users } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, Card, PageHeader } from "@/components/ui/display";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/feedback";
import { ConfirmDialog, Tabs, useToast } from "@/components/ui/overlay";
import { JobLocation } from "@/components/jobs/JobCard";
import { api, errorMessage } from "@/lib/api";
import { formatDate, formatRate } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import type { Job } from "@/lib/types";

export default function EmployerJobsPage() {
  return (
    <Listings />
  );
}

function Listings() {
  const { data, error, loading, reload, setData } = useApi<Job[]>("/jobs/mine");
  const toast = useToast();
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");
  const [deleting, setDeleting] = useState<Job | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const list = data || [];
  const filtered = list.filter((j) => filter === "all" || j.status === filter);

  const toggleStatus = async (job: Job) => {
    setBusyId(job.id);
    const status = job.status === "open" ? "closed" : "open";
    try {
      const updated = await api.put<Job>(`/jobs/${job.id}`, { status });
      setData((cur) => cur?.map((j) => (j.id === job.id ? updated : j)));
      toast.success(status === "open" ? "Listing reopened" : "Listing closed to new applicants");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!deleting) return;
    setBusyId(deleting.id);
    try {
      await api.delete(`/jobs/${deleting.id}`);
      setData((cur) => cur?.filter((j) => j.id !== deleting.id));
      toast.success("Listing deleted");
      setDeleting(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="My Listings"
        description="Create, edit and manage the jobs you've posted."
        actions={
          <ButtonLink href="/post-job">
            <Plus /> Post a job
          </ButtonLink>
        }
      />
      <Tabs
        className="mb-4"
        value={filter}
        onChange={setFilter}
        items={[
          { value: "all", label: "All", count: list.length },
          { value: "open", label: "Open", count: list.filter((j) => j.status === "open").length },
          { value: "closed", label: "Closed", count: list.filter((j) => j.status !== "open").length },
        ]}
      />
      {loading ? (
        <SkeletonRows count={3} />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !filtered.length ? (
        <EmptyState
          icon={<Briefcase />}
          title={list.length ? "No listings here" : "You haven't posted any jobs"}
          description={list.length ? "Try a different filter." : "Post your first job to start receiving applications."}
          action={!list.length && <ButtonLink href="/post-job"><Plus /> Post a job</ButtonLink>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((job) => (
            <Card key={job.id} className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/jobs/${job.id}`} className="text-[15px] font-semibold hover:text-brand-ink">{job.title}</Link>
                    {job.status === "open" ? <Badge tone="success">Open</Badge> : <Badge tone="outline">Closed</Badge>}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
                    <span>{formatRate(job.hourly_rate)}</span>
                    <span>{job.job_type}</span>
                    <JobLocation job={job} />
                    <span>Posted {formatDate(job.created_at)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <ButtonLink href={`/applicants?job=${job.id}`} variant="secondary" size="sm">
                    <Users /> {job.applicant_count ?? 0} applicant{job.applicant_count === 1 ? "" : "s"}
                  </ButtonLink>
                  <ButtonLink href={`/jobs/${job.id}`} variant="ghost" size="icon-sm" aria-label="View listing" title="View">
                    <Eye />
                  </ButtonLink>
                  <ButtonLink href={`/listings/${job.id}/edit`} variant="ghost" size="icon-sm" aria-label="Edit listing" title="Edit">
                    <Pencil />
                  </ButtonLink>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => toggleStatus(job)}
                    loading={busyId === job.id}
                    aria-label={job.status === "open" ? "Close listing" : "Reopen listing"}
                    title={job.status === "open" ? "Close to new applicants" : "Reopen"}
                  >
                    {busyId !== job.id && <Power />}
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(job)} aria-label="Delete listing" title="Delete" className="hover:bg-brand-soft hover:text-brand-ink">
                    <Trash2 />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        loading={!!deleting && busyId === deleting.id}
        destructive
        title="Delete this listing?"
        confirmLabel="Delete listing"
        description={
          <>
            “{deleting?.title}” and its {deleting?.applicant_count ?? 0} application(s) and conversations will be permanently deleted. Active applicants will be
            notified. To stop new applications but keep history, close the listing instead.
          </>
        }
      />
    </div>
  );
}
