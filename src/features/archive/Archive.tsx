import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useStore } from "@/store/store";
import { archivedAnswer, isArchivedQuizId } from "@/domain/archive";
import type { QuizQuestion, QuizVersion } from "@/domain/quiz";
import type { QuizSession } from "@/domain/quiz-session";
import { sourcePassages, type SourceMaterial } from "@/domain/source-material";
import type { SourceRevision } from "@/domain/study-source";
import { Button } from "@/components/ui/button";

function Question({ question: q }: { question: QuizQuestion }) {
  const answer =
    q.type === "mcq"
      ? q.options.find((o) => o.id === q.correctOptionId)?.text
      : q.type === "predict"
        ? q.expectedOutput
        : q.type === "fix"
          ? q.fixedCode
          : q.steps.map((s) => `${s.label}: ${s.values.join(" | ")}`).join("\n");
  return (
    <div className="space-y-2 border-t border-border pt-3">
      <p className="font-medium">{q.prompt}</p>
      {q.type !== "mcq" && <pre className="whitespace-pre-wrap break-words text-sm">{q.code}</pre>}
      {q.type === "mcq" && (
        <ul className="list-disc pl-5">
          {q.options.map((o) => (
            <li key={o.id}>{o.text}</li>
          ))}
        </ul>
      )}
      <p className="whitespace-pre-wrap break-words">
        <strong>Saved answer key: </strong>
        {answer}
      </p>
      <p>{q.explanation}</p>
    </div>
  );
}
function SampleMaterial({ material: m }: { material: SourceMaterial }) {
  const passages = sourcePassages(m.request.source);
  const evidence = (id: string) =>
    passages.find((p) => p.id === id)?.text ?? "Evidence unavailable";
  const output = m.output;
  return (
    <div className="space-y-3">
      {output.format === "quiz" ? (
        output.questions.map((q, i) => (
          <Question
            key={i}
            question={{ ...q, id: String(i), type: "mcq", hints: [], sources: [] }}
          />
        ))
      ) : output.format === "flashcards" ? (
        output.cards.map((c, i) => (
          <div key={i}>
            <p className="font-medium">{c.front}</p>
            <p>{evidence(c.evidenceId)}</p>
          </div>
        ))
      ) : (
        <>
          {output.sections.map((s, i) => (
            <section key={i}>
              <h3 className="font-semibold">{s.heading}</h3>
              <ul>
                {s.points.map((point, j) => (
                  <li key={j}>{evidence(point.evidenceId)}</li>
                ))}
              </ul>
            </section>
          ))}
          {output.terms.map((t, i) => (
            <p key={i}>
              <strong>{t.term}: </strong>
              {evidence(t.evidenceId)}
            </p>
          ))}
          {output.comparisons.map((c, i) => (
            <section key={i}>
              <h3 className="font-semibold">{c.heading}</h3>
              {c.rows.map((r, j) => (
                <p key={j}>
                  <strong>{r.label}: </strong>
                  {evidence(r.evidenceId)}
                </p>
              ))}
            </section>
          ))}
        </>
      )}
      <details>
        <summary className="min-h-11 cursor-pointer py-3">Saved source text</summary>
        {m.request.source.segments.map((s) => (
          <p key={s.id} className="whitespace-pre-wrap">
            {s.label}: {s.text}
          </p>
        ))}
      </details>
    </div>
  );
}
export function Archive({
  selected = {},
}: {
  selected?: { quest?: string; attempt?: string; sample?: string; session?: string };
}) {
  const {
    ready,
    persistence,
    data,
    snapshots,
    listSourceData,
    listSourceMaterials,
    listSavedQuizzes,
    listQuizSessions,
  } = useStore();
  const [saved, setSaved] = useState<{
    revisions: SourceRevision[];
    materials: SourceMaterial[];
    quizzes: QuizVersion[];
    sessions: QuizSession[];
  } | null>(null);
  const [error, setError] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!ready || persistence !== "durable") return;
    let live = true;
    setError(false);
    void Promise.all([
      listSourceData(),
      listSourceMaterials(),
      listSavedQuizzes(),
      listQuizSessions(),
    ]).then(
      ([sources, materials, quizzes, sessions]) => {
        if (!live) return;
        const samples = materials.filter((m) => m.generation.provider === "sample");
        const archived = (id: string) => isArchivedQuizId(id) || samples.some((m) => m.id === id);
        setSaved({
          revisions: sources.revisions.filter((r) => r.kind === "sample"),
          materials: samples,
          quizzes: quizzes.filter((q) => archived(q.id)),
          sessions: sessions.filter((s) => archived(s.version.id)),
        });
      },
      () => {
        if (live) setError(true);
      },
    );
    return () => {
      live = false;
    };
  }, [
    ready,
    persistence,
    listSourceData,
    listSourceMaterials,
    listSavedQuizzes,
    listQuizSessions,
    retry,
  ]);
  const panel = "rounded-xl border border-border bg-card p-4 space-y-3 break-words";
  return (
    <div className="space-y-6 py-6">
      <header>
        <h1 className="text-2xl font-bold">Archive</h1>
        <p className="mt-2 text-muted-foreground">
          Retired Quests and samples are read-only. Unfinished attempts cannot resume. Recorded
          results have not been regraded.
        </p>
        <Link
          to="/settings"
          hash="data-backup"
          className="inline-flex min-h-11 items-center text-primary underline"
        >
          Export everything in Data &amp; backup
        </Link>
      </header>
      {!ready ? (
        <p role="status">Opening saved records…</p>
      ) : (
        <>
          <section aria-label="Archived Quests" className="space-y-3">
            <h2 className="text-lg font-semibold">Quests</h2>
            {!data.quests.length && <p>No archived Quests.</p>}
            {data.quests.map((q) => (
              <details key={q.id} open={selected.quest === q.id} className={panel}>
                <summary className="min-h-11 cursor-pointer py-2 font-medium">{q.title}</summary>
                {q.questions.map((question) => (
                  <Question key={question.id} question={question} />
                ))}
              </details>
            ))}
          </section>
          <section aria-label="Archived attempts" className="space-y-3">
            <h2 className="text-lg font-semibold">Saved answers and results</h2>
            {!data.attempts.length && <p>No archived attempts.</p>}
            {data.attempts.map((a) => {
              const snapshot = snapshots[a.id];
              const answers = Object.values(a.answers);
              return (
                <details
                  key={a.id}
                  open={selected.attempt === a.id || selected.quest === a.questId}
                  className={panel}
                >
                  <summary className="min-h-11 cursor-pointer py-2 font-medium">
                    {a.questTitle} ·{" "}
                    {a.completedAt === null ? "Unfinished (read-only)" : "Completed"}
                  </summary>
                  <p>
                    Recorded outcome: {answers.filter((answer) => answer.correct).length} correct
                    out of {answers.length} answered.
                  </p>
                  <p>
                    {snapshot?.provenance === "original"
                      ? "Original question snapshot"
                      : snapshot?.provenance === "reconstructed"
                        ? "Reconstructed question snapshot — may differ from the original."
                        : "Original questions unavailable. Saved answers are retained."}
                  </p>
                  {snapshot?.quest?.questions.map((q) => (
                    <Question key={q.id} question={q} />
                  ))}
                  {answers.map((answer, index) => (
                    <div key={answer.questionId}>
                      <p className="font-medium">
                        Saved response {index + 1} ·{" "}
                        {answer.correct ? "Recorded correct" : "Recorded incorrect"}
                      </p>
                      <pre className="whitespace-pre-wrap break-words">
                        {archivedAnswer(answer.response)}
                      </pre>
                      <p>
                        Hints used: {answer.hintsUsed}
                        {answer.revealed ? " · Answer was revealed" : ""}
                      </p>
                    </div>
                  ))}
                </details>
              );
            })}
          </section>
          <section aria-label="Archived samples" className="space-y-3">
            <h2 className="text-lg font-semibold">Saved samples</h2>
            {persistence !== "durable" ? (
              <p>
                Browser storage is needed to read saved samples. Open Settings to recover storage.
              </p>
            ) : error ? (
              <div role="alert">
                <p>Saved samples could not be loaded.</p>
                <Button onClick={() => setRetry((n) => n + 1)}>Retry loading</Button>
              </div>
            ) : !saved ? (
              <p role="status">Loading saved samples…</p>
            ) : (
              <>
                {!saved.revisions.length &&
                  !saved.materials.length &&
                  !saved.quizzes.length &&
                  !saved.sessions.length && <p>No saved samples.</p>}
                {saved.revisions.map((r) => (
                  <details key={r.id} className={panel}>
                    <summary className="min-h-11 cursor-pointer py-2">
                      {r.title} · Saved source ({new Date(r.createdAt).toLocaleDateString()})
                    </summary>
                    {r.segments.map((s) => (
                      <p key={s.id} className="whitespace-pre-wrap">
                        {s.label}: {s.text}
                      </p>
                    ))}
                  </details>
                ))}
                {saved.materials.map((m) => (
                  <details key={m.id} open={selected.sample === m.id} className={panel}>
                    <summary className="min-h-11 cursor-pointer py-2">
                      {m.title} · {m.output.format}
                    </summary>
                    <SampleMaterial material={m} />
                  </details>
                ))}
                {saved.quizzes
                  .filter((q) => !saved.materials.some((m) => m.id === q.id))
                  .map((q) => (
                    <details key={q.id} open={selected.sample === q.id} className={panel}>
                      <summary className="min-h-11 cursor-pointer py-2">
                        {q.title} · Saved questions
                      </summary>
                      {q.questions.map((question) => (
                        <Question key={question.id} question={question} />
                      ))}
                    </details>
                  ))}
                {saved.sessions.map((s) => (
                  <details key={s.id} open={selected.session === s.id} className={panel}>
                    <summary className="min-h-11 cursor-pointer py-2">
                      {s.version.title} · {s.mode === "practice" ? "Quiz" : "Exam"} ·{" "}
                      {s.completedAt === null ? "Unfinished (read-only)" : "Completed"}
                    </summary>
                    {s.result && (
                      <p>
                        Recorded result: {s.result.correct}/{s.result.total} ({s.result.percentage}
                        %)
                      </p>
                    )}
                    {s.version.questions.map((q) => {
                      const answer = s.answers[q.id];
                      return (
                        <div key={q.id}>
                          <Question question={q} />
                          <p>
                            Saved response:{" "}
                            {answer?.response.type === "mcq" && q.type === "mcq"
                              ? (q.options.find(
                                  (o) =>
                                    o.id ===
                                    (answer.response.type === "mcq"
                                      ? answer.response.optionId
                                      : null),
                                )?.text ?? "No answer")
                              : answer
                                ? archivedAnswer(answer.response)
                                : "No answer"}
                          </p>
                          <p>
                            {answer?.correct === true
                              ? "Recorded correct"
                              : answer?.correct === false
                                ? "Recorded incorrect"
                                : "Not graded"}
                          </p>
                        </div>
                      );
                    })}
                  </details>
                ))}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
