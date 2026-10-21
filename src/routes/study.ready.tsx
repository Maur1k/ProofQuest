import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PlayCircle } from "lucide-react";
import { Card, DifficultyPill, PageHeader, Pill } from "@/components/common";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QUESTION_TYPE_LABEL, getSubject } from "@/domain/subjects";
import { QUESTION_TYPES } from "@/domain/types";
import { validateQuest } from "@/domain/validation";
import { DemoBanner } from "@/demo/DemoBanner";
import { useDemo } from "@/demo/DemoContext";
import { getDemoLesson } from "@/demo/lessons";
import { demoDraft } from "@/demo/logic";
import { NoDemoQuest } from "@/demo/NoDemoQuest";

export const Route = createFileRoute("/study/ready")({
  head: () => ({
    meta: [
      { title: "Ready to practice (demo) — ProofQuest" },
      {
        name: "description",
        content:
          "Summary of a simulated Study-to-Quest quest. Not saved and does not affect progress.",
      },
      { property: "og:title", content: "Ready to practice (demo) — ProofQuest" },
      { property: "og:description", content: "Preview of a reviewed demo quest." },
    ],
  }),
  component: Ready,
});

function Ready() {
  const demo = useDemo();
  const [open, setOpen] = useState(false);
  const lesson = demo.generatedFor ? getDemoLesson(demo.generatedFor) : undefined;
  const config = demo.config?.lessonId === lesson?.id ? demo.config : null;
  const questions = demo.questions;
  const errorCount = useMemo(
    () =>
      lesson && config && questions
        ? Object.keys(validateQuest(demoDraft(lesson, config, questions))).length
        : 0,
    [lesson, config, questions],
  );

  if (!lesson || !config || !questions) return <NoDemoQuest />;
  const counts = QUESTION_TYPES.map((t) => ({
    t,
    n: questions.filter((q) => q.type === t).length,
  })).filter((x) => x.n > 0);
  const notReady = questions.length === 0 || errorCount > 0;

  return (
    <>
      <DemoBanner>This quest is not saved and will not affect your progress or mastery.</DemoBanner>
      <PageHeader
        title="Ready to practice"
        subtitle="Prototype summary of your reviewed demo quest."
        back={{ to: "/study/review", label: "Review" }}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill tone="warning">Demo · Not saved</Pill>
          <Pill tone="primary">{getSubject(lesson.subjectId)?.short}</Pill>
          <DifficultyPill difficulty={config.difficulty} />
        </div>
        <h2 className="mt-2 font-display text-lg font-semibold text-foreground">
          {config.title.trim()}
        </h2>
        <p className="text-sm text-muted-foreground">
          From sample lesson: {lesson.title} · {lesson.topic}
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-secondary/60 p-3">
            <dt className="text-xs text-muted-foreground">Questions</dt>
            <dd className="font-display text-xl font-semibold text-foreground">
              {questions.length}
            </dd>
          </div>
          <div className="rounded-xl bg-secondary/60 p-3">
            <dt className="text-xs text-muted-foreground">Sections</dt>
            <dd className="font-display text-xl font-semibold text-foreground">
              {config.sectionIds.length}
            </dd>
          </div>
        </dl>
        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
          {counts.map(({ t, n }) => (
            <li key={t}>
              {QUESTION_TYPE_LABEL[t]}: {n}
            </li>
          ))}
        </ul>
      </Card>

      {notReady && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {questions.length === 0
            ? "No questions left."
            : `${errorCount} issue${errorCount === 1 ? "" : "s"} still need fixing.`}{" "}
          <Link to="/study/review" className="font-semibold underline">
            Return to review
          </Link>
        </p>
      )}

      <div className="mt-6 space-y-2">
        <Button className="min-h-11 w-full" disabled={notReady} onClick={() => setOpen(true)}>
          <PlayCircle className="h-4 w-4" aria-hidden /> Start practice (prototype)
        </Button>
        <Link
          to="/study/review"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-border text-sm font-medium text-foreground hover:bg-accent/40"
        >
          Back to review
        </Link>
        <Link
          to="/study"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Back to Study
        </Link>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Practice preview only</DialogTitle>
            <DialogDescription>
              In the full version, this would open the practice screen with these {questions.length}{" "}
              questions. This demo doesn't start a real practice session: no quest or attempt is
              created and your progress is unchanged.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="min-h-11" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button asChild className="min-h-11">
              <Link to="/study" onClick={() => setOpen(false)}>
                Back to Study
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
