"use client";

import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/components/ui/overlay";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>{children}</ToastProvider>
    </AuthProvider>
  );
}
