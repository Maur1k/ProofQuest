import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { Card, CodeBlock, EmptyState, PageHeader, Pill } from "@/components/common";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QUESTION_TYPE_LABEL } from "@/domain/subjects";
import type { Question } from "@/domain/types";
import { validateQuest } from "@/domain/validation";
import { DemoBanner } from "@/demo/DemoBanner";
import { useDemo } from "@/demo/DemoContext";
import { getDemoLesson } from "@/demo/lessons";
import { demoDraft } from "@/demo/logic";
import { NoDemoQuest } from "@/demo/NoDemoQuest";

export const Route = createFileRoute("/study/review")({
  head: () => ({
    meta: [
      { title: "Review demo questions — ProofQuest" },
      {
        name: "description",
        content: "Edit, preview and remove simulated questions before the practice preview.",
      },
      { property: "og:title", content: "Review demo questions — ProofQuest" },
      { property: "og:description", content: "Review a simulated Study-to-Quest question set." },
    ],
  }),
  component: Review,
});

function Review() {
  const demo = useDemo();
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const lesson = demo.generatedFor ? getDemoLesson(demo.generatedFor) : undefined;
  const config = demo.reviewConfig?.lessonId === lesson?.id ? demo.reviewConfig : null;
  const questions = demo.questions;
  const errors = useMemo(
    () =>
      lesson && config && questions ? validateQuest(demoDraft(lesson, config, questions)) : {},
    [lesson, config, questions],
  );

  if (!lesson || !config || !questions) return <NoDemoQuest />;
  const errorCount = Object.keys(errors).length;

  return (
    <>
      <DemoBanner>
        Edits stay in this tab only. These questions are not saved as a quest.
      </DemoBanner>
      <PageHeader
        title="Review demo questions"
        subtitle={`${config.title.trim()} · ${questions.length} question${questions.length === 1 ? "" : "s"}`}
        back={{ to: `/study/lesson/${lesson.id}`, label: "Lesson" }}
      />

      {questions.length === 0 ? (
        <EmptyState
          title="All questions removed"
          body="Open Customize to generate a fresh sample set."
          action={
            <Link
              to="/study/configure/$lessonId"
              params={{ lessonId: lesson.id }}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-primary"
            >
              Customize questions
            </Link>
          }
        />
      ) : (
        <ol className="space-y-4">
          {questions.map((q, i) => (
            <li key={q.id}>
              <QuestionReviewCard
                q={q}
                index={i}
                errors={errors}
                onChange={demo.updateQuestion}
                onRemove={() => setPendingRemove(q.id)}
              />
            </li>
          ))}
        </ol>
      )}

      <div className="mt-6 space-y-2">
        {errorCount > 0 && (
          <p role="alert" className="text-sm text-destructive">
            Fix {errorCount} issue{errorCount === 1 ? "" : "s"} before continuing.
          </p>
        )}
        {questions.length > 0 && errorCount === 0 ? (
          <Link
            to="/study/ready"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-gradient-primary px-4 text-sm font-semibold text-primary-foreground shadow-glow"
          >
            Continue to Ready to Practice
          </Link>
        ) : (
          <Button className="min-h-11 w-full" disabled>
            Continue to Ready to Practice
          </Button>
        )}
      </div>

      <ConfirmDialog
        open={pendingRemove !== null}
        onOpenChange={(o) => !o && setPendingRemove(null)}
        title="Remove this demo question?"
        description="It will be removed from this demo set. Generate again to bring it back."
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          if (pendingRemove) demo.removeQuestion(pendingRemove);
          setPendingRemove(null);
        }}
      />
    </>
  );
}

function FieldError({ id, msg }: { id: string; msg: string | undefined }) {
  return msg ? (
    <p id={id} className="mt-1 text-sm text-destructive">
      {msg}
    </p>
  ) : null;
}

