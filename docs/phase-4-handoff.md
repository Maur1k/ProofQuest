# Phase 4 — local PDF import and reader handoff

Owner: Maur1k. Completed: 2026-11-10. **Complete within the owner-approved scope, explicitly excluding physical-phone testing.** Phase 5 requires a separate authorization. No push, publish, paid service or Lovable AI editing was performed.

## Delivered

The real journey is now Home/Create → PDF library → choose/drop one PDF → select pages → extract → review → save → reader. Original PDF bytes and selected-page text commit together in IndexedDB and reopen after reload. The existing programming quests and static sample lessons remain separate and functional. This phase does not generate quizzes from PDFs; generation is Phase 6, following the Phase 5 quiz lifecycle.

The 80% checkpoint contains the implementation details. This final package adds deterministic worker-lifecycle/deadline tests, PDF quota rollback/retry coverage, production-artifact preview tooling, a repeatable desktop parser diagnostic and acceptance evidence. No application defect requiring a product-code change was found in the final checks.

## Acceptance results

| Check | Evidence / result |
| --- | --- |
| Automated regression | **151 tests, 12 files, all pass.** Includes prior migration/scoring/store tests plus PDF bounds, sparse pages, backup compatibility, stale cancellation, save retry and navigation guard. |
| Worker lifecycle | Twenty repeated successful mocked worker operations release task/worker/port. Never-settling parser hits the deadline and terminates; pre-worker and active-operation cancellation clean up; parser errors remain sanitized. These are deterministic adapter tests, not browser memory measurements. |
| Atomic PDF persistence | Forced page-store quota failure rolls back the document bytes and every page. Clean retry succeeds. Sparse and older full-page backups round-trip without losing page numbering. |
| TypeScript / lint | TypeScript passes. Full lint: zero errors, nine unchanged existing Fast Refresh warnings. |
| Production builds | Node, Lovable and Vercel build and verification commands pass. Worker, character maps, fonts, decoders and Apache license are present. |
| Production browser workflow | Node build: real PDF opens, deliberate selection extracts, review saves, reader renders, reload reopens and distant-page navigation works. |
| Hosting artifacts | Built Lovable and Vercel fetch handlers and client assets run through the local preview bridge. Each passes three-page fixture import/extraction/save/render/reload. This is artifact validation under Node, **not a deployed Cloudflare/Vercel platform certification**. |
| Realistic document | RFC 9110 PDF, 2,858,365 bytes, 194 pages; selected pages 1–3, 10, 20, 30, 40, 50, 100, 194. Eleven-page selection rejected; ten accepted. Pages 100 and 194 render; page 21 explicitly shows that its text was not selected. |
| Errors and recovery | Production build displays intended malformed/password/scan messages. The scan remains editable after failure. Navigation confirmation's Keep working retains selection; Leave import returns Home. |
| Keyboard / layout | Enter activates extract/save; Tab moves from page input to Next page, then Enter navigates. Reader checked at 320, 768 and 1280px; no horizontal document overflow. Import/error screen checked at 320px, likewise no horizontal overflow. Canvas observed at 841 × 1188 pixels, within the configured budget. |
| Browser console | No errors observed on the three local production-artifact origins. |
| Physical phone | **Excluded from Phase 4 acceptance by the owner's explicit instruction on 2026-11-10; not performed or claimed.** |

Browser evidence uses the available Chromium-based in-app browser. Other engines, native 200% zoom and assistive-technology certification are not claimed; native zoom was already assigned to the owner in Phase 2. The viewport tests establish reflow, not native zoom behavior. Public deployed-host checks and the wider release/device matrix belong to the release readiness work before public beta.

## Bounds and extraction quality

Retain the explicit development guards: 5 MiB per file, 10 selected pages, 60,000 text characters, 256,000 serialized UTF-8 bytes, 20 seconds per operation, one-million-pixel canvas and 2,048 pixels per dimension. These are enforced app limits, **not tested maximum hardware capacity or hard process-memory ceilings**. No silent page truncation. The original PDF always retains every page even when extraction selects only some.

The reference PDF exposes a known text-layer limitation: ligatures can become separated text (for example, “fi”), and reading order can differ from the layout. The UI already warns to compare columns, formulas and diagrams with the original. This phase does not claim perfect text fidelity, OCR or semantic understanding. Fewer than 40 non-whitespace characters triggers conservative low-text handling.

## Repeated-open diagnostic

12 open/extract/destroy cycles; cold 384 ms; warm median 157 ms; post-GC warm heap 19.5–21.5 MiB; final heap 19.9 MiB; final process RSS 135.7 MiB.

This measures the **Node legacy PDF parser**, with forced GC between cycles, not the browser's real worker or an Android process. Warm retained heap stayed within the recorded range; RSS includes runtime/native allocations and is not a leak verdict. Do not use these numbers to advertise phone speed or memory support. Raw per-run evidence: [phase-4-runtime-evidence.json](phase-4-runtime-evidence.json).

Reference source: [RFC Editor PDF](https://www.rfc-editor.org/rfc/rfc9110.pdf), SHA-256 `60b30efa1048900833d1758440247fe8ac85a3134f2327388dcb24e07d814c89`. The downloaded reference is retained only in the connected validation workspace, not redistributed as an MIT project fixture. Synthetic fixture provenance remains in `experiments/pdf-feasibility/`.

## Reproduction

```sh
node node_modules/vitest/vitest.mjs run
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js .
node scripts/build-target.mjs lovable
node scripts/verify-build.mjs lovable
node scripts/build-target.mjs vercel
node scripts/verify-build.mjs vercel
node scripts/build-target.mjs node
node scripts/verify-build.mjs node
node scripts/smoke-node.mjs
```

Run `node scripts/preview-target.mjs lovable` or `vercel` after that target is built. The bridge binds only to loopback (ports 4185/4186), serves generated public assets and invokes the built fetch handler. It does not emulate platform bindings, billing, edge execution or deployment settings. Stop it after testing. Run `node --expose-gc scripts/check-pdf-runtime.mjs <local-pdf-path>` for the diagnostic; it outputs only checksums, counts and resource measurements, not document text.

Screenshot: connected workspace `validation/phase4-complete-reader.png`. Build logs and the reference PDF are in the same validation folder. Temporary acceptance servers are stopped after verification.

## Next gate

Stop here. Phase 5 (Practice, Test and results with labeled fixture/manual questions) is ready for owner review/authorization, but has not started. Phase 4 commits are local; pushing and publishing are separate actions. The excluded physical-phone check remains unverified and is not a blocker for this owner-approved Phase 4 completion.
