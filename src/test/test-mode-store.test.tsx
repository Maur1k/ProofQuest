import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import { StoreProvider, useStore } from "@/store/store";
import { presentMcq } from "@/domain/quiz-presentation";
import { RevisionConflict, type QuizSession } from "@/domain/quiz-session";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage.clear();
});
async function openStore() {
  const hook = renderHook(() => useStore(), { wrapper: StoreProvider });
  await waitFor(() => expect(hook.result.current.persistence).toBe("durable"));
  return hook;
}
async function run<T>(work: () => Promise<T>): Promise<T> {
  let value!: T;
  await act(async () => {
    value = await work();
  });
  return value;
}
it("starts independent Test and Practice sessions and resumes each without duplicates", async () => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  const { result } = await openStore();
  const practice = await run(() => result.current.startSamplePractice());
  const test = await run(() => result.current.startSampleTest());
  expect(test.id).not.toBe(practice.id);
  expect(test.mode).toBe("test");
  expect(await run(() => result.current.startSampleTest())).toEqual(test);
  expect(await run(() => result.current.startSamplePractice())).toEqual(practice);
});
it("persists changed and cleared Test choices across provider remounts without revealing feedback", async () => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  const first = await openStore();
  let test = await run(() => first.result.current.startSampleTest());
  test = await run(() => first.result.current.saveTestChoice(test, "recall", "a"));
  test = await run(() => first.result.current.saveTestChoice(test, "recall", "b"));
  expect(test.answers["recall"]).toMatchObject({ status: "draft", correct: null });
  first.unmount();
  const second = await openStore();
  const restored = await run(() => second.result.current.loadQuizSession(test.id));
  expect(restored).toEqual(test);
  expect(presentMcq(restored!, "recall")).toMatchObject({
    selectedOptionId: "b",
    editable: true,
    feedback: null,
  });
  const cleared = await run(() => second.result.current.saveTestChoice(restored!, "recall", null));
  second.unmount();
  const third = await openStore();
  expect(await run(() => third.result.current.startSampleTest())).toEqual(cleared);
  expect(presentMcq(cleared, "recall")).toMatchObject({ selectedOptionId: null, feedback: null });
  expect(cleared.completedAt).toBeNull();
  expect(cleared.result).toBeNull();
});
it("rejects stale drafts, invalid options and Practice-mode edits without replacing saved answers", async () => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  const { result } = await openStore();
  const initial = await run(() => result.current.startSampleTest());
  const saved = await run(() => result.current.saveTestChoice(initial, "recall", "a"));
  await act(async () => {
    await expect(result.current.saveTestChoice(initial, "recall", "b")).rejects.toBeInstanceOf(
      RevisionConflict,
    );
    await expect(result.current.saveTestChoice(saved, "recall", "missing")).rejects.toThrow();
  });
  expect(await run(() => result.current.loadQuizSession(saved.id))).toEqual(saved);
  const practice = await run(() => result.current.startSamplePractice());
  await act(async () => {
    await expect(result.current.saveTestChoice(practice, "recall", "a")).rejects.toThrow(
      "Test is not editable",
    );
  });
  expect(await run(() => result.current.loadQuizSession(practice.id))).toEqual(practice);
  expect(result.current.busy).toBe(false);
});
it("rejects overlapping starts and prevents durable Test writes in temporary mode", async () => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  const { result } = await openStore();
  let test!: QuizSession;
  await act(async () => {
    const pending = result.current.startSampleTest();
    await expect(result.current.startSampleTest()).rejects.toThrow("idle");
    test = await pending;
  });
  act(() => result.current.useTemporarySession());
  await act(async () => {
    await expect(result.current.startSampleTest()).rejects.toThrow();
    await expect(result.current.saveTestChoice(test, "recall", "a")).rejects.toThrow();
  });
  expect(result.current.busy).toBe(false);
});

it("finishes through the store, reopens history and safely starts a separate retry", async () => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  const { result } = await openStore();
  let session = await run(() => result.current.startSampleTest());
  session = await run(() => result.current.saveTestChoice(session, "recall", "a"));
  const done = await run(() => result.current.finishQuiz(session));
  expect(done.result?.percentage).toBe(20);
  expect(await run(() => result.current.finishQuiz(session))).toEqual(done);
  expect(await run(() => result.current.listQuizSessions())).toEqual([done]);
  const next = await run(() => result.current.retryQuiz(done.id));
  expect(next.id).not.toBe(done.id);
  expect(next.answers).toEqual({});
  expect(await run(() => result.current.retryQuiz(done.id))).toEqual(next);
  expect(await run(() => result.current.loadQuizSession(done.id))).toEqual(done);
  expect(await run(() => result.current.getSourceDocument("missing"))).toBeNull();
});
