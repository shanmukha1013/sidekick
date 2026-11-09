"use client";

import { useState } from "react";
import { LocateFixed, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/display";
import { Alert } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ApiError, errorMessage } from "@/lib/api";
import { EXPERIENCE_LEVELS, JOB_CATEGORIES, JOB_TYPES, type Job } from "@/lib/types";
import { cn } from "@/lib/utils";

export type JobPayload = {
  title: string;
  description: string;
  responsibilities?: string | null;
  benefits?: string | null;
  category: string;
  job_type: string;
  experience_level: string;
  hourly_rate: number;
  skills_required?: string | null;
  working_hours?: string | null;
  location_name?: string | null;
  is_remote: boolean;
  lat?: number | null;
  lng?: number | null;
  deadline?: string | null;
};

type FormState = {
  title: string;
  description: string;
  responsibilities: string;
  benefits: string;
  category: string;
  job_type: string;
  experience_level: string;
  hourly_rate: string;
  skills_required: string;
  working_hours: string;
  location_name: string;
  is_remote: boolean;
  lat: number | null;
  lng: number | null;
  deadline: string;
};

function initialState(job?: Job): FormState {
  return {
    title: job?.title || "",
    description: job?.description || "",
    responsibilities: job?.responsibilities || "",
    benefits: job?.benefits || "",
    category: job?.category && (JOB_CATEGORIES as readonly string[]).includes(job.category) ? job.category : "",
    job_type: job?.job_type && (JOB_TYPES as readonly string[]).includes(job.job_type) ? job.job_type : "Part-time",
    experience_level: job?.experience_level && (EXPERIENCE_LEVELS as readonly string[]).includes(job.experience_level) ? job.experience_level : "Entry",
    hourly_rate: job?.hourly_rate ? String(job.hourly_rate) : "",
    skills_required: job?.skills_required || "",
    working_hours: job?.working_hours || "",
    location_name: job?.location_name && !(job.is_remote && job.location_name === "Remote") ? job.location_name : "",
    is_remote: !!job?.is_remote,
    lat: job?.lat ?? null,
    lng: job?.lng ?? null,
    deadline: job?.deadline ? job.deadline.slice(0, 10) : "",
  };
}

function validate(f: FormState) {
  const e: Record<string, string> = {};
  if (f.title.trim().length < 3) e.title = "Give the job a title (at least 3 characters).";
  if (!f.category) e.category = "Choose a category.";
  if (!(Number(f.hourly_rate) > 0)) e.hourly_rate = "Enter an hourly rate greater than 0.";
  if (f.description.trim().length < 20) e.description = "Describe the job in at least 20 characters.";
  if (!f.is_remote && !f.location_name.trim()) e.location_name = "Enter where the work happens, or mark the job as remote.";
  if (f.deadline && new Date(f.deadline) < new Date(new Date().toDateString())) e.deadline = "Deadline can't be in the past.";
  return e;
}

