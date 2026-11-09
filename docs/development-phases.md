# ProofQuest — phased development roadmap

Owner: Maur1k. Updated: 2026-11-10. Status: Phase 2 accepted by the owner with native zoom verification handed to the owner. Physical-phone validation remains pending. Phase 3 pushed; Phase 4 approximately 80% checkpoint complete. Stopped at the owner-authorized limit.

Read alongside [implementation specification](web-implementation-plan.md) and [validation evidence](plan-validation-report.md). This roadmap defines delivery order; the specification retains detailed architecture, privacy, migration and hosting requirements.

## Delivery rules

- Reuse the existing Lovable application. Implement and test locally; never use Lovable AI editing prompts.
- Keep each phase small enough to review through focused changes. Preserve working programming quests and existing user data throughout.
- Complete the phase's exit checks before dependent work proceeds. Record evidence and remaining issues in a phase handoff; a passing earlier baseline does not complete a new phase.
- Tests, accessibility and error handling belong to each feature phase. Phase 7 verifies the integrated release.
- Ordinary local work within an authorized phase does not need repeated approval. At the end of EVERY phase, stop and obtain explicit confirmation from Maur1k before starting the next phase. Unresolved product/cost choices are settled at their stated decision point. Publishing, paid provisioning and domain changes remain separate actions.
- No calendar estimates until Phase 0 establishes the faithful source baseline. Track completion by demonstrated outcomes.

## Phase overview

| Phase | Outcome | Dependency |
| --- | --- | --- |
| 0 — Preserve and prepare | Complete source, clean baseline and contributor setup | None |
| 1 — Prove technical foundations | Portable builds and a bounded PDF feasibility result | 0 |
| 2 — Responsive guest experience | Existing app usable on phone, tablet and desktop | 1 |
| 3 — Durable data and quiz contracts | Safe migration, immutable versions and tested grading transitions | 2 |
| 4 — Real local PDF import | Choose/drop, read and retain a real text PDF | 3 |
| 5 — Practice, Test and results | Complete quiz lifecycle using clearly labeled fixtures/manual data | 3 and 4 |
| 6 — Real PDF-to-quiz generation | First working end-to-end PDF → quiz → result milestone | 4 and 5; provider/budget decision |
| 7 — Release and recovery verification | Tested public beta and verified Vercel backup | 0–6; release authorization |
| Later — Optional expansion | OCR, sync, PWA, sharing and richer questions | Stable core release |

The default execution order is sequential. Building the quiz lifecycle before connecting AI separates scoring/persistence defects from provider-output defects.

## Phase 0 — Preserve the source and establish a clean baseline

**Work**

- Resolve the actual Lovable/GitHub connection and intended `Maur1k/ProofQuest` source of truth without overwriting unrelated history.
- Import full source, original and optimized assets, tests, lockfile and handoff docs. Record revision and checksums; preserve history when available.
- Merge existing README, MIT license and planning documents. Record artwork provenance separately; unknown artwork rights remain a release blocker for redistribution.
- Pin Node/Bun versions and setup commands. Recheck formatting from a faithful export, resolve actual lint issues and retain meaningful tests.
- Establish local baseline commit and separate release/source backup; configure deterministic CI for authorized repository use.

**Exit checks**

- A fresh checkout installs reproducibly and passes tests, lint, typecheck and the existing production build.
- All assets resolve; manual quest creation, practice and existing progress still work.
- Setup is documented and the complete backup scope is recorded. The 137-file validation snapshot alone does not satisfy this gate.

**Review deliverable:** preserved source baseline, setup instructions and check results. Current evidence is recorded in [the Phase 0 handoff](phase-0-handoff.md): complete source/history imported, setup prepared and baseline checks rerun.

## Phase 1 — Prove hosting portability and PDF feasibility

**Work**

- Verify explicit Lovable/Cloudflare, Vercel and Node build configurations while retaining server entry and CSRF protection.
- Resolve the Lovable-controlled build dependency's continuity strategy; prove the chosen install path from a clean cache.
- Run a small PDF.js extraction/worker experiment with representative text, scanned, malformed and password-protected files, including a low-memory phone.
- Record observed memory/latency and choose file, selected-page, extracted-text and serialized-request limits. Keep the proposed 20 MB/30 pages provisional until measured.

