import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import type { ApplicationStatus } from "@/lib/types";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-line bg-surface shadow-card", className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-line px-5 py-4", className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-px text-[12px] font-medium leading-5 [&_svg]:size-3",
  {
    variants: {
      tone: {
        neutral: "border-line bg-subtle text-ink-2",
        outline: "border-line bg-surface text-ink-2",
        brand: "border-brand/15 bg-brand-soft text-brand-ink",
        success: "border-emerald-200 bg-emerald-50 text-emerald-700",
        warning: "border-amber-200 bg-amber-50 text-amber-700",
        danger: "border-red-200 bg-red-50 text-red-700",
        violet: "border-violet-200 bg-violet-50 text-violet-700",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

const STATUS: Record<ApplicationStatus, { label: string; tone: VariantProps<typeof badgeVariants>["tone"] }> = {
  pending: { label: "Submitted", tone: "neutral" },
  reviewing: { label: "In review", tone: "brand" },
  shortlisted: { label: "Shortlisted", tone: "violet" },
  accepted: { label: "Accepted", tone: "success" },
  rejected: { label: "Not selected", tone: "danger" },
  withdrawn: { label: "Withdrawn", tone: "outline" },
};

export function StatusBadge({ status }: { status: ApplicationStatus | string }) {
  const s = STATUS[status as ApplicationStatus] || { label: status, tone: "neutral" as const };
  return (
    <Badge tone={s.tone}>
      <span className="size-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
      {s.label}
    </Badge>
  );
}

export const statusLabel = (s: string) => STATUS[s as ApplicationStatus]?.label || s;

const AVATAR_TONES = [
  "bg-sky-100 text-sky-800",
  "bg-emerald-100 text-emerald-800",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-800",
  "bg-violet-100 text-violet-800",
  "bg-teal-100 text-teal-800",
  "bg-indigo-100 text-indigo-800",
  "bg-orange-100 text-orange-800",
];

function toneFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

export function Avatar({
  name,
  src,
  size = 36,
  square,
  className,
}: {
  name?: string | null;
  src?: string | null;
  size?: number;
  square?: boolean;
  className?: string;
}) {
  const radius = square ? "rounded-lg" : "rounded-full";
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={size} height={size} className={cn(radius, "shrink-0 object-cover ring-1 ring-line", className)} style={{ width: size, height: size }} />;
  }
  return (
    <span
      aria-hidden="true"
      className={cn(radius, "inline-flex shrink-0 select-none items-center justify-center font-semibold", toneFor(name || "?"), className)}
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.38)) }}
    >
      {initials(name)}
    </span>
  );
}

export function Stat({ label, value, hint, icon }: { label: string; value: React.ReactNode; hint?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between text-[13px] text-muted">
        <span>{label}</span>
        {icon && <span className="text-faint [&_svg]:size-4">{icon}</span>}
      </div>
      <div className="mt-2 text-[26px] font-semibold leading-none tracking-[-0.02em] text-ink tabular-nums">{value}</div>
      {hint && <div className="mt-1.5 text-[12.5px] text-muted">{hint}</div>}
    </Card>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-[14px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-line", className)} />;
}
