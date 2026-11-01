# Local data contracts — Phase 3

## Boundaries

`src/domain/quiz.ts` validates new MCQs and version content. `quiz-session.ts` contains pure transitions with injected IDs/time. Existing programming consumers keep the original three-variant `Question` union; they cannot receive an MCQ by type coercion. New `QuizQuestion`/`QuizResponse` checking handles all four variants exhaustively. MCQ renderers are intentionally deferred to Phase 5.

`src/data/records.ts` validates storage and backup boundaries. `indexed-db.ts` opens the database only when called after hydration and resolves transactions on `complete`, never on the last request's success alone. `repository.ts` implements typed document, quiz and attempt repositories. React orchestration is in `store/store.tsx`; scoring and persistence operations do not live in render functions.

## Database

Database: `proofquest:data:v2`, IndexedDB schema version 1.

| Store | Keys/content |
| --- | --- |
| legacy | `legacy`: revision, original v1-compatible quests/attempts, attempt snapshots |
| meta | `migration-v1`: original source, warning, imported IDs; `rollback-sources`: additional imported originals |
| documents | Document ID, SHA-256 checksum, Blob, name, page count and creation time |
| pages | Compound document ID/page key, extracted text and warnings |
| versions | Immutable version ID, quiz ID, title, questions, creation time |
| sessions | Attempt ID, immutable copied version, mode, grading version, orders, answers, revision and result |
| jobs | Job ID, revision, source/configuration, status and result/error references |

Answer records are embedded in their session to make draft changes/finalization atomic; they are not a separately writable table. Source PDF deletion removes its pages/jobs while retaining quiz/session evidence. Quiz deletion removes versions from the library while sessions keep copied content. Whole-library deletion is separately confirmed and clears the retained localStorage v1/backup keys as well; preferences are unrelated.

## Migration and recovery

The adapter checks for an existing legacy record first inside a read/write transaction. Otherwise it prepares the v1 source, validates records, builds reconstructed/missing snapshots, writes/reads back the legacy record, and writes the completion marker in the same transaction. Abort preserves the old source and leaves no partial marker. The original localStorage value is never replaced during normal saves.

Malformed envelopes and duplicate record IDs block migration; individually malformed records use the legacy reader's partial-recovery warning while retaining the exact raw payload. No legacy answers are regraded. Reconstructed question keys may differ from original keys, so the UI retains the original recorded score and displays the reconstruction notice.

On open/write failure, data stays in place. Editing is blocked until storage works or the user selects a temporary session. Temporary changes exist only in memory and can be exported. If newer IndexedDB data cannot be opened, the legacy recovery export is explicitly partial; it does not claim inaccessible records were recovered.

## Transitions and conflicts

- `startSession` copies a validated version and its initial option order. One unfinished session per quiz/mode is reused, and an existing attempt ID cannot be rebound to another version/mode.
- Test draft-upsert checks expected revision and response shape; it records no correctness or hint/reveal state. Practice submission checks hints/response shape, grades once and refuses replacement.
- Finalization checks revision inside the read/write transaction, counts all question IDs, marks existing drafts submitted, records correct/incorrect/skipped totals and percentage, and commits once. A retry returns the existing completed record.
- Legacy mutations also compare revision in the transaction. React changes visible saved state only after commit. A stale editor additionally compares its opening quest snapshot so a focus refresh cannot make an old draft overwrite newer content.
- BroadcastChannel and window focus refresh the legacy view. Correctness depends on database revisions, not notifications; notifications can be missed without permitting stale overwrites.

## Backup format and limitations

`proofquest-backup`, version 2, JSON contains legacy state, migration/rollback sources, documents encoded as base64, pages, immutable versions, sessions and jobs. Imports validate schemas, unique IDs, source/page mapping, session order/grading and document checksums before committing. All imported writes occur in one transaction, including conflict rejection. Repeating the same import adds no duplicate records.

Download/import is capped at 100 MiB of serialized backup. This is a recovery bound, not a new approved PDF workload. Base64 and JSON need memory overhead; physical-mobile limits still require validation. Imported documents remain local. Network generation is absent.

The runtime preserves original programming validators/renderers; tests cover predict/trace/fix grading alongside MCQ checking. The sample-study demo remains memory-only and independent of these repositories. No account or credential collection was added.
