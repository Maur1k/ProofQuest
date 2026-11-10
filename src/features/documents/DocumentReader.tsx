import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { DocumentRecord, PageRecord } from "@/data/records";
import { useStore } from "@/store/store";
import { documentStorage } from "./service";
import { pdfFailure } from "./errors";
import { documentButton } from "./DocumentLibrary";

function PagePreview({ document, page }: { document: DocumentRecord; page: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [message, setMessage] = useState("Rendering original page…");
  useEffect(() => {
    const controller = new AbortController();
    void import("./pdfjs-adapter")
      .then(async (adapter) => {
        if (controller.signal.aborted || !canvas.current) return;
        await adapter.renderPdfPage(document.blob, page, canvas.current, controller.signal);
        if (!controller.signal.aborted) setMessage("");
      })
      .catch((e) => {
        if (!controller.signal.aborted) setMessage(pdfFailure(e).message);
      });
    return () => controller.abort();
  }, [document, page]);
  return (
    <div className="min-w-0 space-y-2">
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      <canvas
        ref={canvas}
        aria-label={`Original PDF page ${page}. Extracted text is provided separately.`}
        role="img"
        className="h-auto max-w-full rounded-lg bg-white"
      />
    </div>
  );
}
export function DocumentReader({
  documentId,
  initialPage = 1,
}: {
  documentId: string;
  initialPage?: number;
}) {
  const { ready, persistence } = useStore();
  const [data, setData] = useState<{ document: DocumentRecord; pages: PageRecord[] } | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    if (!ready || persistence !== "durable") return;
    let active = true;
    setData(null);
    setError("");
    setPage(1);
    void documentStorage((repo) => repo.getDocumentBundle(documentId)).then(
      (result) => {
        if (!active) return;
        if (result) {
          setData(result);
          if (
            Number.isSafeInteger(initialPage) &&
            initialPage >= 1 &&
            initialPage <= result.document.pageCount
          )
            setPage(initialPage);
        } else
          setError("This PDF is no longer in this browser. Import it again from the PDF library.");
      },
      () => {
        if (active)
          setError(
            "The saved PDF could not be read. Reload to retry, or restore your backup from Home.",
          );
      },
    );
    return () => {
      active = false;
    };
  }, [documentId, ready, persistence, initialPage]);
  const extracted = data?.pages.find((item) => item.page === page);
  return (
    <div className="space-y-5 py-6">
      <Link to="/documents" className={documentButton}>
        PDF library
      </Link>
      {!ready ? (
        <p role="status">Opening browser storage…</p>
      ) : persistence !== "durable" ? (
        <p role="alert">
          Browser storage is unavailable. Return Home to resolve the storage warning.
        </p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : !data ? (
        <p role="status">Loading saved PDF…</p>
      ) : (
        <>
          <header>
            <h1 className="break-words text-2xl font-bold">{data.document.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Saved in this browser · {data.pages.length} of {data.document.pageCount} pages
              extracted. Quiz generation is not available yet.
            </p>
          </header>
          <nav aria-label="PDF pages" className="flex flex-wrap items-center gap-3">
            <button
              className={documentButton}
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous page
            </button>
            <label className="flex items-center gap-2">
              Page
              <input
                aria-label="Page number"
                type="number"
                min={1}
                max={data.document.pageCount}
                value={page}
                className="w-20 rounded-lg border border-input bg-background p-2"
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isSafeInteger(n) && n >= 1 && n <= data.document.pageCount) setPage(n);
                }}
              />
              of {data.document.pageCount}
            </label>
            <button
              className={documentButton}
              disabled={page === data.document.pageCount}
              onClick={() => setPage((p) => p + 1)}
            >
              Next page
            </button>
          </nav>
          <div className="grid min-w-0 gap-5 lg:grid-cols-2">
            <section className="min-w-0 space-y-3">
              <h2 className="font-semibold">Original page</h2>
              <PagePreview key={`${documentId}-${page}`} document={data.document} page={page} />
            </section>
            <section className="min-w-0 space-y-3">
              <h2 className="font-semibold">Extracted text · page {page}</h2>
              <p className="text-sm text-muted-foreground">
                Compare with the original. Columns, formulas and diagrams may not be represented
                accurately.
              </p>
              {extracted ? (
                <>
                  {extracted.warnings.map((w) => (
                    <p key={w} className="text-warning">
                      {w}
                    </p>
                  ))}
                  <p className="whitespace-pre-wrap break-words rounded-xl border border-border bg-card p-4 text-sm">
                    {extracted.text || "No readable text on this selected page."}
                  </p>
                </>
              ) : (
                <p className="rounded-xl border border-border p-4">
                  This page was not selected for text extraction. You can still read the original
                  page.
                </p>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
