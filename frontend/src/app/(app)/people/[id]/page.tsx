"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Building2, Calendar, Clock, ExternalLink, Globe, MapPin } from "lucide-react";
import { Avatar, Badge, Card } from "@/components/ui/display";
import { ErrorState, SkeletonRows } from "@/components/ui/feedback";
import { formatDate } from "@/lib/format";
import { useApi } from "@/lib/hooks";
import { AVAILABILITY_LABELS, type Profile } from "@/lib/types";

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-5">
      <h2 className="text-[14px] font-semibold">{title}</h2>
      <div className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-ink-2">{children}</div>
    </section>
  );
}

export default function PersonPage() {
  const { id } = useParams<{ id: string }>();
  const { data: p, error, loading, reload } = useApi<Profile>(`/profiles/${id}`);

  return (
    <div className="max-w-3xl">
      <button onClick={() => history.back()} className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Back
      </button>
      {loading ? (
        <SkeletonRows count={2} />
      ) : error || !p ? (
        <ErrorState error={error} onRetry={reload} />
      ) : (
        <Card className="p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar name={p.full_name} src={p.avatar_url} size={72} />
            <div className="min-w-0">
              <h1 className="text-[22px] font-semibold tracking-[-0.02em]">{p.full_name}</h1>
              {p.headline && <p className="mt-0.5 text-[14.5px] text-ink-2">{p.headline}</p>}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
                <span>@{p.username}</span>
                {p.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{p.location}</span>}
                {p.availability && <span className="inline-flex items-center gap-1"><Clock className="size-3.5" />{AVAILABILITY_LABELS[p.availability] || p.availability}</span>}
                {p.member_since && <span className="inline-flex items-center gap-1"><Calendar className="size-3.5" />Joined {formatDate(p.member_since, { month: "short", year: "numeric" })}</span>}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-5">
            {p.bio && <Block title="About">{p.bio}</Block>}
            {p.skills.length > 0 && (
              <section className="border-t border-line pt-5">
                <h2 className="text-[14px] font-semibold">Skills</h2>
                <div className="mt-2.5 flex flex-wrap gap-1.5">{p.skills.map((s) => <Badge key={s}>{s}</Badge>)}</div>
              </section>
            )}
            {p.experience && <Block title="Experience">{p.experience}</Block>}
            {p.education && <Block title="Education">{p.education}</Block>}
            {p.portfolio_links.length > 0 && (
              <section className="border-t border-line pt-5">
                <h2 className="text-[14px] font-semibold">Links</h2>
                <ul className="mt-2 space-y-1">
                  {p.portfolio_links.map((l) => (
                    <li key={l}>
                      <a href={l} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1.5 text-[14px] text-brand hover:text-brand-hover">
                        {l.replace(/^https?:\/\//, "")} <ExternalLink className="size-3" />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {p.company_name && (
              <section className="border-t border-line pt-5">
                <h2 className="text-[14px] font-semibold">Company</h2>
                <div className="mt-3 flex items-center gap-3">
                  <Avatar name={p.company_name} size={40} square />
                  <div>
                    <p className="inline-flex items-center gap-1.5 text-[14.5px] font-medium"><Building2 className="size-4 text-faint" />{p.company_name}</p>
                    {p.company_website && /^https?:\/\//.test(p.company_website) && (
                      <a href={p.company_website} target="_blank" rel="noopener noreferrer nofollow" className="mt-0.5 flex items-center gap-1 text-[13px] text-brand hover:text-brand-hover">
                        <Globe className="size-3.5" /> {p.company_website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </div>
                </div>
                {p.company_description && <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-ink-2">{p.company_description}</p>}
                {p.roles.includes("employer") && (
                  <Link href={`/jobs?q=${encodeURIComponent(p.company_name)}`} className="mt-3 inline-block text-[13px] font-medium text-brand hover:text-brand-hover">
                    See open jobs from {p.company_name}
                  </Link>
                )}
              </section>
            )}
            {!p.bio && !p.skills.length && !p.experience && !p.education && !p.company_name && (
              <p className="border-t border-line pt-5 text-[14px] text-muted">{p.full_name} hasn&apos;t added profile details yet.</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
