import { useMemo, useRef, useState, type ReactNode } from "react";
import { useBlocker, useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "./ConfirmDialog";
import { SUBJECTS, QUESTION_TYPE_LABEL, DIFFICULTY_LABEL, getSubject } from "@/domain/subjects";
import { validateQuest, LIMITS, type ValidationErrors } from "@/domain/validation";
import { DIFFICULTIES, LANGUAGES, type QuestDraft, type Question, type QuestionType } from "@/domain/types";
import { newId } from "@/lib/id";

export function blankQuestion(type: QuestionType, language: Question["language"] = "javascript"): Question {
  const base = { id: newId(), prompt: "", language, code: "", explanation: "", hints: [] as string[] };
  if (type === "predict") return { ...base, type, expectedOutput: "" };
  if (type === "fix") return { ...base, type, fixedCode: "" };
  return { ...base, type, variables: ["x"], steps: [{ label: "Step 1", values: [""] }] };
}

function Field({ label, error, children, hint, id }: { label: string; error?: string | undefined; hint?: string | undefined; children: ReactNode; id: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

const err = (errors: ValidationErrors, key: string) => ({
  "aria-invalid": errors[key] ? true : undefined,
  "aria-describedby": errors[key] ? `${key}-error` : undefined,
});

export function QuestEditor({
  initial,
  heading,
  onSave,
}: {
  initial: QuestDraft;
  heading: string;
  onSave: (draft: QuestDraft) => string;
}) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<QuestDraft>(initial);
  const [submitted, setSubmitted] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const initialJson = useRef(JSON.stringify(initial));
  const skipBlock = useRef(false);
  const dirty = JSON.stringify(draft) !== initialJson.current;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  const blocker = useBlocker({
    shouldBlockFn: () => dirtyRef.current && !skipBlock.current,
    enableBeforeUnload: () => dirtyRef.current && !skipBlock.current,
    withResolver: true,
  });

  const errors = useMemo(() => validateQuest(draft), [draft]);
  const shown: ValidationErrors = submitted ? errors : {};
  const errorCount = Object.keys(errors).length;
  const subject = getSubject(draft.subjectId);

  const set = <K extends keyof QuestDraft>(k: K, v: QuestDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setQ = (id: string, fn: (q: Question) => Question) =>
    setDraft((d) => ({ ...d, questions: d.questions.map((q) => (q.id === id ? fn(q) : q)) }));
  const move = (i: number, dir: -1 | 1) =>
    setDraft((d) => {
      const qs = [...d.questions];
      const j = i + dir;
      if (j < 0 || j >= qs.length) return d;
      const a = qs[i];
      const b = qs[j];
      if (!a || !b) return d;
      qs[i] = b;
      qs[j] = a;
      return { ...d, questions: qs };
    });

  const save = () => {
    setSubmitted(true);
    if (errorCount > 0) {
      requestAnimationFrame(() => document.getElementById("form-errors")?.focus());
      return;
    }
    const id = onSave(draft);
    skipBlock.current = true;
    void id;
    navigate({ to: "/quests", search: {} });
  };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="space-y-5 pt-6"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{heading}</h1>
        {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
      </div>

      {submitted && errorCount > 0 && (
        <div id="form-errors" tabIndex={-1} role="alert" className="rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          Fix {errorCount} issue{errorCount === 1 ? "" : "s"} below before saving.
        </div>
      )}

      <section className="space-y-4 rounded-2xl border border-border bg-card p-4">
        <Field label="Title" id="title" error={shown["title"]}>
          <input id="title" className="field" value={draft.title} maxLength={LIMITS.titleMax + 20} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Loops & Accumulators" {...err(shown, "title")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Subject" id="subjectId" error={shown["subjectId"]}>
            <select id="subjectId" className="field" value={draft.subjectId} onChange={(e) => set("subjectId", e.target.value as QuestDraft["subjectId"])}>
              {SUBJECTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.short}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Difficulty" id="difficulty" error={shown["difficulty"]}>
            <select id="difficulty" className="field" value={draft.difficulty} onChange={(e) => set("difficulty", e.target.value as QuestDraft["difficulty"])}>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {DIFFICULTY_LABEL[d]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Topic" id="topic" error={shown["topic"]} hint="Pick a suggestion or type your own.">
          <input id="topic" className="field" list="topic-options" value={draft.topic} onChange={(e) => set("topic", e.target.value)} {...err(shown, "topic")} />
          <datalist id="topic-options">
            {subject?.topics.map((t) => <option key={t} value={t} />)}
          </datalist>
        </Field>
      </section>

      <section aria-labelledby="questions-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="questions-heading" className="text-lg font-semibold">
            Questions <span className="text-sm font-normal text-muted-foreground">({draft.questions.length})</span>
          </h2>
        </div>
        {shown["questions"] && <p className="text-sm font-medium text-destructive">{shown["questions"]}</p>}

        {draft.questions.map((q, i) => (
          <QuestionEditor
            key={q.id}
            q={q}
            index={i}
            count={draft.questions.length}
            errors={shown}
            onChange={(fn) => setQ(q.id, fn)}
            onMove={(dir) => move(i, dir)}
            onRemove={() => setRemoveId(q.id)}
          />
        ))}

        <div className="grid grid-cols-3 gap-2">
          {(["predict", "trace", "fix"] as const).map((t) => (
            <Button
              key={t}
              type="button"
              variant="outline"
              className="h-auto min-h-11 flex-col gap-0.5 whitespace-normal py-2 text-xs"
              disabled={draft.questions.length >= LIMITS.questionsMax}
              onClick={() => setDraft((d) => ({ ...d, questions: [...d.questions, blankQuestion(t, d.questions.at(-1)?.language)] }))}
            >
              <Plus aria-hidden /> {QUESTION_TYPE_LABEL[t]}
            </Button>
          ))}
        </div>
      </section>

      <div className="sticky bottom-24 z-10 flex gap-2 rounded-2xl border border-border bg-background/95 p-2 backdrop-blur">
        <Button type="button" variant="outline" className="flex-1" onClick={() => navigate({ to: "/quests", search: {} })}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1">
          Save quest
        </Button>
      </div>

      <ConfirmDialog
        open={removeId !== null}
        onOpenChange={(o) => !o && setRemoveId(null)}
        title="Remove this question?"
        description="The question will be removed from this quest when you save."
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          setDraft((d) => ({ ...d, questions: d.questions.filter((q) => q.id !== removeId) }));
          setRemoveId(null);
        }}
      />
      <ConfirmDialog
        open={blocker.status === "blocked"}
        onOpenChange={(o) => !o && blocker.status === "blocked" && blocker.reset()}
        title="Discard unsaved changes?"
        description="You have changes that haven't been saved. Leaving now will discard them."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        destructive
        onConfirm={() => blocker.status === "blocked" && blocker.proceed()}
      />
    </form>
  );
}

function QuestionEditor({
  q,
  index,
  count,
  errors,
  onChange,
  onMove,
  onRemove,
}: {
  q: Question;
  index: number;
  count: number;
  errors: ValidationErrors;
  onChange: (fn: (q: Question) => Question) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const k = (f: string) => `q.${q.id}.${f}`;
  const fid = (f: string) => `${q.id}-${f}`;
  const upd = (patch: Partial<Question>) => onChange((x) => ({ ...x, ...patch }) as Question);
  const hasErr = Object.keys(errors).some((e) => e.startsWith(`q.${q.id}.`));

  return (
    <article className={`space-y-4 rounded-2xl border bg-card p-4 ${hasErr ? "border-destructive/60" : "border-border"}`} aria-label={`Question ${index + 1}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">
          <span className="text-muted-foreground">Q{index + 1}</span> · {QUESTION_TYPE_LABEL[q.type]}
        </p>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="icon" aria-label={`Move question ${index + 1} up`} disabled={index === 0} onClick={() => onMove(-1)}>
            <ArrowUp aria-hidden />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label={`Move question ${index + 1} down`} disabled={index === count - 1} onClick={() => onMove(1)}>
            <ArrowDown aria-hidden />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="text-destructive" aria-label={`Remove question ${index + 1}`} onClick={onRemove}>
            <Trash2 aria-hidden />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Type" id={fid("type")}>
          <select
            id={fid("type")}
            className="field"
            value={q.type}
            onChange={(e) => {
              const t = e.target.value as QuestionType;
              onChange((x) => ({ ...blankQuestion(t, x.language), id: x.id, prompt: x.prompt, code: x.code, explanation: x.explanation, hints: x.hints }));
            }}
          >
            {(["predict", "trace", "fix"] as const).map((t) => (
              <option key={t} value={t}>
                {QUESTION_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Language" id={fid("language")}>
          <select id={fid("language")} className="field" value={q.language} onChange={(e) => upd({ language: e.target.value as Question["language"] })}>
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l === "javascript" ? "JavaScript" : "Python"}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Prompt" id={fid("prompt")} error={errors[k("prompt")]}>
        <input id={fid("prompt")} className="field" value={q.prompt} onChange={(e) => upd({ prompt: e.target.value })} placeholder="What does this program print?" aria-invalid={errors[k("prompt")] ? true : undefined} />
      </Field>
      <Field label={q.type === "fix" ? "Buggy code" : "Code"} id={fid("code")} error={errors[k("code")]}>
        <textarea id={fid("code")} className="field min-h-32 font-mono text-[13px]" spellCheck={false} value={q.code} onChange={(e) => upd({ code: e.target.value })} aria-invalid={errors[k("code")] ? true : undefined} />
      </Field>

      {q.type === "predict" && (
        <Field label="Expected output" id={fid("expected")} error={errors[k("expected")]} hint="One line per printed line. Case matters; surrounding spaces don't.">
          <textarea id={fid("expected")} className="field min-h-20 font-mono text-[13px]" spellCheck={false} value={q.expectedOutput} onChange={(e) => upd({ expectedOutput: e.target.value })} aria-invalid={errors[k("expected")] ? true : undefined} />
        </Field>
      )}
      {q.type === "fix" && (
        <Field label="Corrected code" id={fid("expected")} error={errors[k("expected")]} hint="Answers are compared as normalized text (spacing and blank lines ignored), not by running the code.">
          <textarea id={fid("expected")} className="field min-h-32 font-mono text-[13px]" spellCheck={false} value={q.fixedCode} onChange={(e) => upd({ fixedCode: e.target.value })} aria-invalid={errors[k("expected")] ? true : undefined} />
        </Field>
      )}
      {q.type === "trace" && <TraceEditor q={q} errors={errors} onChange={(next) => onChange(() => next)} />}

      <Field label="Explanation" id={fid("explanation")} error={errors[k("explanation")]} hint="Shown after the learner answers.">
        <textarea id={fid("explanation")} className="field min-h-20" value={q.explanation} onChange={(e) => upd({ explanation: e.target.value })} aria-invalid={errors[k("explanation")] ? true : undefined} />
      </Field>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Hints <span className="font-normal text-muted-foreground">(optional, up to {LIMITS.hintsMax})</span></legend>
        {q.hints.map((h, hi) => (
          <div key={hi} className="flex gap-2">
            <input
              className="field"
              aria-label={`Hint ${hi + 1}`}
              value={h}
              onChange={(e) => upd({ hints: q.hints.map((x, j) => (j === hi ? e.target.value : x)) })}
            />
            <Button type="button" variant="ghost" size="icon" aria-label={`Remove hint ${hi + 1}`} onClick={() => upd({ hints: q.hints.filter((_, j) => j !== hi) })}>
              <Trash2 aria-hidden />
            </Button>
          </div>
        ))}
        {errors[k("hints")] && <p className="text-xs font-medium text-destructive">{errors[k("hints")]}</p>}
        {q.hints.length < LIMITS.hintsMax && (
          <Button type="button" variant="ghost" size="sm" onClick={() => upd({ hints: [...q.hints, ""] })}>
            <Plus aria-hidden /> Add hint
          </Button>
        )}
      </fieldset>
    </article>
  );
}

function TraceEditor({ q, errors, onChange }: { q: Extract<Question, { type: "trace" }>; errors: ValidationErrors; onChange: (q: Question) => void }) {
  const k = (f: string) => `q.${q.id}.${f}`;
  const setVar = (j: number, name: string) => onChange({ ...q, variables: q.variables.map((v, i) => (i === j ? name : v)) });
  const addVar = () => onChange({ ...q, variables: [...q.variables, ""], steps: q.steps.map((s) => ({ ...s, values: [...s.values, ""] })) });
  const removeVar = (j: number) =>
    onChange({ ...q, variables: q.variables.filter((_, i) => i !== j), steps: q.steps.map((s) => ({ ...s, values: s.values.filter((_, i) => i !== j) })) });
  const setCell = (si: number, j: number, v: string) =>
    onChange({ ...q, steps: q.steps.map((s, i) => (i === si ? { ...s, values: s.values.map((x, c) => (c === j ? v : x)) } : s)) });

  return (
    <div className="space-y-3">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Tracked variables</legend>
        <div className="flex flex-wrap gap-2">
          {q.variables.map((v, j) => (
            <div key={j} className="flex items-center gap-1">
              <input className="field w-24 font-mono text-[13px]" aria-label={`Variable ${j + 1} name`} value={v} onChange={(e) => setVar(j, e.target.value)} />
              {q.variables.length > 1 && (
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove variable ${v || j + 1}`} onClick={() => removeVar(j)}>
                  <Trash2 aria-hidden />
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addVar}>
            <Plus aria-hidden /> Variable
          </Button>
        </div>
        {errors[k("variables")] && <p className="text-xs font-medium text-destructive">{errors[k("variables")]}</p>}
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Expected values per step</legend>
        <div className="space-y-2">
          {q.steps.map((s, si) => (
            <div key={si} className="rounded-xl border border-border p-2">
              <div className="flex gap-2">
                <input className="field" aria-label={`Step ${si + 1} label`} value={s.label} onChange={(e) => onChange({ ...q, steps: q.steps.map((x, i) => (i === si ? { ...x, label: e.target.value } : x)) })} />
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove step ${si + 1}`} disabled={q.steps.length === 1} onClick={() => onChange({ ...q, steps: q.steps.filter((_, i) => i !== si) })}>
                  <Trash2 aria-hidden />
                </Button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {q.variables.map((v, j) => (
                  <label key={j} className="text-xs text-muted-foreground">
                    <span className="font-mono">{v || `var ${j + 1}`}</span>
                    <input className="field mt-1 font-mono text-[13px]" value={s.values[j] ?? ""} onChange={(e) => setCell(si, j, e.target.value)} />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange({ ...q, steps: [...q.steps, { label: `Step ${q.steps.length + 1}`, values: q.variables.map(() => "") }] })}
        >
          <Plus aria-hidden /> Step
        </Button>
        {errors[k("steps")] && <p className="text-xs font-medium text-destructive">{errors[k("steps")]}</p>}
      </fieldset>
    </div>
  );
}
