"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { GuestOnly } from "@/components/app/GuestOnly";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input, PasswordInput } from "@/components/ui/form";
import { errorMessage } from "@/lib/api";
import { homeFor, useAuth } from "@/lib/auth";

export default function LoginPage() {
  return (
    <GuestOnly>
      <LoginForm />
    </GuestOnly>
  );
}

function LoginForm() {
  const { login, sessionMessage } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setSlow(true), 5000);
    return () => clearTimeout(t);
  }, [loading]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!identifier.trim()) next.identifier = "Enter your email or username.";
    if (!password) next.password = "Enter your password.";
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    setSlow(false);
    setLoading(true);
    try {
      const user = await login(identifier.trim(), password);
      router.replace(homeFor(user, params.get("next")));
    } catch (err) {
      setFormError(errorMessage(err));
      setLoading(false);
    }
  };

  const reset = params.get("reset") === "1";
  const notice = reset ? "Your password has been reset. Sign in with your new password." : null;

  return (
    <div className="animate-slide-up">
      <h1 className="text-[26px] font-semibold tracking-[-0.025em]">Sign in to Sidekick</h1>
      <p className="mt-1.5 text-[14.5px] text-muted">Welcome back. Enter your details to continue.</p>

      <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-4">
        {notice && <Alert tone="success">{notice}</Alert>}
        {!notice && sessionMessage && !formError && <Alert tone="info">{sessionMessage}</Alert>}
        {formError && <Alert tone="error">{formError}</Alert>}

        <Field label="Email or username" error={errors.identifier}>
          <Input
            name="identifier"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@example.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoFocus
          />
        </Field>

        <Field
          label="Password"
          error={errors.password}
          action={
            <Link href="/forgot-password" className="text-[13px] font-medium text-brand hover:text-brand-hover">
              Forgot password?
            </Link>
          }
        >
          <PasswordInput
            name="password"
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
          {loading ? "Signing in…" : "Sign in"}
          {!loading && <ArrowRight />}
        </Button>
        {slow && loading && (
          <p className="text-center text-[12.5px] text-muted" role="status">
            Waking up the server — this can take up to a minute the first time.
          </p>
        )}
      </form>

      <p className="mt-8 text-center text-[14px] text-muted">
        New to Sidekick?{" "}
        <Link href="/register" className="font-medium text-ink hover:text-brand">
          Create an account
        </Link>
      </p>
    </div>
  );
}
