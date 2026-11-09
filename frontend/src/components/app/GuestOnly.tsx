"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { homeFor, useAuth } from "@/lib/auth";
import { FullPageSpinner } from "@/components/ui/feedback";

/** Sends already-signed-in users to their home instead of showing login/register. */
export function GuestOnly({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get("next");

  useEffect(() => {
    if (status === "authenticated" && user) router.replace(homeFor(user, next));
  }, [status, user, next, router]);

  if (status === "loading" || status === "authenticated") return <FullPageSpinner />;
  return <>{children}</>;
}
