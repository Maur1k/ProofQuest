import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { parseSelectedPages, PDF_INPUT_MESSAGES } from "@/domain/document-import";
import { inspectPdfSelection } from "@/features/documents/preflight";
import { PDF_DEVELOPMENT_LIMITS } from "@/features/documents/policy";
import {
  inspectDocument,
  prepareDocument,
  type PreparedDocument,
} from "@/features/documents/service";
import { pdfFailure } from "@/features/documents/errors";
import { PagePreview } from "@/features/documents/PagePreview";
export function PdfInput({
  value,
  onChange,
  onBusyChange,
  onDirtyChange,
  disabled,
}: {
  value: PreparedDocument | null;
  onChange: (value: PreparedDocument | null) => void;
  onBusyChange: (busy: boolean) => void;
  onDirtyChange: () => void;
  disabled: boolean;
}) {
  const [file, setFile] = useState<File | null>(null),
    [count, setCount] = useState(0),
    [selection, setSelection] = useState("");
  const [stage, setStage] = useState<"idle" | "opening" | "extracting">("idle"),
    [error, setError] = useState("");
  const [expanded, setExpanded] = useState<number[]>([]);
  const task = useRef<AbortController | null>(null),
    lock = useRef(false);
  useEffect(() => () => task.current?.abort(), []);
  const busy = stage !== "idle";
  async function run(files?: File[]) {
    if (disabled || lock.current) return;
    lock.current = true;
    onDirtyChange();
    setError("");
    onBusyChange(true);
    const controller = new AbortController();
    task.current = controller;
    try {
      if (files) {
        setStage("opening");
        setFile(null);
        onChange(null);
        const check = await inspectPdfSelection(files, PDF_DEVELOPMENT_LIMITS, controller.signal);
        if (!check.ok) throw new Error(PDF_INPUT_MESSAGES[check.code]);
        const chosen = files[0]!;
        const total = await inspectDocument(chosen, controller.signal);
        if (controller.signal.aborted) return;
        setFile(chosen);
        setCount(total);
        setSelection(total <= PDF_DEVELOPMENT_LIMITS.maxSelectedPages ? `1-${total}` : "");
      } else if (file) {
        const parsed = parseSelectedPages(selection, count, PDF_DEVELOPMENT_LIMITS);
        if (!parsed.ok) throw new Error(PDF_INPUT_MESSAGES[parsed.code]);
        setStage("extracting");
        const result = await prepareDocument(file, parsed.value, controller.signal, () => {});
        if (!controller.signal.aborted) onChange(result);
      }
    } catch (e) {
      if (!controller.signal.aborted)
        setError(e instanceof Error ? e.message : pdfFailure(e).message);
    } finally {
      if (!controller.signal.aborted) {
        setStage("idle");
        onBusyChange(false);
        lock.current = false;
      }
    }
  }
  return (
    <div
      className="space-y-4"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        void run(Array.from(e.dataTransfer.files));
      }}
    >
      <p className="text-sm text-muted-foreground">
        PDFs stay local. Up to 5 MiB and 10 selected pages; scans and password-protected files are
        unsupported.
      </p>
      <label className="block">
        Upload PDF
        <input
          aria-label="Choose PDF or drop one here"
          type="file"
          accept="application/pdf,.pdf"
          disabled={disabled || busy}
          className="mt-2 block w-full min-w-0 text-sm"
          onChange={(e) => {
            void run(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </label>
      {file && !value && (
        <div className="space-y-3">
          <p>
            {file.name} · {count} pages
          </p>
          <label className="block">
            Pages to extract (for example 1-3, 5)
            <input
              className="mt-2 w-full rounded-xl border bg-background p-3"
              value={selection}
              disabled={busy || disabled}
              onChange={(e) => setSelection(e.target.value)}
            />
          </label>
          <p className="text-sm">
            Choose up to 10 pages. No partial selection is made for oversized documents.
          </p>
          <Button disabled={busy || disabled} onClick={() => void run()}>
            Extract selected pages
          </Button>
        </div>
      )}
      {busy && (
        <div role="status">
          <p>{stage === "opening" ? "Opening PDF…" : "Extracting selected pages…"}</p>
          <Button
            variant="outline"
            onClick={() => {
              task.current?.abort();
              lock.current = false;
              setStage("idle");
              onBusyChange(false);
              setError("Import cancelled. Nothing was saved.");
            }}
          >
            Cancel import
          </Button>
        </div>
      )}
      {value && (
        <div className="space-y-3">
          <h2 className="font-semibold">Review extraction</h2>
          <p>
            {value.pages.length} of {value.document.pageCount} pages extracted. Check text order,
            columns, formulas and diagrams against the original.
          </p>
          {value.pages.some((page) => !page.text.trim()) && (
            <p role="status">
              Pages without readable text are retained in the original PDF but excluded from study
              generation.
            </p>
          )}
          {value.pages.map((page) => (
            <details
              key={`${value.document.id}:${page.page}`}
              className="rounded-xl border p-3"
              onToggle={(e) => {
                const open = e.currentTarget.open;
                setExpanded((rows) =>
                  open ? [...new Set([...rows, page.page])] : rows.filter((n) => n !== page.page),
                );
              }}
            >
              <summary className="min-h-11 cursor-pointer py-2">
                Page {page.page} · {page.text.length} characters
              </summary>
              <div className="grid min-w-0 gap-4 md:grid-cols-2">
                {expanded.includes(page.page) && (
                  <PagePreview document={value.document} page={page.page} />
                )}
                <div className="min-w-0">
                  <p className="whitespace-pre-wrap break-words">
                    {page.text || "No readable text; this page cannot be used for generation."}
                  </p>
                  {page.warnings.map((w) => (
                    <p key={w} className="text-warning">
                      {w}
                    </p>
                  ))}
                </div>
              </div>
            </details>
          ))}
          {file && (
            <Button
              variant="outline"
              disabled={disabled || busy}
              onClick={() => {
                onChange(null);
                onDirtyChange();
              }}
            >
              Change pages
            </Button>
          )}
        </div>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
