import { normalizeCode } from "./checking";
import { DIFFICULTIES, LANGUAGES, QUESTION_TYPES, SUBJECT_IDS, type QuestDraft } from "./types";

export const LIMITS = {
  titleMin: 3,
  titleMax: 80,
  topicMin: 2,
  topicMax: 40,
  questionsMin: 1,
  questionsMax: 20,
  hintsMax: 3,
  hintMax: 200,
  textMax: 2000,
  codeMax: 4000,
} as const;

/** Keys: "title", "subjectId", "topic", "difficulty", "questions", or "q.<id>.<field>". */
export type ValidationErrors = Record<string, string>;

export function validateQuest(draft: QuestDraft): ValidationErrors {
  const e: ValidationErrors = {};
  const title = draft.title.trim();
  if (title.length < LIMITS.titleMin)
    e["title"] = `Title needs at least ${LIMITS.titleMin} characters.`;
  else if (title.length > LIMITS.titleMax)
    e["title"] = `Title must be ${LIMITS.titleMax} characters or fewer.`;

  if (!(SUBJECT_IDS as readonly string[]).includes(draft.subjectId))
    e["subjectId"] = "Choose a subject.";

  const topic = draft.topic.trim();
  if (topic.length < LIMITS.topicMin) e["topic"] = "Enter a topic.";
  else if (topic.length > LIMITS.topicMax)
    e["topic"] = `Topic must be ${LIMITS.topicMax} characters or fewer.`;

  if (!(DIFFICULTIES as readonly string[]).includes(draft.difficulty))
    e["difficulty"] = "Choose a difficulty.";

  if (draft.questions.length < LIMITS.questionsMin) e["questions"] = "Add at least one question.";
  else if (draft.questions.length > LIMITS.questionsMax)
    e["questions"] = `A quest can have at most ${LIMITS.questionsMax} questions.`;

  for (const q of draft.questions) {
    const k = (f: string) => `q.${q.id}.${f}`;
    if (!(QUESTION_TYPES as readonly string[]).includes(q.type))
      e[k("type")] = "Unknown question type.";
    if (!(LANGUAGES as readonly string[]).includes(q.language))
      e[k("language")] = "Choose a language.";
    if (!q.prompt.trim()) e[k("prompt")] = "Write the question prompt.";
    else if (q.prompt.length > LIMITS.textMax) e[k("prompt")] = "Prompt is too long.";
    if (!q.code.trim()) e[k("code")] = "Add a code snippet.";
    else if (q.code.length > LIMITS.codeMax) e[k("code")] = "Code is too long.";
    if (!q.explanation.trim()) e[k("explanation")] = "Explain the answer.";
    else if (q.explanation.length > LIMITS.textMax)
      e[k("explanation")] = "Explanation is too long.";

    if (q.hints.length > LIMITS.hintsMax) e[k("hints")] = `At most ${LIMITS.hintsMax} hints.`;
    else if (q.hints.some((h) => !h.trim())) e[k("hints")] = "Remove empty hints or fill them in.";
    else if (q.hints.some((h) => h.length > LIMITS.hintMax))
      e[k("hints")] = `Hints must be ${LIMITS.hintMax} characters or fewer.`;

    if (q.type === "predict") {
      if (!q.expectedOutput.trim()) e[k("expected")] = "Enter the expected output.";
    } else if (q.type === "trace") {
      const vars = q.variables.map((v) => v.trim());
      if (vars.length === 0 || vars.some((v) => !v))
        e[k("variables")] = "Name every tracked variable.";
      else if (new Set(vars).size !== vars.length)
        e[k("variables")] = "Variable names must be unique.";
      if (q.steps.length === 0) e[k("steps")] = "Add at least one step.";
      else if (
        q.steps.some(
          (s) =>
            !s.label.trim() || s.values.length !== vars.length || s.values.some((v) => !v.trim()),
        )
      )
        e[k("steps")] = "Every step needs a label and a value for each variable.";
    } else if (q.type === "fix") {
      if (!q.fixedCode.trim()) e[k("expected")] = "Enter the corrected code.";
      else if (normalizeCode(q.fixedCode) === normalizeCode(q.code))
        e[k("expected")] = "The corrected code must differ from the buggy code.";
    }
  }
  return e;
}
