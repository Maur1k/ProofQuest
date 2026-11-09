import { openDatabase } from "@/data/indexed-db";
import { ProofQuestRepository } from "@/data/repository";
import { documentSchema, type DocumentRecord, type PageRecord } from "@/data/records";
import { checkCancelled } from "./errors";
import { extractPages } from "./extraction";

export interface PreparedDocument {
  document: DocumentRecord;
  pages: PageRecord[];
}
export async function documentStorage<T>(
  work: (repository: ProofQuestRepository) => Promise<T>,
): Promise<T> {
  const repository = new ProofQuestRepository(await openDatabase(indexedDB));
  try {
    return await work(repository);
  } finally {
    repository.close();
  }
}
export async function inspectDocument(file: File, signal: AbortSignal) {
  const { withPdf } = await import("./pdfjs-adapter");
  checkCancelled(signal);
  return withPdf(file, signal, async (pdf) => pdf.numPages);
}
export async function prepareDocument(
  file: File,
  selected: number[],
  signal: AbortSignal,
  progress: (done: number, total: number) => void,
): Promise<PreparedDocument> {
  const { withPdf } = await import("./pdfjs-adapter");
  checkCancelled(signal);
  return withPdf(file, signal, async (pdf, activeSignal) => {
    const extracted = await extractPages(pdf, selected, activeSignal, progress);
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    checkCancelled(activeSignal);
    const document = documentSchema.parse({
      id: crypto.randomUUID(),
      name: file.name.slice(0, 500),
      checksum: Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join(""),
      pageCount: pdf.numPages,
      createdAt: Date.now(),
      blob: file,
      extractedPages: selected,
    });
    return { document, pages: extracted.map((page) => ({ ...page, documentId: document.id })) };
  });
}
