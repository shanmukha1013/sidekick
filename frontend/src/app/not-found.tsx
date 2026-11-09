import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="container-page flex h-16 items-center">
        <Logo />
      </header>
      <main className="container-page flex flex-1 flex-col items-center justify-center pb-24 text-center">
        <p className="font-mono text-[13px] text-muted">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em]">This page doesn&apos;t exist</h1>
        <p className="mt-2 max-w-sm text-[14px] text-muted">The link may be broken, or the page may have been moved.</p>
        <div className="mt-6 flex gap-2">
          <ButtonLink href="/" variant="secondary">Go home</ButtonLink>
          <ButtonLink href="/jobs">Browse jobs</ButtonLink>
        </div>
      </main>
    </div>
  );
}