export function JobForm({
  job,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  job?: Job;
  submitLabel: string;
  onSubmit: (payload: JobPayload) => Promise<void>;
  onCancel: () => void;
}) {
  const [f, setF] = useState<FormState>(() => initialState(job));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((cur) => ({ ...cur, [k]: v }));
  const bind = (k: keyof FormState) => ({
    value: f[k] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => set(k, e.target.value as never),
  });

  const locate = () => {
    if (!navigator.geolocation) return setGeoError("Your browser doesn't support location access.");
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setF((cur) => ({ ...cur, lat: +pos.coords.latitude.toFixed(6), lng: +pos.coords.longitude.toFixed(6) }));
        setLocating(false);
      },
      (err) => {
        setGeoError(err.code === err.PERMISSION_DENIED ? "Location permission was denied." : "Couldn't get your location.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate(f);
    setErrors(v);
    setError(null);
    if (Object.keys(v).length) {
      document.getElementById(`job-${Object.keys(v)[0]}`)?.focus();
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        title: f.title.trim(),
        description: f.description.trim(),
        responsibilities: f.responsibilities.trim() || null,
        benefits: f.benefits.trim() || null,
        category: f.category,
        job_type: f.job_type,
        experience_level: f.experience_level,
        hourly_rate: Number(f.hourly_rate),
        skills_required: f.skills_required.split(",").map((s) => s.trim()).filter(Boolean).join(", ") || null,
        working_hours: f.working_hours.trim() || null,
        location_name: f.location_name.trim() || (f.is_remote ? "Remote" : null),
        is_remote: f.is_remote,
        lat: f.lat,
        lng: f.lng,
        deadline: f.deadline ? new Date(`${f.deadline}T23:59:59`).toISOString() : null,
      });
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.errors).length) setErrors(err.errors);
      setError(errorMessage(err));
      setSaving(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      {error && <Alert>{error}</Alert>}

      <Card className="p-5 sm:p-6">
        <h2 className="text-[15px] font-semibold">Basics</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Job title" required error={errors.title} className="sm:col-span-2">
            <Input id="job-title" {...bind("title")} maxLength={120} placeholder="e.g. Weekend Barista" />
          </Field>
          <Field label="Category" required error={errors.category}>
            <Select id="job-category" {...bind("category")}>
              <option value="">Select a category</option>
              {JOB_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Employment type">
            <Select {...bind("job_type")}>
              {JOB_TYPES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Experience level">
            <Select {...bind("experience_level")}>
              {EXPERIENCE_LEVELS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Hourly rate (₹)" required error={errors.hourly_rate}>
            <Input id="job-hourly_rate" type="number" inputMode="decimal" min={1} {...bind("hourly_rate")} placeholder="200" />
          </Field>
          <Field label="Working hours" hint="Optional — e.g. 15 hrs/week, Sat–Sun">
            <Input {...bind("working_hours")} maxLength={120} />
          </Field>
          <Field label="Application deadline" hint="Optional" error={errors.deadline}>
            <Input id="job-deadline" type="date" {...bind("deadline")} />
          </Field>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="text-[15px] font-semibold">Location</h2>
        <div className="mt-4 flex flex-col gap-4">
          <div className="inline-flex w-fit rounded-lg border border-line bg-subtle p-1" role="radiogroup" aria-label="Work mode">
            {[
              { v: false, label: "On-site" },
              { v: true, label: "Remote" },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                role="radio"
                aria-checked={f.is_remote === o.v}
                onClick={() => set("is_remote", o.v)}
                className={cn(
                  "rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                  f.is_remote === o.v ? "bg-black text-yellow shadow-xs" : "text-muted hover:text-ink",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          <Field label={f.is_remote ? "Location (optional)" : "Location"} required={!f.is_remote} error={errors.location_name} hint={f.is_remote ? "e.g. India only" : "City, area or address"}>
            <Input id="job-location_name" {...bind("location_name")} maxLength={120} placeholder={f.is_remote ? "Anywhere" : "Hyderabad, Telangana"} />
          </Field>
          {!f.is_remote && (
            <div className="flex flex-wrap items-center gap-3">
              {f.lat != null && f.lng != null ? (
                <span className="inline-flex items-center gap-2 rounded-lg border border-line bg-subtle px-3 py-1.5 text-[13px] text-ink-2">
                  Pinned at {f.lat.toFixed(4)}, {f.lng.toFixed(4)}
                  <button type="button" onClick={() => setF((c) => ({ ...c, lat: null, lng: null }))} className="text-faint hover:text-ink" aria-label="Remove map pin">
                    <X className="size-3.5" />
                  </button>
                </span>
              ) : (
                <Button variant="secondary" size="sm" onClick={locate} loading={locating}>
                  {!locating && <LocateFixed />} Pin my current location on the map
                </Button>
              )}
              {geoError && <span className="text-[12.5px] font-medium text-danger">{geoError}</span>}
            </div>
          )}
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="text-[15px] font-semibold">Details</h2>
        <div className="mt-4 flex flex-col gap-4">
          <Field label="Description" required error={errors.description}>
            <Textarea id="job-description" rows={6} {...bind("description")} maxLength={8000} placeholder="What will this person do, and what makes the role a good fit?" />
          </Field>
          <Field label="Responsibilities" hint="Optional — one per line">
            <Textarea rows={4} {...bind("responsibilities")} maxLength={4000} />
          </Field>
          <Field label="Skills" hint="Optional — comma separated, e.g. Customer service, MS Excel">
            <Input {...bind("skills_required")} maxLength={500} />
          </Field>
          <Field label="Benefits" hint="Optional — one per line">
            <Textarea rows={3} {...bind("benefits")} maxLength={4000} />
          </Field>
        </div>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t border-line bg-canvas/90 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
