"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, StatusBadge } from "@/components/ui/display";
import { EmptyState, ErrorState, Skeleton, Spinner } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/overlay";
import { api, type ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatTime, timeAgo } from "@/lib/format";
import { emitCountsChanged, toApiError, useApi } from "@/lib/hooks";
import type { Message, Thread } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function MessagesPage() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const active = params.get("thread");
  const threads = useApi<Thread[]>("/messages/threads");
  const { reload: reloadThreads } = threads;

  useEffect(() => {
    const id = setInterval(() => document.visibilityState === "visible" && reloadThreads(), 20_000);
    return () => clearInterval(id);
  }, [reloadThreads]);

  const select = (id: string | null) => router.replace(id ? `${pathname}?thread=${id}` : pathname, { scroll: false });
  const current = threads.data?.find((t) => t.application_id === active) || null;

  return (
    <div>
      <h1 className="mb-5 text-[22px] font-semibold tracking-[-0.02em] sm:text-2xl">Messages</h1>
      <div className="grid h-[calc(100dvh-11rem)] min-h-[480px] overflow-hidden rounded-xl border border-line bg-surface shadow-card md:grid-cols-[300px_minmax(0,1fr)] lg:h-[calc(100dvh-12rem)]">
        <aside className={cn("flex min-h-0 flex-col border-line md:border-r", active && "hidden md:flex")}>
          <div className="border-b border-line px-4 py-3 text-[13px] font-medium text-muted">Conversations</div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {threads.loading && !threads.data ? (
              <div className="space-y-3 p-4">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : threads.error && !threads.data ? (
              <ErrorState className="m-3 border-0" error={threads.error} onRetry={threads.reload} />
            ) : !threads.data?.length ? (
              <p className="px-5 py-10 text-center text-[13px] leading-relaxed text-muted">
                Conversations open when you apply to a job or receive an application.
              </p>
            ) : (
              <ul>
                {threads.data.map((t) => (
                  <li key={t.application_id}>
                    <button
                      onClick={() => select(t.application_id)}
                      className={cn(
                        "flex w-full items-start gap-3 border-b border-line px-4 py-3 text-left transition-colors",
                        t.application_id === active ? "bg-subtle" : "hover:bg-subtle",
                      )}
                    >
                      <Avatar name={t.counterpart_name} src={t.counterpart_avatar} size={36} square={t.my_side === "applicant"} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className={cn("truncate text-[13.5px]", t.unread_count ? "font-semibold" : "font-medium")}>{t.counterpart_name}</p>
                          <span className="shrink-0 text-[11.5px] text-faint">{t.last_message ? timeAgo(t.last_message.created_at) : ""}</span>
                        </div>
                        <p className="truncate text-[12px] text-muted">{t.job_title}</p>
                        <p className={cn("mt-0.5 truncate text-[12.5px]", t.unread_count ? "text-ink" : "text-faint")}>
                          {t.last_message ? t.last_message.body : "No messages yet"}
                        </p>
                      </div>
                      {t.unread_count > 0 && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" aria-label={`${t.unread_count} unread`} />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
        <section className={cn("flex min-h-0 flex-col", !active && "hidden md:flex")}>
          {active ? (
            <Conversation key={active} applicationId={active} thread={current} onBack={() => select(null)} onActivity={reloadThreads} />
          ) : (
            <div className="flex flex-1 items-center justify-center p-6">
              <EmptyState className="border-0" icon={<MessageSquare />} title="Select a conversation" description="Messages are tied to a job application, so context is always one click away." />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Conversation({ applicationId, thread, onBack, onActivity }: { applicationId: string; thread: Thread | null; onBack: () => void; onActivity: () => void }) {
  const { user } = useAuth();
  const toast = useToast();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [retry, setRetry] = useState(0);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);
  const onActivityRef = useRef(onActivity);
  useEffect(() => {
    onActivityRef.current = onActivity;
  });

  useEffect(() => {
    let alive = true;
    const load = (first: boolean) =>
      api
        .get<Message[]>(`/messages/threads/${applicationId}`)
        .then((res) => {
          if (!alive) return;
          setMessages(res);
          setError(null);
          emitCountsChanged();
          if (first) onActivityRef.current();
        })
        .catch((err) => alive && setError(toApiError(err)));
    load(true);
    const id = setInterval(() => document.visibilityState === "visible" && load(false), 8000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [applicationId, retry]);

  useEffect(() => {
    if (messages && messages.length !== lastCount.current) {
      lastCount.current = messages.length;
      bottomRef.current?.scrollIntoView({ block: "end" });
    }
  }, [messages]);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const msg = await api.post<Message>(`/messages/threads/${applicationId}`, { body });
      setMessages((cur) => [...(cur || []), msg]);
      setDraft("");
      onActivity();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <Button variant="ghost" size="icon-sm" className="-ml-1 md:hidden" onClick={onBack} aria-label="Back to conversations">
          <ArrowLeft />
        </Button>
        {thread ? (
          <>
            <Avatar name={thread.counterpart_name} src={thread.counterpart_avatar} size={34} square={thread.my_side === "applicant"} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold">{thread.counterpart_name}</p>
              <Link href={`/jobs/${thread.job_id}`} className="block truncate text-[12.5px] text-muted hover:text-brand-ink">
                {thread.job_title}
              </Link>
            </div>
            <StatusBadge status={thread.application_status} />
          </>
        ) : (
          <Skeleton className="h-8 w-48" />
        )}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto bg-canvas px-4 py-5">
        {error && !messages ? (
          <ErrorState error={error} onRetry={() => setRetry((n) => n + 1)} className="border-0 bg-transparent" />
        ) : !messages ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : !messages.length ? (
          <p className="py-10 text-center text-[13px] text-muted">No messages yet. Say hello.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {messages.map((m, i) => {
              const mine = m.sender_id === user?.id;
              const prev = messages[i - 1];
              const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
              return (
                <li key={m.id} className="flex flex-col">
                  {newDay && <p className="my-3 text-center text-[11.5px] font-medium text-faint">{formatDate(m.created_at, { weekday: "short", day: "numeric", month: "short" })}</p>}
                  <div className={cn("flex max-w-[85%] flex-col sm:max-w-[70%]", mine ? "self-end items-end" : "self-start items-start")}>
                    <p
                      className={cn(
                        "whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed",
                        mine ? "rounded-br-md bg-brand text-paper" : "rounded-bl-md border border-black/10 bg-surface text-ink",
                      )}
                    >
                      {m.body}
                    </p>
                    <span className="mt-1 px-1 text-[11px] text-faint">{formatTime(m.created_at)}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex items-end gap-2 border-t border-line p-3">
        <label htmlFor="composer" className="sr-only">Message</label>
        <textarea
          id="composer"
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          maxLength={4000}
          placeholder="Write a message…"
          className="max-h-40 min-h-10 flex-1 resize-none rounded-lg border border-field-line bg-field px-3 py-2 text-[14px] text-paper shadow-xs placeholder:text-paper/40 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/35"
        />
        <Button type="submit" size="icon" loading={sending} disabled={!draft.trim()} aria-label="Send message" className="h-10 w-10">
          {!sending && <Send />}
        </Button>
      </form>
    </>
  );
}
