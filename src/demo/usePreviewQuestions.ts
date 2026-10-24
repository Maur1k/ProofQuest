import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useDemo } from "./DemoContext";
import { getDemoLesson, type DemoLesson } from "./lessons";
import { defaultDemoConfig, generateDemoQuestions, previewAction, type DemoConfig } from "./logic";

/**
 * One-tap path from a lesson to the demo review. Resumes an existing review for
 * the same lesson, generates with defaults when nothing exists, and asks first
 * before replacing questions reviewed for another lesson.
 */
export function usePreviewQuestions(lesson: DemoLesson) {
  const demo = useDemo();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const action = previewAction(lesson.id, demo.generatedFor, demo.questions?.length ?? 0);
  const otherLesson =
    action === "confirm-replace" && demo.generatedFor
      ? getDemoLesson(demo.generatedFor)
      : undefined;

  const generate = (c: DemoConfig) => {
    demo.setConfig(c);
    demo.setGenerated(c, generateDemoQuestions(lesson, c));
    void navigate({ to: "/study/review" });
  };
  const generateDefaults = () =>
    generate(demo.config?.lessonId === lesson.id ? demo.config : defaultDemoConfig(lesson));

  const start = () => {
    if (action === "resume") void navigate({ to: "/study/review" });
    else if (action === "confirm-replace") setConfirmOpen(true);
    else generateDefaults();
  };

  return {
    action,
    label:
      action === "resume"
        ? `Resume review (${demo.questions?.length ?? 0})`
        : "Preview demo questions",
    start,
    generate,
    generateDefaults,
    confirmOpen,
    setConfirmOpen,
    replaceDescription: `You have ${demo.questions?.length ?? 0} demo question${
      demo.questions?.length === 1 ? "" : "s"
    } in review from "${otherLesson?.title ?? "another lesson"}". Replace them with questions from this lesson? Your edits there will be lost.`,
  };
}
