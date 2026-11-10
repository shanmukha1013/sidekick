"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Check, LogOut, Search } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader, PageHeader } from "@/components/ui/display";
import { Field, Input, PasswordInput } from "@/components/ui/form";
import { useToast } from "@/components/ui/overlay";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { AuthResponse, User } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" description="Manage your account, how you use Sidekick, and security." />
      <div className="flex flex-col gap-5">
        <AccountSection />
        <RolesSection />
        <PasswordSection />
        <SessionSection />
      </div>
    </div>
  );
}

function AccountSection() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  if (!user) return null;
  const dirty = name.trim() !== user.full_name || phone.trim() !== (user.phone || "");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const v: Record<string, string> = {};
    if (name.trim().length < 2) v.full_name = "Enter your full name.";
    if (!/^\+?[0-9]{10,15}$/.test(phone.replace(/[\s\-().]/g, ""))) v.phone = "Enter a valid phone number (10–15 digits).";
    setErrors(v);
    if (Object.keys(v).length) return;
    setSaving(true);
    try {
      const updated = await api.patch<User>("/users/me", { full_name: name.trim(), phone: phone.trim() });
      setUser(updated);
      setName(updated.full_name);
      setPhone(updated.phone || "");
      toast.success("Account details saved");
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.errors).length) setErrors(err.errors);
      else toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Account" description="Your sign-in details and contact information." />
      <form onSubmit={save} noValidate className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Full name" error={errors.full_name}>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </Field>
        <Field label="Phone number" error={errors.phone}>
          <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
        </Field>
        <Field label="Email" hint="Used to sign in and recover your account.">
          <Input value={user.email} disabled />
        </Field>
        <Field label="Username" hint="Usernames can't be changed.">
          <Input value={`@${user.username}`} disabled />
        </Field>
        <div className="flex justify-end sm:col-span-2">
          <Button type="submit" loading={saving} disabled={!dirty}>
            Save changes
          </Button>
        </div>
      </form>
    </Card>
  );
}

function RolesSection() {
  return (
    <Card id="roles" className="scroll-mt-24">
      <CardHeader
        title="One account, both workspaces"
        description="Every Sidekick account can find work and hire people. There's nothing to switch on and no second account to create."
      />
      <div className="grid gap-3 p-5 sm:grid-cols-2">
        {[
          {
            tone: "red" as const,
            icon: Search,
            title: "Find work",
            body: "Search jobs, apply, save listings and track your applications.",
            links: [
              { href: "/jobs", label: "Find Jobs" },
              { href: "/applications", label: "My Applications" },
            ],
          },
          {
            tone: "green" as const,
            icon: Briefcase,
            title: "Hire talent",
            body: "Post jobs, manage listings, review applicants and message them.",
            links: [
              { href: "/post-job", label: "Post a Job" },
              { href: "/applicants", label: "Manage Applicants" },
            ],
          },
        ].map(({ tone, icon: Icon, title, body, links }) => (
          <div key={title} className="rounded-xl border border-line bg-subtle p-4">
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg border [&_svg]:size-4",
                  tone === "red" ? "border-brand/30 bg-brand-soft text-brand-ink" : "border-accent/30 bg-accent-soft text-accent-ink",
                )}
              >
                <Icon />
              </span>
              <span className="text-[14px] font-semibold">{title}</span>
              <span className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-accent-ink">
                <Check className="size-3.5" /> Enabled
              </span>
            </div>
            <p className="mt-2 text-[13px] text-muted">{body}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {links.map((l) => (
                <ButtonLink key={l.href} href={l.href} variant="secondary" size="sm">
                  {l.label}
                </ButtonLink>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PasswordSection() {
  const { acceptSession } = useAuth();
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const v: Record<string, string> = {};
    if (!current) v.current = "Enter your current password.";
    if (next.length < 8 || !/[A-Za-z]/.test(next) || !/[0-9]/.test(next)) v.next = "Use 8+ characters with at least one letter and one number.";
    if (next !== confirm) v.confirm = "Passwords don't match.";
    setErrors(v);
    if (Object.keys(v).length) return;
    setSaving(true);
    try {
      const res = await api.post<AuthResponse>("/auth/change-password", { current_password: current, new_password: next });
      acceptSession(res);
      setCurrent("");
      setNext("");
      setConfirm("");
      toast.success("Password changed. Other devices have been signed out.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) setErrors({ current: err.message });
      else if (err instanceof ApiError && err.errors.new_password) setErrors({ next: err.errors.new_password });
      else toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Password" description="Changing your password signs you out on all other devices." />
      <form onSubmit={save} noValidate className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Current password" error={errors.current} className="sm:col-span-2">
          <PasswordInput value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        </Field>
        <Field label="New password" error={errors.next}>
          <PasswordInput value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        </Field>
        <Field label="Confirm new password" error={errors.confirm}>
          <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        </Field>
        <div className="flex justify-end sm:col-span-2">
          <Button type="submit" loading={saving} disabled={!current || !next}>
            Change password
          </Button>
        </div>
      </form>
    </Card>
  );
}

function SessionSection() {
  const { logout } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Card>
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold">Sign out</h2>
          <p className="mt-0.5 text-[13px] text-muted">End your session on this device.</p>
        </div>
        <Button
          variant="secondary"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            await logout();
            router.replace("/login");
          }}
        >
          {!busy && <LogOut />} Sign out
        </Button>
      </div>
    </Card>
  );
}
