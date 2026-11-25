import type { StudyMaterial } from "./study-material";
import type { QuizVersion } from "./quiz";
type QualityQuestion = Omit<
  Extract<QuizVersion["questions"][number], { type: "mcq" }>,
  "sources"
> & { sources: { excerpt: string }[] };
import { GenerationValidationError } from "./generation";

export const GENERATION_QUALITY_VERSION = "single-answer-v1";
const normalize = (value: string) =>
  value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.!?]+$/, "");
const equivalentChoice = (value: string) =>
  /^(?:neutral|no (?:electric )?charge|zero (?:electric )?charge)$/.test(value)
    ? "no charge"
    : value;
const quantity =
  /^(\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)(?:\s+(bits?|bytes?|values?))?$/;
function supportedCount(question: QualityQuestion): boolean {
  if (!/^how many\b/i.test(question.prompt)) return false;
  const parsed = question.options.map((o) => quantity.exec(normalize(o.text)));
  if (parsed.some((p) => !p) || new Set(parsed.map((p) => p?.[2] ?? "")).size !== 1) return false;
  const correct = quantity.exec(
    normalize(question.options.find((o) => o.id === question.correctOptionId)!.text),
  );
  if (!correct) return false;
  return question.sources.some((s) =>
    new RegExp(`\\b(?:has|contains|contain)\\s+${correct[1]}\\b`).test(normalize(s.excerpt)),
  );
}
const aggregate =
  /^(?:(?:all|none|both|any) of (?:the )?(?:above|these|those|options|answers)|all options|none of these)(?:\b|$)/;
function mentioned(option: string, excerpt: string) {
  // Reference lists commonly omit the repeated RFC prefix after the first entry.
  const reference = /^rfc\s+(\d+)$/.exec(option);
  const needle = reference?.[1] ?? option;
  if (!needle || needle.length < 3) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(String.raw`(?:^|[^\p{L}\p{N}])${escaped}(?=$|[^\p{L}\p{N}])`, "u").test(
    excerpt,
  );
}

/** Conservative rejection heuristics for NEW generated material only.
 * Co-mentioned options can be valid contrasts; rejecting those is deliberate.
 * Passing is not proof of truth or uniqueness. Never apply to historical reads/regrading.
 */
export function checkGeneratedQuizQuality<
  T extends {
    questions: (QualityQuestion | Exclude<QuizVersion["questions"][number], { type: "mcq" }>)[];
  },
>(version: T): T {
  for (const question of version.questions) {
    if (question.type !== "mcq") throw new GenerationValidationError("invalid-output");
    if (question.options.length !== 4) throw new GenerationValidationError("invalid-output");
    // Reject identity aliases and value lists masquerading as counts. These are
    // conservative shape checks, not a semantic correctness claim.
    if (
      /^who\b/i.test(question.prompt) &&
      question.options.some((o) =>
        /\b(?:commander|pilot|editor|author|president|director)\b/i.test(o.text),
      )
    )
      throw new GenerationValidationError("invalid-output");
    if (
      /^how many\b/i.test(question.prompt) &&
      question.options.some((o) => /\b(?:and|or)\b|[,;]/i.test(o.text))
    )
      throw new GenerationValidationError("invalid-output");
    const claims = normalize(
      `${question.prompt} ${question.explanation} ${question.options.find((option) => option.id === question.correctOptionId)?.text ?? ""}`,
    );
    const cited = normalize(question.sources.map((source) => source.excerpt).join(" "));
    for (const qualifier of [
      "only",
      "always",
      "never",
      "primary",
      "primarily",
      "main",
      "first",
      "last",
      "final",
      "best",
      "most",
    ]) {
      const word = new RegExp(`\\b${qualifier}\\b`, "u");
      if (word.test(claims) && !word.test(cited))
        throw new GenerationValidationError("invalid-output");
    }
    const options = question.options.map((option) => normalize(option.text));
    if (
      new Set(options.map(equivalentChoice)).size !== options.length ||
      options.some((option) => aggregate.test(option))
    )
      throw new GenerationValidationError("invalid-output");
    for (const source of question.sources) {
      const excerpt = normalize(source.excerpt);
      if (
        options.filter((option) => mentioned(option, excerpt)).length > 1 &&
        !supportedCount(question)
      )
        throw new GenerationValidationError("invalid-output");
    }
  }
  return version;
}

/** Initial extractive profile: no unsupported paraphrases or imported definitions.
 * Applies only at new generation acceptance, never when opening saved material.
 */
export function checkGeneratedStudyQuality(material: StudyMaterial): StudyMaterial {
  const check = (text: string, sources: { excerpt: string }[]) => {
    const claim = normalize(text);
    if (!sources.some((source) => normalize(source.excerpt).includes(claim)))
      throw new GenerationValidationError("invalid-output");
  };
  if (material.format === "flashcards")
    material.cards.forEach((card) => check(card.back, card.sources));
  else {
    material.sections.forEach((section) =>
      section.points.forEach((point) => check(point.text, point.sources)),
    );
    material.terms.forEach((term) => check(term.definition, term.sources));
    material.comparisons.forEach((comparison) =>
      comparison.rows.forEach((row) => check(row.detail, row.sources)),
    );
  }
  return material;
}
