"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Check, Search } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { DemoBadge } from "@/components/app/DemoBadge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/display";
import { Alert, FullPageSpinner } from "@/components/ui/feedback";
import { ChipSelect, Field, Input, TagInput, Textarea } from "@/components/ui/form";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { firstName } from "@/lib/format";
import { JOB_CATEGORIES, type User } from "@/lib/types";
import { cn } from "@/lib/utils";

const SKILL_SUGGESTIONS = ["Customer service", "Communication", "Sales", "Tutoring", "MS Excel", "Social media", "Data entry", "Driving"];

/**
 * Profile setup after registration. Every account can both find work and hire, so there is no role to
 * pick — this just collects optional details for each workspace (everything can be skipped).
 */
export default function OnboardingPage() {
  const { status, user, setUser, logout } = useAuth();
  const router = useRouter();
  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<"save" | "skip" | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login?next=/onboarding");
    if (status === "authenticated" && user?.onboarded) router.replace("/dashboard");
  }, [status, user, router]);

  if (status !== "authenticated" || !user || user.onboarded) return <FullPageSpinner />;

  const finish = async (skip: boolean) => {
    setError(null);
    let website = companyWebsite.trim();
    if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
    setSaving(skip ? "skip" : "save");
    try {
      const updated = await api.post<User>(
        "/users/me/onboarding",
        skip
          ? {}
          : {
              headline: headline.trim() || undefined,
              location: location.trim() || undefined,
              skills: skills.length ? skills : undefined,
              preferred_categories: categories.length ? categories : undefined,
              company_name: companyName.trim() || undefined,
              company_website: website || undefined,
              company_description: companyDescription.trim() || undefined,
            },
      );
      setUser(updated);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : errorMessage(err));
      setSaving(null);
    }
  };

  return (
    <div className="min-h-dvh bg-canvas bg-hero-glow">
      <header className="container-page flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo href={null} />
          <DemoBadge align="left" />
        </div>
        <Button variant="ghost" size="sm" onClick={async () => { await logout(); router.replace("/login"); }}>
          Sign out
        </Button>
      </header>
      <main className="container-page flex justify-center pb-16 pt-4 sm:pt-10">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            finish(false);
          }}
          noValidate
          className="w-full max-w-xl animate-slide-up"
        >
          <h1 className="text-[26px] font-semibold tracking-[-0.025em]">Welcome, {firstName(user.full_name)}</h1>
          <p className="mt-1.5 text-[14.5px] text-muted">
            Your Sidekick account does both — find work and hire people — from one dashboard. Add a few optional details to get
            started, or skip and do it later from your profile.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2" aria-label="Included with your account">
            {[
              { tone: "red", icon: Search, title: "Find work", body: "Discover roles, apply, save jobs and track applications." },
              { tone: "green", icon: Briefcase, title: "Hire talent", body: "Post jobs, review applicants and message candidates." },
            ].map(({ tone, icon: Icon, title, body }) => (
              <div key={title} className="relative rounded-xl border border-line bg-surface p-4 shadow-card">
                <span className="absolute right-3.5 top-3.5 inline-flex items-center gap-1 text-[11.5px] font-medium text-accent-ink">
                  <Check className="size-3.5" /> Included
                </span>
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg border",
                    tone === "red" ? "border-brand/30 bg-brand-soft text-brand-ink" : "border-accent/30 bg-accent-soft text-accent-ink",
                  )}
                >
                  <Icon className="size-[18px]" />
                </span>
                <p className="mt-3 text-[15px] font-semibold">{title}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{body}</p>
              </div>
            ))}
          </div>

          {error && <Alert className="mt-6">{error}</Alert>}

          <Card className="mt-6 space-y-4 p-5">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-brand" /> Work profile <span className="font-normal text-faint">· optional</span>
            </h2>
            <Field label="Headline" hint="e.g. Computer science student · Weekend availability">
              <Input value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={120} />
            </Field>
            <Field label="Location">
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, State" maxLength={120} />
            </Field>
            <Field label="Skills" hint="Used for job recommendations. Press Enter or comma to add.">
              <TagInput value={skills} onChange={setSkills} placeholder="Add a skill" suggestions={SKILL_SUGGESTIONS} />
            </Field>
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-ink-2">Interested in</span>
              <ChipSelect options={JOB_CATEGORIES} value={categories} onChange={setCategories} />
            </div>
          </Card>

          <Card className="mt-4 space-y-4 p-5">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" /> Hiring profile <span className="font-normal text-faint">· optional</span>
            </h2>
            <Field label="Company or organization" hint="Shown on jobs you post. Leave blank to post under your own name.">
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} maxLength={120} />
            </Field>
            <Field label="Website">
              <Input value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} placeholder="example.com" inputMode="url" />
            </Field>
            <Field label="About the company" hint="Shown to applicants.">
              <Textarea value={companyDescription} onChange={(e) => setCompanyDescription(e.target.value)} rows={3} maxLength={2000} />
            </Field>
          </Card>

          <div className="mt-8 flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => finish(true)} disabled={!!saving} loading={saving === "skip"}>
              Skip for now
            </Button>
            <Button type="submit" size="lg" loading={saving === "save"} disabled={!!saving}>
              Go to my dashboard
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
