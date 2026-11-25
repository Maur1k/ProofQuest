import { useEffect, useRef, useState } from "react";
import type { DocumentRecord } from "@/data/records";
import { pdfFailure } from "./errors";
export function PagePreview({ document, page }: { document: DocumentRecord; page: number }) {
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
