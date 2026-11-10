"use client";

import { useRef, useState } from "react";
import { Camera, ExternalLink } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Avatar, Card, PageHeader } from "@/components/ui/display";
import { Alert, ErrorState, SkeletonRows } from "@/components/ui/feedback";
import { ChipSelect, Field, Input, Select, TagInput, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/overlay";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import { AVAILABILITY_LABELS, JOB_CATEGORIES, type Profile } from "@/lib/types";

type Form = {
  headline: string;
  bio: string;
  location: string;
  availability: string;
  skills: string[];
  preferred_categories: string[];
  experience: string;
  education: string;
  portfolio_links: string;
  company_name: string;
  company_website: string;
  company_description: string;
};

const toForm = (p: Profile): Form => ({
  headline: p.headline || "",
  bio: p.bio || "",
  location: p.location || "",
  availability: p.availability || "",
  skills: p.skills || [],
  preferred_categories: p.preferred_categories || [],
  experience: p.experience || "",
  education: p.education || "",
  portfolio_links: (p.portfolio_links || []).join("\n"),
  company_name: p.company_name || "",
  company_website: p.company_website || "",
  company_description: p.company_description || "",
});

export default function ProfilePage() {
  const { data, error, loading, reload, setData } = useApi<Profile>("/profiles/me");
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;
  if (loading || !data) return <SkeletonRows count={3} />;
  return <ProfileEditor data={data} setData={setData} />;
}

function ProfileEditor({ data, setData }: { data: Profile; setData: (p: Profile) => void }) {
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState<Form>(() => toForm(data));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Form>(k: K) => (v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const bind = (k: keyof Form) => ({
    value: form[k] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(k)(e.target.value as never),
  });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const links = form.portfolio_links.split(/\s+/).map((s) => s.trim()).filter(Boolean);
    const bad = links.find((l) => !/^https?:\/\//i.test(l));
    const v: Record<string, string> = {};
    if (bad) v.portfolio_links = `“${bad}” must start with http:// or https://`;
    setErrors(v);
    setFormError(null);
    if (Object.keys(v).length) return;
    let website = form.company_website.trim();
    if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
    setSaving(true);
    try {
      const updated = await api.put<Profile>("/profiles/me", {
        headline: form.headline.trim() || null,
        bio: form.bio.trim() || null,
        location: form.location.trim() || null,
        availability: form.availability || null,
        skills: form.skills,
        preferred_categories: form.preferred_categories,
        experience: form.experience.trim() || null,
        education: form.education.trim() || null,
        portfolio_links: links,
        company_name: form.company_name.trim() || null,
        company_website: website || null,
        company_description: form.company_description.trim() || null,
      });
      setData(updated);
      setForm(toForm(updated));
      toast.success("Profile saved");
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.errors).length) setErrors(err.errors);
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const upload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be 5 MB or smaller.");
    const fd = new FormData();
    fd.append("file", file);
    setUploading(true);
    try {
      const updated = await api.post<Profile>("/profiles/me/avatar", fd, { timeoutMs: 90_000 });
      setData(updated);
      toast.success("Photo updated");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="My Profile"
        description="One profile for finding work and hiring — this is what employers and candidates see."
        actions={
          user && (
            <ButtonLink href={`/people/${user.id}`} variant="secondary" size="sm">
              <ExternalLink /> View public profile
            </ButtonLink>
          )
        }
      />
      <form onSubmit={save} noValidate className="flex flex-col gap-5">
        {formError && <Alert>{formError}</Alert>}
        <Card className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative w-fit">
              <Avatar name={data.full_name} src={data.avatar_url} size={72} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full border border-line bg-surface text-ink-2 shadow-xs transition-colors hover:text-ink disabled:opacity-50"
                aria-label="Change profile photo"
              >
                <Camera className="size-4" />
              </button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            </div>
            <div className="min-w-0">
              <p className="text-[17px] font-semibold">{data.full_name}</p>
              <p className="text-[13.5px] text-muted">@{data.username}</p>
              {uploading && <p className="mt-1 text-[12.5px] text-muted">Uploading photo…</p>}
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Headline" className="sm:col-span-2" hint="A one-line summary, e.g. Commerce student · Evenings & weekends">
              <Input {...bind("headline")} maxLength={120} />
            </Field>
            <Field label="Location">
              <Input {...bind("location")} maxLength={120} placeholder="City, State" />
            </Field>
            <Field label="Availability">
              <Select {...bind("availability")}>
                <option value="">Not specified</option>
                {Object.entries(AVAILABILITY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </Select>
            </Field>
            <Field label="About you" className="sm:col-span-2">
              <Textarea {...bind("bio")} rows={4} maxLength={2000} />
            </Field>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-brand" /> Work profile
          </h2>
          <p className="mt-0.5 text-[13px] text-muted">Used when you apply for jobs and for recommendations.</p>
          <div className="mt-4 flex flex-col gap-4">
            <Field label="Skills" hint="Used to recommend jobs. Press Enter or comma to add.">
              <TagInput value={form.skills} onChange={set("skills")} placeholder="Add a skill" />
            </Field>
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-ink-2">Job interests</span>
              <ChipSelect options={JOB_CATEGORIES} value={form.preferred_categories} onChange={set("preferred_categories")} />
            </div>
            <Field label="Experience">
              <Textarea {...bind("experience")} rows={4} maxLength={4000} placeholder="Past jobs, internships, volunteering…" />
            </Field>
            <Field label="Education">
              <Textarea {...bind("education")} rows={2} maxLength={2000} />
            </Field>
            <Field label="Portfolio links" hint="One URL per line" error={errors.portfolio_links}>
              <Textarea {...bind("portfolio_links")} rows={2} placeholder="https://" />
            </Field>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" /> Hiring profile
          </h2>
          <p className="mt-0.5 text-[13px] text-muted">
            Optional. Shown on the jobs you post — if you leave it blank, your listings show your name.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Company or organization" error={errors.company_name}>
              <Input {...bind("company_name")} maxLength={120} />
            </Field>
            <Field label="Website">
              <Input {...bind("company_website")} placeholder="example.com" />
            </Field>
            <Field label="About the company" className="sm:col-span-2">
              <Textarea {...bind("company_description")} rows={3} maxLength={2000} />
            </Field>
          </div>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setForm(toForm(data))} disabled={saving}>
            Discard changes
          </Button>
          <Button type="submit" loading={saving}>
            Save profile
          </Button>
        </div>
      </form>
    </div>
  );
}
