"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Briefcase, Check, Search } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/display";
import { Alert, FullPageSpinner } from "@/components/ui/feedback";
import { ChipSelect, Field, Input, TagInput, Textarea } from "@/components/ui/form";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { firstName } from "@/lib/format";
import { JOB_CATEGORIES, type Role, type User } from "@/lib/types";
import { cn } from "@/lib/utils";

const SKILL_SUGGESTIONS = ["Customer service", "Communication", "Sales", "Tutoring", "MS Excel", "Social media", "Data entry", "Driving"];

export default function OnboardingPage() {
  const { status, user, setUser, logout } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [roles, setRoles] = useState<Role[]>([]);
  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login?next=/onboarding");
    if (status === "authenticated" && user?.onboarded && user.roles.length) router.replace("/dashboard");
  }, [status, user, router]);

  if (status !== "authenticated" || !user || (user.onboarded && user.roles.length)) return <FullPageSpinner />;

  const toggle = (r: Role) => setRoles((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));
  const seeker = roles.includes("seeker");
  const employer = roles.includes("employer");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (employer && !companyName.trim()) {
      setCompanyError("Enter your company or organization name.");
      return;
    }
    setCompanyError(null);
    let website = companyWebsite.trim();
    if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
    setSaving(true);
    try {
      const updated = await api.post<User>("/users/me/onboarding", {
        roles,
        headline: seeker ? headline.trim() || undefined : undefined,
        location: location.trim() || undefined,
        skills: seeker ? skills : undefined,
        preferred_categories: seeker ? categories : undefined,
        company_name: employer ? companyName.trim() : undefined,
        company_website: employer ? website || undefined : undefined,
        company_description: employer ? companyDescription.trim() || undefined : undefined,
      });
      setUser(updated);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="container-page flex h-16 items-center justify-between">
        <Logo href={null} />
        <Button variant="ghost" size="sm" onClick={async () => { await logout(); router.replace("/login"); }}>
          Sign out
        </Button>
      </header>
      <main className="container-page flex justify-center pb-16 pt-4 sm:pt-10">
        <div className="w-full max-w-xl animate-slide-up">
          <p className="text-[13px] font-medium text-muted">Step {step} of 2</p>
          <div className="mt-2 flex gap-1.5" aria-hidden="true">
            <span className="h-1 flex-1 rounded-full bg-ink" />
            <span className={cn("h-1 flex-1 rounded-full", step === 2 ? "bg-ink" : "bg-line")} />
          </div>

          {step === 1 ? (
            <section className="mt-8">
              <h1 className="text-[26px] font-semibold tracking-[-0.025em]">Welcome, {firstName(user.full_name)}</h1>
              <p className="mt-1.5 text-[14.5px] text-muted">How do you plan to use Sidekick? Choose one or both — you can change this later.</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2" role="group" aria-label="Account roles">
                {[
                  { role: "seeker" as Role, icon: Search, title: "Find work", body: "Discover part-time roles, apply, and track applications." },
                  { role: "employer" as Role, icon: Briefcase, title: "Hire people", body: "Post jobs, review applicants, and message candidates." },
                ].map(({ role, icon: Icon, title, body }) => {
                  const active = roles.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      role="checkbox"
                      aria-checked={active}
                      onClick={() => toggle(role)}
                      className={cn(
                        "relative flex flex-col items-start rounded-xl border bg-surface p-5 text-left shadow-xs transition-[border-color,box-shadow]",
                        active ? "border-ink ring-1 ring-ink" : "border-line hover:border-line-strong",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute right-4 top-4 flex size-5 items-center justify-center rounded-md border transition-colors",
                          active ? "border-ink bg-ink text-white" : "border-line-strong bg-surface",
                        )}
                      >
                        {active && <Check className="size-3.5" />}
                      </span>
                      <span className="flex size-10 items-center justify-center rounded-lg border border-line bg-canvas">
                        <Icon className="size-[18px] text-ink-2" />
                      </span>
                      <span className="mt-4 text-[15px] font-semibold">{title}</span>
                      <span className="mt-1 text-[13.5px] leading-relaxed text-muted">{body}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-8 flex justify-end">
                <Button size="lg" disabled={!roles.length} onClick={() => setStep(2)}>
                  Continue <ArrowRight />
                </Button>
              </div>
            </section>
          ) : (
            <form onSubmit={submit} noValidate className="mt-8">
              <h1 className="text-[26px] font-semibold tracking-[-0.025em]">A few details</h1>
              <p className="mt-1.5 text-[14.5px] text-muted">
                {employer && seeker
                  ? "These help us recommend jobs and show candidates who you are."
                  : employer
                    ? "Candidates will see this on your job listings."
                    : "We use this to recommend jobs that match your skills."}
              </p>
              {error && <Alert className="mt-6">{error}</Alert>}

              {seeker && (
                <Card className="mt-6 space-y-4 p-5">
                  <h2 className="text-[14px] font-semibold">Your work profile</h2>
                  <Field label="Headline" hint="e.g. Computer science student · Weekend availability">
                    <Input value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={120} />
                  </Field>
                  <Field label="Location">
                    <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, State" maxLength={120} />
                  </Field>
                  <Field label="Skills" hint="Press Enter or comma to add.">
                    <TagInput value={skills} onChange={setSkills} placeholder="Add a skill" suggestions={SKILL_SUGGESTIONS} />
                  </Field>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-medium text-ink-2">Interested in</span>
                    <ChipSelect options={JOB_CATEGORIES} value={categories} onChange={setCategories} />
                  </div>
                </Card>
              )}

              {employer && (
                <Card className="mt-4 space-y-4 p-5">
                  <h2 className="text-[14px] font-semibold">Your company</h2>
                  <Field label="Company or organization name" required error={companyError}>
                    <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} maxLength={120} />
                  </Field>
                  <Field label="Website" hint="Optional">
                    <Input value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} placeholder="example.com" inputMode="url" />
                  </Field>
                  {!seeker && (
                    <Field label="Location" hint="Optional">
                      <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, State" />
                    </Field>
                  )}
                  <Field label="About the company" hint="Optional — shown to applicants.">
                    <Textarea value={companyDescription} onChange={(e) => setCompanyDescription(e.target.value)} rows={3} maxLength={2000} />
                  </Field>
                </Card>
              )}

              <div className="mt-8 flex items-center justify-between gap-3">
                <Button variant="ghost" onClick={() => setStep(1)} disabled={saving}>
                  <ArrowLeft /> Back
                </Button>
                <Button type="submit" size="lg" loading={saving}>
                  Finish setup
                </Button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
