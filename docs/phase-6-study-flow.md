# Phase 6: four-choice study workflow

Workflow status: implemented and retained in the current app. Phase 6 overall remains incomplete because factual-quality acceptance failed; AI generation remains disabled. Groq and Upstash are integrated server-side, but their presence does not enable generation. Current schema is 4 and backup format is v5; older implementation-specific version numbers below are historical notes from this original checkpoint. See the [current Phase 6 rollup](phase-6-progress.md), [6A quality gate](phase-6a-progress.md), and [system handoff](system-progress-handoff.md).

## Delivered

- PDF reader offers Flashcards, Quiz, Exam and Reviewer as keyboard-selectable cards, stacked on narrow screens and arranged in grids at wider widths. The choices and selected-text preview remain visible when generation is disabled.
- Quiz maps to existing Practice behavior; Exam maps to existing Test behavior. Internal mode names and saved history remain unchanged. Both can start/resume from the same stored question version without generation. Initial generation remains five questions and exams have no timer.
- Only the selected content format is requested after transfer consent. Changing format clears consent. Returned content survives a local save failure in the current tab so saving can be retried without another request. Quiz and Exam share the quiz endpoint; reviewer/deck requests include their format in the separate study endpoint. Both endpoints remain disabled in production.
- Saved materials are accessible from Home and each PDF reader, including when AI is unavailable. Reviewers render source-linked sections, key terms and comparisons. Flashcards reveal answers/evidence and persist position/reveal state, resetting reveal when moving cards. Save failures retain the last durable state; revision checks reject stale cross-tab writes.
- Original-page links reuse the existing missing-source handling. Saved content and source excerpts remain available after PDF deletion. Explicit exclusions identify image-dependent or unsupported material.
- IndexedDB upgrades from version 1 to 2 add materials and studyProgress stores without replacing existing stores. Version-3 backups include them; existing version-2 backups remain accepted. Restores reject conflicting source text, altered checksums and orphan/out-of-bounds progress atomically. Selected source text is retained locally with material to validate saved content and backups.

## Validation

237 tests across 28 files pass. TypeScript passes; ESLint has zero errors and the existing nine Fast Refresh warnings. Node production build, artifact verification and route smoke checks pass.

Browser acceptance used explicitly labeled, authored validation fixtures restored through the real backup UI, not live AI output. Verified four selectable choices, keyboard-arrow navigation, saved reviewer evidence and comparison table, card reveal, next-card reveal reset, position retained after reload, Quiz immediate feedback, Exam hidden solutions before submission, and 20% for one correct plus four skipped answers.

Checked 320px, 390px and 768px viewport overflow and desktop layout. Mobile reviewer and flashcard views fit the viewport. These are browser viewport checks, not physical-device testing. Screenshot: C:/Users/maurik/Documents/ChatGPT/ProofQuest/validation/study-four-choices.jpg.

## Remaining Phase 6 work

Real provider and durable shared usage controls are still pending. The future study server handler must bind format and source fingerprint to its job identity and use the same consent, quotas, bounded output, deadlines and privacy rules as quiz generation. This change does not claim real AI output or provider-side deduplication is deployed.

Live quality evaluation, request recovery across reload during generation, and larger-PDF validation remain outstanding. The existing 5 MiB import limit is unchanged. The supplied parasitology document was not transmitted or included in fixtures. Do not mark Phase 6 complete or begin Phase 7.
