import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { webcrypto } from "node:crypto";
import { GenerateSource } from "@/features/study-sources/GenerateSource";
import { textSource, WATER_SAMPLE } from "@/features/study-sources/adapters";
import { SOURCE_CONTRACT } from "@/domain/source-material";
const mocks = vi.hoisted(() => ({ save: vi.fn(), start: vi.fn(), navigate: vi.fn() }));
vi.mock("@/store/store", () => ({
  useStore: () => ({ saveSourceMaterial: mocks.save, startSavedQuiz: mocks.start }),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useNavigate: () => mocks.navigate,
  useBlocker: () => ({}),
}));
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it("requires fresh consent, retries the same request, and explicitly resets its identity", async () => {
  vi.stubGlobal("crypto", webcrypto);
  const source = await textSource("Water", WATER_SAMPLE.text);
  const network = vi.fn(async (_url: unknown, init?: RequestInit) =>
    init?.method === "POST"
      ? { ok: false, json: async () => ({ code: "invalid-output" }) }
      : {
          ok: true,
          json: async () => ({
            enabled: true,
            sourceContract: SOURCE_CONTRACT,
            allowedFormats: ["quiz"],
            provider: "Test",
            retention: "",
            maxInputBytes: 3500,
            guestDailyLimit: 3,
          }),
        },
  );
  vi.stubGlobal("fetch", network);
  const props = {
    source,
    selected: source.segments.map((s) => s.id),
    choice: "quiz" as const,
    saved: true,
    onBusyChange: vi.fn(),
  };
  const view = render(<GenerateSource {...props} />);
  const consent = await screen.findByRole("checkbox");
  expect(screen.getByRole("button", { name: "Generate selected format" })).toBeDisabled();
  fireEvent.click(consent);
  fireEvent.click(screen.getByRole("button", { name: "Generate selected format" }));
  await screen.findByRole("alert");
  const posts = () => network.mock.calls.filter((c) => c[1]?.method === "POST");
  const first = posts()[0]![1]!;
  fireEvent.click(screen.getByRole("button", { name: "Check request status" }));
  await waitFor(() => expect(posts()).toHaveLength(2));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Start a new request" })).toBeEnabled(),
  );
  expect(posts()[1]![1]!.headers).toEqual(first.headers);
  fireEvent.click(screen.getByRole("button", { name: "Start a new request" }));
  expect(consent).not.toBeChecked();
  fireEvent.click(consent);
  fireEvent.click(screen.getByRole("button", { name: "Generate selected format" }));
  await waitFor(() => expect(posts()).toHaveLength(3));
  expect(posts()[2]![1]!.headers).not.toEqual(first.headers);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Start a new request" })).toBeEnabled(),
  );
  view.rerender(<GenerateSource {...props} selected={[source.segments[0]!.id]} />);
  expect(consent).not.toBeChecked();
  expect(mocks.save).not.toHaveBeenCalled();
});

it("retries a failed material save without another AI request", async () => {
  vi.stubGlobal("crypto", webcrypto);
  const source = await textSource(
    "Biology",
    "Plants absorb sunlight to make food. Water supports plant growth.",
  );
  const network = vi.fn(async (_url: unknown, init?: RequestInit) => {
    if (!init?.method)
      return {
        ok: true,
        json: async () => ({
          enabled: true,
          sourceContract: SOURCE_CONTRACT,
          allowedFormats: ["flashcards"],
          provider: "Test",
          retention: "",
          maxInputBytes: 3500,
          guestDailyLimit: 3,
        }),
      };
    const input = JSON.parse(init.body as string);
    const id = (init.headers as Record<string, string>)["idempotency-key"];
    return {
      ok: true,
      json: async () => ({
        material: {
          contract: SOURCE_CONTRACT,
          id: `source-generated-${id}`,
          title: "Biology cards",
          createdAt: 1,
          request: input,
          generation: {
            provider: "groq",
            model: "test",
            promptVersion: "source-evidence-v2",
            validationVersion: "single-answer-v1",
            reviewStatus: "structural-pass",
          },
          output: {
            format: "flashcards",
            cards: [{ front: "What supports plant growth?", evidenceId: "paragraph-1:s2" }],
            excluded: [],
          },
        },
      }),
    };
  });
  vi.stubGlobal("fetch", network);
  mocks.save
    .mockRejectedValueOnce(new Error("quota"))
    .mockImplementationOnce(async (value) => value);
  render(
    <GenerateSource
      source={source}
      selected={source.segments.map((s) => s.id)}
      choice="flashcards"
      saved
      onBusyChange={vi.fn()}
    />,
  );
  fireEvent.click(await screen.findByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Generate selected format" }));
  await screen.findByRole("button", { name: "Retry saving" });
  expect(mocks.navigate).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Retry saving" }));
  await waitFor(() => expect(mocks.navigate).toHaveBeenCalled());
  expect(network.mock.calls.filter((c) => c[1]?.method === "POST")).toHaveLength(1);
  expect(mocks.save).toHaveBeenCalledTimes(2);
});
it("shows expired recovery without sending or automatically starting another request", async () => {
  vi.stubGlobal("crypto", webcrypto);
  const source = await textSource(
    "Biology",
    "Plants absorb sunlight to make food. Water supports plant growth.",
  );
  sessionStorage.setItem(
    `proofquest:source-generation:${source.id}`,
    JSON.stringify({
      id: crypto.randomUUID(),
      started: Date.now() - 86400001,
      choice: "quiz",
      input: { contract: SOURCE_CONTRACT, source, format: "quiz" },
    }),
  );
  const network = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      enabled: false,
      provider: "",
      retention: "",
      maxInputBytes: 3500,
      guestDailyLimit: 3,
    }),
  });
  vi.stubGlobal("fetch", network);
  render(
    <GenerateSource
      source={source}
      selected={source.segments.map((s) => s.id)}
      choice="quiz"
      saved
      onBusyChange={vi.fn()}
    />,
  );
  await screen.findByText(/previous request belongs to different coverage or has expired/);
  expect(screen.getByRole("button", { name: "Start a new request" })).toBeEnabled();
  expect(screen.queryByRole("button", { name: "Check request status" })).toBeNull();
  expect(network.mock.calls.filter((c) => c[1]?.method === "POST")).toHaveLength(0);
});
