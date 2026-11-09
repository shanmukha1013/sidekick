"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { GuestOnly } from "@/components/app/GuestOnly";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input, PasswordInput } from "@/components/ui/form";
import { ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type FormState = { full_name: string; username: string; email: string; phone: string; password: string; confirm: string };
type Errors = Partial<Record<keyof FormState, string>>;

const USERNAME_RE = /^[a-z0-9](?:[a-z0-9._]{1,28})[a-z0-9]$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(f: FormState): Errors {
  const e: Errors = {};
  if (f.full_name.trim().length < 2) e.full_name = "Enter your full name.";
  const u = f.username.trim().toLowerCase();
  if (!u) e.username = "Choose a username.";
  else if (!USERNAME_RE.test(u) || u.includes(".."))
    e.username = "3–30 characters: letters, numbers, dots or underscores.";
  if (!EMAIL_RE.test(f.email.trim())) e.email = "Enter a valid email address.";
  const phone = f.phone.replace(/[\s\-().]/g, "");
  if (!/^\+?[0-9]{10,15}$/.test(phone)) e.phone = "Enter a valid phone number (10–15 digits).";
  if (f.password.length < 8) e.password = "Use at least 8 characters.";
  else if (!/[A-Za-z]/.test(f.password) || !/[0-9]/.test(f.password)) e.password = "Include at least one letter and one number.";
  else if (new TextEncoder().encode(f.password).length > 72) e.password = "Use at most 72 characters.";
  if (!f.confirm) e.confirm = "Confirm your password.";
  else if (f.confirm !== f.password) e.confirm = "Passwords don't match.";
  return e;
}

export default function RegisterPage() {
  return (
    <GuestOnly>
      <RegisterForm />
    </GuestOnly>
  );
}

function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ full_name: "", username: "", email: "", phone: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setSlow(true), 5000);
    return () => clearTimeout(t);
  }, [loading]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = { ...form, [k]: e.target.value };
    setForm(next);
    if (touched) setErrors(validate(next));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setFormError(null);
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length) return;

    setSlow(false);
    setLoading(true);
    try {
      await register({
        full_name: form.full_name.trim(),
        username: form.username.trim().toLowerCase(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
      });
      router.replace("/onboarding");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          const field: keyof FormState = /email/i.test(err.message) ? "email" : "username";
          setErrors({ [field]: err.message });
        } else if (err.status === 422 && Object.keys(err.errors).length) {
          const mapped: Errors = {};
          for (const [k, msg] of Object.entries(err.errors)) if (k in form) mapped[k as keyof FormState] = msg;
          setErrors(mapped);
          if (!Object.keys(mapped).length) setFormError(err.message);
        } else setFormError(err.message);
      } else setFormError(errorMessage(err));
      setLoading(false);
    }
  };

  const pw = form.password;
  const rules = [
    { ok: pw.length >= 8, label: "8+ characters" },
    { ok: /[A-Za-z]/.test(pw), label: "A letter" },
    { ok: /[0-9]/.test(pw), label: "A number" },
  ];

  return (
    <div className="animate-slide-up">
      <h1 className="text-[26px] font-semibold tracking-[-0.025em]">Create your account</h1>
      <p className="mt-1.5 text-[14.5px] text-muted">One account to find work and hire people.</p>

      <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-4">
        {formError && <Alert tone="error">{formError}</Alert>}

        <Field label="Full name" error={errors.full_name}>
          <Input autoComplete="name" placeholder="Priya Sharma" value={form.full_name} onChange={set("full_name")} autoFocus />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Username" error={errors.username}>
            <Input
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="priya.sharma"
              value={form.username}
              onChange={set("username")}
            />
          </Field>
          <Field label="Phone number" error={errors.phone}>
            <Input type="tel" autoComplete="tel" inputMode="tel" placeholder="+91 98765 43210" value={form.phone} onChange={set("phone")} />
          </Field>
        </div>

        <Field label="Email address" error={errors.email}>
          <Input type="email" autoComplete="email" autoCapitalize="none" placeholder="you@example.com" value={form.email} onChange={set("email")} />
        </Field>

        <Field label="Password" error={errors.password}>
          <PasswordInput autoComplete="new-password" placeholder="Create a password" value={form.password} onChange={set("password")} />
        </Field>
        {pw && !errors.password && (
          <ul className="-mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]" aria-label="Password requirements">
            {rules.map((r) => (
              <li key={r.label} className={cn("inline-flex items-center gap-1", r.ok ? "text-emerald-700" : "text-muted")}>
                <Check className={cn("size-3.5", !r.ok && "opacity-30")} /> {r.label}
              </li>
            ))}
          </ul>
        )}

        <Field label="Confirm password" error={errors.confirm}>
          <PasswordInput autoComplete="new-password" placeholder="Repeat your password" value={form.confirm} onChange={set("confirm")} />
        </Field>

        <Button type="submit" size="lg" loading={loading} className="mt-2 w-full">
          {loading ? "Creating account…" : "Create account"}
          {!loading && <ArrowRight />}
        </Button>
        {slow && loading && (
          <p className="text-center text-[12.5px] text-muted" role="status">
            Waking up the server — this can take up to a minute the first time.
          </p>
        )}
      </form>

      <p className="mt-8 text-center text-[14px] text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-ink hover:text-brand">
          Sign in
        </Link>
      </p>
    </div>
  );
}
