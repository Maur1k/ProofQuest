export const STUDY_CHOICES = [
  {
    id: "flashcards",
    label: "Flashcards",
    description: "Reveal answers and study at your own pace.",
  },
  { id: "quiz", label: "Quiz", description: "Five questions with feedback after each answer." },
  {
    id: "exam",
    label: "Exam",
    description: "Five questions; answers and score after submission. No timer.",
  },
  { id: "reviewer", label: "Reviewer", description: "Topic summaries, key terms and comparisons." },
] as const;
export type StudyChoice = (typeof STUDY_CHOICES)[number]["id"];
export const choiceFormat = (choice: StudyChoice) => (choice === "exam" ? "quiz" : choice);
export const choiceMode = (choice: "quiz" | "exam") =>
  choice === "quiz" ? ("practice" as const) : ("test" as const);
