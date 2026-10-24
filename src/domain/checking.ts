import type { AnswerResponse, Question, TraceQuestion } from "./types";

/**
 * Output normalization rules:
 * - CRLF / CR line endings become LF.
 * - Leading and trailing whitespace on each line is ignored.
 * - Blank lines at the very start or end are ignored.
 * - Case, inner spacing, and blank lines between output lines ARE significant.
 */
export function normalizeOutput(text: string): string {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.trim());
  while (lines.length && lines[0] === "") lines.shift();
  while (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines.join("\n");
}

export function checkOutput(expected: string, actual: string): boolean {
  return normalizeOutput(expected) === normalizeOutput(actual);
}

/** Trace cells are compared after trimming; case is significant. */
export function checkTrace(
  q: Pick<TraceQuestion, "variables" | "steps">,
  cells: string[][],
): { correct: boolean; cellResults: boolean[][] } {
  const cellResults = q.steps.map((step, i) =>
    q.variables.map((_, j) => (cells[i]?.[j] ?? "").trim() === (step.values[j] ?? "").trim()),
  );
  return { correct: cellResults.every((row) => row.every(Boolean)), cellResults };
}

/**
 * Code normalization rules (text comparison only — NOT semantic equivalence):
 * - Line endings normalized, each line trimmed.
 * - Runs of spaces/tabs inside a line collapse to one space.
 * - Blank lines are ignored.
 * Different but equivalent fixes (e.g. renamed variables) will not match.
 */
export function normalizeCode(code: string): string {
  return code
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.trim().replace(/\s+/g, " "))
    .filter((l) => l !== "")
    .join("\n");
}

export function checkFix(expected: string, actual: string): boolean {
  return normalizeCode(expected) === normalizeCode(actual);
}

export interface CheckResult {
  correct: boolean;
  cellResults?: boolean[][];
}

export function checkAnswer(q: Question, response: AnswerResponse): CheckResult {
  if (q.type === "predict" && response.type === "predict") {
    return { correct: checkOutput(q.expectedOutput, response.output) };
  }
  if (q.type === "trace" && response.type === "trace") {
    return checkTrace(q, response.cells);
  }
  if (q.type === "fix" && response.type === "fix") {
    return { correct: checkFix(q.fixedCode, response.code) };
  }
  return { correct: false };
}

export function isResponseEmpty(response: AnswerResponse): boolean {
  if (response.type === "predict") return response.output.trim() === "";
  if (response.type === "fix") return response.code.trim() === "";
  return response.cells.every((row) => row.every((c) => c.trim() === ""));
}

export function emptyResponse(q: Question): AnswerResponse {
  if (q.type === "predict") return { type: "predict", output: "" };
  if (q.type === "fix") return { type: "fix", code: q.code };
  return { type: "trace", cells: q.steps.map(() => q.variables.map(() => "")) };
}
