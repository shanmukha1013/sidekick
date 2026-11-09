"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, HardDrive, KeyRound } from "lucide-react";
import { isServerUnavailable } from "@/components/app/DemoBadge";
import { GuestOnly } from "@/components/app/GuestOnly";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input, PasswordInput } from "@/components/ui/form";
import { errorMessage } from "@/lib/api";
import { homeFor, useAuth } from "@/lib/auth";
import { DEMO_ACCOUNT } from "@/lib/demo/store";
import { DEMO_SWITCHABLE, setMode, useDataMode } from "@/lib/mode";

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
  const [unavailable, setUnavailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const mode = useDataMode();
  const demo = mode === "demo";
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
    setUnavailable(false);
    if (Object.keys(next).length) return;

    setSlow(false);
    setLoading(true);
    try {
      const user = await login(identifier.trim(), password);
      router.replace(homeFor(user, params.get("next")));
    } catch (err) {
      setFormError(errorMessage(err));
      setUnavailable(!demo && DEMO_SWITCHABLE && isServerUnavailable(err));
      setLoading(false);
    }
  };

  const reset = params.get("reset") === "1";
  const notice = reset ? "Your password has been reset. Sign in with your new password." : null;

  return (
    <div className="animate-slide-up">
      <h1 className="text-[26px] font-semibold tracking-[-0.025em]">Sign in to Sidekick</h1>
      <p className="mt-1.5 text-[14.5px] text-muted">Welcome back. Enter your details to continue.</p>

      {demo && (
        <div className="mt-6 rounded-xl border border-line bg-subtle p-4">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
            <HardDrive className="size-4 text-accent" /> Demo mode — local data
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            The live server is unavailable, so sign-in uses demo accounts stored in this browser.
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface px-3 py-2.5">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[12.5px]">
              <dt className="text-faint">Email</dt>
              <dd className="font-mono text-ink-2">{DEMO_ACCOUNT.email}</dd>
              <dt className="text-faint">Password</dt>
              <dd className="font-mono text-ink-2">{DEMO_ACCOUNT.password}</dd>
            </dl>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setIdentifier(DEMO_ACCOUNT.email);
                setPassword(DEMO_ACCOUNT.password);
                setErrors({});
              }}
            >
              <KeyRound /> Use demo account
            </Button>
          </div>
          <p className="mt-2 text-[11.5px] text-faint">Demo-only credentials. They don&apos;t exist on the live server.</p>
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className={demo ? "mt-6 flex flex-col gap-4" : "mt-8 flex flex-col gap-4"}>
        {notice && <Alert tone="success">{notice}</Alert>}
        {!notice && sessionMessage && !formError && <Alert tone="info">{sessionMessage}</Alert>}
        {formError && (
          <Alert tone="error">
            {formError}
            {unavailable && (
              <span className="mt-2 block">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setMode("demo");
                    setFormError(null);
                    setUnavailable(false);
                    setIdentifier(DEMO_ACCOUNT.email);
                    setPassword(DEMO_ACCOUNT.password);
                  }}
                >
                  <HardDrive /> Continue in demo mode
                </Button>
              </span>
            )}
          </Alert>
        )}

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
            <Link href="/forgot-password" className="text-[13px] font-medium text-brand-ink hover:underline">
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
        <Link href="/register" className="font-medium text-ink hover:text-brand-ink">
          Create an account
        </Link>
      </p>
    </div>
  );
}
