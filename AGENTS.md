<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This repository is connected to [Lovable](https://lovable.dev). Commits pushed
> to the connected branch sync to the Lovable project. Do not force-push, rebase,
> amend, or squash published history; it may damage the Lovable project history.
<!-- LOVABLE:END -->

# Agent instructions

Read [the system progress handoff](docs/system-progress-handoff.md) for current product, roadmap, deployment and AI status. Read the relevant phase file before changing its area. Historical dated notes describe past checkpoints and do not override the newest status.

## Current product state

- ProofQuest is a guest-first, local-first responsive web study app: **Add material → Choose study mode → Review and create → Study → Results**.
- Main destinations are New study and Library. Study modes are Flashcards, Quiz, Exam and Reviewer. Settings contains Data & backup, Archive and About.
- Phases 0–5, simplification S1–S3, and UI/UX refinement checkpoints 1–5 are complete. Phase 6A AI factual acceptance is unresolved; generation is disabled. Vercel is a planned, unverified backup host. No public release or AI enablement follows from documentation or a source push.
- Current data contracts are IndexedDB schema 4 and backup format v5. Do not change them without an explicit migration design, compatibility coverage and owner authorization.

## Architecture and data rules

- Keep domain types, validation, scoring and projections as pure functions in `src/domain/`. UI must not reimplement these rules.
- Keep routes thin; UI in `src/features/` and shared `src/components/`; app commands/state in the existing `src/store/`; persistence in typed `src/data/` repositories.
- Await durable transactions before showing success. Preserve explicit temporary mode, migration recovery and backup conflict handling.
- New Quiz/Exam sessions use immutable question snapshots. Do not edit/regrade historical outcomes. Keep `practice` and `test` as internal modes for visible Quiz and Exam.
- Preserve source revisions, citations, local PDF access, selected-text consent, backup compatibility and Archive readers. Never infer ambiguous legacy source associations.
- Preserve original artwork in `public/assets/proofquest/original/`; derivatives and asset terms are documented separately. MIT code licensing does not grant artwork rights.

## AI and secrets

- AI generation is off. `PROOFQUEST_APPROVED_FORMATS` defaults empty. Never enable a format, raise production limits, run live provider calls, or add a semantic verifier without explicit owner authorization and satisfaction of [Phase 6A acceptance](docs/phase-6a-progress.md).
- Keep Groq/Upstash credentials server-only in ignored local environment files. Never print, commit, upload, or place credentials in browser bundles, URLs, logs, fixtures, or documentation.
- Explicit user review and consent are required before selected source text is sent to an AI provider. Structural validity and exact quotations do not prove factual correctness.
- Keep free/paid usage limits honest. No paid billing, public deployment, host switch, or custom-domain change is implied.

## Work and release boundaries

- Follow [development-phases.md](docs/development-phases.md) and [simplification-plan.md](docs/simplification-plan.md). Checkpointed work stops at its agreed boundary; get owner direction before beginning another phase or resolving a material product decision.
- Make code changes locally. Do not use Lovable AI to edit/build. Git sync and publishing the live site are separate; a commit/push does not prove that a public deployment was republished.
- Commit or push only when the owner explicitly asks. Never rewrite published history.
- Keep historical phase evidence, source manifests, asset provenance and Flutter/design references unless an owner explicitly requests their removal. Remove generated build/cache artifacts only when safe and reproducible; preserve dependencies, secrets, and host configuration.
- Update the README, [system handoff](docs/system-progress-handoff.md), and the relevant phase record when the current project status materially changes.

## Validation

Use Node 22.18.0 and Bun 1.4.4 with the committed Bun lockfile. Run the checks relevant to the requested change and report their scope and limits accurately. Browser viewport checks do not establish physical-device support. Build, schema, citation and unit checks do not establish AI factual acceptance.
