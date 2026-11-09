"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/form";
import { api, errorMessage } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setFieldError("Enter the email address you signed up with.");
      return;
    }
    setFieldError(null);
    setLoading(true);
    try {
      const res = await api.post<{ message: string }>("/auth/forgot-password", { email: email.trim() });
      setSent(res.message);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-slide-up">
      <Link href="/login" className="mb-8 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Back to sign in
      </Link>
      {sent ? (
        <div>
          <div className="mb-5 flex size-11 items-center justify-center rounded-xl border border-line bg-canvas text-ink-2 shadow-xs">
            <MailCheck className="size-5" />
          </div>
          <h1 className="text-[26px] font-semibold tracking-[-0.025em]">Check your email</h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{sent} The link expires in 30 minutes.</p>
          <Button variant="secondary" className="mt-8 w-full" size="lg" onClick={() => setSent(null)}>
            Use a different email
          </Button>
        </div>
      ) : (
        <>
          <h1 className="text-[26px] font-semibold tracking-[-0.025em]">Reset your password</h1>
          <p className="mt-1.5 text-[14.5px] text-muted">Enter your account email and we&apos;ll send you a reset link.</p>
          <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-4">
            {error && <Alert tone="error">{error}</Alert>}
            <Field label="Email address" error={fieldError}>
              <Input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
            </Field>
            <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
              Send reset link
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
