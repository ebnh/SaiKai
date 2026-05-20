"use client";

import { cn } from "@/lib/utils";
import { useTheme } from "@/providers/theme-provider";

export function SectionCard({
  className,
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-[32px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(255,255,255,0.82))] p-5 shadow-card ring-1 ring-white/55 motion-safe:animate-[surface-float_280ms_ease-out] dark:border-[#253243] dark:bg-none dark:bg-[#10161d] dark:ring-0 sm:p-6",
        className
      )}
    >
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
  const { theme } = useTheme();
  const variants = {
    primary:
      "bg-[linear-gradient(135deg,#18212d,#2d3847)] text-white shadow-[0_14px_30px_rgba(24,33,45,0.24)] hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(24,33,45,0.28)] dark:bg-none dark:bg-[#1f2a36] dark:text-slate-50 dark:shadow-[0_10px_22px_rgba(0,0,0,0.24)] dark:hover:bg-[#2a3b4f]",
    secondary:
      "bg-[linear-gradient(135deg,#b86f52,#cf8d71)] text-white shadow-[0_12px_24px_rgba(184,111,82,0.22)] hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(184,111,82,0.26)] dark:bg-none dark:bg-[#7a4f3f] dark:text-slate-50 dark:shadow-[0_10px_22px_rgba(0,0,0,0.22)] dark:hover:bg-[#9c6650]",
    ghost:
      "border border-white/70 bg-white/72 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] hover:-translate-y-0.5 hover:bg-white/92 dark:border-[#2a3747] dark:bg-[#1b2430] dark:text-slate-100 dark:shadow-none dark:hover:bg-[#243140]",
    danger:
      "bg-[linear-gradient(135deg,#c24747,#d96a6a)] text-white shadow-[0_12px_24px_rgba(194,71,71,0.2)] hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(194,71,71,0.24)] dark:bg-none dark:bg-[#7d3d3d] dark:text-slate-50 dark:shadow-[0_10px_22px_rgba(0,0,0,0.22)] dark:hover:bg-[#a04f4f]"
  };

  const darkStyles =
    theme === "dark"
      ? variant === "ghost"
        ? { color: "#f8fafc", backgroundColor: "#1b2430", borderColor: "#2a3747" }
        : variant === "primary"
          ? { color: "#f8fafc", backgroundColor: "#1f2a36" }
          : variant === "secondary"
            ? { color: "#f8fafc", backgroundColor: "#7a4f3f" }
            : { color: "#f8fafc", backgroundColor: "#7d3d3d" }
      : undefined;

  const disabledStyles =
    theme === "dark" && props.disabled
      ? { color: "#94a3b8", opacity: 0.82 }
      : undefined;

  return (
    <button
      {...props}
      style={{ ...darkStyles, ...disabledStyles, ...props.style }}
      className={cn(
        "rounded-2xl px-4 py-2.5 text-sm font-medium transition duration-200 disabled:cursor-not-allowed disabled:opacity-60 dark:disabled:opacity-70",
        variants[variant],
        className
      )}
    />
  );
}

export function Pill({
  className,
  children,
  style
}: {
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <span
      style={style}
      className={cn(
        "rounded-full border border-white/75 bg-white/72 px-3 py-1 text-[11px] font-semibold tracking-[0.02em] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:border-[#2a3747] dark:bg-[#202a36] dark:text-slate-100 dark:shadow-none",
        className
      )}
    >
      {children}
    </span>
  );
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
    <SectionCard className="flex min-h-64 flex-col items-center justify-center overflow-hidden text-center">
      <div className="max-w-md">
        <div className="mx-auto mb-5 h-16 w-16 rounded-[22px] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_rgba(227,232,239,0.9)_55%,_rgba(184,111,82,0.2))] dark:bg-[#202a36]" />
        <h2 className="text-xl font-semibold text-slate dark:text-white">{title}</h2>
        <p className="mt-3 text-sm leading-7 text-ink/70 dark:text-slate-200">{description}</p>
        {action ? <div className="mt-6">{action}</div> : null}
      </div>
    </SectionCard>
  );
}
