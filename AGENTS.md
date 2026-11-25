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
- Follow docs/development-phases.md. Phase 2 was accepted on 2026-10-30 with native zoom verification assigned to the owner. Phase 3 is complete and pushed. Phase 4 is complete as of 2026-11-10 within the owner-approved scope explicitly excluding physical-phone testing; see docs/phase-4-handoff.md. Do not claim physical-device validation. Phase 4 was pushed on 2026-11-10 at 030f0fc. The owner authorized completion of Phase 5 on 2026-11-11. Phase 5 is complete locally; see docs/phase-5-handoff.md. Phase 5 was subsequently pushed with owner authorization at b9adce9; publication was not performed. The owner subsequently authorized finishing Phase 6 on 2026-11-11. Phase 6 remains in progress; see docs/phase-6-progress.md. Provider selection remains pending after the owner asked about Groq limits. Finish authorized independent work, but do not claim the phase complete without its live generation and quality exit checks. Stop before Phase 7. The owner prefers free generation; provider/backend/allowance decisions remain pending and no spending is authorized. No Phase 6 push or publication is authorized.
- At the end of EVERY phase, report results and stop. Obtain explicit confirmation from Maur1k before starting the next phase.
- All code edits and testing happen locally. Never send Lovable AI editing/build prompts. Git synchronization is separate from AI editing.
- Do not rewrite published history. Keep historical handoff/Flutter documents as references; the active web plan governs future work.

- Real PDF imports live in `src/features/documents/`, separate from the sample demo. Lazy-load the pinned PDF.js adapter only after hydration; retain real workers, cancellation, deadlines and local assets. `extractedPages` records deliberate selection; absent on older documents means all pages. Validate document/page mapping atomically and preserve it in backups. The 5 MiB/10-page development guards are not validated mobile capacity.

- Phase 6 expansion approved on 2026-11-11: subject-neutral quizzes, reviewers and flashcards are all required; programming remains optional examples. Follow docs/phase-6-expansion.md. Preserve existing data, require source evidence, flag unsupported/image-dependent content, and do not claim larger-PDF or live AI support until validated. Provider choice remains pending.

- Four-choice study workflow is implemented locally; see docs/phase-6-study-flow.md. Quiz/Exam keep internal practice/test modes. Immutable reviewer/deck records and separate revisioned progress use IndexedDB version 2; export backup version 3 and accept version 2. Never enable either generation endpoint without validated provider and durable usage controls.

- 2026-11-17 update: owner supplied Groq and Upstash credentials and authorized local integration after intentionally discarding the earlier uncommitted version. Provider-pending notes above are superseded. Follow docs/ai-local-setup.md. Keep secrets server-only, default generation disabled, and complete quality/browser exit checks before declaring Phase 6 complete. No push, deployment, spending or Phase 7 authorization.

- Phase 6A is authorized and in progress as of 2026-11-17. Follow docs/phase-6a-progress.md. New-output quality checks must never change historical grades or legacy parsing. All generation formats remain disabled pending live acceptance; PROOFQUEST_APPROVED_FORMATS defaults empty. Stop before 6B.


- 2026-11-17: owner explicitly authorized starting 6B despite pending 6A live acceptance. Follow docs/phase-6b-progress.md. Schema 3 and backup v4 now include source revisions. Unified-source generation remains unfinished and disabled; do not claim 6B complete. Stop before 6C. This supersedes the earlier stop-before-6B instruction only.

- 2026-11-24: owner authorized finishing 6A/6B. Unified-source implementation/workflow checks are complete; see docs/phase-6b-progress.md. Schema 4/backup v5 supersede earlier source migration notes. 6A factual acceptance is still unmet; exact citations and structural checks are not factual verification. Keep generation disabled/format allowlist empty and normal cap20. See docs/phase-6a-progress.md for the concrete semantic-verifier proposal requiring the owner's decision. No 6C, push, publication or paid usage.

- 2026-11-24 simplification supersedes the earlier active demo/onboarding/navigation guidance. Follow docs/simplification-plan.md. S1 retires those entry points into a read-only Archive and stops fresh sample seeding; preserve readers, snapshots and backup support. IndexedDB remains schema 4, backup remains v5. S2 and S3 each require new owner confirmation. AI quality work is separate and paused; do not add a verifier, enable generation, push or publish as part of simplification.

- 2026-11-25: owner authorized finishing S2. The guided New study workflow now replaces active PDF/source creation panels. Preserve the old PDF endpoint solely for retained-request recovery and the original reader/result deep links. See docs/simplification-plan.md for S2 validation and remaining S3 scope. Stop before S3; generation remains disabled and there is no push/publication authorization.

- 2026-11-25: owner authorized S3 through 50% only. The unified Library projection and source/material/result navigation are implemented and checked locally; see docs/simplification-plan.md. Stop at this halfway checkpoint. Full compatibility/browser acceptance, old-entry redirects and dead-UI cleanup remain pending further owner authorization. No push, publication or AI enablement.

- 2026-11-25: owner explicitly authorized updating Markdown and pushing current progress through S3 50%. Earlier no-push instructions are superseded for this snapshot only. Stop implementation at S3 50%; publication and AI enablement remain unauthorized.

- 2026-11-26: owner authorized finishing S3 and committing locally. S3 is complete; see docs/simplification-plan.md for evidence and limitations. Stop before further development. This authorization does not include a new push/publication or AI enablement. Keep schema 4/backup v5 and archived data support intact.
