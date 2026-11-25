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
      className="mx-auto max-w-3xl space-y-6 py-6"
      aria-labelledby="study-step-heading"
      aria-busy={busy}
    >
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">
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
      </header>
      {children}
      <div className="flex flex-wrap gap-3">
        {step > 0 && (
          <Button variant="outline" disabled={busy} onClick={onBack}>
            Back
          </Button>
        )}
        {step < 2 && (
          <Button disabled={busy || !canContinue} onClick={onContinue}>
            Continue
          </Button>
        )}
      </div>
    </section>
  );
}
