"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppShell, PublicShell } from "@/components/app/AppShell";
import { ErrorState, FullPageSpinner } from "@/components/ui/feedback";
import { ApiError } from "@/lib/api";
import { consumeExplicitSignOut, useAuth } from "@/lib/auth";

const isPublic = (path: string) => path === "/jobs" || path.startsWith("/jobs/");

function AppGate({ children }: { children: React.ReactNode }) {
  const { status, user, refresh } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const publicPage = isPublic(pathname);

  useEffect(() => {
    if (status === "unauthenticated" && !publicPage) {
      if (consumeExplicitSignOut()) {
        router.replace("/login");
        return;
      }
      const next = typeof window !== "undefined" ? window.location.pathname + window.location.search : pathname;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    } else if (status === "authenticated" && user && !user.onboarded) {
      router.replace("/onboarding");
    }
  }, [status, user, publicPage, pathname, router]);

  if (status === "loading") return <FullPageSpinner />;
  if (status === "error")
    return (
      <div className="container-page py-24">
        <ErrorState
          error={new ApiError("We couldn't verify your session because the server is unreachable. Your session is still saved.", 0)}
          onRetry={refresh}
        />
      </div>
    );
  if (status === "unauthenticated") return publicPage ? <PublicShell>{children}</PublicShell> : <FullPageSpinner />;
  if (!user || !user.onboarded) return <FullPageSpinner />;
  return <AppShell user={user}>{children}</AppShell>;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <AppGate>{children}</AppGate>
    </Suspense>
  );
}
