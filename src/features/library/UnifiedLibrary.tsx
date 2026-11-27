import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useStore } from "@/store/store";
import { documentStorage } from "@/features/documents/service";
import {
  buildLibrary,
  type LibraryView,
  type LibraryMaterial,
  type LibrarySource,
} from "@/domain/library";
import { Button } from "@/components/ui/button";
import type { QuizSession } from "@/domain/quiz-session";

function Attempts({ rows }: { rows: QuizSession[] }) {
  return (
    <ul className="space-y-3">
      {rows.map((s) => (
        <li key={s.id}>
          <Link
            className="block space-y-2 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary"
            to={
              s.completedAt !== null
                ? "/quiz-results/$sessionId"
                : s.mode === "practice"
                  ? "/quiz-practice/$sessionId"
                  : "/quiz-test/$sessionId"
            }
            params={{ sessionId: s.id }}
          >
            <span className="block break-words font-semibold">{s.version.title}</span>
            <span className="block text-sm">
              {s.mode === "practice" ? "Quiz" : "Exam"} ·{" "}
              {s.completedAt === null
                ? "Resume unfinished attempt"
                : s.result
                  ? `Recorded score: ${s.result.correct}/${s.result.total} (${s.result.percentage}%)`
                  : "Open saved result"}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(s.updatedAt).toLocaleString()}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
function Material({ row }: { row: LibraryMaterial }) {
  const { startSavedQuiz } = useStore();
  const navigate = useNavigate();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function open(mode: "practice" | "test") {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const session = await startSavedQuiz(row.id, mode);
      await navigate({
        to: mode === "practice" ? "/quiz-practice/$sessionId" : "/quiz-test/$sessionId",
        params: { sessionId: session.id },
      });
    } catch {
      setError("Saved questions could not be opened. Retry without generating again.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <article className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <h3 className="break-words text-lg font-semibold">{row.title}</h3>
      <p className="text-sm text-muted-foreground">
        {row.format === "quiz"
          ? "Quiz / Exam"
          : row.format === "flashcards"
            ? "Flashcards"
            : "Reviewer"}
      </p>
      {row.kind === "attempt" ? (
        <p className="text-sm text-muted-foreground">
          Your saved attempt is available below, with its original questions and answers.
        </p>
      ) : row.format === "quiz" ? (
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => void open("practice")}>
            Open Quiz
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => void open("test")}>
            Open Exam
          </Button>
          <p className="w-full text-xs text-muted-foreground">
            Uses the same saved questions; no AI call.
          </p>
        </div>
      ) : (
        <Link
          to="/materials"
          search={{ id: row.id }}
          className="inline-flex min-h-11 items-center text-primary underline"
        >
          Open {row.format === "flashcards" ? "Flashcards" : "Reviewer"}
        </Link>
      )}
      {row.attempts.length > 0 && (
        <details>
          <summary className="min-h-11 cursor-pointer py-2">
            Results and unfinished attempts ({row.attempts.length})
          </summary>
          <Attempts rows={row.attempts} />
        </details>
      )}
      {error && <p role="alert">{error}</p>}
    </article>
  );
}
function SourceDetails({ group }: { group: LibrarySource }) {
  const [section, setSection] = useState<"materials" | "results">("materials");
  const attempts = group.materials
    .flatMap((m) => m.attempts)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        to="/library"
        search={{}}
        className="inline-flex min-h-11 items-center text-primary underline"
      >
        Back to Library
      </Link>
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {group.source?.kind === "text" ? "Text source" : "PDF source"} · Saved locally
        </p>
        <h1 className="break-words text-2xl font-bold sm:text-3xl">{group.title}</h1>
      </header>
      <div className="flex flex-wrap gap-3">
        {group.source ? (
          <Link
            to="/"
            search={{ source: group.source.id }}
            className="inline-flex min-h-11 items-center text-primary underline"
          >
            Create study material
          </Link>
        ) : (
          group.document && (
            <Link
              to="/"
              search={{ document: group.document.id }}
              className="inline-flex min-h-11 items-center text-primary underline"
            >
              Create study material
            </Link>
          )
        )}
        {group.document && (
          <Link
            to="/documents/$documentId"
            params={{ documentId: group.document.id }}
            className="inline-flex min-h-11 items-center text-primary underline"
          >
            Open original PDF
          </Link>
        )}
      </div>
      <details className="rounded-xl border border-border p-4">
        <summary className="min-h-11 cursor-pointer py-2">Source details</summary>
        {group.source?.kind === "pdf" && !group.document && (
          <p>Original PDF is unavailable. Retained text and study materials remain readable.</p>
        )}
        {group.revisions.map((r) => (
          <details key={r.id}>
            <summary className="min-h-11 cursor-pointer py-2">
              {new Date(r.createdAt).toLocaleString()} ·{" "}
              {r.id === group.source?.currentRevisionId ? "Current version" : "Earlier version"}
            </summary>
            <Link
              to="/"
              search={{ source: r.sourceId, revision: r.id }}
              className="inline-flex min-h-11 items-center text-primary underline"
            >
              Study this saved version
            </Link>
            {r.segments.map((s) => (
              <section key={s.id} className="my-3">
                <h3 className="font-semibold">{s.label}</h3>
                <p className="whitespace-pre-wrap break-words">{s.text}</p>
              </section>
            ))}
          </details>
        ))}
        {!group.revisions.length && <p>Original PDF retained. Open it to read extracted text.</p>}
      </details>
      <div
        role="group"
        aria-label="Source sections"
        className="grid grid-cols-2 gap-2 rounded-2xl bg-muted/40 p-2"
      >
        <Button
          variant={section === "materials" ? "default" : "outline"}
          aria-pressed={section === "materials"}
          onClick={() => setSection("materials")}
        >
          Study materials
        </Button>
        <Button
          variant={section === "results" ? "default" : "outline"}
          aria-pressed={section === "results"}
          onClick={() => setSection("results")}
        >
          Results
        </Button>
      </div>
      {section === "materials" ? (
        <section aria-label="Study materials" className="space-y-3">
          {!group.materials.length && (
            <div className="rounded-2xl border border-dashed border-border p-6 sm:p-8">
              <h2 className="mb-2 text-lg font-semibold">Ready when you are</h2>
              <p className="text-sm text-muted-foreground">
                No saved study materials yet. Your source is saved and ready to use.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Choose Create study material above to select a study mode.
              </p>
            </div>
          )}
          {group.materials.map((row) => (
            <Material key={row.key} row={row} />
          ))}
        </section>
      ) : (
        <section aria-label="Results">
          {!attempts.length ? (
            <div className="rounded-2xl border border-dashed border-border p-6 sm:p-8">
              <h2 className="mb-2 text-lg font-semibold">Your results will appear here</h2>
              <p className="text-sm text-muted-foreground">
                No saved attempts for this source yet.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Open a Quiz or Exam from Study materials to get started.
              </p>
            </div>
          ) : (
            <Attempts rows={attempts} />
          )}
        </section>
      )}
    </div>
  );
}
export function UnifiedLibrary({ sourceKey }: { sourceKey?: string | undefined }) {
  const {
    ready,
    persistence,
    listSourceData,
    listSourceMaterials,
    listStudyMaterials,
    listSavedQuizzes,
    listQuizSessions,
  } = useStore();
  const [view, setView] = useState<LibraryView | null>(null),
    [error, setError] = useState(false),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!ready || persistence !== "durable") return;
    let live = true;
    setError(false);
    setView(null);
    void Promise.all([
      listSourceData(),
      documentStorage((repo) => repo.listDocuments()),
      listSourceMaterials(),
      listStudyMaterials(),
      listSavedQuizzes(),
      listQuizSessions(),
    ])
      .then(([data, documents, sourceMaterials, studyMaterials, quizzes, sessions]) => {
        if (live)
          setView(
            buildLibrary({
              ...data,
              documents,
              sourceMaterials,
              studyMaterials,
              quizzes,
              sessions,
            }),
          );
      })
      .catch(() => {
        if (live) setError(true);
      });
    return () => {
      live = false;
    };
  }, [
    ready,
    persistence,
    listSourceData,
    listSourceMaterials,
    listStudyMaterials,
    listSavedQuizzes,
    listQuizSessions,
    refresh,
  ]);
  if (!ready) return <p role="status">Opening browser storage…</p>;
  if (persistence !== "durable")
    return (
      <p>
        Saved Library access requires browser storage.{" "}
        <Link to="/settings" className="text-primary underline">
          Open Settings
        </Link>
      </p>
    );
  if (error)
    return (
      <div role="alert">
        <p>Library could not be loaded. Your saved records have not been changed.</p>
        <Button onClick={() => setRefresh((n) => n + 1)}>Retry loading Library</Button>
      </div>
    );
  if (!view) return <p role="status">Loading Library…</p>;
  if (sourceKey) {
    const group = view.sources.find((g) => g.key === sourceKey);
    return (
      <div className="py-6 sm:py-10">
        {group ? (
          <SourceDetails key={group.key} group={group} />
        ) : (
          <>
            <p>This source is no longer available in this browser.</p>
            <Link
              to="/library"
              search={{}}
              className="inline-flex min-h-11 items-center text-primary underline"
            >
              Open Library
            </Link>
          </>
        )}
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-4xl space-y-6 py-6 sm:py-10">
      <header>
        <h1 className="text-3xl font-bold">Library</h1>
        <p className="mt-2 text-muted-foreground">
          Pick up where you left off. Everything here is saved in this browser.
        </p>
      </header>
      <Link
        to="/"
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        New study
      </Link>
      {view.sources.length === 0 && view.other.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-6 sm:p-10">
          <h2 className="mb-2 text-xl font-semibold">Your next study starts here</h2>
          <p className="text-muted-foreground">
            Your Library is empty. Add a PDF or paste text to begin.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Choose New study above. Your saved sources, study materials and results will stay
            together.
          </p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {view.sources.map((g) => (
          <Link
            key={g.key}
            to="/library"
            search={{ source: g.key }}
            className="block rounded-2xl border border-border bg-card p-5 hover:border-primary focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="mb-3 inline-flex rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              {g.source?.kind === "text" ? "Text" : "PDF"}
            </span>
            <h2 className="break-words text-lg font-semibold">{g.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {g.materials.length === 0
                ? "Source saved · Ready to study"
                : `${g.materials.length} saved ${g.materials.length === 1 ? "material" : "materials"}`}
            </p>
            <span className="mt-3 block text-sm text-primary">Open source</span>
          </Link>
        ))}
      </div>
      {view.other.length > 0 && (
        <section aria-label="Other saved materials" className="space-y-3">
          <h2 className="text-xl font-semibold">Other saved materials</h2>
          <p className="text-sm text-muted-foreground">
            These materials could not be matched to a saved source. You can still open their
            original content and results.
          </p>
          {view.other.map((row) => (
            <Material key={row.key} row={row} />
          ))}
        </section>
      )}
    </div>
  );
}
