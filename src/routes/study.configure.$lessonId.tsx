import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DIFFICULTY_LABEL, QUESTION_TYPE_LABEL } from "@/domain/subjects";
import { DIFFICULTIES, QUESTION_TYPES, type QuestionType } from "@/domain/types";
import { DemoBanner } from "@/demo/DemoBanner";
import { useDemo } from "@/demo/DemoContext";
import { getDemoLesson } from "@/demo/lessons";
import {
  DEMO_LIMITS,
  availableQuestionCount,
  defaultDemoConfig,
  generateDemoQuestions,
  validateDemoConfig,
  type DemoConfig,
} from "@/demo/logic";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/study/configure/$lessonId")({
  head: () => ({
    meta: [
      { title: "Configure demo quest — ProofQuest" },
      {
        name: "description",
        content:
          "Pick sections, difficulty and question types for a simulated Study-to-Quest preview.",
      },
      { property: "og:title", content: "Configure demo quest — ProofQuest" },
      {
        property: "og:description",
        content: "Simulated quest configuration from a sample lesson.",
      },
    ],
  }),
  component: Configure,
});

const STEPS = ["Reading selected sections", "Matching question styles", "Preparing review"];
const optionCls = (on: boolean) =>
  cn(
    "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
    on ? "border-primary bg-accent/40 text-foreground" : "border-border text-muted-foreground",
  );

