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
            className="block rounded-xl border border-border p-4 focus-visible:ring-2 focus-visible:ring-primary"
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
    <article className="space-y-3 rounded-xl border border-border bg-card p-4">
      <h3 className="break-words font-semibold">{row.title}</h3>
      <p className="text-sm text-muted-foreground">
        {row.format === "quiz"
          ? "Quiz / Exam"
          : row.format === "flashcards"
            ? "Flashcards"
            : "Reviewer"}
      </p>
      {row.kind === "attempt" ? (
        <p className="text-sm">Retained attempt snapshot. Open the saved attempt below.</p>
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
    <div className="space-y-5">
      <Link
        to="/library"
        search={{}}
        className="inline-flex min-h-11 items-center text-primary underline"
      >
        Back to Library
      </Link>
      <h1 className="break-words text-2xl font-bold">{group.title}</h1>
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
      <div role="group" aria-label="Source sections" className="flex flex-wrap gap-2">
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
            <p>No saved study materials yet. Your source is saved and ready to use.</p>
          )}
          {group.materials.map((row) => (
            <Material key={row.key} row={row} />
          ))}
        </section>
      ) : (
        <section aria-label="Results">
          {!attempts.length ? (
            <p>No saved attempts for this source yet.</p>
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
      <div className="py-6">
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
    <div className="space-y-6 py-6">
      <header>
        <h1 className="text-3xl font-bold">Library</h1>
        <p className="mt-2 text-muted-foreground">
          Your sources, study materials and results, saved in this browser.
        </p>
      </header>
      <Link to="/" className="inline-flex min-h-11 items-center text-primary underline">
        New study
      </Link>
      {view.sources.length === 0 && view.other.length === 0 && (
        <p>Your Library is empty. Add a PDF or paste text to begin.</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {view.sources.map((g) => (
          <Link
            key={g.key}
            to="/library"
            search={{ source: g.key }}
            className="block rounded-2xl border border-border bg-card p-5 hover:border-primary focus-visible:ring-2 focus-visible:ring-primary"
          >
            <h2 className="break-words font-semibold">{g.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {g.source?.kind === "text" ? "Text" : "PDF"} · {g.materials.length} saved materials
            </p>
            <span className="mt-3 block text-sm text-primary">Open source</span>
          </Link>
        ))}
      </div>
      {view.other.length > 0 && (
        <section aria-label="Other saved materials" className="space-y-3">
          <h2 className="text-xl font-semibold">Other saved materials</h2>
          <p className="text-sm text-muted-foreground">
            These records have no unambiguous saved source link. Their original content and results
            are preserved.
          </p>
          {view.other.map((row) => (
            <Material key={row.key} row={row} />
          ))}
        </section>
      )}
    </div>
  );
}
