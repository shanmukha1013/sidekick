"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  CalendarCheck,
  Code,
  FileText,
  Headphones,
  HeartPulse,
  Megaphone,
  MapPin,
  MessageSquare,
  Palette,
  PartyPopper,
  Search,
  Shapes,
  Store,
  Truck,
  UserCheck,
  Users,
  Utensils,
  ClipboardList,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { JobCard } from "@/components/jobs/JobCard";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import { JOB_CATEGORIES, type JobList } from "@/lib/types";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "Retail & Sales": Store,
  "Food & Hospitality": Utensils,
  "Tutoring & Education": BookOpen,
  "Delivery & Logistics": Truck,
  "Customer Support": Headphones,
  "Software & IT": Code,
  "Design & Creative": Palette,
  "Marketing & Content": Megaphone,
  Administrative: ClipboardList,
  "Events & Promotions": PartyPopper,
  "Healthcare & Care": HeartPulse,
  Other: Shapes,
};

const SEEKER_STEPS = [
  { icon: UserCheck, title: "Create one account", body: "Sign up once, tell us your skills and the kind of work you want." },
  { icon: Search, title: "Find the right role", body: "Search by category, location and schedule. Save jobs for later." },
  { icon: FileText, title: "Apply and follow up", body: "Track every application's status and message employers directly." },
];
const EMPLOYER_STEPS = [
  { icon: Briefcase, title: "Post a job in minutes", body: "Describe the role, pay and schedule. It goes live immediately." },
  { icon: Users, title: "Review applicants", body: "See cover letters and profiles, then shortlist, accept or decline." },
  { icon: MessageSquare, title: "Hire with confidence", body: "Message candidates in context and keep hiring organised." },
];

