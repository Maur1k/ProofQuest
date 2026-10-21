import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";
import { Card, CodeBlock, EmptyState, PageHeader, Pill, ProgressBar } from "@/components/common";
import { getSubject } from "@/domain/subjects";
import { DemoBanner } from "@/demo/DemoBanner";
import { useDemo } from "@/demo/DemoContext";
import { getDemoLesson } from "@/demo/lessons";
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
          content: "Sample lesson with objectives, code examples and key points.",
        },
      ],
    };
  },
  component: LessonReader,
});

function LessonReader() {
  const { lessonId } = Route.useParams();
  const lesson = getDemoLesson(lessonId);
  const { readSections, toggleRead } = useDemo();

  if (!lesson) {
    return (
      <div className="pt-8">
        <EmptyState
          title="Demo lesson not found"
          body="This sample lesson doesn't exist."
          action={
            <Link
              to="/study"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-primary"
            >
              Back to Study Library
            </Link>
          }
        />
      </div>
    );
  }
  const read = readSections[lesson.id] ?? [];
  const readCount = lesson.sections.filter((s) => read.includes(s.id)).length;

  return (
    <>
      <DemoBanner>
        Sample lesson. Reading progress lives only in this tab and does not affect mastery or
        progress.
      </DemoBanner>
      <PageHeader
        title={lesson.title}
        subtitle={`${getSubject(lesson.subjectId)?.name} · ${lesson.topic} · ${lesson.readMinutes} min read`}
        back={{ to: "/study", label: "Study Library" }}
      />

      <Card>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-foreground">Demo reading progress</span>
          <span className="text-muted-foreground">
            {readCount}/{lesson.sections.length} sections
          </span>
        </div>
        <div className="mt-2">
          <ProgressBar value={readCount / lesson.sections.length} label="Demo reading progress" />
        </div>
      </Card>

      <nav aria-label="Lesson sections" className="mt-4">
        <ol className="space-y-1">
          {lesson.sections.map((s, i) => (
            <li key={s.id}>
              <a
                href={`#sec-${s.id}`}
                className="flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm text-muted-foreground hover:bg-accent/40 hover:text-foreground"
              >
                {read.includes(s.id) ? (
                  <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
                ) : (
                  <Circle className="h-4 w-4" aria-hidden />
                )}
                {i + 1}. {s.heading}
                {read.includes(s.id) && <span className="sr-only">(read)</span>}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <section aria-labelledby="obj-h" className="mt-4">
        <Card>
          <h2 id="obj-h" className="font-display text-base font-semibold text-foreground">
            Learning objectives
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {lesson.objectives.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </Card>
      </section>

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
                "mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                done
                  ? "border-success/50 text-success"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {done ? (
                <CheckCircle2 className="h-4 w-4" aria-hidden />
              ) : (
                <Circle className="h-4 w-4" aria-hidden />
              )}
              {done ? "Marked as read (demo)" : "Mark section as read (demo)"}
            </button>
          </section>
        );
      })}

      <div className="mt-8 rounded-2xl border border-primary/40 bg-accent/30 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" aria-hidden />
          <h2 className="font-display text-base font-semibold text-foreground">
            Turn this into a quest
          </h2>
          <Pill tone="warning">Demo</Pill>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose sections and question types to preview a sample quest. Questions come from a fixed
          sample set, not AI.
        </p>
        <Link
          to="/study/configure/$lessonId"
          params={{ lessonId: lesson.id }}
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-gradient-primary px-4 text-sm font-semibold text-primary-foreground shadow-glow"
        >
          Configure demo quest
        </Link>
      </div>
    </>
  );
}
