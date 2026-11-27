# Phase 6 — PDF study materials and AI status

Current rollup: 2026-11-28. **Phase 6 is not complete. AI generation remains disabled.** This file summarizes the current status; the linked 6A/6B records contain detailed evidence. Historical percentage checkpoints and implementation notes were recorded in this file before it was consolidated and are preserved in Git history.

## Implemented product foundation

- Subject-neutral PDF and pasted-text sources with local extraction, explicit page/paragraph selection, source revisions and immutable saved materials.
- Four study formats: Flashcards, Quiz, Exam, Reviewer. Quiz and Exam reuse the same saved question version and existing internal `practice`/`test` session rules.
- User review and explicit consent precede any AI transfer. Existing saved content, source references, progress, results, and recovery flow remain available.
- Groq inference and Upstash shared usage controls are integrated behind server paths. Current model/profile at last validation: `openai/gpt-oss-120b` / `source-evidence-v2`.
- Current persistence contracts: IndexedDB schema 4, backup v5. Keep legacy records and completed grades intact.

## Release gate: factual quality

Phase 6A acceptance **failed** in manual review. Public-PDF output contained a wrong percolation/infiltration key and a questionable cloud-condensation-nucleus distractor; browser generation also produced ambiguous/incorrect MCQs. Schema validation and exact source evidence did not prevent these errors. Keep the approved-format allowlist empty and generation disabled. Do not describe PDF-to-AI material generation as released or fact-checked.

The owner has not authorized a semantic verifier or the next 6C–6G milestones. The independent second-review proposal, its cost/capacity tradeoffs, and required quality gates are detailed in [Phase 6A progress](phase-6a-progress.md). Do not make live provider calls or change limits as an exploratory test.

## Current outstanding work

1. Owner decides whether to pursue the second semantic review call and agrees measurable factual acceptance criteria.
2. Pass the minimum accepted-question corpus and representative public-PDF review against the current unified-source prompt.
3. Validate atomic shared/guest quotas, concurrency, failure accounting, request idempotency, origin/CSRF protection, timeouts and outages in the intended host runtime.
4. Validate generation recovery across reload, result retention/deletion, privacy disclosure and credential/log redaction.
5. Complete an authorized real PDF → material → study → result/reload browser acceptance without transmitting private documents.
6. Confirm PDF size/page limits and host configuration; larger-PDF and physical-phone capacity are not certified.

## Detailed records

- [6A factual quality gate](phase-6a-progress.md)
- [6B unified sources and migrations](phase-6b-progress.md)
- [Four-choice study workflow](phase-6-study-flow.md)
- [AI local setup and operational checks](ai-local-setup.md)
- [2026-11-24 validation record](phase-6-validation-2026-11-24.md)
- [Study expansion architecture proposal](study-expansion-architecture.md)

The product workflow and recent UI/UX simplification are documented separately in [simplification-plan.md](simplification-plan.md). Those completions do not satisfy the AI quality gate or authorize Phase 7.
