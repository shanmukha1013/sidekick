"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, PasswordInput } from "@/components/ui/form";
import { api, ApiError, errorMessage } from "@/lib/api";

export default function ResetPasswordPage() {
  const token = useSearchParams().get("token") || "";
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.025em]">Invalid reset link</h1>
        <p className="mt-2 text-[14.5px] text-muted">This link is missing its reset token. Request a new one.</p>
        <ButtonLink href="/forgot-password" size="lg" className="mt-8 w-full">
          Request a new link
        </ButtonLink>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v: typeof errors = {};
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password))
      v.password = "Use 8+ characters with at least one letter and one number.";
    if (confirm !== password) v.confirm = "Passwords don't match.";
    setErrors(v);
    setError(null);
    if (Object.keys(v).length) return;
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      router.replace("/login?reset=1");
    } catch (err) {
      setError(err instanceof ApiError && err.errors.password ? err.errors.password : errorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div className="animate-slide-up">
      <h1 className="text-[26px] font-semibold tracking-[-0.025em]">Choose a new password</h1>
      <p className="mt-1.5 text-[14.5px] text-muted">Signing in elsewhere will require the new password.</p>
      <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-4">
        {error && (
          <Alert tone="error">
            {error}{" "}
            {/expired|invalid/i.test(error) && (
              <Link href="/forgot-password" className="font-medium underline">
                Request a new link
              </Link>
            )}
          </Alert>
        )}
        <Field label="New password" error={errors.password}>
          <PasswordInput autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        </Field>
        <Field label="Confirm new password" error={errors.confirm}>
          <PasswordInput autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
          Reset password
        </Button>
      </form>
    </div>
  );
}
