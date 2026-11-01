import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QuestEditor } from "@/components/QuestEditor";
import { createSampleQuests } from "@/data/sample-quests";
const mocks = vi.hoisted(() => ({ navigate: vi.fn(), blocker: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
  useBlocker: (options: unknown) => {
    mocks.blocker(options);
    return {};
  },
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("keeps draft text and navigation guard when asynchronous save fails", async () => {
  const draft = createSampleQuests()[0]!;
  render(<QuestEditor initial={draft} heading="Create quest" onSave={async () => null} />);
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "My unsaved title" } });
  fireEvent.submit(screen.getByLabelText("Title").closest("form")!);
  await waitFor(() => expect(screen.getByText(/Your quest was not saved/)).toBeVisible());
  expect(screen.getByLabelText("Title")).toHaveValue("My unsaved title");
  expect(mocks.navigate).not.toHaveBeenCalled();
  expect(mocks.blocker.mock.lastCall?.[0].shouldBlockFn()).toBe(true);
});
