import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import {
  initialStudyFlow,
  studyFlowReducer as reduce,
  canContinueStudy,
  shouldWarnBeforeLeavingStudy,
} from "@/domain/study-flow";
import type { SourceRevision } from "@/domain/study-source";
import { StudyFlowFrame } from "@/features/new-study/StudyFlowFrame";
const source: SourceRevision = {
  id: "revision",
  sourceId: "source",
  kind: "text",
  title: "Notes",
  createdAt: 1,
  contentHash: "a".repeat(64),
  segments: [
    { id: "p1", label: "Paragraph 1", text: "First paragraph." },
    { id: "p2", label: "Paragraph 2", text: "Second paragraph." },
  ],
};
function saved() {
  return reduce(reduce(initialStudyFlow, { type: "begin", operation: "saving" }), {
    type: "source-saved",
    source,
    selected: ["p1", "p2"],
  });
}
afterEach(cleanup);
it("cannot advance until saving succeeds and requires a deliberate mode choice", () => {
  let state = reduce(initialStudyFlow, { type: "source-edited" });
  expect(shouldWarnBeforeLeavingStudy(state)).toBe(true);
  expect(canContinueStudy(state)).toBe(false);
  state = reduce(state, { type: "begin", operation: "saving" });
  expect(reduce(state, { type: "continue" })).toBe(state);
  state = reduce(state, { type: "settled" }); // failed save retains dirty state
  expect(state.dirty).toBe(true);
  state = reduce(saved(), { type: "continue" });
  expect(state.step).toBe(1);
  expect(canContinueStudy(state)).toBe(false);
  expect(reduce(initialStudyFlow, { type: "source-saved", source, selected: ["p1"] })).toBe(
    initialStudyFlow,
  );
});
it.each(["flashcards", "quiz", "exam", "reviewer"] as const)(
  "preserves %s and source selection through Back while clearing consent on edits",
  (choice) => {
    let state = reduce(saved(), { type: "select", selected: ["p2"] });
    state = reduce(reduce(state, { type: "continue" }), { type: "choose", choice });
    state = reduce(reduce(state, { type: "continue" }), { type: "consent", consent: true });
    expect(state.step).toBe(2);
    state = reduce(reduce(state, { type: "back" }), { type: "back" });
    expect(state.choice).toBe(choice);
    expect(state.selected).toEqual(["p2"]);
    expect(state.source).toBe(source);
    state = reduce(state, { type: "select", selected: ["p1"] });
    expect(state.consent).toBe(false);
    expect(reduce(state, { type: "source-edited" }).dirty).toBe(true);
  },
);
it("rejects invalid selection and prevents navigation during an active request", () => {
  const state = saved();
  expect(reduce(state, { type: "select", selected: ["invented"] })).toBe(state);
  expect(reduce(state, { type: "select", selected: ["p1", "p1"] })).toBe(state);
  expect(canContinueStudy(reduce(state, { type: "select", selected: [] }))).toBe(false);
  let review = reduce(
    reduce(reduce(state, { type: "continue" }), { type: "choose", choice: "quiz" }),
    { type: "continue" },
  );
  expect(reduce(review, { type: "begin", operation: "generating" })).toBe(review);
  review = reduce(reduce(review, { type: "consent", consent: true }), {
    type: "begin",
    operation: "generating",
  });
  expect(shouldWarnBeforeLeavingStudy(review)).toBe(true);
  expect(reduce(review, { type: "back" })).toBe(review);
  expect(reduce(review, { type: "choose", choice: "exam" })).toBe(review);
  expect(reduce(review, { type: "settled" }).operation).toBeNull();
});
it("moves focus to the new heading and disables navigation while busy", () => {
  const props = { busy: false, canContinue: true, onBack: vi.fn(), onContinue: vi.fn() };
  const view = render(
    <StudyFlowFrame {...props} step={0}>
      <p>Add screen</p>
    </StudyFlowFrame>,
  );
  expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
  view.rerender(
    <StudyFlowFrame {...props} step={1} busy>
      <p>Mode screen</p>
    </StudyFlowFrame>,
  );
  expect(screen.getByRole("heading", { name: "Choose study mode" })).toHaveFocus();
  expect(screen.queryByText("Add screen")).toBeNull();
  expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  view.rerender(
    <StudyFlowFrame {...props} step={2}>
      <p>Review screen</p>
    </StudyFlowFrame>,
  );
  expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
});
