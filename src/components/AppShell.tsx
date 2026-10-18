import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BarChart3, BookOpen, Home, Library, Plus, X } from "lucide-react";
import { useStore } from "@/store/store";

const navItem =
  "flex min-h-14 min-w-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground";
const active = { className: "text-foreground [&_svg]:text-primary" };

export function AppShell({ children }: { children: ReactNode }) {
  const { warning, dismissWarning } = useStore();
  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      {warning && (
        <div role="alert" className="mx-auto flex max-w-[430px] items-start gap-2 bg-warning/15 px-4 py-3 text-sm text-warning">
          <p className="flex-1">{warning}</p>
          <button
            onClick={dismissWarning}
            className="-m-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
            aria-label="Dismiss warning"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <main id="main" className="mx-auto max-w-[430px] px-4 pb-32">
        {children}
      </main>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-md"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-[430px] items-center justify-between gap-1 px-2 py-1.5">
          <Link to="/" className={navItem} activeProps={active} activeOptions={{ exact: true }}>
            <Home className="h-5 w-5" aria-hidden /> Home
          </Link>
          <Link to="/subjects" className={navItem} activeProps={active}>
            <BookOpen className="h-5 w-5" aria-hidden /> Subjects
          </Link>
          <Link
            to="/quests/new"
            search={{}}
            aria-label="Create quest"
            className="mx-1 inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow transition-transform hover:scale-105"
          >
            <Plus className="h-6 w-6" aria-hidden />
          </Link>
          <Link to="/quests" className={navItem} activeProps={active} activeOptions={{ exact: true }}>
            <Library className="h-5 w-5" aria-hidden /> Quests
          </Link>
          <Link to="/progress" className={navItem} activeProps={active}>
            <BarChart3 className="h-5 w-5" aria-hidden /> Progress
          </Link>
        </div>
      </nav>
    </div>
  );
}
