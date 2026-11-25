import { it, expect } from "vitest";
import fixtures from "./fixtures/accepted-quality-corpus.json";
import { validateGeneratedQuiz } from "@/domain/generation";
import { checkGeneratedQuizQuality } from "@/domain/generation-quality";
for (const f of fixtures)
  it(`retains audited ${f.source.id} questions under current generation checks`, () => {
    const version = validateGeneratedQuiz(
      f.output,
      { documentId: f.source.id, pages: [{ page: 1, text: f.source.text }], questionCount: 5 },
      { id: f.source.id, quizId: f.source.id, title: f.source.id, createdAt: 1 },
    );
    expect(checkGeneratedQuizQuality(version).questions).toHaveLength(5);
  });
