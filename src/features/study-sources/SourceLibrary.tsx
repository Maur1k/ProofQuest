import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useStore } from "@/store/store";
import type { SourceRevision, StudySource } from "@/domain/study-source";
export function SourceLibrary() {
  const { ready, persistence, listSourceData } = useStore();
  const [sources, setSources] = useState<StudySource[]>([]),
    [revisions, setRevisions] = useState<SourceRevision[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    if (!ready || persistence !== "durable") return;
    let live = true;
    void listSourceData().then(
      (data) => {
        if (live) {
          setSources(data.sources.filter((s) => s.kind !== "sample"));
          setRevisions(data.revisions);
        }
      },
      () => {
        if (live) setError("Saved sources could not be loaded. Reload to retry.");
      },
    );
    return () => {
      live = false;
    };
  }, [ready, persistence, listSourceData]);
  return (
    <section className="space-y-3" aria-label="Saved sources">
      {!sources.length && <p>No saved study sources.</p>}
      {sources.map((source) => (
        <article key={source.id} className="space-y-2 rounded-xl border p-4">
          <h2 className="break-words font-semibold">{source.title}</h2>
          <Link
            to="/"
            search={{ source: source.id }}
            className="inline-flex min-h-11 items-center text-primary underline"
          >
            Choose study mode
          </Link>
          <details>
            <summary className="min-h-11 cursor-pointer py-2">
              Source details and earlier versions
            </summary>
            {revisions
              .filter((r) => r.sourceId === source.id)
              .map((r) => (
                <details key={r.id}>
                  <summary className="min-h-11 cursor-pointer py-2">
                    {new Date(r.createdAt).toLocaleString()}{" "}
                    {r.id === source.currentRevisionId ? "(current)" : "(retained)"}
                  </summary>
                  <Link
                    to="/"
                    search={{ source: source.id, revision: r.id }}
                    className="inline-flex min-h-11 items-center text-primary underline"
                  >
                    Study this saved version
                  </Link>
                  {r.segments.map((s) => (
                    <p key={s.id} className="my-2 whitespace-pre-wrap break-words">
                      {s.label}: {s.text}
                    </p>
                  ))}
                </details>
              ))}
          </details>
        </article>
      ))}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
