import type { Difficulty, QuestionType, SubjectId } from "./types";

export interface Subject {
  id: SubjectId;
  name: string;
  short: string;
  description: string;
  topics: string[];
}

export const SUBJECTS: Subject[] = [
  {
    id: "fundamentals",
    name: "Programming Fundamentals",
    short: "Fundamentals",
    description: "Variables, control flow, loops and functions.",
    topics: ["Variables", "Conditionals", "Loops", "Functions"],
  },
  {
    id: "data-structures",
    name: "Data Structures",
    short: "Data Structures",
    description: "Arrays, stacks, queues, hash maps and trees.",
    topics: ["Arrays", "Stacks", "Queues", "Hash Maps", "Trees"],
  },
  {
    id: "algorithms",
    name: "Algorithms",
    short: "Algorithms",
    description: "Searching, sorting and recursion.",
    topics: ["Searching", "Sorting", "Recursion"],
  },
  {
    id: "computer-science",
    name: "Computer Science",
    short: "CS Theory",
    description: "Number systems, bits and how computers represent data.",
    topics: ["Number Systems", "Bitwise Operations", "Complexity"],
  },
];

export function getSubject(id: string): Subject | undefined {
  return SUBJECTS.find((s) => s.id === id);
}

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  predict: "Predict output",
  trace: "Trace variables",
  fix: "Fix the bug",
};
