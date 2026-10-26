// Small shadcn-style primitives, tuned to the Qubool palette.
import { cn } from "@/lib/format";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
const variants: Record<Variant, string> = {
  primary: "bg-ink text-ivory hover:bg-ink/90",
  secondary: "bg-cream text-ink hover:bg-sand",
  outline: "border border-line bg-white text-ink hover:bg-cream/60",
  ghost: "text-ink hover:bg-cream/70",
  danger: "border border-rose/40 bg-white text-[#9b4d47] hover:bg-rose-soft",
};
const base = "inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium transition disabled:opacity-50 disabled:pointer-events-none";
const sizes = { sm: "h-8 px-3 text-xs", md: "h-10 px-5", lg: "h-12 px-7 text-[15px]" };

export function Button({ variant = "primary", size = "md", className, ...p }: ComponentProps<"button"> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <button className={cn(base, variants[variant], sizes[size], className)} {...p} />;
}

export function ButtonLink({ variant = "primary", size = "md", className, ...p }: ComponentProps<typeof Link> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <Link className={cn(base, variants[variant], sizes[size], className)} {...p} />;
}

export function Card({ className, ...p }: ComponentProps<"div">) {
  return <div className={cn("rounded-2xl border border-line bg-white shadow-[0_1px_0_rgba(43,38,32,0.03)]", className)} {...p} />;
}

export function CardHeader({ title, description, action }: { title: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line/70 px-5 py-4">
      <div>
        <h3 className="font-serif text-xl leading-tight">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

const field = "w-full rounded-xl border border-line bg-white px-3.5 text-sm text-ink placeholder:text-muted/60 focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold-soft";

export function Input({ className, ...p }: ComponentProps<"input">) {
  return <input className={cn(field, "h-10", className)} {...p} />;
}
export function Textarea({ className, ...p }: ComponentProps<"textarea">) {
  return <textarea className={cn(field, "py-2.5 leading-relaxed", className)} {...p} />;
}
export function Select({ className, ...p }: ComponentProps<"select">) {
  return <select className={cn(field, "h-10 pr-8", className)} {...p} />;
}

export function Label({ className, ...p }: ComponentProps<"label">) {
  return <label className={cn("mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-muted", className)} {...p} />;
}

/** Labelled form control. The <label> wraps the control so it's associated without ids; pass `group` for checkbox groups. */
export function Field({ label, hint, children, className, group }: { label: string; hint?: ReactNode; children: ReactNode; className?: string; group?: boolean }) {
  const caption = <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.08em] text-muted">{label}</span>;
  if (group) {
    return (
      <fieldset className={className}>
        <legend className="mb-1.5 text-xs font-medium uppercase tracking-[0.08em] text-muted">{label}</legend>
        {children}
        {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      </fieldset>
    );
  }
  return (
    <div className={className}>
      <label className="block">{caption}{children}</label>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

const tones = {
  neutral: "bg-cream text-ink/80",
  gold: "bg-gold-soft/70 text-[#7a5d2f]",
  sage: "bg-sage-soft text-[#4f5f48]",
  rose: "bg-rose-soft text-[#8f4f4a]",
  ink: "bg-ink text-ivory",
  outline: "border border-line text-muted",
};
export function Badge({ tone = "neutral", className, ...p }: ComponentProps<"span"> & { tone?: keyof typeof tones }) {
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium", tones[tone], className)} {...p} />;
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "sage" | "rose" | "gold" }) {
  const dot = tone === "sage" ? "bg-sage" : tone === "rose" ? "bg-rose" : tone === "gold" ? "bg-gold" : "bg-line";
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-[0.08em] text-muted">
        <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
        {label}
      </div>
      <div className="mt-1 font-serif text-3xl leading-none">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}

export function Progress({ value, className, tone = "gold" }: { value: number; className?: string; tone?: "gold" | "sage" | "rose" }) {
  const c = tone === "sage" ? "bg-sage" : tone === "rose" ? "bg-rose" : "bg-gold";
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-cream", className)}>
      <div className={cn("h-full rounded-full transition-all", c)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-serif text-4xl leading-tight">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      <p className="font-serif text-xl">{title}</p>
      {children && <div className="mt-1 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Checkbox({ className, ...p }: ComponentProps<"input">) {
  return <input type="checkbox" className={cn("h-4 w-4 rounded border-line accent-[#2b2620]", className)} {...p} />;
}

/** Small decorative crescent-arch mark used as the Qubool logo. */
/** Two interlocking rings: Qubool's mark (also the favicon, app/icon.svg). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden className={cn("h-6 w-6", className)}>
      <circle cx="12.5" cy="16" r="7.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="19.5" cy="16" r="7.5" stroke="#b08d57" strokeWidth="2" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-serif text-2xl tracking-tight", className)}>
      <LogoMark className="h-[0.9em] w-[0.9em]" />
      Qubool
    </span>
  );
}
