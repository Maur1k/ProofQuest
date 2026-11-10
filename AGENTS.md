<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Domain logic (types, answer checking, validation, stats/mastery, storage parsing) lives in `src/domain/` as pure functions; UI never re-implements it. Why: testable and portable to the responsive web implementation.
- App state is one React context in `src/store/`, initialized after hydration and saved through typed IndexedDB repositories in `src/data/`. Keep the v1 localStorage source for rollback; never overwrite it during normal saves. Await transaction completion before showing success. Explicit temporary mode is memory-only. See docs/phase-3-data-contracts.md.
- State changes go through the pure reducer in `src/store/reducer.ts`, which enforces one unfinished attempt per quest and one answer per question. Why: prevents duplicate records regardless of UI double-clicks.
- Legacy attempts retain recorded outcomes and answered-only scoring; history uses original/reconstructed/missing question snapshots. New quiz sessions copy immutable versions and persist mode/order/grading version. Never regrade migrated history or present reconstructed content as original.
- Study-to-Quest is a UI-only demo in `src/demo/`: static sample lessons, pure deterministic generation/validation in `logic.ts`, and a memory-only `DemoProvider` that never touches the store, reducer or localStorage; sample drag-and-drop uses pointer events with capture (touch-safe), never reads real files. Why: preview the flow without real uploads, AI or persistence, and keep real progress untouched.
- Onboarding/account demo lives in `src/onboarding/`: the only persisted value is the isolated `proofquest:onboarding:v1` key (pure read/write in `preference.ts`, in-memory fallback when storage fails); Home now opens directly for guests without reading that preference; `/intro` is optional and finishes at Home. `/welcome`, `/login` and `/register` redirect only to Home; prototype account components remain unused references. Why: no credential collection or onboarding gate, while preserving existing quest data and editor guards.
- Full-screen routes (`/intro`, `/welcome`, `/login`, `/register`) are listed in `BARE_PATHS` in `AppShell` and render without bottom nav. Why: no app navigation behind onboarding/auth screens.
- Artwork originals live in `public/assets/proofquest/original/` and are never modified; the app uses resized WebP derivatives. `docs/development-handoff/` is the handoff package (tokens, specs, manifest, Flutter mapping, QA); update it when behavior or tokens change. Why: stable, project-owned assets and a verifiable source/design baseline.

## Phase approval gates
- Follow docs/development-phases.md. Phase 2 was accepted on 2026-10-30 with native zoom verification assigned to the owner. Phase 3 is complete and pushed. Phase 4 is complete as of 2026-11-10 within the owner-approved scope explicitly excluding physical-phone testing; see docs/phase-4-handoff.md. Do not claim physical-device validation. Stop before Phase 5, which is unauthorized.
- At the end of EVERY phase, report results and stop. Obtain explicit confirmation from Maur1k before starting the next phase.
- All code edits and testing happen locally. Never send Lovable AI editing/build prompts. Git synchronization is separate from AI editing.
- Do not rewrite published history. Keep historical handoff/Flutter documents as references; the active web plan governs future work.

- Real PDF imports live in `src/features/documents/`, separate from the sample demo. Lazy-load the pinned PDF.js adapter only after hydration; retain real workers, cancellation, deadlines and local assets. `extractedPages` records deliberate selection; absent on older documents means all pages. Validate document/page mapping atomically and preserve it in backups. The 5 MiB/10-page development guards are not validated mobile capacity.
