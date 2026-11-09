import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";
import type { ApplicationStatus } from "@/lib/types";
import { CheckCircle2, Eye, type LucideIcon, Send, Star, Undo2, XCircle } from "lucide-react";

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
        success: "border-silver-700 bg-silver-700 text-silver-50",
        warning: "border-silver-500 bg-silver-400 text-silver-900",
        danger: "border-line bg-surface text-faint line-through decoration-faint/60",
        violet: "border-silver-500 bg-silver-400 text-silver-900",
        solid: "border-silver-800 bg-silver-800 text-silver-50",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/** Application statuses are told apart by icon and silver weight (outline → light → medium → deep). */
const STATUS: Record<ApplicationStatus, { label: string; tone: VariantProps<typeof badgeVariants>["tone"]; icon: LucideIcon }> = {
  pending: { label: "Submitted", tone: "outline", icon: Send },
  reviewing: { label: "In review", tone: "neutral", icon: Eye },
  shortlisted: { label: "Shortlisted", tone: "warning", icon: Star },
  accepted: { label: "Accepted", tone: "success", icon: CheckCircle2 },
  rejected: { label: "Not selected", tone: "outline", icon: XCircle },
  withdrawn: { label: "Withdrawn", tone: "outline", icon: Undo2 },
};

export function StatusBadge({ status }: { status: ApplicationStatus | string }) {
  const s = STATUS[status as ApplicationStatus] || { label: status, tone: "neutral" as const, icon: Eye };
  const Icon = s.icon;
  const dim = status === "rejected" || status === "withdrawn";
  return (
    <Badge tone={s.tone} className={dim ? "text-faint" : undefined}>
      <Icon aria-hidden="true" />
      {s.label}
    </Badge>
  );
}

export const statusLabel = (s: string) => STATUS[s as ApplicationStatus]?.label || s;

const AVATAR_TONES = [
  "bg-silver-700 text-silver-50",
  "bg-silver-600 text-silver-50",
  "bg-silver-500 text-silver-900",
  "bg-silver-400 text-silver-800",
  "bg-silver-800 text-silver-100",
  "bg-gradient-to-br from-silver-500 to-silver-700 text-silver-50",
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
        {icon && <span className="flex size-7 items-center justify-center rounded-md border border-line bg-subtle text-muted [&_svg]:size-3.5">{icon}</span>}
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
