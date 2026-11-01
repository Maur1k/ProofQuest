# Phase 3 — durable data and quiz contracts

Owner: Maur1k. Completed: 2026-11-01. Phase 4 is not authorized.

## Delivered

- The existing programming application now saves through IndexedDB after hydration. Saving and finishing await a committed transaction; failed writes leave the editor draft and navigation guard intact. Storage failure pauses editing until the user explicitly chooses a visibly labeled temporary session.
- The v1 source remains untouched in localStorage and is also retained with the atomic migration marker. Migration verifies the committed legacy record before marking completion; repeat initialization does not duplicate records. Invalid data is not silently overwritten. Partial recovery retains the source and warning.
- Every legacy attempt has a question snapshot marked original, reconstructed or missing. All migrated available details are reconstructed, even when IDs match. Legacy recorded outcomes and answered-only scoring remain unchanged. New manual attempts capture original content; history review reads that snapshot after source edits/deletion.
- MCQ/version schemas and pure Practice/Test transitions coexist with the programming-only editor. New sessions preserve mode, grading version, question/option order and question content. Test drafts are editable; Practice answers lock. Finalization counts all questions, handles skips, and is repeat-safe within an IndexedDB transaction.
- Typed repositories retain document blobs/page mapping, immutable quiz versions, sessions with their answer records, generation jobs and legacy state. Revisions protect concurrent writers. Source deletion retains session snapshots and citations.
- Home's Data & backup panel exports/imports validated JSON backups, checks PDF byte checksums, rejects conflicting or malformed imports atomically, and requires deliberate confirmation to delete the browser library. Imported rollback sources survive subsequent export. The 100 MiB backup limit is separate from provisional PDF-import limits.

## Exit evidence

| Check | Evidence |
| --- | --- |
| Legacy IDs/outcomes preserved; changed/deleted sources | Migration fixtures preserve recorded answers and score, mark reconstructed/missing details, and retain the exact source |
| Repeat migration and failure recovery | Two connections initialize once; injected marker/quota failure rolls back data and marker together, then retries successfully |
| Concurrent writes and finalization | Exactly one stale-revision writer succeeds; concurrent finalization returns the same committed result |
| New Test scoring | One correct plus four skipped yields 20%; cleared drafts finalize as submitted/skipped; close/reopen retains the latest draft |
| Immutable content | Version overwrite is rejected; sessions retain full content after source-version deletion |
| Backup integrity | Byte/checksum, duplicate IDs, missing snapshots, invalid scores and late import-conflict fixtures reject without partial writes |
| Failure UX | React tests prove failed writes do not report success, editor text/guard remain, and stale drafts cannot overwrite another tab after refresh |
| Production | Node production build, output verification, SSR/assets and safe account-URL redirect smoke checks passed |

Final automated result: **108 tests across 8 files passed**. TypeScript passed. Lint: **0 errors, 9 existing Fast Refresh warnings**. No real AI requests were made.

## Browser acceptance

On 2026-10-30 and 2026-11-01, the in-app desktop browser verified migration of the existing local test library, preserved progress, reconstructed-history labeling, manual creation, answer submission, completion, reload and an actual backup download/import. The same-backup import succeeded without duplicate quests. No browser console errors were captured in the final check.

Synthetic quest `91ec6c47-62c7-418b-a1a9-685832276086`, attempt `0d5d4e74-2d3a-4f6b-9b68-f7ec89d315ac`: answered 5 and scored 100%, then changed the source answer to 999 and its explanation. After reopening the result, it still displayed 5 and the original explanation. The synthetic quest remains in local preview data, with its intentionally changed source key. Existing user records were not deleted.

The expanded recovery panel passed document-overflow checks at 320, 390, 768, 1024 and 1440px. The viewport override was reset. Evidence is in the chat workspace: `validation/phase3-preserved-history.png`, `validation/phase3-backup-restored.png`, `validation/phase3-viewport-checks.json`.

## Limits and next gate

- Physical-phone validation remains pending under the owner's earlier exception. Native 200% zoom was handed to the owner in Phase 2; no automated zoom pass is claimed. This is not full accessibility or cross-browser certification.
- Real PDF selection/extraction/reader UI belongs to Phase 4; MCQ Practice/Test screens belong to Phase 5. The tested storage/grading contracts are ready for those phases, but a PDF-to-quiz product flow is not yet implemented.
- Browser data is origin/profile-local and can be cleared by the browser. Downloaded backups remain necessary; server hosting does not back up this data. A blocked-storage recovery export explicitly contains only readable legacy data, not a promise to recover inaccessible newer records.
- Imports merge missing records and abort on differing IDs/content. Restore conflicting backups into another browser profile, or export and deliberately clear the destination first. No silent replacement policy exists.
- Keep old-version tabs closed when upgrading. The retained v1 key is a rollback source, not a live synchronization channel with old code. No cloud sync or backward synchronization is claimed.
- No Git push, production deployment or Phase 4 work was performed. Stop here for Maur1k's explicit confirmation.

See [data contracts](phase-3-data-contracts.md) for implementation and recovery details.
