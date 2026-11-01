import { z } from "zod";
import { questSchema } from "./storage";
import type { AnswerResponse, Question } from "./types";
import { checkAnswer, isResponseEmpty } from "./checking";

const id = z.string().trim().min(1).max(200);
export const sourceReferenceSchema = z
  .object({
    documentId: id,
    page: z.number().int().positive(),
    excerpt: z.string().trim().min(1).max(4000),
  })
  .strict();

export const mcqSchema = z
  .object({
    id,
    type: z.literal("mcq"),
    prompt: z.string().trim().min(1).max(4000),
    explanation: z.string().trim().min(1).max(4000),
    hints: z.array(z.string().trim().min(1).max(200)).max(3),
    options: z
      .array(z.object({ id, text: z.string().trim().min(1).max(2000) }).strict())
      .min(2)
      .max(6),
    correctOptionId: id,
    sources: z.array(sourceReferenceSchema).max(30),
  })
  .strict()
  .superRefine((question, ctx) => {
    if (new Set(question.options.map((option) => option.id)).size !== question.options.length)
      ctx.addIssue({ code: "custom", message: "Option IDs must be unique", path: ["options"] });
    if (
      new Set(question.options.map((option) => option.text.toLowerCase())).size !==
      question.options.length
    )
      ctx.addIssue({ code: "custom", message: "Option text must be distinct", path: ["options"] });
    if (!question.options.some((option) => option.id === question.correctOptionId))
      ctx.addIssue({
        code: "custom",
        message: "Correct option must exist",
        path: ["correctOptionId"],
      });
  });

export type McqQuestion = z.infer<typeof mcqSchema>;
// Legacy editors remain programming-only. New quiz consumers must handle all four types.
export type QuizQuestion = Question | McqQuestion;
export type QuizResponse = AnswerResponse | { type: "mcq"; optionId: string | null };
export const quizQuestionSchema = z.union([questSchema.shape.questions.element, mcqSchema]);
export const quizVersionSchema = z
  .object({
    id,
    quizId: id,
    title: z.string().trim().min(1).max(200),
    createdAt: z.number().finite().nonnegative(),
    questions: z.array(quizQuestionSchema).min(1).max(100),
  })
  .strict()
  .superRefine((version, ctx) => {
    if (new Set(version.questions.map((question) => question.id)).size !== version.questions.length)
      ctx.addIssue({ code: "custom", message: "Question IDs must be unique", path: ["questions"] });
  });
export type QuizVersion = z.infer<typeof quizVersionSchema>;

export function assertNever(value: never): never {
  throw new Error(`Unsupported quiz variant: ${String(value)}`);
}

export function checkQuizAnswer(question: QuizQuestion, response: QuizResponse): boolean {
  switch (question.type) {
    case "mcq":
      return response.type === "mcq" && response.optionId === question.correctOptionId;
    case "predict":
    case "trace":
    case "fix":
      return response.type !== "mcq" && checkAnswer(question, response).correct;
    default:
      return assertNever(question);
  }
}

export function responseIsEmpty(response: QuizResponse): boolean {
  switch (response.type) {
    case "mcq":
      return response.optionId === null;
    case "predict":
    case "trace":
    case "fix":
      return isResponseEmpty(response);
    default:
      return assertNever(response);
  }
}

export function validateResponse(question: QuizQuestion, response: QuizResponse): void {
  if (question.type !== response.type) throw new Error("Response type does not match question");
  if (
    question.type === "mcq" &&
    response.type === "mcq" &&
    response.optionId !== null &&
    !question.options.some((option) => option.id === response.optionId)
  )
    throw new Error("Unknown option");
  if (
    question.type === "trace" &&
    response.type === "trace" &&
    (response.cells.length !== question.steps.length ||
      response.cells.some((row) => row.length !== question.variables.length))
  )
    throw new Error("Trace dimensions do not match question");
}
