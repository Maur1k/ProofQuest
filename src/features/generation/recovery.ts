import { z } from "zod";
import { validateGenerationInput, type GenerationInput } from "@/domain/generation";
import { choiceFormat, type StudyChoice } from "@/domain/study-choice";
import { validateStudyRequest } from "@/domain/study-material";
const schema = z
  .object({
    id: z.string().uuid(),
    started: z.number().finite(),
    checksum: z.string(),
    choice: z.enum(["quiz", "exam", "reviewer", "flashcards"]),
    input: z.unknown(),
  })
  .strict();
export function recoverGeneration(
  raw: string,
  checksum: string,
  pages: { page: number; text: string }[],
  documentId: string,
  now = Date.now(),
) {
  const saved = schema.parse(JSON.parse(raw));
  const input = validateGenerationInput(saved.input);
  if (
    saved.checksum !== checksum ||
    input.documentId !== documentId ||
    saved.started > now ||
    now - saved.started >= 86400000 ||
    input.pages.some(
      (page) =>
        !pages.some((stored) => stored.page === page.page && stored.text.trim() === page.text),
    )
  )
    throw new Error("Request recovery expired or source changed");
  return {
    id: saved.id,
    started: saved.started,
    choice: saved.choice,
    input,
    studyInput: validateStudyRequest({
      documentId,
      pages: input.pages,
      format: choiceFormat(saved.choice),
    }),
  };
}
export function recoveryValue(
  id: string,
  started: number,
  checksum: string,
  choice: StudyChoice,
  input: GenerationInput,
) {
  return JSON.stringify({ id, started, checksum, choice, input });
}
