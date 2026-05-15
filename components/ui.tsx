"use client";

import { cn } from "@/lib/utils";

export function SectionCard({
  className,
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-card backdrop-blur", className)}>
      {children}
    </section>
  );
}

export function Button({
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const variants = {
    primary: "bg-ink text-white hover:bg-ink/90",
    secondary: "bg-clay text-white hover:bg-clay/90",
    ghost: "bg-mist/70 text-ink hover:bg-mist",
    danger: "bg-rose-600 text-white hover:bg-rose-500"
  };

  return (
    <button
      {...props}
      className={cn(
        "rounded-2xl px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className
      )}
    />
  );
}

export function Pill({
  className,
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <span className={cn("rounded-full bg-sand px-3 py-1 text-xs font-medium text-ink", className)}>{children}</span>;
}

export function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <SectionCard className="flex min-h-60 flex-col items-center justify-center text-center">
      <div className="max-w-md">
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-ink/70">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </SectionCard>
  );
}