**Exit checks**

- Each target produces the intended runtime output; the Node server starts and handles direct routes locally. Cloudflare output is not counted as Vercel output.
- PDF text retains page mapping, worker paths resolve in production output and unsupported files fail clearly.
- Findings are recorded as short architecture decisions. Live host verification remains Phase 7; local builds are not called a ready backup.

**Review deliverable:** runtime/build instructions and PDF feasibility report. See [Phase 1 handoff](phase-1-handoff.md). The owner explicitly approved finishing desktop checks with phone validation pending. Limits remain provisional and must be validated before Phase 4 depends on them; Phase 2 layout work can proceed after separate approval.

## Phase 2 — Responsive guest experience

**Partial authorization:** work through approximately 60% is complete on 2026-10-25: shared shell/navigation, guest entry and responsive home/library. See [60% checkpoint](phase-2-60-checkpoint.md) and [earlier 30% checkpoint](phase-2-checkpoint.md). Maur1k subsequently authorized finishing Phase 2. The owner accepted advancement on 2026-10-30 with native zoom verification assigned to the owner. See [final review](phase-2-final-review.md) for completed checks and verification limits.

**Work**

- Adapt AppShell, navigation, home, library and existing quest screens for compact, medium and wide layouts.
- Implement the proposed guest-first entry and safe redirects from account-demo URLs; preserve returning users and unsaved-edit guards.
- Reuse current branding and components. Keep sample actions clearly labeled while real PDF importing is still being built.

**Exit checks**

- Verify 320, 390, 768, 1024 and 1440px layouts, long content, 200% zoom, keyboard focus and touch targets.
- No page-level horizontal overflow or inaccessible primary controls; Back/Forward, refresh and direct routes work.
- Existing manual programming quests remain usable and no real credentials are collected by demo forms.

**Review deliverable:** responsive screenshots and a navigable local preview. Settle any change to the proposed no-required-login scope before changing entry behavior.

## Phase 3 — Durable data and quiz contracts

**Status:** Complete on 2026-11-01. See [Phase 3 handoff](phase-3-handoff.md) and [data contracts](phase-3-data-contracts.md). Phase 4 was subsequently authorized through approximately 20% only on 2026-11-10.

**Work**

- Add discriminated MCQ types alongside existing programming types; audit every validator, renderer and checker exhaustively.
- Introduce typed repositories and IndexedDB records for documents, page text, immutable quiz versions, attempts, answers and generation jobs.
- Implement transactional, repeatable v1 migration with rollback source retained and reconstructed history explicitly marked.
- Define and test separate Practice submission, Test draft-upsert and atomic finalization transitions. Persist mode, order, grading version and snapshots.
- Implement export/import and deliberate deletion behavior before new data becomes the user's only copy.

**Exit checks**

- Legacy IDs, recorded outcomes and scoring remain unchanged after migration, including edited/deleted source quests.
- Migration can run twice without duplicates; malformed payloads, quota failure and multi-tab conflicts are handled.
- New history survives source edits/deletion. Failed writes never display Saved.
- Unit checks prove one correct plus four skipped yields 20% in new Test mode, and repeated finalization creates one result.

**Review deliverable:** schema/transition documentation, migration fixtures and data recovery tests.

## Phase 4 — Real local PDF import and reader

**Status:** First approximately 20% complete on 2026-11-10. See [checkpoint](phase-4-20-checkpoint.md). Stop here until the owner authorizes further work.

**Work**

- Add keyboard/touch file selection and desktop dropping, file validation, page selection and extraction-quality feedback.
- Integrate the verified parser/worker through the document repository; extract incrementally and release workers/object URLs.
- Add readable preview and page navigation across layouts, cancellation and explicit OCR/password/invalid-file messages.

**Exit checks**

- Choose a real text PDF, inspect selected-page text and preview, reload and reopen the saved document.
- No silent omitted pages or invented diagram text; limits and low-text warnings are visible.
- Cancellation, malformed files and storage failure leave recoverable state. This local import stage makes no AI network request.

**Review deliverable:** working PDF import/reader on desktop and a physical mobile browser.

## Phase 5 — Practice, Test and reliable results

**Work**

