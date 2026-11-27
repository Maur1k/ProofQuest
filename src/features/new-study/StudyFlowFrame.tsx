import { useEffect, useRef, type ReactNode } from "react";
import { STUDY_STEPS, type StudyStep } from "@/domain/study-flow";
import { Button } from "@/components/ui/button";

/** Displays only the current step. The controller owns saving and request recovery. */
export function StudyFlowFrame({
  step,
  children,
  busy,
  canContinue,
  onBack,
  onContinue,
}: {
  step: StudyStep;
  children: ReactNode;
  busy: boolean;
  canContinue: boolean;
  onBack: () => void;
  onContinue: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const previous = useRef(step);
  useEffect(() => {
    if (previous.current !== step) heading.current?.focus();
    previous.current = step;
  }, [step]);
  return (
    <section
      className="mx-auto max-w-3xl space-y-6 py-6 sm:py-10"
      aria-labelledby="study-step-heading"
      aria-busy={busy}
    >
      <header className="space-y-4">
        <ol aria-label="Study progress" className="flex gap-2">
          {["Material", "Study mode", "Review"].map((label, index) => (
            <li
              key={label}
              aria-current={index === step ? "step" : undefined}
              className="min-w-0 flex-1"
            >
              <div
                className={`mb-2 h-1 rounded-full ${index <= step ? "bg-primary" : "bg-border"}`}
              />
              <span
                className={`text-xs sm:text-sm ${index === step ? "font-semibold text-foreground" : "text-muted-foreground"}`}
              >
                {index + 1}. {label}
              </span>
            </li>
          ))}
        </ol>
        <p className="sr-only">
          Step {step + 1} of {STUDY_STEPS.length}
        </p>
        <h1
          ref={heading}
          id="study-step-heading"
          tabIndex={-1}
          className="text-3xl font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        >
          {STUDY_STEPS[step]}
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          {
            [
              "Start with a PDF or your own notes.",
              "Choose the way you want to learn.",
              "Check your selection before creating study material.",
            ][step]
          }
        </p>
      </header>
      {children}
      <div className="flex items-center justify-between gap-3 border-t border-border pt-5">
        {step > 0 && (
          <Button variant="outline" disabled={busy} onClick={onBack}>
            Back
          </Button>
        )}
        {step < 2 && (
          <Button className="ml-auto min-w-32" disabled={busy || !canContinue} onClick={onContinue}>
            Continue
          </Button>
        )}
      </div>
    </section>
  );
}
