import type { DocumentRecord } from "@/data/records";
import type { StudySource, SourceRevision } from "./study-source";
import { sourceQuizVersion, type SourceMaterial } from "./source-material";
import type { StudyRecord } from "./study-record";
import type { QuizVersion } from "./quiz";
import type { QuizSession } from "./quiz-session";
import { isArchivedQuizId } from "./archive";

export interface LibraryMaterial {
  key: string;
  id: string;
  title: string;
  format: "quiz" | "flashcards" | "reviewer";
  kind: "source" | "legacy" | "quiz" | "attempt";
  version?: QuizVersion;
  attempts: QuizSession[];
}
export interface LibrarySource {
  key: string;
  title: string;
  source?: StudySource;
  document?: DocumentRecord;
  revisions: SourceRevision[];
  materials: LibraryMaterial[];
}
export interface LibraryInput {
  sources: StudySource[];
  revisions: SourceRevision[];
  documents: DocumentRecord[];
  sourceMaterials: SourceMaterial[];
  studyMaterials: StudyRecord[];
  quizzes: QuizVersion[];
  sessions: QuizSession[];
}
export interface LibraryView {
  sources: LibrarySource[];
  other: LibraryMaterial[];
}
/** A projection over existing records. Never persists, regrades or infers links from titles. */
export function buildLibrary(input: LibraryInput): LibraryView {
  const groups: LibrarySource[] = input.sources
    .filter((s) => s.kind !== "sample")
    .map((source) => ({
      key: `source:${source.id}`,
      title: source.title,
      source,
      revisions: input.revisions.filter((r) => r.sourceId === source.id),
      materials: [],
    }));
  const documentGroups = new Map<string, LibrarySource[]>();
  for (const doc of input.documents) {
    const linked = groups.filter((g) =>
      g.revisions.some((r) => r.kind === "pdf" && r.documentId === doc.id),
    );
    if (!linked.length) {
      const g: LibrarySource = {
        key: `document:${doc.id}`,
        title: doc.name,
        document: doc,
        revisions: [],
        materials: [],
      };
      groups.push(g);
      documentGroups.set(doc.id, [g]);
    } else {
      for (const g of linked) g.document = doc;
      documentGroups.set(doc.id, linked);
    }
  }
  const other: LibraryMaterial[] = [];
  const byVersion = new Map<string, { row: LibraryMaterial; group: LibrarySource | undefined }>();
  const archived = new Set(
    input.sourceMaterials.filter((m) => m.generation.provider === "sample").map((m) => m.id),
  );
  function attach(row: LibraryMaterial, group?: LibrarySource) {
    (group?.materials ?? other).push(row);
    if (row.version) byVersion.set(row.id, { row, group });
  }
  function documentGroup(id: string) {
    const matches = documentGroups.get(id);
    return matches?.length === 1 ? matches[0] : undefined;
  }
  function quizGroup(version: QuizVersion) {
    if (!version.questions.every((q) => q.type === "mcq" && q.sources.length > 0)) return undefined;
    const ids = new Set(
      version.questions.flatMap((q) =>
        q.type === "mcq" ? q.sources.map((s) => s.documentId) : [],
      ),
    );
    return ids.size === 1 ? documentGroup([...ids][0]!) : undefined;
  }
  for (const m of input.sourceMaterials) {
    if (m.generation.provider === "sample" || isArchivedQuizId(m.id)) continue;
    const group = groups.find(
      (g) =>
        g.source?.id === m.request.source.sourceId &&
        g.revisions.some(
          (r) => r.id === m.request.source.id && r.contentHash === m.request.source.contentHash,
        ),
    );
    attach(
      {
        key: `source-material:${m.id}`,
        id: m.id,
        title: m.title,
        kind: "source",
        format: m.output.format,
        attempts: [],
        ...(m.output.format === "quiz" ? { version: sourceQuizVersion(m) } : {}),
      },
      group,
    );
  }
  for (const m of input.studyMaterials) {
    const group = documentGroup(m.request.documentId);
    attach(
      {
        key: `legacy-material:${m.id}`,
        id: m.id,
        title: m.material.title,
        kind: "legacy",
        format: m.material.format,
        attempts: [],
      },
      group?.document?.checksum === m.checksum ? group : undefined,
    );
  }
  for (const q of input.quizzes) {
    if (
      byVersion.has(q.id) ||
      archived.has(q.id) ||
      isArchivedQuizId(q.id) ||
      !q.questions.every((item) => item.type === "mcq")
    )
      continue;
    attach(
      {
        key: `quiz:${q.id}`,
        id: q.id,
        title: q.title,
        kind: "quiz",
        format: "quiz",
        version: q,
        attempts: [],
      },
      quizGroup(q),
    );
  }
  for (const session of input.sessions) {
    if (
      archived.has(session.version.id) ||
      isArchivedQuizId(session.version.id) ||
      !session.version.questions.every((q) => q.type === "mcq")
    )
      continue;
    const match = byVersion.get(session.version.id);
    // An attempt owns its immutable snapshot; do not attach conflicting copies by ID alone.
    if (match && JSON.stringify(match.row.version) === JSON.stringify(session.version))
      match.row.attempts.push(session);
    else {
      const row: LibraryMaterial = {
        key: `attempt:${session.id}`,
        id: session.version.id,
        title: session.version.title,
        kind: "attempt",
        format: "quiz",
        attempts: [session],
      };
      (quizGroup(session.version)?.materials ?? other).push(row);
    }
  }
  for (const g of groups)
    for (const m of g.materials) m.attempts.sort((a, b) => b.updatedAt - a.updatedAt);
  return { sources: groups.sort((a, b) => a.title.localeCompare(b.title)), other };
}