- Connect MCQ UI to the tested repositories and transitions using clearly labeled deterministic fixtures/manual data.
- Implement Practice feedback, editable Test drafts, final submission, resume and consistent option order.
- Show correct/incorrect/skipped totals, explanations and source-page references; support retries and history review.

**Exit checks**

- Change a draft twice, reload and retain the latest answer; Test solutions stay hidden until finalization.
- One correct answer and four skips gives 20%; double-click/retry produces one completed result.
- Source editing/deletion does not change a completed new result; missing PDFs produce an honest unavailable-preview state.
- Export/import preserves the completed session, and legacy programming flows still pass.

**Review deliverable:** complete sample/manual quiz journey. It is not advertised as real PDF-generated content yet.

## Phase 6 — Real generation and first end-to-end milestone

**Entry decisions:** select AI provider, owner-controlled credentials, backend, monthly budget, guest allowance and general-subject MCQ scope. No paid service is provisioned merely by approving this roadmap.

**Work**

- Implement one provider behind `QuestionGenerator`, sending only selected necessary page text after explaining the transfer.
- Add server validation, payload/token limits, durable guest quotas, shared global budget enforcement, concurrency/timeouts and deduplicated jobs.
- Validate structured MCQs, evidence references and output quality; reject unsupported/invalid output before committing a quiz version.
- Add real generation states, cancellation, stale-result handling and retry. Keep existing quizzes usable during provider outages.
- Redact logs/error hooks and test synthetic document/secret sentinels against leakage.

**Exit checks**

- A real PDF produces five supported MCQs; a user finishes the quiz, sees explanations/page evidence, reloads and retains results.
- Representative document evaluation records factual correctness and citation support, not merely schema validity. Agree measurable quality acceptance criteria before evaluation and resolve unsupported answers in the release set.
- Invalid output, timeout, budget exhaustion, concurrent requests and counter failure behave as specified; no secret appears in client output or logs.

**Review deliverable:** local end-to-end demonstration and provider quality/cost evidence. This is the first complete core-product milestone.

## Phase 7 — Public beta and backup readiness

**Work**

- Run integrated regression, accessibility, real Android/iOS/tablet and desktop checks, including long PDFs, reload and failure recovery.
- Complete contributor/self-hosting instructions, environment examples, MIT notices, artwork terms and user data-transfer/deletion explanations.
- Prepare the same release for Lovable primary and Vercel backup; verify routes, PDF worker, SSR, generation, quota handling and stored results on actual previews.
- Decide running versus on-demand backup; ensure shared budget enforcement or disable standby generation.
- Rehearse manual recovery and record duration. Verify export/import for a hostname change; do not promise inaccessible old-origin data can be recovered.
- Present tested release notes and outstanding limitations, then publish when authorized. Verify public access after publication and retain a rollback release.

**Exit checks**

- All required checks pass with recorded device/browser scope; unresolved critical data loss, scoring, privacy or generation faults block release.
- Complete source/assets are backed up, the Vercel recovery procedure has been exercised and credentials are portable.
- Production is verified after an authorized publish. No custom-domain purchase or DNS switch is implied.

**Review deliverable:** release candidate evidence, recovery runbook and then verified public beta.

## Deferred work

OCR for scanned PDFs, accounts/cloud sync, installable PWA/offline startup, shared quizzes and additional question formats follow a stable core release. Each needs its own scope and tests; none is required to start using the public web app.

## Phase handoff template

- Phase and status: not started / in progress / blocked / complete.
- Delivered behavior and relevant files or change set.
- Commands/checks run, results and demonstrated preview.
- Known limitations and unresolved decisions.
- Exit criteria satisfied and next eligible phase.

Phase 0 was authorized on 2026-10-24 and completed on 2026-10-25. The completion evidence is in docs/phase-0-handoff.md. Phase 1 was authorized and its desktop scope completed on 2026-10-25. Physical-phone validation remains pending by owner instruction. Phase 2 through approximately 60% was subsequently authorized and completed. Phase 2 was accepted for advancement on 2026-10-30; native zoom verification is assigned to the owner. Phase 3 is complete as of 2026-11-01. Phase 4 was authorized through approximately 20% on 2026-11-10, after pushing Phase 3. The owner then authorized progress through approximately 80%; that checkpoint is complete (docs/phase-4-80-checkpoint.md). Obtain confirmation before the final Phase 4 acceptance package.
