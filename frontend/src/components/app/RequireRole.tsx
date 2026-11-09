"use client";

import { Briefcase, Search } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/types";

/** UI-level gate. The API enforces the same rule server-side from the roles stored in MongoDB. */
export function RequireRole({ role, children }: { role: Role; children: React.ReactNode }) {
  const { hasRole } = useAuth();
  if (hasRole(role)) return <>{children}</>;
  const hiring = role === "employer";
  return (
    <EmptyState
      className="mt-6"
      icon={hiring ? <Briefcase /> : <Search />}
      title={hiring ? "Hiring isn't enabled on your account" : "Job seeking isn't enabled on your account"}
      description={
        hiring
          ? "Turn on hiring in Settings to post jobs and review applicants. You'll need your company name."
          : "Turn on job seeking in Settings to apply for jobs and save listings."
      }
      action={<ButtonLink href="/settings#roles">Open settings</ButtonLink>}
    />
  );
}
