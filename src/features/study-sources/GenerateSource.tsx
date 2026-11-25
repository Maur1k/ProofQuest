import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useBlocker } from "@tanstack/react-router";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useStore } from "@/store/store";
import {
  sourceRequestSchema,
  sourceMaterialSchema,
  SOURCE_CONTRACT,
  SOURCE_CONSENT,
  type SourceMaterial,
  type SourceRequest,
} from "@/domain/source-material";
import { selectSource, type SourceRevision } from "@/domain/study-source";
import { choiceFormat, type StudyChoice } from "@/domain/study-choice";
import { availabilitySchema } from "@/features/generation/client";
import { restoreSourceRequest, sourceRecoverySchema } from "./source-recovery";

export function GenerateSource({
  source,
  selected,
  choice,
  saved,
  onBusyChange,
}: {
  source: SourceRevision;
  selected: string[];
  choice: StudyChoice;
  saved: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const { saveSourceMaterial, startSavedQuiz } = useStore(),
    navigate = useNavigate();
  const [availability, setAvailability] = useState<z.infer<typeof availabilitySchema> | null>(null),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const lock = useRef(false),
    abort = useRef<AbortController | null>(null),
    mounted = useRef(true);
  const current = useRef<{
    id: string;
    started: number;
    input: SourceRequest;
    choice: StudyChoice;
    material?: SourceMaterial;
  } | null>(null);
  const key = `proofquest:source-generation:${source.id}`;
  const selectionKey = JSON.stringify([source.id, selected, choice]);
  const blocker = useBlocker({
    shouldBlockFn: () => lock.current,
    enableBeforeUnload: busy,
    withResolver: true,
  });
  useEffect(() => {
    onBusyChange(busy);
    return () => onBusyChange(false);
  }, [busy, onBusyChange]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      abort.current?.abort();
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/generation/config", { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error();
        return availabilitySchema.parse(await r.json());
      })
      .then(
        (a) => {
          if (!controller.signal.aborted) setAvailability(a);
        },
        () => {
          if (!controller.signal.aborted) setAvailability(null);
        },
      );
    return () => controller.abort();
  }, [refresh]);
  useEffect(() => {
    setConsent(false);
    setError("");
    current.current = null;
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return;
      const input = sourceRequestSchema.parse({
        contract: SOURCE_CONTRACT,
        source: selectSource(source, selected),
        format: choiceFormat(choice),
      });
      current.current = restoreSourceRequest(raw, input);
      setError(
        "An unfinished request is available. Review this exact selection and consent again to check its status without starting a new request.",
      );
    } catch {
      setError(
        "A previous request belongs to different coverage or has expired. Restore its selection to retry, or explicitly start a new request.",
      );
    }
  }, [selectionKey, key, source, selected, choice]);
  async function generate() {
    if (lock.current || !saved || source.kind === "sample") return;
    if (
      !current.current?.material &&
      (!consent ||
        !availability?.enabled ||
        availability.sourceContract !== SOURCE_CONTRACT ||
        !availability.allowedFormats?.includes(choiceFormat(choice)))
    )
      return;
    lock.current = true;
    setBusy(true);
    setError("");
    abort.current = new AbortController();
    try {
      const input = sourceRequestSchema.parse({
        contract: SOURCE_CONTRACT,
        source: selectSource(source, selected),
        format: choiceFormat(choice),
      });
      const previous = sessionStorage.getItem(key);
      if (!current.current && previous) current.current = restoreSourceRequest(previous, input);
      if (!current.current)
        current.current = { id: crypto.randomUUID(), started: Date.now(), input, choice };
      const request = current.current;
      if (
        JSON.stringify(request.input) !== JSON.stringify(input) ||
        (!request.material && Date.now() - request.started >= 86400000)
      )
        throw new Error("Request selection changed or expired. Start a new request explicitly.");
      if (!request.material) {
        {
          if (
            new TextEncoder().encode(JSON.stringify(input)).byteLength > availability!.maxInputBytes
          )
            throw new Error("Select fewer paragraphs or pages. Nothing was sent or truncated.");
          sessionStorage.setItem(key, JSON.stringify(sourceRecoverySchema.parse(request)));
          const response = await fetch("/api/source-generation", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "idempotency-key": request.id,
              "x-generation-consent": SOURCE_CONSENT,
            },
            body: JSON.stringify(input),
            signal: abort.current.signal,
          });
          const raw: unknown = await response.json();
          if (!response.ok) {
            const code = z.object({ code: z.string() }).safeParse(raw);
            throw new Error(
              code.success
                ? `Generation ${code.data.code}. Check request status to recover the same request; allowance may have been used.`
                : "Generation unavailable.",
            );
          }
          const material = z
            .object({ material: sourceMaterialSchema })
            .strict()
            .parse(raw).material;
          if (
            JSON.stringify(material.request) !== JSON.stringify(input) ||
            material.id !== `source-generated-${request.id}`
          )
            throw new Error("Returned material does not match this source.");
          request.material = material;
        }
      }
      const material = await saveSourceMaterial(request.material);
      sessionStorage.removeItem(key);
      if (!mounted.current) return;
      setRefresh((n) => n + 1);
      setConsent(false);
      if (choice === "quiz" || choice === "exam") {
        const session = await startSavedQuiz(material.id, choice === "quiz" ? "practice" : "test");
        lock.current = false;
        await navigate({
          to: choice === "quiz" ? "/quiz-practice/$sessionId" : "/quiz-test/$sessionId",
          params: { sessionId: session.id },
        });
      } else {
        lock.current = false;
        await navigate({ to: "/materials", search: { id: material.id } });
      }
      current.current = null;
    } catch (e) {
      if (mounted.current)
        setError(
          e instanceof Error && !(e instanceof z.ZodError)
            ? e.message
            : "The request or result failed validation. Nothing was saved; check your selection.",
        );
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  const enabled =
    availability?.enabled &&
    availability.sourceContract === SOURCE_CONTRACT &&
    availability.allowedFormats?.includes(choiceFormat(choice));
  let selectionError = "";
  try {
    sourceRequestSchema.parse({
      contract: SOURCE_CONTRACT,
      source: selectSource(source, selected),
      format: choiceFormat(choice),
    });
  } catch {
    selectionError =
      "Select 1–10 readable pages or paragraphs with at least 40 non-space characters. Go Back to adjust the selection; nothing is sent or truncated.";
  }
  return (
    <div className="space-y-3">
      {!saved && <p>Save this source before creating study material.</p>}
      <details>
        <summary className="min-h-11 cursor-pointer py-2">AI provider, privacy and usage</summary>
        <p className="text-sm">
          Only selected text and its references are sent through this server to{" "}
          {availability?.provider || "the configured AI provider"}. The original PDF stays local.{" "}
          {availability?.retention ||
            "Provider retention details are unavailable while generation is offline."}
        </p>
        <p className="text-sm">
          Up to {availability?.guestDailyLimit ?? 3} requests per guest daily, subject to shared
          availability. Failed requests may use allowance. AI output can be wrong; verify it against
          the source.
        </p>
      </details>
      {!enabled && (
        <div role="status">
          <p>AI generation is currently unavailable. Your material is saved in Library.</p>
          <Link
            to="/library"
            search={{}}
            className="inline-flex min-h-11 items-center text-primary underline"
          >
            Open Library
          </Link>
        </div>
      )}
      {enabled && (
        <label className="flex min-h-11 items-start gap-3">
          <input
            type="checkbox"
            checked={consent}
            disabled={busy}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            I have permission to share this text and consent to sending only the selected segments.
          </span>
        </label>
      )}
      {selectionError && <p role="alert">{selectionError}</p>}
      <div className="flex flex-wrap gap-3">
        {!current.current && !error && (
          <Button
            disabled={busy || !saved || !enabled || !consent || !!selectionError}
            onClick={() => void generate()}
          >
            Generate selected format
          </Button>
        )}
        {error && current.current?.material && (
          <Button disabled={busy} onClick={() => void generate()}>
            Retry saving
          </Button>
        )}
        {error && current.current && !current.current.material && (
          <Button
            disabled={busy || !enabled || !consent || !!selectionError}
            onClick={() => void generate()}
          >
            Check request status
          </Button>
        )}
        {error && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => {
              try {
                sessionStorage.removeItem(key);
                current.current = null;
                setConsent(false);
                setError("");
              } catch {
                setError("Browser request storage is unavailable. Nothing was sent.");
              }
            }}
          >
            Start a new request
          </Button>
        )}
        {busy && <p role="status">Creating / saving study material…</p>}
      </div>
      {error && <p role="alert">{error}</p>}

      <ConfirmDialog
        open={blocker.status === "blocked"}
        onOpenChange={(open) => {
          if (!open) blocker.reset?.();
        }}
        title="Generation is in progress"
        description="Leaving may interrupt local saving. Stay here to retain the result; a submitted provider request may still use allowance."
        confirmLabel="Stay here"
        onConfirm={() => blocker.reset?.()}
      />
    </div>
  );
}
