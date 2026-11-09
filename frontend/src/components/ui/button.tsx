import Link from "next/link";
import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-[background-color,border-color,color,box-shadow,opacity,transform,filter] duration-200 select-none disabled:pointer-events-none aria-busy:opacity-90 data-[inactive]:bg-black/85 data-[inactive]:text-paper/45 data-[inactive]:shadow-none data-[inactive]:ring-1 data-[inactive]:ring-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-brand text-paper shadow-glow hover:-translate-y-px hover:bg-brand-hover active:translate-y-0",
        brand: "bg-brand text-paper shadow-glow hover:-translate-y-px hover:bg-brand-hover active:translate-y-0",
        secondary: "border border-line-strong bg-surface text-ink shadow-xs hover:-translate-y-px hover:brightness-[0.94] active:translate-y-0",
        ghost: "text-ink-2 hover:bg-subtle hover:text-ink",
        danger: "bg-black text-yellow ring-1 ring-yellow/35 shadow-xs hover:ring-yellow/70",
        "danger-ghost": "text-danger underline-offset-4 hover:bg-subtle hover:underline",
        link: "h-auto px-0 text-brand-ink underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-[13px]",
        md: "h-9 px-3.5 text-sm",
        lg: "h-11 px-5 text-[15px]",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, loading, disabled, children, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-inactive={disabled && !loading ? "" : undefined}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
});

export function ButtonLink({
  href,
  className,
  variant,
  size,
  children,
  ...props
}: React.ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>) {
  return (
    <Link href={href} className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {children}
    </Link>
  );
}
