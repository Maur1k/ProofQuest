import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Circle } from "lucide-react";
import { CodeBlock, EmptyState, PageHeader } from "@/components/common";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { getSubject } from "@/domain/subjects";
import { DemoBanner } from "@/demo/DemoBanner";
import { useDemo } from "@/demo/DemoContext";
import { getDemoLesson, type DemoLesson } from "@/demo/lessons";
import { usePreviewQuestions } from "@/demo/usePreviewQuestions";
import { LoopDiagram } from "@/demo/LoopDiagram";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/study/lesson/$lessonId")({
  head: ({ params }) => {
    const title = `${getDemoLesson(params.lessonId)?.title ?? "Lesson"} (demo) — ProofQuest`;
    return {
      meta: [
        { title },
        {
          name: "description",
          content: "Read a sample programming lesson in the Study-to-Quest demo.",
        },
        { property: "og:title", content: title },
        {
          property: "og:description",
          content: "Sample lesson with code examples and key points.",
        },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: LessonReader,
});

function LessonReader() {
  const { lessonId } = Route.useParams();
  const lesson = getDemoLesson(lessonId);
  if (!lesson) {
    return (
      <div className="pt-8">
        <EmptyState
          title="Sample lesson not found"
          body="This sample lesson doesn't exist."
          action={
            <Link
              to="/study"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-primary"
            >
              Back to Study
            </Link>
          }
        />
      </div>
    );
  }
  return <Reader lesson={lesson} />;
}

function Reader({ lesson }: { lesson: DemoLesson }) {
  const { readSections, toggleRead } = useDemo();
  const preview = usePreviewQuestions(lesson);
  const read = readSections[lesson.id] ?? [];
  const readCount = lesson.sections.filter((s) => read.includes(s.id)).length;

  return (
    <>
      <DemoBanner>
        Sample lesson. Marking sections read is optional, lives only in this tab, and does not
        affect mastery or progress.
      </DemoBanner>
      <PageHeader
        title={lesson.title}
        subtitle={`${getSubject(lesson.subjectId)?.name} · ${lesson.topic} · ${lesson.readMinutes} min read`}
        back={{ to: "/study", label: "Study" }}
      />

      <details className="-mt-2 rounded-xl border border-border bg-card text-sm">
        <summary className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="min-w-0 flex-1">Outline &amp; objectives</span>
          {readCount > 0 && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {readCount}/{lesson.sections.length} read
            </span>
          )}
        </summary>
        <div className="px-3 pb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            You'll learn to
          </h2>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
            {lesson.objectives.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
          <nav aria-label="Lesson sections" className="mt-3">
            <ol>
              {lesson.sections.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#sec-${s.id}`}
                    className="flex min-h-11 items-center gap-2 rounded-lg px-1 text-muted-foreground hover:text-foreground"
                  >
                    {i + 1}. {s.heading}
                    {read.includes(s.id) && (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
                        <span className="sr-only">(read)</span>
                      </>
                    )}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </details>

      {lesson.sections.map((s, i) => {
        const done = read.includes(s.id);
        return (
          <section
            key={s.id}
            id={`sec-${s.id}`}
            aria-labelledby={`h-${s.id}`}
            className="mt-6 scroll-mt-4"
          >
            <h2 id={`h-${s.id}`} className="font-display text-lg font-semibold text-foreground">
              {i + 1}. {s.heading}
            </h2>
            <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-foreground/90">
              {s.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
            <div className="mt-3">
              <CodeBlock code={s.example} language={lesson.language} />
            </div>
            {s.diagram === "for-loop-flow" && <LoopDiagram />}
            <div className="mt-3 rounded-xl border border-border bg-card p-3">
              <h3 className="text-sm font-semibold text-foreground">Key points</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {s.keyPoints.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              aria-pressed={done}
              onClick={() => toggleRead(lesson.id, s.id)}
              className={cn(
                "mt-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                done ? "text-success" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {done ? (
                <CheckCircle2 className="h-4 w-4" aria-hidden />
              ) : (
                <Circle className="h-4 w-4" aria-hidden />
              )}
              {done ? "Read" : "Mark read (optional)"}
            </button>
          </section>
        );
      })}

      <section aria-labelledby="practice-h" className="mt-8 rounded-2xl border border-border bg-card p-4">
        <h2 id="practice-h" className="font-display text-base font-semibold text-foreground">
          Practice this lesson
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Preview sample questions from this lesson. Fixed sample set, not AI. Nothing is saved.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
          <Button className="min-h-11" onClick={preview.start}>
            {preview.label}
          </Button>
          <Link
            to="/study/configure/$lessonId"
            params={{ lessonId: lesson.id }}
            className="inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-medium text-primary hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Customize
          </Link>
        </div>
      </section>

      <ConfirmDialog
        open={preview.confirmOpen}
        onOpenChange={preview.setConfirmOpen}
        title="Replace demo questions?"
        description={preview.replaceDescription}
        confirmLabel="Replace"
        cancelLabel="Keep current"
        destructive
        onConfirm={preview.generateDefaults}
      />
    </>
  );
}