export default function LandingPage() {
  const { status } = useAuth();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");
  const latest = useApi<JobList>("/jobs?limit=4");
  const authed = status === "authenticated";

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (loc.trim()) sp.set("location", loc.trim());
    router.push(`/jobs${sp.toString() ? `?${sp}` : ""}`);
  };

  return (
    <div className="min-h-dvh bg-surface">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-surface/85 backdrop-blur-md">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Logo />
          <nav className="hidden items-center gap-7 text-[14px] text-ink-2 md:flex" aria-label="Primary">
            <Link href="/jobs" className="hover:text-ink">Find jobs</Link>
            <a href="#how-it-works" className="hover:text-ink">How it works</a>
            <a href="#employers" className="hover:text-ink">For employers</a>
          </nav>
          <div className="flex items-center gap-2">
            {authed ? (
              <ButtonLink href="/dashboard" size="sm">
                Dashboard <ArrowRight />
              </ButtonLink>
            ) : (
              <>
                <ButtonLink href="/login" variant="ghost" size="sm">Sign in</ButtonLink>
                <ButtonLink href="/register" size="sm">Get started</ButtonLink>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-line">
          <div aria-hidden="true" className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
          <div className="container-page relative pb-20 pt-16 text-center sm:pb-28 sm:pt-24">
            <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[12.5px] font-medium text-ink-2 shadow-xs">
              <span className="size-1.5 rounded-full bg-brand" /> Part-time, flexible and entry-level work
            </p>
            <h1 className="mx-auto mt-6 max-w-4xl text-balance text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[60px]">
              Work that fits around your life.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-muted sm:text-[18px]">
              Sidekick connects students and job seekers with employers hiring for part-time roles — and gives both sides one simple place to apply,
              hire and talk.
            </p>

            <form onSubmit={search} role="search" className="mx-auto mt-10 flex max-w-2xl flex-col gap-2 rounded-2xl border border-line bg-surface p-2 text-left shadow-pop sm:flex-row">
              <label htmlFor="hero-q" className="sr-only">Keywords</label>
              <Input id="hero-q" leading={<Search />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Job title or skill" containerClassName="sm:flex-1" className="h-11 border-transparent shadow-none" />
              <div className="hidden w-px bg-line sm:block" />
              <label htmlFor="hero-loc" className="sr-only">Location</label>
              <Input id="hero-loc" leading={<MapPin />} value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="City" containerClassName="sm:w-48" className="h-11 border-transparent shadow-none" />
              <Button type="submit" size="lg" className="sm:px-6">
                Search jobs
              </Button>
            </form>
            <p className="mt-5 text-[13.5px] text-muted">
              Hiring?{" "}
              <Link href={authed ? "/employer/jobs/new" : "/register"} className="font-medium text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
                Post a job
              </Link>
            </p>
          </div>
        </section>

        {/* Categories */}
        <section className="container-page py-20">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-[26px] font-semibold tracking-[-0.025em] sm:text-[30px]">Browse by category</h2>
              <p className="mt-1.5 text-[15px] text-muted">From weekend retail shifts to remote tutoring.</p>
            </div>
            <Link href="/jobs" className="inline-flex items-center gap-1 text-[14px] font-medium text-brand hover:text-brand-hover">
              All jobs <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {JOB_CATEGORIES.map((c) => {
              const Icon = CATEGORY_ICONS[c] || Shapes;
              return (
                <Link
                  key={c}
                  href={`/jobs?category=${encodeURIComponent(c)}`}
                  className="group flex items-center gap-3 rounded-xl border border-line bg-surface p-4 transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-card"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-canvas text-ink-2 transition-colors group-hover:text-ink">
                    <Icon className="size-[17px]" />
                  </span>
                  <span className="min-w-0 text-[13.5px] font-medium leading-snug text-ink-2 group-hover:text-ink">{c}</span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Latest jobs (live data; hidden when there are none) */}
        {!!latest.data?.items.length && (
          <section className="border-y border-line bg-canvas py-20">
            <div className="container-page">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-[26px] font-semibold tracking-[-0.025em] sm:text-[30px]">Latest openings</h2>
                  <p className="mt-1.5 text-[15px] text-muted">Recently posted by employers on Sidekick.</p>
                </div>
                <Link href="/jobs" className="inline-flex items-center gap-1 text-[14px] font-medium text-brand hover:text-brand-hover">
                  View all {latest.data.total} <ArrowRight className="size-4" />
                </Link>
              </div>
              <div className="mt-8 grid gap-3 md:grid-cols-2">
                {latest.data.items.map((job) => (
                  <JobCard key={job.id} job={job} showSave={false} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* How it works */}
        <section id="how-it-works" className="container-page scroll-mt-20 py-20">
          <div className="max-w-2xl">
            <h2 className="text-[26px] font-semibold tracking-[-0.025em] sm:text-[30px]">One account. Both sides of the job.</h2>
            <p className="mt-1.5 text-[15px] text-muted">
              Everyone signs up the same way. Choose to find work, hire, or both — and switch any time.
            </p>
          </div>
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {[
              { id: "seekers", title: "For job seekers", steps: SEEKER_STEPS, cta: { href: "/register", label: "Start looking" } },
              { id: "employers", title: "For employers", steps: EMPLOYER_STEPS, cta: { href: authed ? "/employer/jobs/new" : "/register", label: "Start hiring" } },
            ].map((col) => (
              <div key={col.id} id={col.id} className="scroll-mt-24 rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8">
                <h3 className="text-[17px] font-semibold tracking-[-0.01em]">{col.title}</h3>
                <ol className="mt-6 space-y-6">
                  {col.steps.map(({ icon: Icon, title, body }, i) => (
                    <li key={title} className="flex gap-4">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-canvas text-ink-2">
                        <Icon className="size-[18px]" />
                      </span>
                      <div>
                        <p className="text-[14.5px] font-semibold">
                          <span className="mr-2 font-mono text-[12px] text-faint">0{i + 1}</span>
                          {title}
                        </p>
                        <p className="mt-1 text-[14px] leading-relaxed text-muted">{body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <ButtonLink href={col.cta.href} variant="secondary" className="mt-8">
                  {col.cta.label} <ArrowRight />
                </ButtonLink>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container-page pb-20">
          <div className="relative overflow-hidden rounded-2xl bg-ink px-6 py-14 text-center text-white sm:px-12">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage: "linear-gradient(to right,#fff 1px,transparent 1px),linear-gradient(to bottom,#fff 1px,transparent 1px)",
                backgroundSize: "40px 40px",
                maskImage: "radial-gradient(ellipse at center, black 10%, transparent 70%)",
              }}
            />
            <CalendarCheck className="relative mx-auto size-6 text-white/70" />
            <h2 className="relative mt-4 text-[26px] font-semibold tracking-[-0.025em] sm:text-[32px]">Your next shift starts here.</h2>
            <p className="relative mx-auto mt-2 max-w-md text-[15px] text-white/60">Create a free account in under a minute.</p>
            <div className="relative mt-8 flex flex-col justify-center gap-2 sm:flex-row">
              <ButtonLink href={authed ? "/dashboard" : "/register"} size="lg" className="bg-white text-ink hover:bg-white/90">
                {authed ? "Go to dashboard" : "Create account"}
              </ButtonLink>
              <ButtonLink href="/jobs" size="lg" variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
                Browse jobs
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="container-page flex flex-col items-start justify-between gap-6 py-10 sm:flex-row sm:items-center">
          <div>
            <Logo size={24} wordmarkClassName="text-[15px]" />
            <p className="mt-2 text-[13px] text-muted">Part-time work, done right.</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[13.5px] text-muted" aria-label="Footer">
            <Link href="/jobs" className="hover:text-ink">Find jobs</Link>
            <a href="#employers" className="hover:text-ink">For employers</a>
            <Link href="/login" className="hover:text-ink">Sign in</Link>
            <Link href="/register" className="hover:text-ink">Create account</Link>
          </nav>
          <p className="text-[12.5px] text-faint">© {new Date().getFullYear()} Sidekick</p>
        </div>
      </footer>
    </div>
  );
}