function QuestionReviewCard({
  q,
  index,
  errors,
  onChange,
  onRemove,
}: {
  q: Question;
  index: number;
  errors: Record<string, string>;
  onChange: (q: Question) => void;
  onRemove: () => void;
}) {
  const [preview, setPreview] = useState(false);
  const k = (f: string) => errors[`q.${q.id}.${f}`];
  const fid = (f: string) => `${q.id}-${f}`;

  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-semibold text-foreground">Q{index + 1}</span>
          <Pill tone="primary">{QUESTION_TYPE_LABEL[q.type]}</Pill>
          <Pill tone="warning">Demo</Pill>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="h-11 w-11 p-0 text-muted-foreground hover:text-destructive"
          aria-label={`Remove question ${index + 1}`}
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </Button>
      </div>

      <div className="mt-3">
        <Label htmlFor={fid("prompt")}>Prompt</Label>
        <Textarea
          id={fid("prompt")}
          rows={2}
          value={q.prompt}
          onChange={(e) => onChange({ ...q, prompt: e.target.value })}
          aria-invalid={!!k("prompt")}
          aria-describedby={k("prompt") ? fid("prompt-err") : undefined}
          className="mt-1"
        />
        <FieldError id={fid("prompt-err")} msg={k("prompt")} />
      </div>

      <div className="mt-3">
        <CodeBlock code={q.code} language={q.language} />
      </div>

      <div className="mt-3">
        {q.type === "predict" && (
          <>
            <Label htmlFor={fid("ans")}>Expected output</Label>
            <Textarea
              id={fid("ans")}
              rows={2}
              value={q.expectedOutput}
              onChange={(e) => onChange({ ...q, expectedOutput: e.target.value })}
              aria-invalid={!!k("expected")}
              className="mt-1 font-mono text-[13px]"
            />
          </>
        )}
        {q.type === "fix" && (
          <>
            <Label htmlFor={fid("ans")}>Corrected code</Label>
            <Textarea
              id={fid("ans")}
              rows={Math.min(12, q.fixedCode.split("\n").length + 1)}
              value={q.fixedCode}
              onChange={(e) => onChange({ ...q, fixedCode: e.target.value })}
              aria-invalid={!!k("expected")}
              spellCheck={false}
              className="mt-1 font-mono text-[13px]"
            />
          </>
        )}
        {q.type === "trace" && (
          <fieldset className="min-w-0">
            <legend className="text-sm font-medium text-foreground">Expected trace</legend>
            <div className="mt-1 overflow-x-auto">
              <table className="w-full min-w-max border-separate border-spacing-1 text-sm">
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="px-1 text-left text-xs font-medium text-muted-foreground"
                    >
                      Step
                    </th>
                    {q.variables.map((v) => (
                      <th
                        key={v}
                        scope="col"
                        className="px-1 text-left font-mono text-xs text-muted-foreground"
                      >
                        {v}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {q.steps.map((s, si) => (
                    <tr key={si}>
                      <th
                        scope="row"
                        className="whitespace-nowrap px-1 text-left text-xs font-normal text-muted-foreground"
                      >
                        {s.label}
                      </th>
                      {s.values.map((val, vi) => (
                        <td key={vi}>
                          <input
                            aria-label={`${s.label}, ${q.variables[vi]}`}
                            value={val}
                            onChange={(e) =>
                              onChange({
                                ...q,
                                steps: q.steps.map((st, j) =>
                                  j === si
                                    ? {
                                        ...st,
                                        values: st.values.map((x, m) =>
                                          m === vi ? e.target.value : x,
                                        ),
                                      }
                                    : st,
                                ),
                              })
                            }
                            className="h-11 w-20 rounded-md border border-input bg-background px-2 font-mono text-[13px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <FieldError id={fid("steps-err")} msg={k("steps")} />
          </fieldset>
        )}
        <FieldError id={fid("ans-err")} msg={k("expected")} />
      </div>

      <div className="mt-3">
        <Label htmlFor={fid("exp")}>Explanation</Label>
        <Textarea
          id={fid("exp")}
          rows={2}
          value={q.explanation}
          onChange={(e) => onChange({ ...q, explanation: e.target.value })}
          aria-invalid={!!k("explanation")}
          className="mt-1"
        />
        <FieldError id={fid("exp-err")} msg={k("explanation")} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {q.hints.length} hint{q.hints.length === 1 ? "" : "s"} kept for this difficulty.
      </p>

      <Button
        type="button"
        variant="outline"
        className="mt-3 min-h-11"
        aria-expanded={preview}
        aria-controls={fid("preview")}
        onClick={() => setPreview((p) => !p)}
      >
        {preview ? (
          <EyeOff className="h-4 w-4" aria-hidden />
        ) : (
          <Eye className="h-4 w-4" aria-hidden />
        )}
        {preview ? "Hide answer preview" : "Preview answer"}
      </Button>
      {preview && (
        <div
          id={fid("preview")}
          className="mt-3 space-y-2 rounded-xl border border-success/40 bg-success/10 p-3 text-sm"
        >
          <p className="font-semibold text-success">Answer a learner would need</p>
          {q.type === "predict" && <CodeBlock code={q.expectedOutput || "(empty)"} />}
          {q.type === "fix" && <CodeBlock code={q.fixedCode || "(empty)"} language={q.language} />}
          {q.type === "trace" && (
            <ul className="space-y-0.5 font-mono text-[13px] text-foreground">
              {q.steps.map((s, i) => (
                <li key={i}>
                  {s.label}: {q.variables.map((v, j) => `${v}=${s.values[j] ?? ""}`).join(", ")}
                </li>
              ))}
            </ul>
          )}
          <p className="text-foreground/90">{q.explanation}</p>
        </div>
      )}
    </Card>
  );
}
