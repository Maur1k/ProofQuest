import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Link, useBlocker } from "@tanstack/react-router";
import { useStore } from "@/store/store";
import { initialStudyFlow, studyFlowReducer } from "@/domain/study-flow";
import { STUDY_CHOICES } from "@/domain/study-choice";
import type { SourceRevision, StudySource } from "@/domain/study-source";
import { textSource, pdfSource } from "@/features/study-sources/adapters";
import { GenerateSource } from "@/features/study-sources/GenerateSource";
import { sourceRecoverySchema } from "@/features/study-sources/source-recovery";
import { documentStorage, type PreparedDocument } from "@/features/documents/service";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { StudyFlowFrame } from "./StudyFlowFrame";
import { PdfInput } from "./PdfInput";
import { CompatibleMaterials } from "./CompatibleMaterials";
export function NewStudy({
  sourceId,
  documentId,
  revisionId,
}: {
  sourceId?: string | undefined;
  documentId?: string | undefined;
  revisionId?: string | undefined;
}) {
  const { ready, persistence, listSourceData, saveSourceRevision } = useStore();
  const [state, dispatch] = useReducer(studyFlowReducer, initialStudyFlow);
  const [kind, setKind] = useState<"pdf" | "text">("pdf"),
    [title, setTitle] = useState(""),
    [text, setText] = useState("");
  const [prepared, setPrepared] = useState<PreparedDocument | null>(null),
    [working, setWorking] = useState(false),
    [generating, setGenerating] = useState(false);
  const [sourcesReady, setSourcesReady] = useState(false);
  const [sources, setSources] = useState<StudySource[]>([]),
    [revisions, setRevisions] = useState<SourceRevision[]>([]),
    [error, setError] = useState("");
  const [pendingKind, setPendingKind] = useState<"pdf" | "text" | null>(null),
    [inputKey, setInputKey] = useState(0);
  const [expected, setExpected] = useState<number | null>(null),
    [saveFailed, setSaveFailed] = useState(false);
  const lock = useRef(false),
    alive = useRef(true),
    loaded = useRef<string | null>(null);
  const busy = working || generating || state.operation !== null;
  const dirty = state.dirty;
  const blocker = useBlocker({
    shouldBlockFn: () => dirty || working || state.operation !== null,
    enableBeforeUnload: dirty || working || state.operation !== null,
    withResolver: true,
  });
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const available = ready && persistence === "durable";
  useEffect(() => {
    if (!available) return;
    let live = true;
    void listSourceData().then(
      (data) => {
        if (live) {
          setSources(data.sources.filter((s) => s.kind !== "sample"));
          setRevisions(data.revisions);
          setSourcesReady(true);
        }
      },
      () => {
        if (live) setError("Saved sources could not be loaded. Reload to retry.");
      },
    );
    return () => {
      live = false;
    };
  }, [available, listSourceData]);
  const openSource = useCallback(
    async (id: string) => {
      if (lock.current || busy || dirty) return;
      const head = sources.find((s) => s.id === id),
        revision = revisions.find(
          (r) => r.sourceId === id && r.id === (revisionId ?? head?.currentRevisionId),
        );
      if (!head || !revision) return;
      lock.current = true;
      setWorking(true);
      setError("");
      setExpected(head.revision);
      setKind(revision.kind === "pdf" ? "pdf" : "text");
      setTitle(revision.title);
      setText(revision.segments.map((s) => s.text).join("\n\n"));
      setPrepared(null);
      try {
        if (revision.kind === "pdf") {
          const bundle = await documentStorage((repo) =>
            repo.getDocumentBundle(revision.documentId),
          );
          if (alive.current) setPrepared(bundle ?? null);
          if (!bundle)
            setError(
              "Original PDF is unavailable. Retained extracted text is still available below.",
            );
        }
        if (!alive.current) return;
        dispatch({ type: "begin", operation: "saving" });
        dispatch({
          type: "source-saved",
          source: revision,
          selected: revision.segments.map((s) => s.id),
        });
        // Restore only the exact retained revision/selection. Never send a request on reload.
        const raw = sessionStorage.getItem(`proofquest:source-generation:${revision.id}`);
        if (raw) {
          const parsed = sourceRecoverySchema.safeParse(JSON.parse(raw));
          if (parsed.success && parsed.data.input.source.id === revision.id) {
            dispatch({
              type: "select",
              selected: parsed.data.input.source.segments.map((s) => s.id),
            });
            dispatch({ type: "continue" });
            dispatch({ type: "choose", choice: parsed.data.choice });
            dispatch({ type: "continue" });
          }
        }
      } catch {
        if (alive.current)
          setError(
            "Source or request recovery could not be loaded. Your saved records remain in Library.",
          );
      } finally {
        lock.current = false;
        if (alive.current) setWorking(false);
      }
    },
    [busy, dirty, revisions, sources, revisionId],
  );
  useEffect(() => {
    if (sourceId && sources.length && loaded.current !== `${sourceId}:${revisionId ?? "current"}`) {
      loaded.current = `${sourceId}:${revisionId ?? "current"}`;
      void openSource(sourceId);
    }
  }, [sourceId, sources, openSource, revisionId]); // opening is explicit via a saved-source link
  useEffect(() => {
    if (!documentId || sourceId || !available || !sourcesReady || loaded.current === documentId)
      return;
    loaded.current = documentId;
    const existing = sources.find((s) => s.id === `pdf:${documentId}`);
    if (existing) {
      void openSource(existing.id);
      return;
    }
    setWorking(true);
    void documentStorage((repo) => repo.getDocumentBundle(documentId))
      .then(
        (bundle) => {
          if (!alive.current) return;
          if (!bundle) {
            setError("Original PDF is unavailable. Open Library for retained study materials.");
            return;
          }
          setPrepared(bundle);
          setKind("pdf");
          dispatch({ type: "source-edited" });
        },
        () => {
          if (alive.current) setError("Could not load the original PDF. Reload to retry.");
        },
      )
      .finally(() => {
        if (alive.current) setWorking(false);
      });
  }, [documentId, sourceId, available, sourcesReady, sources, openSource]);
  function switchKind(next: "pdf" | "text") {
    setKind(next);
    setTitle("");
    setText("");
    setPrepared(null);
    setExpected(null);
    setError("");
    setSaveFailed(false);
    setInputKey((n) => n + 1);
    setPendingKind(null);
    dispatch({ type: "reset" });
  }
  function edit() {
    dispatch({ type: "source-edited" });
    setSaveFailed(false);
    setError("");
  }
  const setPdf = useCallback((value: PreparedDocument | null) => {
    setPrepared(value);
    dispatch({ type: "source-edited" });
  }, []);
  const editPdf = useCallback(() => dispatch({ type: "source-edited" }), []);
  async function next() {
    if (busy || lock.current || !available) return;
    if (state.step !== 0 || (state.source && !dirty)) {
      dispatch({ type: "continue" });
      return;
    }
    lock.current = true;
    dispatch({ type: "begin", operation: "saving" });
    setError("");
    setSaveFailed(false);
    try {
      let revision: SourceRevision;
      if (kind === "text")
        revision = await textSource(
          title,
          text,
          state.source?.kind === "text" ? state.source.sourceId : undefined,
        );
      else {
        if (!prepared) throw new Error("Extract readable PDF pages first.");
        revision = await pdfSource(prepared.document, prepared.pages);
        await documentStorage(async (repo) => {
          if (!(await repo.getDocument(prepared.document.id)))
            await repo.addDocument(prepared.document, prepared.pages);
        });
      }
      const isSame = state.source?.sourceId === revision.sourceId;
      const existing = sources.find((s) => s.id === revision.sourceId);
      const head = await saveSourceRevision(
        revision,
        isSame ? expected : (existing?.revision ?? null),
      );
      if (!alive.current) return;
      setExpected(head.revision);
      setSources((rows) => [head, ...rows.filter((s) => s.id !== head.id)]);
      setRevisions((rows) => [...rows, revision]);
      dispatch({
        type: "source-saved",
        source: revision,
        selected: revision.segments.map((s) => s.id),
      });
      dispatch({ type: "continue" });
    } catch (e) {
      if (alive.current) {
        setError(
          `Material was not fully saved. ${e instanceof Error ? e.message : "Browser storage may be unavailable."} Your draft is retained; retry saving.`,
        );
        setSaveFailed(true);
        dispatch({ type: "settled" });
      }
    } finally {
      lock.current = false;
    }
  }
  const canContinue =
    available &&
    (state.step === 0
      ? !dirty && state.source
        ? state.selected.length > 0
        : kind === "text"
          ? !!title.trim() && !!text.trim() && text.length <= 60000
          : !!prepared
      : !!state.choice);
  return (
    <StudyFlowFrame
      step={state.step}
      busy={busy}
      canContinue={canContinue}
      onBack={() => dispatch({ type: "back" })}
      onContinue={() => void next()}
    >
      {!available && (
        <p role="status">
          {ready
            ? "Browser storage is unavailable. Open Settings to recover storage."
            : "Opening browser storage…"}{" "}
          <Link to="/settings">Settings</Link>
        </p>
      )}
      <div hidden={state.step !== 0} className="space-y-4">
        <fieldset disabled={busy || !available} className="grid grid-cols-2 gap-3">
          <legend className="mb-2">Add material</legend>
          {(["pdf", "text"] as const).map((k) => (
            <label
              key={k}
              className="rounded-xl border border-border p-4 focus-within:ring-2 focus-within:ring-primary"
            >
              <input
                type="radio"
                name="input-kind"
                checked={kind === k}
                onChange={() => {
                  if (dirty) setPendingKind(k);
                  else switchKind(k);
                }}
              />
              <span className="ml-2">{k === "pdf" ? "Upload PDF" : "Paste text"}</span>
            </label>
          ))}
        </fieldset>
        <div hidden={kind !== "pdf"}>
          <PdfInput
            key={inputKey}
            value={prepared}
            onChange={setPdf}
            onDirtyChange={editPdf}
            onBusyChange={setWorking}
            disabled={!available || state.operation !== null || generating}
          />
        </div>
        {kind === "text" && (
          <fieldset disabled={busy || !available} className="space-y-3">
            <label className="block">
              Title
              <input
                className="mt-1 min-h-11 w-full rounded-xl border bg-background p-3"
                value={title}
                maxLength={200}
                onChange={(e) => {
                  setTitle(e.target.value);
                  edit();
                }}
              />
            </label>
            <label className="block">
              Source text
              <textarea
                className="mt-1 min-h-48 w-full rounded-xl border bg-background p-3"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  edit();
                }}
              />
            </label>
            <p className="text-sm">
              Separate paragraphs with a blank line. {text.length.toLocaleString()} / 60,000
              characters; up to 100 paragraphs. Over-limit text is rejected, never truncated.
            </p>
          </fieldset>
        )}
        {state.source && !dirty && (
          <fieldset disabled={busy} className="space-y-2">
            <legend>Selected pages or paragraphs</legend>
            {state.source.segments.map((s) => (
              <label key={s.id} className="flex min-h-11 items-start gap-3">
                <input
                  type="checkbox"
                  checked={state.selected.includes(s.id)}
                  onChange={(e) =>
                    dispatch({
                      type: "select",
                      selected: e.target.checked
                        ? [...state.selected, s.id]
                        : state.selected.filter((id) => id !== s.id),
                    })
                  }
                />
                <span>
                  {s.label}
                  <details>
                    <summary className="cursor-pointer py-2">Read extracted text</summary>
                    <p className="whitespace-pre-wrap break-words">{s.text}</p>
                  </details>
                </span>
              </label>
            ))}
          </fieldset>
        )}
        <p className="text-sm text-muted-foreground">
          Continue saves your source in this browser. No text is sent to AI at this step. Use
          Settings → Data &amp; backup to keep a separate copy.
        </p>
        {saveFailed && (
          <Button disabled={busy} onClick={() => void next()}>
            Retry saving
          </Button>
        )}
        {sources.length > 0 && (
          <details>
            <summary className="min-h-11 cursor-pointer py-2">Use a saved source</summary>
            {sources.map((s) => (
              <Button
                key={s.id}
                className="m-1 max-w-full whitespace-normal break-words"
                variant="outline"
                disabled={busy || dirty}
                onClick={() => void openSource(s.id)}
              >
                {s.title}
              </Button>
            ))}
          </details>
        )}
      </div>
      {state.step === 1 && state.source && (
        <div className="space-y-4">
          <p className="break-words">
            {state.source.title} · {state.selected.length} selected pages/paragraphs
          </p>
          <fieldset disabled={busy}>
            <legend className="mb-3">Choose how to study</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {STUDY_CHOICES.map((c) => (
                <label
                  key={c.id}
                  className={`flex min-h-28 items-start gap-3 rounded-xl border p-4 focus-within:ring-2 focus-within:ring-primary ${state.choice === c.id ? "border-primary bg-primary/10" : "border-border"}`}
                >
                  <input
                    type="radio"
                    name="study-choice"
                    checked={state.choice === c.id}
                    onChange={() => dispatch({ type: "choose", choice: c.id })}
                  />
                  <span>
                    <strong className="block">{c.label}</strong>
                    <span className="text-sm text-muted-foreground">{c.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          {state.choice && (
            <CompatibleMaterials
              source={state.source}
              selected={state.selected}
              choice={state.choice}
            />
          )}
        </div>
      )}
      {state.step === 2 && state.source && state.choice && (
        <div className="space-y-4">
          <p className="break-words font-semibold">
            {state.source.title} · {STUDY_CHOICES.find((c) => c.id === state.choice)?.label}
          </p>
          <p>
            {state.source.segments
              .filter((s) => state.selected.includes(s.id))
              .map((s) => s.label)
              .join(", ")}
          </p>
          <details>
            <summary className="min-h-11 cursor-pointer py-2">
              Review the exact selected text
            </summary>
            {state.source.segments
              .filter((s) => state.selected.includes(s.id))
              .map((s) => (
                <section key={s.id} className="my-3">
                  <h2 className="font-semibold">{s.label}</h2>
                  <p className="whitespace-pre-wrap break-words">{s.text}</p>
                </section>
              ))}
          </details>
          <p className="text-sm">
            Image-dependent content is unsupported. Check extracted text and AI answers against the
            original.
          </p>
          <CompatibleMaterials
            source={state.source}
            selected={state.selected}
            choice={state.choice}
          />
          <GenerateSource
            source={state.source}
            selected={state.selected}
            choice={state.choice}
            saved
            onBusyChange={setGenerating}
          />
        </div>
      )}
      {error && <p role="alert">{error}</p>}
      <ConfirmDialog
        open={pendingKind !== null}
        onOpenChange={(open) => {
          if (!open) setPendingKind(null);
        }}
        title="Discard unsaved material?"
        description="Switching input type will discard this unsaved draft. Saved Library records are kept."
        confirmLabel="Discard draft"
        cancelLabel="Keep working"
        onConfirm={() => {
          if (pendingKind) switchKind(pendingKind);
        }}
      />
      <ConfirmDialog
        open={blocker.status === "blocked"}
        onOpenChange={(open) => {
          if (!open) blocker.reset?.();
        }}
        title="Leave this study?"
        description="Unsaved text or extraction will be lost. An active save or request may still finish; check Library when you return."
        confirmLabel="Leave"
        cancelLabel="Keep working"
        onConfirm={() => blocker.proceed?.()}
      />
    </StudyFlowFrame>
  );
}
