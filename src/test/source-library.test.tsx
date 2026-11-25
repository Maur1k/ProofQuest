import { afterEach, it, expect, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { SourceLibrary } from "@/features/study-sources/SourceLibrary";
const list = vi.hoisted(() => vi.fn());
vi.mock("@/store/store", () => ({
  useStore: () => ({ ready: true, persistence: "durable", listSourceData: list }),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
}));
afterEach(cleanup);
it("offers saved real sources without a competing editor or sample entry point", async () => {
  list.mockResolvedValue({
    sources: [
      { id: "real", title: "Biology", kind: "text", currentRevisionId: "r" },
      { id: "sample", title: "Hidden sample", kind: "sample" },
    ],
    revisions: [],
  });
  render(<SourceLibrary />);
  await screen.findByText("Biology");
  expect(screen.queryByText("Hidden sample")).toBeNull();
  expect(screen.queryByRole("textbox")).toBeNull();
  expect(screen.getByRole("link", { name: "Choose study mode" })).toBeInTheDocument();
});
