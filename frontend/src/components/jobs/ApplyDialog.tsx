"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Dialog, useToast } from "@/components/ui/overlay";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatRate } from "@/lib/format";
import { emitCountsChanged } from "@/lib/hooks";
import type { Application, Job } from "@/lib/types";

export function ApplyDialog({ job, open, onClose, onApplied }: { job: Job; open: boolean; onClose: () => void; onApplied: (a: Application) => void }) {
  const { user } = useAuth();
  const toast = useToast();
  const [cover, setCover] = useState("");
  const [rate, setRate] = useState("");
  const [availability, setAvailability] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [phone, setPhone] = useState(user?.phone || "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v: Record<string, string> = {};
    if (cover.trim().length < 20) v.cover_letter = "Write at least 20 characters about why you're a good fit.";
    if (rate && !(Number(rate) > 0)) v.expected_rate = "Enter a positive amount.";
    setErrors(v);
    setError(null);
    if (Object.keys(v).length) return;
    setLoading(true);
    try {
      const app = await api.post<Application>(`/jobs/${job.id}/apply`, {
        cover_letter: cover.trim(),
        expected_rate: rate ? Number(rate) : undefined,
        availability: availability.trim() || undefined,
        portfolio_links: portfolio.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      toast.success("Application sent");
      emitCountsChanged();
      onApplied(app);
      onClose();
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.errors).length) setErrors(err.errors);
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Apply to ${job.title}`}
      description={`${job.company_name || "Employer"} · ${formatRate(job.hourly_rate)}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="apply-form" loading={loading}>
            Submit application
          </Button>
        </>
      }
    >
      <form id="apply-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Why are you a good fit?" required error={errors.cover_letter} hint={`${cover.trim().length}/5000`}>
          <Textarea
            rows={6}
            value={cover}
            onChange={(e) => setCover(e.target.value)}
            maxLength={5000}
            placeholder="Briefly describe relevant experience, skills and when you can start."
            autoFocus
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Expected rate (₹/hr)" error={errors.expected_rate} hint="Optional">
            <Input type="number" inputMode="decimal" min={1} value={rate} onChange={(e) => setRate(e.target.value)} placeholder={String(job.hourly_rate)} />
          </Field>
          <Field label="Availability" hint="Optional">
            <Input value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="Weekends, from 1 Dec" maxLength={200} />
          </Field>
        </div>
        <Field label="Portfolio or resume link" hint="Optional">
          <Input type="url" value={portfolio} onChange={(e) => setPortfolio(e.target.value)} placeholder="https://" maxLength={500} />
        </Field>
        <Field label="Phone for this application" hint="Shared only with this employer.">
          <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />
        </Field>
      </form>
    </Dialog>
  );
}