function Configure() {
  const { lessonId } = Route.useParams();
  const lesson = getDemoLesson(lessonId);
  const demo = useDemo();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  if (!lesson) {
    return (
      <div className="pt-8">
        <EmptyState
          title="Demo lesson not found"
          body="Pick a sample lesson from the library."
          action={
            <Link
              to="/study"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-primary"
            >
              Study Library
            </Link>
          }
        />
      </div>
    );
  }
  const c: DemoConfig =
    demo.config?.lessonId === lesson.id ? demo.config : defaultDemoConfig(lesson);
  const set = (patch: Partial<DemoConfig>) => demo.setConfig({ ...c, ...patch });
  const errors = validateDemoConfig(lesson, c);
  const shown = submitted ? errors : {};
  const max = availableQuestionCount(lesson, c);
  const hasExisting = demo.generatedFor === lesson.id && (demo.questions?.length ?? 0) > 0;
  const generating = step !== null;

  const toggle = <T extends string>(list: T[], v: T) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  const run = (i: number) => {
    setStep(i);
    timer.current = setTimeout(() => {
      if (i + 1 < STEPS.length) run(i + 1);
      else {
        demo.setGenerated(lesson.id, generateDemoQuestions(lesson, c));
        setStep(null);
        void navigate({ to: "/study/review" });
      }
    }, 500);
  };
  const generate = () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    run(0);
  };
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    setStep(null);
  };

  return (
    <>
      <DemoBanner>
        Simulated generation from a fixed sample question set. Nothing is created or saved.
      </DemoBanner>
      <PageHeader
        title="Configure demo quest"
        subtitle={lesson.title}
        back={{ to: `/study/lesson/${lesson.id}`, label: "Lesson" }}
      />

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          generate();
        }}
        className="space-y-5"
        aria-describedby={submitted && Object.keys(errors).length ? "cfg-errors" : undefined}
      >
        {submitted && Object.keys(errors).length > 0 && (
          <p
            id="cfg-errors"
            role="alert"
            className="rounded-xl bg-destructive/15 px-3 py-2 text-sm text-destructive"
          >
            Fix {Object.keys(errors).length} issue{Object.keys(errors).length === 1 ? "" : "s"}{" "}
            below.
          </p>
        )}
        <fieldset disabled={generating} className="space-y-5">
          <div>
            <Label htmlFor="cfg-title">Quest title</Label>
            <Input
              id="cfg-title"
              value={c.title}
              maxLength={DEMO_LIMITS.titleMax + 20}
              onChange={(e) => set({ title: e.target.value })}
              aria-invalid={!!shown.title}
              aria-describedby={shown.title ? "cfg-title-err" : undefined}
              className="mt-1 h-11"
            />
            {shown.title && (
              <p id="cfg-title-err" className="mt-1 text-sm text-destructive">
                {shown.title}
              </p>
            )}
          </div>

          <fieldset aria-describedby={shown.sections ? "cfg-sec-err" : undefined}>
            <legend className="text-sm font-medium text-foreground">Sections</legend>
            <div className="mt-2 space-y-2">
              {lesson.sections.map((s) => (
                <label key={s.id} className={optionCls(c.sectionIds.includes(s.id))}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={c.sectionIds.includes(s.id)}
                    onChange={() => set({ sectionIds: toggle(c.sectionIds, s.id) })}
                  />
                  {s.heading}
                </label>
              ))}
            </div>
            {shown.sections && (
              <p id="cfg-sec-err" className="mt-1 text-sm text-destructive">
                {shown.sections}
              </p>
            )}
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium text-foreground">Difficulty</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {DIFFICULTIES.map((d) => (
                <label key={d} className={cn(optionCls(c.difficulty === d), "justify-center")}>
                  <input
                    type="radio"
                    name="cfg-difficulty"
                    className="sr-only"
                    checked={c.difficulty === d}
                    onChange={() => set({ difficulty: d })}
                  />
                  {DIFFICULTY_LABEL[d]}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Demo: difficulty sets how many hints each question keeps (Easy 2, Medium 1, Hard 0).
            </p>
          </fieldset>

          <fieldset aria-describedby={shown.types ? "cfg-type-err" : undefined}>
            <legend className="text-sm font-medium text-foreground">Question types</legend>
            <div className="mt-2 space-y-2">
              {QUESTION_TYPES.map((t: QuestionType) => (
                <label key={t} className={optionCls(c.types.includes(t))}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary"
                    checked={c.types.includes(t)}
                    onChange={() => set({ types: toggle(c.types, t) })}
                  />
                  {QUESTION_TYPE_LABEL[t]}
                </label>
              ))}
            </div>
            {shown.types && (
              <p id="cfg-type-err" className="mt-1 text-sm text-destructive">
                {shown.types}
              </p>
            )}
          </fieldset>

          <div>
            <Label htmlFor="cfg-count">Number of questions</Label>
            <div className="mt-1 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 w-11"
                aria-label="Fewer questions"
                onClick={() => set({ count: Math.max(DEMO_LIMITS.countMin, c.count - 1) })}
              >
                −
              </Button>
              <Input
                id="cfg-count"
                type="number"
                inputMode="numeric"
                min={DEMO_LIMITS.countMin}
                max={Math.max(1, max)}
                value={Number.isFinite(c.count) ? c.count : ""}
                onChange={(e) => set({ count: e.target.value === "" ? 0 : Number(e.target.value) })}
                aria-invalid={!!shown.count}
                aria-describedby="cfg-count-help"
                className="h-11 w-20 text-center"
              />
              <Button
                type="button"
                variant="outline"
                className="h-11 w-11"
                aria-label="More questions"
                onClick={() => set({ count: Math.min(DEMO_LIMITS.countMax, c.count + 1) })}
              >
                +
              </Button>
            </div>
            <p
              id="cfg-count-help"
              className={cn(
                "mt-1 text-sm",
                shown.count ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {shown.count ?? `Up to ${max} available for this selection.`}
            </p>
          </div>
        </fieldset>

        {hasExisting && !generating && (
          <Card className="text-sm text-muted-foreground">
            You already have {demo.questions?.length} reviewed demo question
            {demo.questions?.length === 1 ? "" : "s"}.{" "}
            <Link
              to="/study/review"
              className="font-semibold text-primary underline-offset-2 hover:underline"
            >
              Return to review
            </Link>{" "}
            to keep them, or generate again to replace them.
          </Card>
        )}

        {generating ? (
          <Card>
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-2 text-sm text-foreground"
            >
              <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden />
              Simulating: {STEPS[step]}… ({step + 1}/{STEPS.length})
            </div>
            <Button type="button" variant="outline" className="mt-3 min-h-11" onClick={cancel}>
              Cancel
            </Button>
          </Card>
        ) : (
          <Button type="submit" className="min-h-11 w-full">
            {hasExisting ? "Generate again (demo)" : "Generate demo questions"}
          </Button>
        )}
      </form>
    </>
  );
}
