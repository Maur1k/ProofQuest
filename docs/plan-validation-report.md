# ProofQuest plan validation

Date: 2026-10-24. Verdict: feasible to proceed through staged feasibility gates; not yet proven end to end or ready for release.

## Evidence

Inspected Lovable revision `8c1b2541b4e4e9c656a3fef00aab9be256da72ab`. Reconstructed 137 text files in `validation/lovable-baseline`, excluding binary assets and `.lovable/`. The manifest records scope. This is an isolated validation snapshot, not a complete backup or imported product repository. No product behavior was changed, pushed or published.

Environment: Windows, Node 22.18.0, Bun 1.4.4, existing frozen lockfile. Resolved TypeScript 5.9.3 and Vitest 4.1.11. These resolved versions differ from some package.json lower-bound ranges.

| Check | Result |
| --- | --- |
| `bun install --frozen-lockfile` | Passed: 515 packages installed, including the Lovable registry wrapper |
| `bun run test` | Passed on retry: 63 tests across 4 files |
| `node node_modules/typescript/bin/tsc --noEmit` | Passed |
| `bun run build` | Passed; Cloudflare/Wrangler output, not a verified Vercel deployment |
| `bun run lint` | Failed: 404 errors, 9 warnings; errors reported as auto-fixable |
| PDF generation, device layouts, migration, Vercel recovery | Not implemented or executed in this investigation |

Initial tests could not start because sandbox temporary-file renaming returned EPERM; rerunning outside that restriction passed. Initial `tsc.cmd` invocation was unavailable under Bun's Windows installation; direct invocation of the installed compiler passed. Lint includes formatting and extra-final-newline findings that may be influenced by text export; its precise source-baseline count must be rechecked after a faithful Git export. No lint suppression or automated code fixes were applied.

Logs are in the workspace `validation/` directory: `test.log`, `test-retry.log`, `lint.log`, `typecheck.log`, `build.log`.

## Findings incorporated into the plan

1. **Test mode requires new transitions.** Existing answers lock after submission and drafts live in component memory. Persist editable drafts separately, then finalize atomically. New Test scoring must count skipped questions: one correct out of five is 20%. Preserve legacy scoring.
2. **Historical review is incomplete.** Existing attempts contain recorded answers and metadata, not full original question/count snapshots. Current content may have changed under the same ID. Mark reconstructed details, preserve recorded outcomes, and never silently regrade legacy history.
3. **Backup deployment is unproven.** The wrapper defaults to Cloudflare; the successful build generated Wrangler configuration. Explicit Vercel and Node builds and live recovery checks remain necessary. Preserve server entry and CSRF protection.
4. **Dependency availability is a continuity dependency.** The frozen lockfile uses a Lovable-controlled registry for its build wrapper. Today's successful install does not establish independence if that registry disappears. Plan an equivalent portable configuration if needed.
5. **Public AI requires bounded operation.** Select provider/budget, use portable credentials and durable shared quota enforcement, handle retries, and bound UTF-8 payload size as well as tokens/pages. Vercel's current function payload limit is 4.5 MB.
6. **Error reporting needs privacy controls.** Existing error capture can traverse causes and forward context. Before real documents or credentials enter the pipeline, add allowlisted/redacted reporting and sentinel leak tests.
7. **GitHub is not yet a backup.** `Maur1k/ProofQuest` was public and empty when inspected. Resolve Lovable's Git connection without overwriting repository history; preserve all assets and source before implementation.

## Release evidence still required

- Real PDF extraction on representative files and a physical mobile browser, with bounded memory and correct page mapping.
- Generated MCQ quality and evidence review with the chosen provider and a controlled budget.
- Migration, immutable history, editable drafts, skipped-answer denominator and idempotent finalization tests.
- Responsive screenshots at 320, 390, 768, 1024 and 1440px, plus keyboard, zoom and physical device checks.
- Same-release Lovable and Vercel preview verification, plus portable Node startup and a timed recovery drill.
- Faithful full-source backup, artwork provenance, resolved lint baseline and contributor setup instructions.

## Sources checked

- [Vercel TanStack Start deployment](https://vercel.com/kb/guide/deploy-a-tanstack-start-app-to-vercel)
- [Vercel Functions limits](https://vercel.com/docs/functions/limitations)
- [Lovable GitHub synchronization](https://docs.lovable.dev/integrations/github)

The plan is ready for review. Passing the existing suite validates existing behavior; it does not prove features that have not been built.
