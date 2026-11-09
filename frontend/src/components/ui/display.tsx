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
        brand: "border-brand bg-brand text-paper",
        success: "border-brand bg-brand text-paper",
        warning: "border-black bg-black text-yellow",
        danger: "border-line bg-surface text-faint line-through decoration-faint/60",
        violet: "border-brand/50 bg-brand-soft text-brand-ink",
        solid: "border-black bg-black text-yellow",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/** Application statuses are told apart by icon and brand weight (outline → tint → black → purple). */
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
  "bg-brand text-paper",
  "bg-black text-yellow ring-1 ring-yellow/30",
  "bg-gradient-to-br from-brand to-black text-yellow",
  "bg-yellow text-black ring-1 ring-black/20",
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
      <div className="mt-2 text-[28px] font-bold leading-none tracking-[-0.03em] text-brand-ink tabular-nums">{value}</div>
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
        <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-accent sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 text-[14px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-line", className)} />;
}
