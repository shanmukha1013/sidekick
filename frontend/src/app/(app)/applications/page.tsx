"use client";

import Link from "next/link";
import { useState } from "react";
import { FileText, MessageSquare } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Avatar, Card, PageHeader, StatusBadge } from "@/components/ui/display";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/feedback";
import { ConfirmDialog, Tabs, useToast } from "@/components/ui/overlay";
import { api, errorMessage } from "@/lib/api";
import { formatDate, formatRate } from "@/lib/format";
import { emitCountsChanged, useApi } from "@/lib/hooks";
import type { Application } from "@/lib/types";

type Filter = "all" | "active" | "accepted" | "closed";
const ACTIVE = ["pending", "reviewing", "shortlisted"];

export default function ApplicationsPage() {
  const { data, error, loading, reload, setData } = useApi<Application[]>("/applications/mine");
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("all");
  const [withdrawing, setWithdrawing] = useState<Application | null>(null);
  const [busy, setBusy] = useState(false);

  const list = data || [];
  const filtered = list.filter((a) =>
    filter === "all" ? true : filter === "active" ? ACTIVE.includes(a.status) : filter === "accepted" ? a.status === "accepted" : ["rejected", "withdrawn"].includes(a.status),
  );

  const withdraw = async () => {
    if (!withdrawing) return;
    setBusy(true);
    try {
      const updated = await api.post<Application>(`/applications/${withdrawing.id}/withdraw`);
      setData((cur) => cur?.map((a) => (a.id === updated.id ? { ...a, status: updated.status } : a)));
      toast.success("Application withdrawn");
      emitCountsChanged();
      setWithdrawing(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <PageHeader title="My applications" description="Track every job you've applied to." />
      <Tabs
        className="mb-4"
        value={filter}
        onChange={setFilter}
        items={[
          { value: "all", label: "All", count: list.length },
          { value: "active", label: "In progress", count: list.filter((a) => ACTIVE.includes(a.status)).length },
          { value: "accepted", label: "Accepted", count: list.filter((a) => a.status === "accepted").length },
          { value: "closed", label: "Closed", count: list.filter((a) => ["rejected", "withdrawn"].includes(a.status)).length },
        ]}
      />
      {loading ? (
        <SkeletonRows count={3} />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !filtered.length ? (
        <EmptyState
          icon={<FileText />}
          title={list.length ? "Nothing here" : "No applications yet"}
          description={list.length ? "No applications match this filter." : "When you apply to a job, you can follow its status here."}
          action={!list.length && <ButtonLink href="/jobs">Find jobs</ButtonLink>}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((a) => (
            <Card key={a.id} className="p-4 sm:p-5">
              <div className="flex items-start gap-3.5">
                <Avatar name={a.job?.company_name || a.job?.title} size={42} square />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      {a.job ? (
                        <Link href={`/jobs/${a.job.id}`} className="text-[15px] font-semibold hover:text-brand-ink">{a.job.title}</Link>
                      ) : (
                        <p className="text-[15px] font-semibold text-muted">Listing removed</p>
                      )}
                      <p className="mt-0.5 text-[13px] text-muted">
                        {a.job?.company_name}
                        {a.job && ` · ${formatRate(a.job.hourly_rate)}`} · Applied {formatDate(a.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                  {a.cover_letter && <p className="mt-3 line-clamp-2 text-[13.5px] leading-relaxed text-ink-2">{a.cover_letter}</p>}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {a.job && a.status !== "withdrawn" && (
                      <ButtonLink href={`/messages?thread=${a.id}`} variant="secondary" size="sm">
                        <MessageSquare /> Message employer
                      </ButtonLink>
                    )}
                    {ACTIVE.includes(a.status) && (
                      <Button variant="danger-ghost" size="sm" onClick={() => setWithdrawing(a)}>
                        Withdraw
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <ConfirmDialog
        open={!!withdrawing}
        onClose={() => setWithdrawing(null)}
        onConfirm={withdraw}
        loading={busy}
        destructive
        title="Withdraw application?"
        confirmLabel="Withdraw"
        description={`The employer will be notified that you withdrew from “${withdrawing?.job?.title}”. You can't re-apply to this job.`}
      />
    </div>
  );
}
