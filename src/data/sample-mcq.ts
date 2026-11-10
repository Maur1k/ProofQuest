import { quizVersionSchema, type QuizVersion } from "@/domain/quiz";

/** Explicit opt-in fixture for Phase 5. Never seeded automatically or attributed to a PDF. */
export function createSampleMcqVersion(): QuizVersion {
  return quizVersionSchema.parse({
    id: "proofquest-sample-study-skills-v1",
    quizId: "proofquest-sample-study-skills",
    title: "Sample quiz: study skills (not PDF-generated)",
    createdAt: 0,
    questions: [
      {
        id: "recall",
        prompt: "Which activity directly practices recalling information from memory?",
        options: [
          { id: "a", text: "Answering a question before looking at notes" },
          { id: "b", text: "Copying notes with the answer visible" },
          { id: "c", text: "Changing the font of your notes" },
        ],
        correctOptionId: "a",
        explanation: "Answering without looking requires you to retrieve information from memory.",
      },
      {
        id: "evidence",
        prompt: "A summary seems to contradict the source. What should you check first?",
        options: [
          { id: "a", text: "Whether the summary uses a larger font" },
          { id: "b", text: "The relevant passage in the original source" },
          { id: "c", text: "How many words the summary contains" },
        ],
        correctOptionId: "b",
        explanation: "Checking the original passage helps establish what the source actually says.",
      },
      {
        id: "clarify",
        prompt: "Which note makes an unfamiliar term easiest to revisit?",
        options: [
          { id: "a", text: "The term alone with no context" },
          { id: "b", text: "A random page number" },
          { id: "c", text: "The term, its meaning, and a relevant example" },
        ],
        correctOptionId: "c",
        explanation: "A definition and example record both the meaning and how it is used.",
      },
      {
        id: "review",
        prompt: "After an incorrect practice answer, which action addresses the misunderstanding?",
        options: [
          { id: "a", text: "Compare the explanation with your reasoning" },
          { id: "b", text: "Hide the question permanently" },
          { id: "c", text: "Choose another option without reading it" },
        ],
        correctOptionId: "a",
        explanation:
          "Comparing your reasoning with the explanation helps locate the specific misunderstanding.",
      },
      {
        id: "diagram",
        prompt: "Extracted PDF text omits labels from a diagram. Where should you verify them?",
        options: [
          { id: "a", text: "In an unrelated document" },
          { id: "b", text: "On the original PDF page" },
          { id: "c", text: "By guessing from the file name" },
        ],
        correctOptionId: "b",
        explanation: "The original page retains the diagram and its visible labels.",
      },
    ].map((question) => ({ ...question, type: "mcq", hints: [], sources: [] })),
  });
}
