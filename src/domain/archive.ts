import type { AnswerResponse } from "./types";
import type { QuizResponse } from "./quiz";
/** Classify by recorded identity/provenance, never by a user-editable title. */
export function isArchivedQuizId(id: string) {
  return id === "proofquest-sample-study-skills-v1" || id.startsWith("source-sample-");
}
export function archivedAnswer(response: AnswerResponse | QuizResponse): string {
  switch (response.type) {
    case "predict":
      return response.output || "(empty)";
    case "fix":
      return response.code || "(empty)";
    case "trace":
      return response.cells.map((row) => row.map((cell) => cell || "—").join(" | ")).join("\n");
    case "mcq":
      return response.optionId ?? "No answer";
  }
}
