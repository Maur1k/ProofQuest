# Validation record — 2026-11-24

Scope: finish authorized 6A/6B work; stop before 6C. Local checkout only, no commit/push/deployment.

## Final local checks

- TypeScript: passed.
- Vitest: **298 passed, 18 opt-in live cases skipped**, 38 passing test files and four skipped live files.
- ESLint: **0 errors, 9 existing Fast Refresh warnings**. Formatting and a test-only union narrowing error were corrected.
- Node production build: passed. Runtime/entry/assets and local PDF worker, character maps, fonts, decoders/license verification passed.
- Route smoke checks: all **16 passed**, including guest redirects and missing-content pages.
- Exact configured-secret scan: **384 build files, zero credential matches**.
- Local environment checked without printing credentials: generation false; no approved-format or temporary-cap override. Final localhost 4193 preview runs disabled; browser confirmed disabled controls and saved-content access. Normal shared cap remains 20.

## Live tests are not factual certification

Three public-USGS requests passed the source harness's structural/citation checks. Human-style source review rejected the quiz's infiltration/percolation key and its dust/salt-crystal alternatives. Further card/reviewer label relationships also require scrutiny. The harness intentionally reports structure only; a green test must not be described as factual acceptance.

The browser additionally completed a PDF Quiz/result/reload/source-link path, a pasted-biology Flashcard path and a Reviewer path. The biology cards and Reviewer were manually reviewed against the supplied paragraphs. No private PDF was sent. Six provider calls were used across these two validation clients; pacing denials did not trigger generation. No counter was reset to bypass a limit.

Known-invalid PDF quiz content exists only as a local validation attempt and is explicitly excluded from the accepted corpus. Do not publish or use it as trusted study content. Historical grades were not rewritten.

## Outcome

6B implementation and workflow checks are complete locally. 6A remains incomplete: 25 accepted earlier-profile MCQs are below the 30-question gate, and the new unified-source public-PDF factual gate failed. Generation remains off. The bounded second-review proposal and its free-allowance tradeoff are in `phase-6a-progress.md`; owner decision is pending. No 6C work or physical-phone test was performed.
