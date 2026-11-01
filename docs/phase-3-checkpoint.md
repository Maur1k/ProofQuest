# Phase 3 — quiz contracts checkpoint

Owner: Maur1k. Date: 2026-10-30. Historical initial checkpoint; superseded by the [completed Phase 3 handoff](phase-3-handoff.md) on 2026-11-01. Phase 3 was explicitly authorized after the owner accepted advancing from Phase 2. Phase 4 is not authorized.

## Implemented

- `src/domain/quiz.ts`: validated MCQ and quiz-version contracts alongside the existing programming question union. Options require distinct IDs/text and a valid correct-option ID; source references require a positive page and excerpt. New grading exhaustively handles MCQ/predict/trace/fix. Schema validity does not establish factual support for an answer.
- `src/domain/quiz-session.ts`: pure session creation, editable Test drafts, locked Practice submission, revision conflict checks, and repeat-safe finalization. Session creation copies question content and preserves question/option order. Submitted answers copy their input. New grading uses the complete question denominator and records a grading version; legacy grading is unchanged.
- `src/data/legacy-migration.ts`: pure migration preparation retains the exact original payload, original IDs and recorded answers/scores. All available backfilled question details are explicitly reconstructed; deleted details are missing. Invalid envelopes and duplicate record IDs fail before any write. Partial recovery retains a warning and source.
- `src/test/quiz-contracts.test.ts`: 22 new cases covering invalid MCQs, legacy programming compatibility, draft edits, skips, repeated finalization, stale revisions, locked answers, source mutation, malformed migration input and reconstructed history.

## Verification

- TypeScript check passed.
- All 85 tests passed (63 existing plus 22 new).
- Scoped lint passed for all four new files and the final Phase 2 sheet-close change.
- No UI behavior, live browser storage or deployment changed in this checkpoint. JSON round-trip testing is not an IndexedDB persistence test.

## Remaining Phase 3 work

1. Implement typed IndexedDB repositories for documents/page text, immutable versions, sessions/answers and generation jobs. Version immutability must be enforced at the repository boundary, not inferred from cloned input.
2. Read, check revision, apply the pure transition and write inside one transaction. Pure revision tests alone do not prove multi-tab safety or atomic finalization.
3. Connect and test repeatable transactional v1 migration, preserving rollback source and verifying IDs/counts before marking it complete. Preparation alone is not a completed migration.
4. Implement validated export/import, deliberate deletion and failure/temporary-session UX before switching the application to durable records. Test quota failures, aborted transactions, conflicts, retries and recovery.
5. Audit and connect affected UI/store consumers without changing legacy scores or losing history. The existing editor/renderers remain explicitly programming-only; MCQ UI integration belongs to Phase 5, and new quiz types must not be cast into legacy consumers.
6. Run integrated regression and production checks, document remaining device limits, then stop for approval before Phase 4.

No new Phase 3 approval is needed to continue this list. No push, publication, provider selection or paid provisioning is authorized by this checkpoint.
