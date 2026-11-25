import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Library, Plus, Settings, X } from "lucide-react";
import { useStore } from "@/store/store";
const navItem =
  "app-nav-link flex min-h-14 min-w-11 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground";
const active = { className: "text-foreground [&_svg]:text-primary" };
export function AppShell({ children }: { children: ReactNode }) {
  const { warning, dismissWarning, persistence } = useStore();
  return (
    <div className="app-shell min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <header className="app-content flex items-center justify-between px-4 py-3 md:px-8">
        <span className="font-display text-xl font-bold lg:invisible">ProofQuest</span>
        <Link
          to="/settings"
          aria-label="Settings"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Settings className="h-5 w-5" aria-hidden />
        </Link>
      </header>
      {warning && (
        <div
          role="alert"
          className="app-content flex items-start gap-2 bg-warning/15 px-4 py-3 text-sm text-warning"
        >
          <div className="flex-1">
            <p>{warning}</p>
            <Link
              to="/settings"
              hash="data-backup"
              className="inline-flex min-h-11 items-center underline"
            >
              Data &amp; backup
            </Link>
          </div>
          <button
            onClick={dismissWarning}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center"
            aria-label="Dismiss warning"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {persistence === "temporary" && (
        <p role="status" className="app-content bg-warning/15 px-4 py-2 text-sm">
          Temporary session — export before closing this tab.
        </p>
      )}
      <main id="main" tabIndex={-1} className="app-content app-main">
        {children}
      </main>
      <nav
        aria-label="Primary"
        className="app-nav fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-md"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <span className="app-nav-brand font-display text-xl font-bold">ProofQuest</span>
        <div className="app-nav-items mx-auto flex max-w-[430px] items-center justify-between gap-2 px-2 py-1.5">
          <Link to="/" className={navItem} activeProps={active} activeOptions={{ exact: true }}>
            <Plus className="h-5 w-5" aria-hidden />
            New study
          </Link>
          <Link to="/library" search={{}} className={navItem} activeProps={active}>
            <Library className="h-5 w-5" aria-hidden />
            Library
          </Link>
        </div>
      </nav>
    </div>
  );
}
