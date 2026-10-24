# Phase 0 — source preservation and development baseline

Owner: Maur1k. Updated 2026-10-25 (Asia/Singapore).
Status: final verification in progress. Phase 1 is not authorized.

## Delivered

- Imported all 172 files from Lovable's Download codebase ZIP at revision
  `8c1b2541b4e4e9c656a3fef00aab9be256da72ab`, including original artwork,
  optimized assets and reference screenshots. Source checksums are recorded in
  [the import manifest](source-import/manifest.json).
- Saved the untouched ZIP separately at
  `C:/Users/maurik/Documents/ChatGPT/ProofQuest/backups/lovable-8c1b2541-source.zip`.
  SHA-256: `b3cf91518fd5be62ccca3382e1f9d41819deb1aa056efad1546798575eb6a9f4`.
- With owner authorization, renamed the empty repository to
  [ProofQuest-reserved](https://github.com/Maur1k/ProofQuest-reserved), connected
  Lovable to GitHub, and set the new repository's name to
  [Maur1k/ProofQuest](https://github.com/Maur1k/ProofQuest). Lovable reports it connected.
  The new source repository is private; public release remains a later action.
- Retrieved the original Lovable Git history and merged it without rewriting
  published commits. The original connected tip `470a609` is an ancestor of
  the local branch. Local import tag: `source/lovable-8c1b2541`.
- Pinned Node 22.18.0 and Bun 1.4.4, added a typecheck script, contribution
  instructions, environment-file ignores and LF line-ending rules.
- Added CI for frozen install, lint, types, tests and build, with official actions
  pinned to commit SHAs and read-only repository permissions. The workflow is
  prepared locally; no hosted CI run is claimed.
- Fixed 292 formatting errors in the faithful source export. Independent review
  confirmed all 36 changed source files are formatting-equivalent to the original.
  No product behavior, tests, lint rules or dependency versions were removed/relaxed.
- Persisted the owner's instruction in AGENTS.md and both plans: stop after each
  phase and obtain explicit confirmation before starting the next.

## Verification

| Check | Result |
| --- | --- |
| Frozen dependency install | Pass |
| TypeScript | Pass |
| Existing tests | 63 passed across four files |
| Current production build | Pass; existing Cloudflare target |
| Lint after normalization | Pass; zero errors and nine existing Fast Refresh warnings |
| Source review | Formatting-only changes; all 34 public assets/reference screenshots match checksums |
| Local browser smoke | Guest entry, manual quest creation, correct answer, completion, result reload and progress totals passed |
| Artwork | Home image loaded; originals and derivatives preserved |
| Fresh checkout verification | Pending final candidate check |

Browser smoke was performed at the default 1280×720 desktop viewport on
`http://127.0.0.1:4173`. The synthetic “Phase 0 baseline check” quest lives only
on that local origin; no production user data was touched. Its result remained
100% (1/1) after reload and appeared in progress history. This is a baseline
smoke check, not the later responsive/device acceptance matrix.

Evidence logs and screenshots are under
`C:/Users/maurik/Documents/ChatGPT/ProofQuest/validation/` with the
`phase0-` prefix. The earlier test snapshot's 404 formatting errors included
export-induced newlines; the faithful ZIP baseline had 292. Windows line endings
restored by Git briefly caused additional lint failures; the formatter and
.gitattributes resolve those without suppressing checks.

## Known limitations and next phase

- Nine Fast Refresh warnings remain in mixed component/helper modules:
  QuestEditor, badge, button, form, navigation-menu, sidebar, toggle,
  DemoContext and store. They predate this work and do not fail the existing
  lint command. No unrelated module refactor was included merely to hide them.
- GitHub contains the original exported source/history. Phase 0 setup and
  formatting changes are local commits until an authorized push; production
  was not published. The CI workflow has not run on GitHub yet.
- MIT applies to original code/documentation. Artwork provenance is preserved;
  redistribution terms remain a public-release decision.
- The current build still depends on the Lovable wrapper/registry and targets
  Cloudflare. Vercel and Node portability, PDF feasibility and mobile limits
  belong to Phase 1 and have not been implemented here.

**Next eligible phase:** Phase 1 — technical feasibility, only after Maur1k's
explicit confirmation.
