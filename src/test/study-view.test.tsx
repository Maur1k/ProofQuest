import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StudyMaterialView } from "@/features/study-materials/StudyMaterialView";
import { SavedStudyLibrary } from "@/features/study-materials/SavedStudyLibrary";
import { validateGeneratedStudy } from "@/domain/study-material";
import { createSampleMcqVersion } from "@/data/sample-mcq";
const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  save: vi.fn(),
  materials: vi.fn(),
  quizzes: vi.fn(),
  start: vi.fn(),
  navigate: vi.fn(),
}));
vi.mock("@/store/store", () => ({
  useStore: () => ({
    loadStudyProgress: mocks.load,
    saveStudyProgress: mocks.save,
    listStudyMaterials: mocks.materials,
    listSavedQuizzes: mocks.quizzes,
    startSavedQuiz: mocks.start,
  }),
}));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
vi.mock("@/features/quizzes/SourceReference", () => ({
  SourceReference: ({ source }: { source: { page: number; excerpt: string } }) => (
    <p>
      Page {source.page}: {source.excerpt}
    </p>
  ),
}));
const text =
  "Active recall means retrieving information from memory. A source provides evidence for a claim.";
const sources = [{ page: 1, excerpt: "Active recall means retrieving information from memory." }];
const request = { format: "flashcards" as const, documentId: "doc", pages: [{ page: 1, text }] };
const material = validateGeneratedStudy(
  {
    format: "flashcards",
    cards: [
      { front: "First question", back: "First answer", sources },
      { front: "Second question", back: "Second answer", sources },
    ],
    excluded: [{ page: 1, reason: "image-required" }],
  },
  request,
  { id: "deck", title: "Study deck", createdAt: 1 },
);
const record = { id: "deck", checksum: "a".repeat(64), request, material };
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it("reveals evidence, resets reveal on next card and resumes the persisted position", async () => {
  let state = { id: "deck", revision: 0, index: 0, revealed: false };
  mocks.load.mockImplementation(async () => state);
  mocks.save.mockImplementation(async (_previous, index, revealed) => {
    state = { ...state, revision: state.revision + 1, index, revealed };
    return state;
  });
  const view = render(<StudyMaterialView record={record} />);
  await screen.findByText("First question");
  expect(screen.queryByText("First answer")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Reveal answer" }));
  await screen.findByText("First answer");
  fireEvent.click(screen.getByRole("button", { name: "Next card" }));
  await screen.findByText("Second question");
  expect(screen.queryByText("Second answer")).toBeNull();
  view.unmount();
  render(<StudyMaterialView record={record} />);
  await screen.findByText("Second question");
  expect(screen.getByText(/Requires image interpretation/)).toBeInTheDocument();
});
it("keeps the last saved card when writing fails", async () => {
  mocks.load.mockResolvedValue({ id: "deck", revision: 0, index: 0, revealed: false });
  mocks.save.mockRejectedValue(new Error("quota"));
  render(<StudyMaterialView record={record} />);
  await screen.findByText("First question");
  fireEvent.click(screen.getByRole("button", { name: "Next card" }));
  await screen.findByRole("alert");
  expect(screen.getByText("First question")).toBeInTheDocument();
  expect(screen.queryByText("Second question")).toBeNull();
});
it("opens Quiz and Exam from saved content without generation", async () => {
  mocks.materials.mockResolvedValue([record]);
  mocks.quizzes.mockResolvedValue([{ ...createSampleMcqVersion(), id: "real-saved-quiz" }]);
  mocks.start.mockResolvedValue({ id: "session" });
  render(<SavedStudyLibrary />);
  await screen.findByRole("button", { name: "Open Quiz" });
  fireEvent.click(screen.getByRole("button", { name: "Open Quiz" }));
  await waitFor(() => expect(mocks.start.mock.calls[0]?.[1]).toBe("practice"));
  await waitFor(() => expect(screen.getByRole("button", { name: "Open Exam" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Open Exam" }));
  await waitFor(() => expect(mocks.start.mock.calls[1]?.[1]).toBe("test"));
});
it("renders reviewer sections, terms and comparisons with evidence", () => {
  const input = { ...request, format: "reviewer" as const };
  const reviewer = validateGeneratedStudy(
    {
      format: "reviewer",
      sections: [
        { heading: "Summary", points: [{ text: "Recall retrieves information.", sources }] },
      ],
      terms: [{ term: "Recall", definition: "Retrieval", sources }],
      comparisons: [
        {
          heading: "Comparison",
          rows: [
            { label: "First", detail: "First detail", sources },
            { label: "Second", detail: "Second detail", sources },
          ],
        },
      ],
      excluded: [],
    },
    input,
    { id: "notes", title: "Reviewer notes", createdAt: 1 },
  );
  render(
    <StudyMaterialView record={{ ...record, id: "notes", request: input, material: reviewer }} />,
  );
  expect(screen.getByRole("heading", { name: "Summary" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Key terms" })).toBeInTheDocument();
  expect(screen.getByRole("table", { name: "Comparison" })).toBeInTheDocument();
});
