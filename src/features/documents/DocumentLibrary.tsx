import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Link, useBlocker } from "@tanstack/react-router";
import { useStore } from "@/store/store";
import type { DocumentRecord } from "@/data/records";
import { parseSelectedPages, PDF_INPUT_MESSAGES } from "@/domain/document-import";
import { inspectPdfSelection } from "./preflight";
import { PDF_DEVELOPMENT_LIMITS } from "./policy";
import { pdfFailure } from "./errors";
import {
  documentStorage,
  inspectDocument,
  prepareDocument,
  type PreparedDocument,
} from "./service";

export const documentButton =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-primary/50 px-4 py-2 text-sm font-semibold disabled:opacity-50";
export function DocumentLibrary() {
  const { ready, persistence } = useStore();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [count, setCount] = useState(0);
  const [selection, setSelection] = useState("");
  const [stage, setStage] = useState<
    "idle" | "opening" | "selecting" | "extracting" | "review" | "saving"
  >("idle");
  const [prepared, setPrepared] = useState<PreparedDocument | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const task = useRef<AbortController | null>(null);
  const saving = useRef(false);
  const mounted = useRef(false);
  const dirty = useRef(false);
  dirty.current = stage !== "idle";
  const blocker = useBlocker({
    shouldBlockFn: () => dirty.current,
    enableBeforeUnload: () => dirty.current,
    withResolver: true,
  });
  const available = ready && persistence === "durable";
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      task.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (!available) return;
    let active = true;
    void documentStorage((repo) => repo.listDocuments()).then(
      (rows) => {
        if (active) setDocuments(rows);
      },
      () => {
        if (active) setError("Saved PDFs could not be loaded. Reload to retry.");
      },
    );
    return () => {
      active = false;
    };
  }, [available]);
  const cancel = () => {
    task.current?.abort();
    setStage(file ? "selecting" : "idle");
    setMessage("Import cancelled. No document was saved.");
    setPrepared(null);
  };
  async function choose(files: File[]) {
    if (!available || saving.current) return;
    task.current?.abort();
    const controller = new AbortController();
    task.current = controller;
    setFile(null);
    setPrepared(null);
    setError("");
    setMessage("");
    setStage("opening");
    try {
      const check = await inspectPdfSelection(files, PDF_DEVELOPMENT_LIMITS, controller.signal);
      if (controller.signal.aborted) return;
      if (!check.ok) {
        setError(PDF_INPUT_MESSAGES[check.code]);
        setStage("idle");
        return;
      }
      const selected = files[0]!;
      const pages = await inspectDocument(selected, controller.signal);
      if (controller.signal.aborted) return;
      setFile(selected);
      setCount(pages);
      setSelection(pages <= PDF_DEVELOPMENT_LIMITS.maxSelectedPages ? `1-${pages}` : "");
      setStage("selecting");
    } catch (e) {
      if (!controller.signal.aborted) {
        setError(pdfFailure(e).message);
        setStage("idle");
      }
    }
  }
  async function extract() {
    if (!file) return;
    const parsed = parseSelectedPages(selection, count, PDF_DEVELOPMENT_LIMITS);
    if (!parsed.ok) {
      setError(PDF_INPUT_MESSAGES[parsed.code]);
      return;
    }
    task.current?.abort();
    const controller = new AbortController();
    task.current = controller;
    setError("");
    setMessage("");
    setProgress(0);
    setStage("extracting");
    try {
      const result = await prepareDocument(file, parsed.value, controller.signal, (done, total) => {
        if (!controller.signal.aborted) setProgress(done / total);
      });
      if (!controller.signal.aborted) {
        setPrepared(result);
        setStage("review");
      }
    } catch (e) {
      if (!controller.signal.aborted) {
        setError(pdfFailure(e).message);
        setStage("selecting");
      }
    }
  }
  async function save() {
    if (!prepared || saving.current || !available) return;
    saving.current = true;
    setStage("saving");
    setError("");
    try {
      await documentStorage((repo) => repo.addDocument(prepared.document, prepared.pages));
      if (mounted.current) {
        setDocuments((rows) => [prepared.document, ...rows]);
        setMessage("PDF saved in this browser. Open it below.");
        setPrepared(null);
        setFile(null);
        setStage("idle");
      }
    } catch {
      if (mounted.current) {
        setError(
          "PDF was not saved. Browser storage may be full or unavailable. Your extracted text is retained here; free space and retry.",
        );
        setStage("review");
      }
    } finally {
      saving.current = false;
    }
  }
  return (
    <div className="space-y-5 py-6">
      <ConfirmDialog
        open={blocker.status === "blocked"}
        onOpenChange={(open) => {
          if (!open && blocker.status === "blocked") blocker.reset();
        }}
        title="Leave PDF import?"
        description="Unsaved extraction will be lost. If a save is in progress, it may still finish; check the PDF library when you return."
        confirmLabel="Leave import"
        cancelLabel="Keep working"
        onConfirm={() => {
          if (blocker.status === "blocked") blocker.proceed();
        }}
      />

      <Link to="/" className={documentButton}>
        Back home
      </Link>
      <header>
        <h1 className="text-3xl font-bold">PDF library</h1>
        <p className="mt-2 text-muted-foreground">
          Choose a PDF, select pages, and read your material.
        </p>
      </header>
      <p className="text-sm text-muted-foreground">
        Your PDF stays in this browser. Nothing is sent to AI. Quiz generation is not available yet.
        Export a library backup from Home to keep a separate copy.
      </p>
      <p className="rounded-xl border border-border p-3 text-sm">
        Development limits: 5 MiB per PDF, up to 10 selected pages. Phone capacity is still awaiting
        validation. Scans and password-protected PDFs are not supported.
      </p>
      {!available ? (
        <p role="status">
          {ready
            ? "PDF saving requires browser storage. Return Home to resolve the storage warning."
            : "Opening browser storage…"}
        </p>
      ) : (
        <section
          className="space-y-4 rounded-2xl border border-border bg-card p-4"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void choose(Array.from(e.dataTransfer.files));
          }}
          aria-label="Import PDF"
        >
          <label htmlFor="pdf-file" className="block font-semibold">
            Choose PDF or drop one here
          </label>
          <input
            id="pdf-file"
            type="file"
            accept="application/pdf,.pdf"
            disabled={stage === "saving"}
            className="block w-full min-w-0 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:p-3 file:text-primary-foreground"
            onChange={(e) => {
              void choose(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
          {file && (
            <p className="break-words">
              {file.name} · {count} pages
            </p>
          )}
          {stage === "selecting" && (
            <>
              <label htmlFor="pdf-pages" className="block text-sm font-semibold">
                Pages to extract (for example 1-3, 5)
              </label>
              <input
                id="pdf-pages"
                value={selection}
                maxLength={4096}
                onChange={(e) => setSelection(e.target.value)}
                className="w-full rounded-xl border border-input bg-background p-3"
                aria-describedby="page-help"
              />
              <p id="page-help" className="text-sm text-muted-foreground">
                Choose up to 10 pages. Other pages remain in the original PDF, but their text will
                not be extracted.
              </p>
              <button className={documentButton} onClick={() => void extract()}>
                Extract selected pages
              </button>
            </>
          )}
          {(stage === "opening" || stage === "extracting") && (
            <div className="space-y-2">
              <p role="status">
                {stage === "opening"
                  ? "Opening PDF…"
                  : `Extracting selected pages: ${Math.round(progress * 100)}%`}
              </p>
              {stage === "extracting" && (
                <progress
                  className="w-full"
                  value={progress}
                  max={1}
                  aria-label="Extraction progress"
                />
              )}
              <button className={documentButton} onClick={cancel}>
                Cancel import
              </button>
            </div>
          )}
          {prepared && (
            <div className="space-y-3">
              <h2 className="font-semibold">Review extraction</h2>
              <p>
                {prepared.pages.length} of {count} pages extracted. Original PDF retained in full.
              </p>
              <p className="text-sm text-muted-foreground">
                Text order may differ from the page. Check formulas, columns and diagrams against
                the original before studying.
              </p>
              {prepared.pages.map((page) => (
                <details key={page.page} className="rounded-xl border border-border p-3">
                  <summary className="cursor-pointer">
                    Page {page.page} · {page.text.length} characters
                  </summary>
                  {page.warnings.map((w) => (
                    <p key={w} className="my-2 text-warning">
                      {w}
                    </p>
                  ))}
                  <p className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-sm">
                    {page.text || "No readable text."}
                  </p>
                </details>
              ))}
              <div className="flex flex-wrap gap-2">
                <button
                  className={documentButton}
                  disabled={stage === "saving"}
                  onClick={() => void save()}
                >
                  {stage === "saving" ? "Saving…" : "Save PDF to library"}
                </button>
                <button
                  className={documentButton}
                  disabled={stage === "saving"}
                  onClick={() => {
                    setPrepared(null);
                    setStage("selecting");
                  }}
                >
                  Change pages
                </button>
              </div>
            </div>
          )}
        </section>
      )}
      {error && (
        <p role="alert" className="rounded-xl border border-destructive p-3">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Saved PDFs</h2>
        {documents.length === 0 && <p className="text-muted-foreground">No saved PDFs yet.</p>}
        {documents.map((doc) => (
          <Link
            key={doc.id}
            to="/documents/$documentId"
            params={{ documentId: doc.id }}
            className="block rounded-xl border border-border bg-card p-4 hover:border-primary"
          >
            <span className="break-words font-semibold">{doc.name}</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              {doc.extractedPages?.length ?? doc.pageCount} extracted · {doc.pageCount} total pages
              · Open reader
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
