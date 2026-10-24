import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { MASTERY_MAX } from "@/domain/stats";
import type { Difficulty, Language } from "@/domain/types";
import { DIFFICULTY_LABEL } from "@/domain/subjects";

export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: string;
  subtitle?: ReactNode;
  back?: { to: string; label: string };
  action?: ReactNode;
}) {
  return (
    <header className="mb-5 pt-6">
      {back && (
        <Link
          to={back.to}
          className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <span aria-hidden>←</span> {back.label}
        </Link>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}

export function CodeBlock({ code, language }: { code: string; language?: Language }) {
  return (
    <figure className="overflow-hidden rounded-xl border border-border bg-code">
      {language && (
        <figcaption className="border-b border-border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {language}
        </figcaption>
      )}
      <pre
        className="overflow-x-auto p-3 font-mono text-[13px] leading-relaxed text-code-foreground"
        tabIndex={0}
      >
        <code>{code}</code>
      </pre>
    </figure>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Pill({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "primary" | "success" | "warning" | "danger";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        tone === "default" && "bg-secondary text-secondary-foreground",
        tone === "primary" && "bg-accent text-accent-foreground",
        tone === "success" && "bg-success/15 text-success",
        tone === "warning" && "bg-warning/15 text-warning",
        tone === "danger" && "bg-destructive/15 text-destructive",
      )}
    >
      {children}
    </span>
  );
}

export function DifficultyPill({ difficulty }: { difficulty: Difficulty }) {
  const tone = difficulty === "easy" ? "success" : difficulty === "medium" ? "warning" : "danger";
  return <Pill tone={tone}>{DIFFICULTY_LABEL[difficulty]}</Pill>;
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(1, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
    >
      <div
        className="h-full rounded-full bg-gradient-primary transition-all"
        style={{ width: `${v * 100}%` }}
      />
    </div>
  );
}

export function MasteryDots({ mastery }: { mastery: number }) {
  return (
    <span
      className="inline-flex items-center gap-1"
      aria-label={`Mastery ${mastery} of ${MASTERY_MAX}`}
      role="img"
    >
      {Array.from({ length: MASTERY_MAX }, (_, i) => (
        <span
          key={i}
          className={cn("h-2 w-2 rounded-full", i < mastery ? "bg-primary" : "bg-secondary")}
        />
      ))}
    </span>
  );
}

export function LoadingState() {
  return (
    <div className="space-y-3 pt-8" role="status" aria-live="polite">
      <span className="sr-only">Loading your quests…</span>
      <div className="h-7 w-2/3 animate-pulse rounded-lg bg-muted" />
      <div className="h-24 animate-pulse rounded-2xl bg-muted" />
      <div className="h-24 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4", className)}>{children}</div>
  );
}
