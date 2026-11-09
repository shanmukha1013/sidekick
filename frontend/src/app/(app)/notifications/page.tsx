"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, BriefcaseBusiness, CheckCheck, CircleCheck, CircleX, FileText, Star, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/display";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/overlay";
import { api, errorMessage } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { emitCountsChanged, useApi } from "@/lib/hooks";
import type { Notification } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  application_received: FileText,
  application_accepted: CircleCheck,
  application_rejected: CircleX,
  application_shortlisted: Star,
  application_reviewing: FileText,
  application_withdrawn: UserMinus,
  job_removed: BriefcaseBusiness,
};

export default function NotificationsPage() {
  const { data, error, loading, reload, setData } = useApi<Notification[]>("/notifications");
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const unread = (data || []).filter((n) => !n.is_read).length;

  const open = async (n: Notification) => {
    if (!n.is_read) {
      setData((cur) => cur?.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      api.post(`/notifications/${n.id}/read`).then(emitCountsChanged).catch(() => {});
    }
    if (n.link) router.push(n.link);
  };

  const markAll = async () => {
    setBusy(true);
    try {
      await api.post("/notifications/read-all");
      setData((cur) => cur?.map((x) => ({ ...x, is_read: true })));
      emitCountsChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Notifications"
        description={unread ? `${unread} unread` : "You're all caught up."}
        actions={
          unread > 0 && (
            <Button variant="secondary" size="sm" onClick={markAll} loading={busy}>
              <CheckCheck /> Mark all as read
            </Button>
          )
        }
      />
      {loading ? (
        <SkeletonRows count={4} />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data?.length ? (
        <EmptyState icon={<Bell />} title="No notifications yet" description="Updates about your applications and listings will show up here." />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {data.map((n) => {
              const Icon = ICONS[n.type] || Bell;
              return (
                <li key={n.id}>
                  <button onClick={() => open(n)} className={cn("flex w-full items-start gap-3.5 px-4 py-4 text-left transition-colors hover:bg-canvas sm:px-5", !n.is_read && "bg-brand-soft/40")}>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink-2">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-[14px] leading-snug", n.is_read ? "text-ink-2" : "font-semibold text-ink")}>{n.title}</p>
                      {n.body && <p className="mt-0.5 text-[13px] text-muted">{n.body}</p>}
                      <p className="mt-1 text-[12px] text-faint">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.is_read && <span className="mt-2 size-2 shrink-0 rounded-full bg-brand" aria-label="Unread" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
