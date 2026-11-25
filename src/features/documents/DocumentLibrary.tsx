import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useStore } from "@/store/store";
import type { DocumentRecord } from "@/data/records";
import { documentStorage } from "./service";
import { SourceLibrary } from "@/features/study-sources/SourceLibrary";
export const documentButton =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-primary/50 px-4 py-2 text-sm font-semibold disabled:opacity-50";
export function DocumentLibrary() {
  const { ready, persistence } = useStore();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]),
    [error, setError] = useState("");
  useEffect(() => {
    if (!ready || persistence !== "durable") return;
    let live = true;
    void documentStorage((repo) => repo.listDocuments()).then(
      (rows) => {
        if (live) setDocuments(rows);
      },
      () => {
        if (live) setError("Saved PDFs could not be loaded. Reload to retry.");
      },
    );
    return () => {
      live = false;
    };
  }, [ready, persistence]);
  return (
    <div className="space-y-5 py-6">
      <h1 className="text-2xl font-bold">Saved sources</h1>
      <Link to="/" className={documentButton}>
        New study
      </Link>
      <Link to="/library" search={{}} className={documentButton}>
        Library
      </Link>
      <SourceLibrary />
      <h2 className="font-semibold">Original PDFs</h2>
      {documents.map((doc) => (
        <Link
          key={doc.id}
          to="/documents/$documentId"
          params={{ documentId: doc.id }}
          className="block break-words rounded-xl border p-4"
        >
          {doc.name} · Open original PDF
        </Link>
      ))}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
