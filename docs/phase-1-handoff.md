# Phase 1 handoff — desktop technical foundations

Owner: Maur1k. Completed desktop scope: 2026-10-25. Phase 2 is not authorized.

## Delivered

- Preserved the existing application and Lovable build wrapper. The wrapper's lockfile download now uses public npm with the same version and integrity.
- Added explicit Cloudflare, Lovable-output, Vercel and Node builds with artifact assertions. Added a Node production smoke test and CI steps for these checks.
- Added an isolated PDF.js experiment with synthetic fixtures, real production worker loading, page mapping, scan/password/invalid messages, cancellation and deadline outcomes.
- Recorded [hosting decision](decisions/001-hosting-portability.md) and [PDF feasibility decision](decisions/002-pdf-feasibility.md).

## Verification

| Check | Result |
| --- | --- |
| New directory + empty cache, frozen install from public npm | 515 packages installed; no version changes |
| Existing unit tests | 63 passed in 4 files |
| TypeScript | Passed |
| ESLint | 0 errors; 9 existing Fast Refresh warnings |
| Cloudflare output | Expected module runtime, server and public assets |
| Local Lovable sandbox simulation | Expected `dist/server` + `dist/client` |
| Vercel output | v3 deployment manifest, Node 22 SSR function, static assets and route fallback |
| Node production smoke | 5 direct routes and linked assets passed |
| Desktop production browser | Quest library hydrated; previous Phase 0 local quest/result remained visible |
| PDF Node fixture checks | 6 passed; fixture checksums match |
| PDF production browser | 7 cases observed; all 30 page sentinels retained |
| Security-sensitive source | `src/server.ts` and `src/start.ts` unchanged |

CI has been extended; these results are local Windows checks, not a claim that the updated remote workflow has run. Local evidence is retained under the chat workspace's `validation/phase1-*` files, including build logs, browser outcomes and screenshot.

## Scope limits and next gate

The owner explicitly chose: “No—finish desktop checks and leave phone validation pending.” Desktop Phase 1 is complete with this recorded exception. File/page ceilings remain provisional; physical Android and realistic large-document memory tests must pass before Phase 4 relies on them or claims mobile support. Deadline and payload boundary coverage must also expand during product integration.

No production app was published, no AI provider connected, and no PDF feature was added to the existing product UI. Vercel is build-compatible locally; an operational backup requires Phase 7 live deployment/recovery verification. Repository visibility and artwork redistribution clearance remain release work.

Next eligible work is Phase 2: responsive guest experience. Stop here and obtain Maur1k's confirmation before starting it.
