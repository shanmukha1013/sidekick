import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Sidekick brand mark: a geometric "S" in an ink tile, with a cobalt companion dot —
 * the sidekick that's always alongside you.
 */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <rect width="32" height="32" rx="8" fill="#0B0B0F" />
      <path
        d="M20.6 11.4C20.1 9.6 18.3 8.4 15.9 8.4C13.2 8.4 11.3 9.9 11.3 12C11.3 14.4 13.4 15.2 16 15.8C18.7 16.4 20.8 17.3 20.8 19.9C20.8 22.1 18.8 23.6 16 23.6C13.5 23.6 11.6 22.4 11.1 20.5"
        stroke="#FFFFFF"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="24.6" cy="7.4" r="2.3" fill="#2F5BEA" />
    </svg>
  );
}

export function Logo({
  href = "/",
  size = 28,
  className,
  wordmarkClassName,
}: {
  href?: string | null;
  size?: number;
  className?: string;
  wordmarkClassName?: string;
}) {
  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      <span className={cn("text-[17px] font-semibold tracking-[-0.02em] text-ink", wordmarkClassName)}>Sidekick</span>
    </span>
  );
  if (!href) return content;
  return (
    <Link href={href} aria-label="Sidekick home" className="inline-flex rounded-md">
      {content}
    </Link>
  );
}
