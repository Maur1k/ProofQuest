import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Question } from "@/domain/types";
import type { DemoConfig } from "./logic";

/**
 * Memory-only state for the Study-to-Quest demo. Deliberately separate from the
 * app store: never touches the reducer or localStorage, and resets on reload.
 */
interface DemoValue {
  readSections: Record<string, string[]>;
  toggleRead: (lessonId: string, sectionId: string) => void;
  config: DemoConfig | null;
  setConfig: (c: DemoConfig) => void;
  questions: Question[] | null;
  generatedFor: string | null;
  setGenerated: (lessonId: string, qs: Question[]) => void;
  updateQuestion: (q: Question) => void;
  removeQuestion: (id: string) => void;
  reset: () => void;
}

const Ctx = createContext<DemoValue | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [readSections, setRead] = useState<Record<string, string[]>>({});
  const [config, setConfig] = useState<DemoConfig | null>(null);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [generatedFor, setGeneratedFor] = useState<string | null>(null);

  const value = useMemo<DemoValue>(
    () => ({
      readSections,
      toggleRead: (lessonId, sectionId) =>
        setRead((r) => {
          const cur = r[lessonId] ?? [];
          return {
            ...r,
            [lessonId]: cur.includes(sectionId)
              ? cur.filter((s) => s !== sectionId)
              : [...cur, sectionId],
          };
        }),
      config,
      setConfig,
      questions,
      generatedFor,
      setGenerated: (lessonId, qs) => {
        setGeneratedFor(lessonId);
        setQuestions(qs);
      },
      updateQuestion: (q) => setQuestions((qs) => qs?.map((x) => (x.id === q.id ? q : x)) ?? qs),
      removeQuestion: (id) => setQuestions((qs) => qs?.filter((x) => x.id !== id) ?? qs),
      reset: () => {
        setConfig(null);
        setQuestions(null);
        setGeneratedFor(null);
      },
    }),
    [readSections, config, questions, generatedFor],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDemo(): DemoValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDemo must be used inside DemoProvider");
  return v;
}
