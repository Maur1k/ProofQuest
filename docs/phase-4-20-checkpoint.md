# Phase 4 — approximately 20% checkpoint

Owner: Maur1k. Date: 2026-11-10. Status: first work package complete; stopped at the owner's requested limit. Further Phase 4 work requires confirmation to continue beyond this checkpoint.

## Source checkpoint

Before starting Phase 4, pushed Phase 3 commit `4b24c9ed14a6fcc9651a5e322e1d8f61e2cf001e` to `Maur1k/ProofQuest` main and verified the remote branch at that exact revision. This was a normal fast-forward including the earlier local Phase 1/2 checkpoints. No history was rewritten. Git synchronization may surface commits in Lovable; no Lovable AI prompt or production publication was performed.

## Delivered

- `src/domain/document-import.ts`: typed file-input outcomes and messages, one-file selection validation, zero/invalid/oversize rejection, byte-signature check, and explicit page-range parsing.
- `src/features/documents/preflight.ts`: reusable input path for the future file picker and drop handler. It reads only five signature bytes, rejects metadata failures before reading, handles file-read failure without exposing exception details, settles cancellation promptly, and ignores late read results. It neither parses nor stores the PDF.
- Page selection accepts comma-separated pages/ranges, sorts/deduplicates them, retains deliberate gaps, and rejects empty, invalid, out-of-range or oversized selections. Large ranges are rejected before allocating page arrays; nothing is silently truncated to the first thirty pages.
- 24 new tests cover file/page boundaries, ambiguous input, MIME/extension hints, renamed non-PDF files, bounded reads, cancellation and read failure.

## Verification

All **132 tests across 9 files** passed. TypeScript and scoped lint passed. Existing product UI, data migration, PDF.js dependencies and document records are unchanged at this checkpoint. No new browser or mobile check is claimed for these unconnected modules.

## Meaning of 20%

This is the first of five planned Phase 4 work packages, an approximate scope checkpoint rather than a precise time estimate:

1. **Complete:** input and deliberate page-selection foundations with tests.
2. Pending: integrate the verified PDF.js worker, incremental extraction, quality warnings, timeout and cleanup.
3. Pending: connect accessible file selection/drop and page selection to real extraction states.
4. Pending: persist imports, add preview/page navigation, reload/reopen and cancellation/failure recovery.
5. Pending: production-worker, realistic-document, responsive and physical-mobile acceptance; final handoff.

The provisional 20 MiB/30 selected-page values are named experiment bounds passed explicitly to validation. They are not active product defaults or a claim of supported mobile capacity. The strict signature preflight checks for `%PDF-` at byte zero; it does not prove PDF structure, detect encryption, or determine whether OCR is needed. Parser validation follows in package 2. Real PDF input is not yet exposed in the application.

The Phase 1 mobile/realistic-memory validation remains outstanding before approving product limits. No extraction, AI generation, renderer, live import or Phase 5 work was implemented. The Phase 4 checkpoint is saved locally; only Phase 3 was pushed in this request.
