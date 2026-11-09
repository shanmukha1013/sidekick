"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Check, LogOut, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, PageHeader } from "@/components/ui/display";
import { Alert } from "@/components/ui/feedback";
import { Field, Input, PasswordInput } from "@/components/ui/form";
import { useToast } from "@/components/ui/overlay";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { AuthResponse, Role, User } from "@/lib/types";
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
  const { user, setUser } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>(user?.roles || []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  if (!user) return null;
  const dirty = [...roles].sort().join() !== [...user.roles].sort().join();

  const toggle = (r: Role) => setRoles((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));
  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      const updated = await api.put<User>("/users/me/roles", { roles });
      setUser(updated);
      toast.success("Account roles updated");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card id="roles" className="scroll-mt-24">
      <CardHeader title="How you use Sidekick" description="Enable one or both. Permissions are enforced by the server." />
      <div className="p-5">
        {error && (
          <Alert className="mb-4">
            {error}{" "}
            {/company/i.test(error) && (
              <button onClick={() => router.push("/profile")} className="font-medium underline">
                Go to profile
              </button>
            )}
          </Alert>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { role: "seeker" as Role, icon: Search, title: "Find work", body: "Apply to jobs, save listings, track applications." },
            { role: "employer" as Role, icon: Briefcase, title: "Hire people", body: "Post jobs, manage listings and applicants." },
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
                  "flex items-start gap-3 rounded-xl border p-4 text-left transition-[border-color,box-shadow]",
                  active ? "border-ink ring-1 ring-ink" : "border-line hover:border-line-strong",
                )}
              >
                <Icon className="mt-0.5 size-[18px] shrink-0 text-ink-2" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold">{title}</span>
                  <span className="mt-0.5 block text-[13px] text-muted">{body}</span>
                </span>
                <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-md border", active ? "border-silver-700 bg-silver-700 text-silver-50" : "border-line-strong")}>
                  {active && <Check className="size-3.5" />}
                </span>
              </button>
            );
          })}
        </div>
        {!roles.length && <p className="mt-3 text-[13px] text-red-600">Keep at least one option enabled.</p>}
        <div className="mt-4 flex justify-end">
          <Button onClick={save} loading={saving} disabled={!dirty || !roles.length}>
            Update roles
          </Button>
        </div>
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
