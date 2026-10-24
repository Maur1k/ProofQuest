import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { INTRO_SLIDES, nextSlideIndex, swipeDelta } from "@/onboarding/slides";
import { markOnboardingSeen } from "@/onboarding/useOnboarding";

export const Route = createFileRoute("/intro")({
  head: () => ({
    meta: [
      { title: "Introduction — ProofQuest" },
      { name: "description", content: "A three-step introduction to studying and practicing with ProofQuest." },
      { property: "og:title", content: "Introduction — ProofQuest" },
      { property: "og:description", content: "Understand a topic, practice what you learn, and see your progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Intro,
});

function Intro() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const total = INTRO_SLIDES.length;
  const slide = INTRO_SLIDES[index] ?? INTRO_SLIDES[0]!;
  const last = index === total - 1;

  const finish = () => {
    markOnboardingSeen();
    void navigate({ to: "/welcome" });
  };
  const go = (delta: number) => setIndex((i) => nextSlideIndex(i, delta, total));

  const onPointerDown = (e: PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const onPointerUp = (e: PointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s || s.id !== e.pointerId) return;
    const d = swipeDelta(e.clientX - s.x, e.clientY - s.y);
    if (d) go(d);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") go(1);
    else if (e.key === "ArrowLeft") go(-1);
  };

  return (
    <div className="mx-auto flex h-[100dvh] min-h-[480px] max-w-[430px] flex-col px-1 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] md:max-w-[560px]">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={finish}
          className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Skip<span className="sr-only"> introduction</span>
        </button>
      </div>

      <section
        aria-roledescription="carousel"
        aria-label="Introduction"
        onKeyDown={onKeyDown}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div
          key={slide.id}
          role="group"
          aria-roledescription="slide"
          aria-label={`${index + 1} of ${total}`}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (start.current = null)}
          className="flex min-h-0 flex-1 touch-pan-y select-none flex-col animate-in fade-in duration-300 motion-reduce:animate-none"
        >
          <div className="relative flex min-h-0 flex-1 items-center justify-center">
            <div aria-hidden className="absolute inset-x-8 bottom-4 top-10 rounded-full bg-primary/15 blur-3xl" />
            <img
              src={slide.image}
              alt=""
              width={640}
              height={640}
              draggable={false}
              className="relative h-full max-h-[440px] w-auto max-w-full object-contain"
            />
          </div>
          <div className="shrink-0 px-3 pt-2 text-center">
            <h1 className="text-2xl font-bold text-foreground" aria-live="polite">
              {slide.title}
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-[15px] text-muted-foreground">{slide.body}</p>
            {slide.note && (
              <p className="mx-auto mt-2 max-w-sm text-xs font-medium text-warning">{slide.note}</p>
            )}
          </div>
        </div>

        <div className="shrink-0 px-3 pt-4">
          <div className="flex justify-center gap-1" role="group" aria-label="Choose slide">
            {INTRO_SLIDES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Slide ${i + 1} of ${total}: ${s.title}`}
                aria-current={i === index ? "step" : undefined}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full"
              >
                <span
                  className={cn(
                    "block h-2.5 rounded-full transition-all motion-reduce:transition-none",
                    i === index ? "w-6 bg-gold" : "w-2.5 bg-muted-foreground/40",
                  )}
                />
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            {index > 0 && (
              <Button variant="outline" className="min-h-12 flex-1 text-base" onClick={() => go(-1)}>
                Back
              </Button>
            )}
            <Button
              className="min-h-12 flex-[2] text-base"
              onClick={() => (last ? finish() : go(1))}
            >
              {last ? "Get started" : "Next"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
