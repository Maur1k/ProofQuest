import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, BookOpen, Home, Library, PenLine, Plus, Sparkles, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useStore } from "@/store/store";

const navItem =
  "app-nav-link flex min-h-14 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground";
const choice =
  "flex min-h-16 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const BARE_PATHS = ["/intro", "/welcome", "/login", "/register"];
const active = { className: "text-foreground [&_svg]:text-primary" };

export function AppShell({ children }: { children: ReactNode }) {
  const { warning, dismissWarning, persistence } = useStore();
  const [createOpen, setCreateOpen] = useState(false);
  const close = () => setCreateOpen(false);
  // Onboarding and account demo screens are full-screen: no app navigation behind them.
  const bare = useRouterState({
    select: (s) => BARE_PATHS.includes(s.location.pathname.replace(/\/$/, "") || "/"),
  });
  if (bare) {
    return (
      <main id="main" className="min-h-[100dvh] px-4">
        {children}
      </main>
    );
  }
  return (
    <div className="app-shell min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      {warning && (
        <div
          role="alert"
          className="app-content flex items-start gap-2 bg-warning/15 px-4 py-3 text-sm text-warning"
        >
          <div className="flex-1">
            <p>{warning}</p>
            <Link to="/" hash="data-backup" className="inline-flex min-h-11 items-center underline">
              Data &amp; backup
            </Link>
          </div>
          <button
            onClick={dismissWarning}
            className="-m-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
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
        <div className="app-nav-items mx-auto flex max-w-[430px] items-center justify-between gap-1 px-2 py-1.5">
          <Link to="/" className={navItem} activeProps={active} activeOptions={{ exact: true }}>
            <Home className="h-5 w-5" aria-hidden /> Home
          </Link>
          <Link to="/subjects" className={navItem} activeProps={active}>
            <BookOpen className="h-5 w-5" aria-hidden /> Subjects
          </Link>
          <Sheet open={createOpen} onOpenChange={setCreateOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Create"
                className="app-create mx-1 inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow transition-transform hover:scale-105"
              >
                <Plus className="h-6 w-6" aria-hidden />
                <span className="hidden lg:inline">Create</span>
              </button>
            </SheetTrigger>
            <SheetContent
              side="bottom"
              className="mx-auto max-w-[430px] md:max-w-xl max-h-[90dvh] overflow-y-auto rounded-t-2xl border-border pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
            >
              <SheetHeader className="text-left">
                <SheetTitle className="font-display">Create</SheetTitle>
                <SheetDescription>Write your own quest, or study a sample lesson.</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-2">
                <Link to="/quests/new" search={{}} onClick={close} className={choice}>
                  <PenLine className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <span className="min-w-0">
                    <span className="block font-semibold text-foreground">
                      Create quest manually
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Write your own questions. Saved to your library.
                    </span>
                  </span>
                </Link>
                <Link to="/study" onClick={close} className={choice}>
                  <Sparkles className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2 font-semibold text-foreground">
                      Study a sample lesson{" "}
                      <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning">
                        Demo
                      </span>
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Drop or tap a sample to start reading. Nothing is saved.
                    </span>
                  </span>
                </Link>
              </div>
            </SheetContent>
          </Sheet>

          <Link
            to="/quests"
            className={navItem}
            activeProps={active}
            activeOptions={{ exact: true }}
          >
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
