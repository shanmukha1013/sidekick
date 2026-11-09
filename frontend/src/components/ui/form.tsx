"use client";

import { forwardRef, useId, useState, cloneElement, isValidElement } from "react";
import { ChevronDown, Eye, EyeOff, X } from "lucide-react";
import { cn } from "@/lib/utils";

const controlBase =
  "w-full rounded-lg border bg-field text-[14px] text-paper shadow-xs transition-[border-color,box-shadow] duration-150 placeholder:text-paper/40 disabled:cursor-not-allowed disabled:border-line-strong disabled:bg-subtle disabled:text-ink-2 focus:outline-none focus:ring-4";
const controlOk = "border-field-line hover:border-yellow/50 focus:border-brand focus:ring-brand/35";
const controlErr = "border-danger focus:border-danger focus:ring-brand/35";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  leading?: React.ReactNode;
  /** Layout classes for the wrapper when `leading` is used (e.g. flex-1, widths). */
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, invalid, leading, containerClassName, ...props }, ref) {
  if (leading) {
    return (
      <div className={cn("relative", containerClassName)}>
        <span className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center text-yellow/70 [&_svg]:size-4">{leading}</span>
        <input
          ref={ref}
          aria-invalid={invalid || undefined}
          className={cn(controlBase, invalid ? controlErr : controlOk, "h-10 pl-9 pr-3", className)}
          {...props}
        />
      </div>
    );
  }
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(controlBase, invalid ? controlErr : controlOk, "h-10 px-3", className)}
      {...props}
    />
  );
});

export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, "type">>(function PasswordInput(
  { className, invalid, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        ref={ref}
        type={visible ? "text" : "password"}
        aria-invalid={invalid || undefined}
        className={cn(controlBase, invalid ? controlErr : controlOk, "h-10 pl-3 pr-10", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-paper/50 transition-colors hover:text-yellow"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ className, invalid, rows = 4, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        aria-invalid={invalid || undefined}
        className={cn(controlBase, invalid ? controlErr : controlOk, "min-h-[80px] resize-y px-3 py-2.5 leading-relaxed", className)}
        {...props}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  function Select({ className, invalid, children, ...props }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          aria-invalid={invalid || undefined}
          className={cn(controlBase, invalid ? controlErr : controlOk, "h-10 cursor-pointer appearance-none pl-3 pr-9", className)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-yellow/70" aria-hidden="true" />
      </div>
    );
  },
);

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-[13px] font-medium text-ink-2", className)} {...props} />;
}

/** Label + control + hint/error, wired up with ids for accessibility. */
export function Field({
  label,
  hint,
  error,
  required,
  action,
  className,
  children,
}: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  required?: boolean;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactElement<{ id?: string; "aria-describedby"?: string; invalid?: boolean }>;
}) {
  const id = useId();
  const controlId = (isValidElement(children) && children.props.id) || id;
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {(label || action) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <Label htmlFor={controlId}>
              {label}
              {required && <span className="ml-0.5 text-accent" aria-hidden="true">*</span>}
            </Label>
          )}
          {action}
        </div>
      )}
      {isValidElement(children)
        ? cloneElement(children, { id: controlId, "aria-describedby": describedBy, invalid: !!error })
        : children}
      {error ? (
        <p id={`${id}-error`} className="text-[12.5px] font-medium text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[12.5px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Free-form tag entry (skills etc). Enter or comma adds a tag. */
export function TagInput({
  value,
  onChange,
  placeholder,
  suggestions,
  max = 30,
  id,
  invalid,
  "aria-describedby": describedBy,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  suggestions?: readonly string[];
  max?: number;
  id?: string;
  invalid?: boolean;
  "aria-describedby"?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    for (const p of parts) if (!next.some((v) => v.toLowerCase() === p.toLowerCase()) && next.length < max) next.push(p.slice(0, 60));
    onChange(next);
    setDraft("");
  };
  const remaining = (suggestions || []).filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase())).slice(0, 8);
  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          "flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border bg-field px-2 py-1.5 shadow-xs transition-[border-color,box-shadow] focus-within:ring-4",
          invalid ? controlErr : "border-field-line focus-within:border-brand focus-within:ring-brand/35",
        )}
      >
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-yellow py-0.5 pl-2 pr-1 text-[13px] font-medium text-black">
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              className="rounded p-0.5 text-black/60 hover:bg-black/10 hover:text-black"
              aria-label={`Remove ${tag}`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          aria-describedby={describedBy}
          value={draft}
          onChange={(e) => {
            if (e.target.value.endsWith(",")) add(e.target.value);
            else setDraft(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => draft && add(draft)}
          placeholder={value.length ? "" : placeholder}
          className="h-7 min-w-[8rem] flex-1 bg-transparent px-1 text-[14px] text-paper placeholder:text-paper/40 focus:outline-none"
        />
      </div>
      {remaining.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {remaining.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-md border border-dashed border-line-strong px-2 py-0.5 text-[12.5px] text-muted transition-colors hover:border-accent hover:text-accent"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Multi-select chips for a fixed list of options. */
export function ChipSelect({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? value.filter((v) => v !== opt) : [...value, opt])}
            className={cn(
              "rounded-full border px-3 py-1 text-[13px] transition-colors",
              active ? "border-brand bg-brand text-paper shadow-glow" : "border-line-strong bg-transparent text-ink-2 hover:border-accent hover:text-accent",
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
