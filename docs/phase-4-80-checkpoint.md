# Phase 4 — approximately 80% checkpoint

Owner: Maur1k. Date: 2026-11-10. Status: four of five implementation packages delivered; stop at the owner-authorized checkpoint. This is an approximate scope measure, not a measured effort percentage or complete Phase 4 acceptance.

## Delivered behavior

- Home and Create now link to the real PDF library, separate from the unchanged sample lesson demo.
- Accessible native file selection and drag/drop share signature and one-file checks. PDF.js 6.4.299 validates structure, opens a real module worker, reads only explicitly selected pages sequentially, and releases workers/pages after success, error, cancellation or a deadline.
- Progress reports completed selected pages. Page ranges retain gaps. Large documents require deliberate selection, never silent first-page truncation. Cancellation and replacement ignore stale operations. Navigation warns about unsaved import work.
- Review shows per-page text and low-text warnings. Scans without useful text, protected PDFs, invalid files and excessive extraction have clear recovery messages. OCR is not implemented. Text order, diagrams and formulas require checking against the original.
- Save commits the original PDF and extracted page records in one IndexedDB transaction. Failed saves retain review for retry. Saved documents reopen after reload; the reader renders bounded canvases with original-page navigation and separate extracted text. Unselected pages explicitly say their text was not extracted.
- Optional `DocumentRecord.extractedPages` preserves sparse page mappings. Old records without it still require all pages. Repository and backup validation enforce the same mapping; older backups remain importable. New sparse-page backups require this updated app. Database stores and backup format version remain unchanged.
- PDF character maps, standard fonts, decoding assets and Apache license are copied locally from the pinned dependency during Vite setup. The worker is emitted by Vite; no document URL or third-party PDF service is used. Generated assets are excluded from Git and lint.

## Development bounds

Current development build: **5 MiB per file; 10 selected pages; 60,000 text characters; 256,000 serialized UTF-8 bytes; 20 seconds per open/extract/render operation; 1,000,000 canvas pixels and 2,048 pixels per side**. These intentionally tighter guards replace the experiment's 20 MiB/30-page values for the live development path. They are not a promise of Android capacity or hard total-process memory ceilings. PDF.js can allocate internal structures before the app sees extracted text. The 40 non-whitespace-character quality heuristic is conservative and can reject legitimate sparse pages.

Nothing is sent to AI. Saved data remains scoped to this browser/origin; browser clearing or eviction can remove it. Use Home's existing export/import controls for a separate backup. Temporary-session mode does not offer PDF saving. No OCR, password entry, PDF-generated quiz, cloud sync or production deployment is included.

## Verification at this checkpoint

- 145 automated tests across 11 files pass, including selected-page storage/backup restoration, old full-page compatibility, unicode, extraction bounds, low-text handling, cancellation, save failure/retry and unsaved-navigation protection.
- TypeScript passes. Full lint has zero errors and nine existing Fast Refresh warnings. Node production build passes and emits a distinct PDF worker asset. Build verification checks worker and locally packaged font/map/decoder/license assets; Node smoke checks include the library and reader routes.
- Local browser, synthetic MIT fixture: choose three-page PDF, extract pages 1 and 3, review, commit, open reader, reload, navigate to original page 2 and verify the unselected-text message. Canvas renders successfully. Protected, image-only and malformed fixtures show their intended errors. No browser console errors observed.
- Basic desktop and 390px viewport inspection: readable stacked controls and original/text layout; reader document width stayed within client width. This is responsive emulation, not physical-device validation.
- Screenshot evidence is retained in the connected workspace at `validation/phase4-80-reader.png`.

## Remaining approximately 20% — not authorized yet

Complete the final acceptance package: execute the worker workflow on production outputs and both hosting targets; representative real-world/complex PDFs and repeated-open memory measurements; broader browser/responsive/keyboard/zoom matrix; physical Android speed/memory checks when a device is available; document final supported limits and resolve defects before Phase 4 sign-off. Physical-phone checks remain pending under the owner's existing instruction. Include malformed, protected, cancellation, quota and recovery scenarios in the final matrix.

Only Phase 3 has been pushed (`4b24c9e`). The Phase 4 checkpoints remain local. No Lovable AI editing, publication, paid service or Phase 5 work was performed. Obtain the owner's confirmation before further phase work.
