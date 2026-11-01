import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { StoreProvider, useStore } from "@/store/store";
import { STORAGE_KEY } from "@/domain/storage";
import { createSampleQuests } from "@/data/sample-quests";
import { openDatabase } from "@/data/indexed-db";
import { ProofQuestRepository } from "@/data/repository";
import type { Quest } from "@/domain/types";
import { useState } from "react";

function Harness() {
  const store = useStore();
  const [result, setResult] = useState("idle");
  const [original, setOriginal] = useState<Quest | null>(null);
  return (
    <>
      <p data-testid="mode">{store.ready ? store.persistence : "loading"}</p>
      <p data-testid="count">{store.data.quests.length}</p>
      <p data-testid="result">{result}</p>
      <p>{store.warning}</p>
      <button
        onClick={() =>
          void store
            .createQuest({ ...createSampleQuests()[0]!, title: "Persisted from test" })
            .then((id) => setResult(id ? "success" : "failed"))
        }
      >
        Create
      </button>
      <button onClick={store.useTemporarySession}>Temporary</button>
      <button onClick={() => setOriginal(structuredClone(store.data.quests[0]!))}>
        Open editor
      </button>
      <button
        onClick={() => {
          if (original)
            void store
              .updateQuest(original.id, { ...original, title: "Stale edited title" }, original)
              .then((ok) => setResult(ok ? "success" : "failed"));
        }}
      >
        Save old draft
      </button>
    </>
  );
}

beforeEach(() => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  window.localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
describe("durable app store", () => {
  it("retains the v1 source, persists a change and reloads the same library", async () => {
    const raw = JSON.stringify({ version: 1, quests: [], attempts: [] });
    window.localStorage.setItem(STORAGE_KEY, raw);
    const first = render(
      <StoreProvider>
        <Harness />
      </StoreProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("mode")).toHaveTextContent("durable"));
    fireEvent.click(screen.getByText("Create"));
    await waitFor(() => expect(screen.getByTestId("result")).toHaveTextContent("success"));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(raw);
    first.unmount();
    render(
      <StoreProvider>
        <Harness />
      </StoreProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("mode")).toHaveTextContent("durable"));
    expect(screen.getByTestId("count")).toHaveTextContent("1");
  });
  it("does not report success or update the library on a failed write", async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, quests: [], attempts: [] }),
    );
    render(
      <StoreProvider>
        <Harness />
      </StoreProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("mode")).toHaveTextContent("durable"));
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => {
      throw new DOMException("Quota", "QuotaExceededError");
    });
    fireEvent.click(screen.getByText("Create"));
    await waitFor(() => expect(screen.getByTestId("result")).toHaveTextContent("failed"));
    expect(screen.getByTestId("count")).toHaveTextContent("0");
    expect(screen.getByText(/Could not save this change/)).toBeVisible();
  });
  it("blocks mutations after migration failure until temporary mode is explicitly chosen", async () => {
    window.localStorage.setItem(STORAGE_KEY, "{broken");
    render(
      <StoreProvider>
        <Harness />
      </StoreProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("mode")).toHaveTextContent("blocked"));
    fireEvent.click(screen.getByText("Create"));
    await waitFor(() => expect(screen.getByTestId("result")).toHaveTextContent("failed"));
    fireEvent.click(screen.getByText("Temporary"));
    fireEvent.click(screen.getByText("Create"));
    await waitFor(() => expect(screen.getByTestId("result")).toHaveTextContent("success"));
    expect(screen.getByTestId("mode")).toHaveTextContent("temporary");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("{broken");
  });
  it("does not overwrite another tab's edit after focus refresh", async () => {
    const quest = createSampleQuests()[0]!;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, quests: [quest], attempts: [] }),
    );
    render(
      <StoreProvider>
        <Harness />
      </StoreProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("mode")).toHaveTextContent("durable"));
    fireEvent.click(screen.getByText("Open editor"));
    const other = new ProofQuestRepository(await openDatabase(window.indexedDB));
    await other.changeLegacy(
      { type: "updateQuest", quest: { ...quest, title: "Other tab edit" } },
      0,
    );
    fireEvent.focus(window);
    await waitFor(async () =>
      expect((await other.getLegacy())?.data.quests[0]?.title).toBe("Other tab edit"),
    );
    fireEvent.click(screen.getByText("Save old draft"));
    await waitFor(() => expect(screen.getByTestId("result")).toHaveTextContent("failed"));
    expect((await other.getLegacy())?.data.quests[0]?.title).toBe("Other tab edit");
    other.close();
  });
});
