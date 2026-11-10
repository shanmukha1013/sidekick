"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  BellRing,
  BookOpen,
  Bookmark,
  Briefcase,
  Building2,
  ClipboardList,
  Code,
  FileText,
  Headphones,
  HeartPulse,
  LayoutDashboard,
  MapPin,
  Megaphone,
  MessageSquare,
  Palette,
  PartyPopper,
  Search,
  Shapes,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Truck,
  UserCheck,
  Users,
  Utensils,
} from "lucide-react";
import { DemoBadge } from "@/components/app/DemoBadge";
import { Logo } from "@/components/brand/Logo";
import { JobCard } from "@/components/jobs/JobCard";
import { Button, ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/display";
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

const POPULAR = ["Barista", "Tutor", "Delivery", "Designer", "React", "Customer support"];

const FEATURES = [
  { icon: SlidersHorizontal, title: "Search that respects your time", body: "Filter by category, pay, schedule, experience and on-site or remote work." },
  { icon: Bookmark, title: "Save and apply in one place", body: "Shortlist roles you like and apply with a tailored note in under a minute." },
  { icon: BellRing, title: "Always know where you stand", body: "Every status change notifies you — from submitted to accepted." },
];

const SEEKER_STEPS = [
  { icon: UserCheck, title: "Create one account", body: "Sign up once, then tell us your skills and the kind of work you want." },
  { icon: Search, title: "Find the right role", body: "Search by category, location and schedule. Save jobs for later." },
  { icon: FileText, title: "Apply and follow up", body: "Track every application's status and message employers directly." },
];

const EMPLOYER_POINTS = [
  { icon: Briefcase, title: "Post a job in minutes", body: "Describe the role, pay and schedule. It goes live immediately." },
  { icon: Users, title: "Review applicants", body: "Read cover notes and profiles, then shortlist, accept or decline." },
  { icon: MessageSquare, title: "Talk in context", body: "Message candidates from each application and keep hiring organised." },
  { icon: LayoutDashboard, title: "One dashboard for everything", body: "Your listings, applicants, applications and saved jobs side by side." },
];

const delay = (ms: number) => ({ animationDelay: `${ms}ms` });

export default function LandingPage() {
  const { status } = useAuth();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");
  const latest = useApi<JobList>("/jobs?limit=4");
  const authed = status === "authenticated";
  const postHref = authed ? "/post-job" : "/register";

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (loc.trim()) sp.set("location", loc.trim());
    router.push(`/jobs${sp.toString() ? `?${sp}` : ""}`);
  };

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/80 backdrop-blur-md">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Logo />
          <nav className="hidden items-center gap-1 text-[14px] text-ink-2 md:flex" aria-label="Primary">
            <Link href="/jobs" className="rounded-md px-3 py-1.5 transition-colors hover:bg-raised hover:text-ink">Find jobs</Link>
            <a href="#how-it-works" className="rounded-md px-3 py-1.5 transition-colors hover:bg-raised hover:text-ink">How it works</a>
            <a href="#employers" className="rounded-md px-3 py-1.5 transition-colors hover:bg-raised hover:text-ink">Hiring</a>
          </nav>
          <div className="flex items-center gap-2">
            <DemoBadge />
            {authed ? (
              <ButtonLink href="/dashboard" size="sm">
                Dashboard <ArrowRight />
              </ButtonLink>
            ) : (
              <>
                <ButtonLink href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">Sign in</ButtonLink>
                <ButtonLink href="/register" size="sm">Get started</ButtonLink>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-line bg-hero-glow">
          <div aria-hidden="true" className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black_20%,transparent_75%)]" />
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[-18rem] h-[36rem] w-[60rem] -translate-x-1/2 rounded-full bg-brand/10 blur-3xl" />
          <div className="container-page relative pb-20 pt-14 text-center sm:pb-24 sm:pt-20">
            <p className="mx-auto inline-flex animate-rise items-center gap-2 rounded-full border border-line-strong/70 bg-surface/80 px-3 py-1 text-[12.5px] font-medium text-ink-2 shadow-xs backdrop-blur" style={delay(0)}>
              <span className="size-1.5 animate-pulse-ring rounded-full bg-accent" /> Find work and hire — from one account
            </p>
            <h1
              className="mx-auto mt-6 max-w-4xl animate-rise text-balance text-[42px] font-semibold leading-[1.03] tracking-[-0.04em] text-ink sm:text-[68px]"
              style={delay(80)}
            >
              Work that fits{" "}
              <span className="bg-gradient-to-b from-[#ff6a66] to-brand bg-clip-text text-transparent">around your life.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl animate-rise text-[16px] leading-relaxed text-muted sm:text-[18px]" style={delay(160)}>
              Sidekick is one marketplace for flexible work. Apply for jobs and hire people from the same account and the same dashboard.
            </p>

            <form
              onSubmit={search}
              role="search"
              className="mx-auto mt-10 flex max-w-2xl animate-rise flex-col gap-2 rounded-2xl border border-line-strong/60 bg-surface p-2 text-left shadow-pop sm:flex-row"
              style={delay(240)}
            >
              <label htmlFor="hero-q" className="sr-only">Keywords</label>
              <Input id="hero-q" leading={<Search />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Job title, skill or company" containerClassName="sm:flex-1" className="h-12 border-transparent bg-transparent text-[15px] shadow-none" />
              <div className="hidden w-px bg-line sm:block" />
              <label htmlFor="hero-loc" className="sr-only">Location</label>
              <Input id="hero-loc" leading={<MapPin />} value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="City or area" containerClassName="sm:w-48" className="h-12 border-transparent bg-transparent text-[15px] shadow-none" />
              <Button type="submit" size="lg" className="h-12 rounded-xl sm:px-6">
                <Search /> Search jobs
              </Button>
            </form>

            <div className="mx-auto mt-5 flex max-w-2xl animate-rise flex-wrap items-center justify-center gap-2" style={delay(320)}>
              <span className="text-[12.5px] font-medium text-faint">Popular:</span>
              {POPULAR.map((term) => (
                <Link
                  key={term}
                  href={`/jobs?q=${encodeURIComponent(term)}`}
                  className="rounded-full border border-line bg-surface/70 px-3 py-1 text-[12.5px] text-ink-2 transition-colors hover:border-line-strong hover:bg-surface hover:text-ink"
                >
                  {term}
                </Link>
              ))}
            </div>

            <div className="mt-10 flex animate-rise flex-col justify-center gap-2 sm:flex-row" style={delay(400)}>
              <ButtonLink href={authed ? "/dashboard" : "/register"} size="lg" className="rounded-xl">
                {authed ? "Go to dashboard" : "Get started — it's free"} <ArrowRight />
              </ButtonLink>
              <ButtonLink href={postHref} size="lg" variant="secondary" className="rounded-xl">
                <Building2 /> Post a job
              </ButtonLink>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="container-page py-20">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center lg:gap-12">
            <div>
              <p className="flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.12em] text-brand-ink"><span className="size-1.5 rounded-full bg-brand" /> Find work</p>
              <h2 className="mt-2 text-[28px] font-semibold leading-tight tracking-[-0.03em] text-ink sm:text-[36px]">
                From search to offer, without the guesswork.
              </h2>
              <div className="mt-8 grid gap-5 sm:grid-cols-3 lg:grid-cols-1">
                {FEATURES.map(({ icon: Icon, title, body }) => (
                  <div key={title} className="flex gap-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-brand/30 bg-brand-soft text-brand-ink">
                      <Icon className="size-[18px]" />
                    </span>
                    <div>
                      <p className="text-[15px] font-semibold text-ink">{title}</p>
                      <p className="mt-1 text-[14px] leading-relaxed text-muted">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Application status pipeline — the real status indicators used across the app */}
            <div className="relative mt-6 lg:mt-0">
              <div className="rounded-2xl border border-line bg-surface p-5 shadow-lift sm:p-6">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-semibold text-ink">How an application moves</p>
                  <span className="text-[12px] text-faint">Updated in real time</span>
                </div>
                <ol className="mt-5 space-y-3">
                  {(["pending", "reviewing", "shortlisted", "accepted"] as const).map((s, i) => (
                    <li key={s} className="flex items-center gap-3 rounded-xl border border-line bg-canvas/50 px-3.5 py-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface font-mono text-[11.5px] text-muted">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13.5px] font-medium text-ink">
                          {["You apply with a short note", "The employer reviews it", "You make the shortlist", "You're hired"][i]}
                        </p>
                        <p className="text-[12.5px] text-muted">
                          {["Your profile and note go to the employer", "You're notified the moment it's opened", "Message the employer to arrange next steps", "Confirm details and get started"][i]}
                        </p>
                      </div>
                      <StatusBadge status={s} />
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="border-y border-line bg-surface py-20">
          <div className="container-page">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-[26px] font-semibold tracking-[-0.03em] text-ink sm:text-[32px]">Browse by category</h2>
                <p className="mt-1.5 text-[15px] text-muted">From weekend retail shifts to remote tutoring.</p>
              </div>
              <Link href="/jobs" className="inline-flex items-center gap-1 text-[14px] font-medium text-ink-2 hover:text-ink">
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
                    className="group flex items-center gap-3 rounded-xl border border-line bg-surface p-4 shadow-xs transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-canvas text-brand-ink transition-colors group-hover:border-brand group-hover:bg-brand group-hover:text-on-brand">
                      <Icon className="size-[17px]" />
                    </span>
                    <span className="min-w-0 text-[13.5px] font-medium leading-snug text-ink-2 group-hover:text-ink">{c}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Latest jobs (real listings from the current data source; hidden when there are none) */}
        {!!latest.data?.items.length && (
          <section className="container-page py-20">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-[26px] font-semibold tracking-[-0.03em] text-ink sm:text-[32px]">Latest openings</h2>
                <p className="mt-1.5 text-[15px] text-muted">Recently posted by employers on Sidekick.</p>
              </div>
              <Link href="/jobs" className="inline-flex items-center gap-1 text-[14px] font-medium text-ink-2 hover:text-ink">
                View all {latest.data.total} <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="mt-8 grid gap-3 md:grid-cols-2">
              {latest.data.items.map((job) => (
                <JobCard key={job.id} job={job} showSave={false} />
              ))}
            </div>
          </section>
        )}

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20 border-t border-line py-20">
          <div className="container-page">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-[12.5px] font-semibold uppercase tracking-[0.12em] text-faint">How it works</p>
              <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-ink sm:text-[36px]">One account. Both sides of the job.</h2>
              <p className="mt-2 text-[15px] text-muted">Everyone signs up the same way, and every account can do both. Apply for jobs and post your own from one dashboard.</p>
            </div>
            <ol className="mt-12 grid gap-4 md:grid-cols-3">
              {SEEKER_STEPS.map(({ icon: Icon, title, body }, i) => (
                <li key={title} className="relative rounded-2xl border border-line bg-surface p-6 shadow-card">
                  <div className="flex items-center justify-between">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-brand text-on-brand shadow-glow-red">
                      <Icon className="size-[18px]" />
                    </span>
                    <span className="font-mono text-[12px] text-faint">0{i + 1}</span>
                  </div>
                  <p className="mt-5 text-[16px] font-semibold text-ink">{title}</p>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* For employers */}
        <section id="employers" className="container-page scroll-mt-20 pb-20">
          <div className="relative overflow-hidden rounded-3xl border border-line bg-brand-panel px-6 py-12 text-ink sm:px-12 sm:py-16">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-[0.05]"
              style={{
                backgroundImage: "linear-gradient(to right,#fff 1px,transparent 1px),linear-gradient(to bottom,#fff 1px,transparent 1px)",
                backgroundSize: "44px 44px",
                maskImage: "radial-gradient(ellipse at 80% 0%, black 10%, transparent 70%)",
              }}
            />
            <div className="relative grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
              <div>
                <p className="flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.12em] text-accent-ink"><span className="size-1.5 rounded-full bg-accent" /> Hire talent</p>
                <h2 className="mt-2 text-[28px] font-semibold leading-tight tracking-[-0.03em] sm:text-[38px]">Hire reliable people for flexible roles.</h2>
                <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted">
                  Post a role, review applicants and message candidates — from the same account and dashboard you use to find work. Nothing to switch on.
                </p>
                <div className="mt-8 flex flex-col gap-2 sm:flex-row">
                  <ButtonLink href={postHref} size="lg" variant="brand" className="rounded-xl">
                    <Briefcase /> Post a job
                  </ButtonLink>
                  <ButtonLink href="/jobs" size="lg" variant="ghost" className="rounded-xl">
                    See live listings <ArrowRight />
                  </ButtonLink>
                </div>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {EMPLOYER_POINTS.map(({ icon: Icon, title, body }) => (
                  <li key={title} className="rounded-2xl border border-line bg-surface/70 p-5 backdrop-blur-sm">
                    <span className="flex size-9 items-center justify-center rounded-lg border border-accent/30 bg-accent-soft">
                      <Icon className="size-4 text-accent" />
                    </span>
                    <p className="mt-4 text-[15px] font-semibold">{title}</p>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="container-page pb-20">
          <div className="grid gap-3 rounded-2xl border border-line bg-surface p-6 shadow-card sm:grid-cols-3 sm:p-8">
            {[
              { icon: ShieldCheck, title: "Secure by default", body: "Hashed passwords, server-enforced permissions and revocable sessions." },
              { icon: UserCheck, title: "Direct contact", body: "Every listing comes from an employer account you can message from your application." },
              { icon: MessageSquare, title: "Talk in context", body: "Conversations stay attached to the application they're about." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-3">
                <Icon className="mt-0.5 size-5 shrink-0 text-accent" />
                <div>
                  <p className="text-[14.5px] font-semibold text-ink">{title}</p>
                  <p className="mt-0.5 text-[13.5px] leading-relaxed text-muted">{body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <h2 className="text-[26px] font-semibold tracking-[-0.03em] text-ink sm:text-[32px]">Your next shift starts here.</h2>
            <p className="mx-auto mt-2 max-w-md text-[15px] text-muted">Create a free account in under a minute.</p>
            <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
              <ButtonLink href={authed ? "/dashboard" : "/register"} size="lg" className="rounded-xl">
                {authed ? "Go to dashboard" : "Create account"} <ArrowRight />
              </ButtonLink>
              <ButtonLink href="/jobs" size="lg" variant="secondary" className="rounded-xl">
                Browse jobs
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="container-page flex flex-col items-start justify-between gap-6 py-10 sm:flex-row sm:items-center">
          <div>
            <Logo size={24} wordmarkClassName="text-[15px]" />
            <p className="mt-2 text-[13px] text-muted">Part-time work, done right.</p>
          </div>
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-[13.5px] text-muted" aria-label="Footer">
            <Link href="/jobs" className="hover:text-ink">Find jobs</Link>
            <a href="#how-it-works" className="hover:text-ink">How it works</a>
            <a href="#employers" className="hover:text-ink">Hiring</a>
            <Link href="/login" className="hover:text-ink">Sign in</Link>
            <Link href="/register" className="hover:text-ink">Create account</Link>
          </nav>
          <p className="text-[12.5px] text-faint">© {new Date().getFullYear()} Sidekick</p>
        </div>
      </footer>
    </div>
  );
}
