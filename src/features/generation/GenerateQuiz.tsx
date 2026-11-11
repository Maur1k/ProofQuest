import { STUDY_CHOICES, choiceFormat, choiceMode, type StudyChoice } from "@/domain/study-choice";
import {
  validateStudyRequest,
  type StudyRequest,
  type StudyMaterial,
} from "@/domain/study-material";
import { SavedStudyLibrary } from "@/features/study-materials/SavedStudyLibrary";
import { useEffect, useRef, useState } from "react";
import { useBlocker, useNavigate } from "@tanstack/react-router";
import type { DocumentRecord, PageRecord } from "@/data/records";
import { validateGenerationInput, type GenerationInput } from "@/domain/generation";
import type { QuizVersion } from "@/domain/quiz";
import type { GenerationAvailability } from "@/domain/generation-policy";
import { useStore } from "@/store/store";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  availabilitySchema,
  GenerationClientError,
  requestGeneratedQuiz,
  requestGeneratedStudy,
} from "./client";

export function GenerateQuiz({
  document,
  pages,
}: {
  document: DocumentRecord;
  pages: PageRecord[];
}) {
  const { commitGeneratedQuiz, saveStudyMaterial } = useStore();
  const [choice, setChoice] = useState<StudyChoice>("quiz");
  const navigate = useNavigate();
  const [availability, setAvailability] = useState<GenerationAvailability | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newRequired, setNewRequired] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const lock = useRef(false);
  const request = useRef<{
    id: string;
    input: GenerationInput;
    studyInput: StudyRequest;
    version?: QuizVersion;
    material?: StudyMaterial;
  } | null>(null);
  const mounted = useRef(true);
  const blocker = useBlocker({
    shouldBlockFn: () => lock.current,
    enableBeforeUnload: busy,
    withResolver: true,
  });
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    setAvailability(null);
    void fetch("/api/generation/config", { signal: abort.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return availabilitySchema.parse(await response.json());
      })
      .then((value) => {
        if (!abort.signal.aborted) setAvailability(value);
      })
      .catch(() => {
        if (!abort.signal.aborted)
          setAvailability({
            enabled: false,
            provider: "",
            retention: "",
            maxInputBytes: 1,
            guestDailyLimit: 0,
          });
      });
    return () => abort.abort();
  }, [refresh]);
  async function generate() {
    if (lock.current || !consent || !availability?.enabled || newRequired) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    controller.current = new AbortController();
    try {
      if (!request.current) {
        const input = validateGenerationInput({
          documentId: document.id,
          questionCount: 5,
          pages: pages
            .filter((page) => selected.includes(page.page))
            .map((page) => ({ page: page.page, text: page.text })),
        });
        if (new TextEncoder().encode(JSON.stringify(input)).byteLength > availability.maxInputBytes)
          throw new Error("Select fewer pages for this service.");
        request.current = {
          id: crypto.randomUUID(),
          input,
          studyInput: validateStudyRequest({
            documentId: input.documentId,
            pages: input.pages,
            format: choiceFormat(choice),
          }),
        };
      }
      const current = request.current;
      if (choice === "quiz" || choice === "exam") {
        if (!current.version)
          current.version = await requestGeneratedQuiz(
            current.input,
            current.id,
            controller.current.signal,
          );
        if (controller.current.signal.aborted || !mounted.current) return;
        const session = await commitGeneratedQuiz(
          current.input,
          document.checksum,
          current.version,
          choiceMode(choice),
        );
        if (!mounted.current) return;
        lock.current = false;
        setBusy(false);
        await navigate({
          to: choice === "quiz" ? "/quiz-practice/$sessionId" : "/quiz-test/$sessionId",
          params: { sessionId: session.id },
        });
      } else {
        if (!current.material)
          current.material = await requestGeneratedStudy(
            current.studyInput,
            current.id,
            controller.current.signal,
          );
        if (controller.current.signal.aborted || !mounted.current) return;
        const saved = await saveStudyMaterial({
          id: current.material.id,
          request: current.studyInput,
          checksum: document.checksum,
          material: current.material,
        });
        if (!mounted.current) return;
        lock.current = false;
        setBusy(false);
        await navigate({ to: "/materials", search: { id: saved.id } });
      }
    } catch (failure) {
      if (mounted.current) {
        setError(
          failure instanceof GenerationClientError
            ? failure.message
            : request.current?.version || request.current?.material
              ? "Study material could not be saved. Your result is kept in this tab; retry saving. The source PDF must still be unchanged."
              : "Select readable pages within the service limit, then retry.",
        );
        setNewRequired(
          failure instanceof GenerationClientError && ["failed", "conflict"].includes(failure.code),
        );
      }
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  function reset() {
    request.current = null;
    setError(null);
    setNewRequired(false);
    setConsent(false);
  }
  return (
    <section
      className="space-y-3 rounded-xl border border-primary/40 bg-card p-4"
      aria-labelledby="generation-title"
    >
      <h2 id="generation-title" className="text-lg font-semibold">
        Choose how to study this PDF
      </h2>
      <fieldset disabled={busy || request.current !== null}>
        <legend className="mb-2 text-sm">Study format</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {STUDY_CHOICES.map((item) => (
            <label
              key={item.id}
              className={`flex min-h-28 cursor-pointer items-start gap-3 rounded-xl border p-4 focus-within:ring-2 focus-within:ring-primary ${choice === item.id ? "border-primary bg-primary/10" : "border-border"}`}
            >
              <input
                type="radio"
                name="study-format"
                className="mt-1"
                value={item.id}
                checked={choice === item.id}
                onChange={() => {
                  setChoice(item.id);
                  setConsent(false);
                }}
              />
              <span>
                <span className="block font-semibold">{item.label}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{item.description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <p role="status" className="text-sm">
        {STUDY_CHOICES.find((item) => item.id === choice)?.description}
      </p>
      <p className="text-sm text-muted-foreground">
        Review the selected text against the original. Image-dependent questions and unsupported
        answers must be excluded; this text-only workflow cannot identify diagrams.
      </p>
      <fieldset disabled={busy || request.current !== null} className="space-y-2">
        <legend>Pages to send</legend>
        {pages.map((page) => (
          <label key={page.page} className="flex min-h-11 items-start gap-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={selected.includes(page.page)}
              onChange={(event) => {
                setSelected((value) =>
                  event.target.checked
                    ? [...value, page.page]
                    : value.filter((n) => n !== page.page),
                );
                setConsent(false);
              }}
            />
            <span>
              Page {page.page} · {page.text.length} characters
              {page.warnings.length > 0 ? " · extraction warnings" : ""}
            </span>
          </label>
        ))}
      </fieldset>
      <details>
        <summary className="cursor-pointer py-2">Review the exact selected text</summary>
        {pages
          .filter((page) => selected.includes(page.page))
          .map((page) => (
            <pre
              key={page.page}
              className="my-2 max-h-60 overflow-auto whitespace-pre-wrap break-words text-xs"
            >
              {page.text}
            </pre>
          ))}
      </details>
      {!availability ? (
        <p role="status">Checking generation availability…</p>
      ) : !availability.enabled ? (
        <>
          <p>
            AI generation is not configured on this host. Your PDF stays local; saved study
            materials remain available.
          </p>
          <Button variant="outline" onClick={() => setRefresh((n) => n + 1)}>
            Check availability
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm">
            Selected text and page numbers will be sent to {availability.provider} through this
            server. The PDF file stays in this browser. {availability.retention}
          </p>
          <p className="text-xs text-muted-foreground">
            Up to {availability.guestDailyLimit} requests per guest daily, subject to shared
            availability. Failed attempts can use allowance. AI questions can be wrong; verify
            explanations against the source.
          </p>
          <label className="flex min-h-11 items-start gap-3">
            <input
              type="checkbox"
              className="mt-1"
              checked={consent}
              disabled={busy}
              onChange={(event) => setConsent(event.target.checked)}
            />
            <span>I have permission to share this text and agree to send the selected pages.</span>
          </label>
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={busy || !consent || selected.length === 0 || newRequired}
              onClick={() => void generate()}
            >
              {busy
                ? "Generating / saving…"
                : request.current?.version || request.current?.material
                  ? "Retry saving material"
                  : request.current
                    ? "Retry same request"
                    : choice === "quiz" || choice === "exam"
                      ? "Generate five questions"
                      : choice === "flashcards"
                        ? "Generate flashcards"
                        : "Generate reviewer"}
            </Button>
            {busy ? (
              <Button
                variant="outline"
                onClick={() => {
                  controller.current?.abort();
                  setError(
                    "Cancelled locally. The provider may already have processed the request; retry the same request to check its result.",
                  );
                }}
              >
                Cancel generation
              </Button>
            ) : (
              request.current && (
                <Button variant="outline" onClick={reset}>
                  Start a new request
                </Button>
              )
            )}
          </div>
          {request.current && (
            <p className="text-xs text-muted-foreground">
              Retry keeps the same request ID in this tab to avoid another provider call. Reloading
              this page loses this ID; a new request uses another allowance.
            </p>
          )}
        </>
      )}
      <SavedStudyLibrary documentId={document.id} />
      {error && <p role="alert">{error}</p>}
      <ConfirmDialog
        open={blocker.status === "blocked"}
        onOpenChange={(open) => {
          if (!open) blocker.reset?.();
        }}
        title="Generation is in progress"
        description="Stay here to keep the request and any returned study material. You can cancel generation first."
        confirmLabel="Stay here"
        onConfirm={() => blocker.reset?.()}
      />
    </section>
  );
}
