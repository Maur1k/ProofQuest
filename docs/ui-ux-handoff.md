# ProofQuest UI/UX handoff

Updated: 2026-11-28  
Repository: `Maur1k/ProofQuest`  
Branch: `main`

## Current state

ProofQuest is a responsive, open-source study app. Its intended path is **Add material → Choose study mode → Review and create → Study → Results**. Main navigation is **New study** and **Library**. Settings contains **Data & backup**, **Archive**, and **About**.

The five UI/UX refinement checkpoints are complete:

1. **New study** — simplified step progress and instructions; clearer input and mode selection, PDF upload, local-save explanation, source summary, exact-text review, and unavailable-generation state.
2. **Library** — clearer source cards, PDF/Text identification, new-study action, material/results sections, empty states, and plain-language association messaging.
3. **Study screens** — readable Quiz/Exam question and progress layouts; clearer Flashcards/Reviewer reading cards; expandable source evidence; accessible flashcard reveal state.
4. **Results** — score summary, answer-review cards, labeled explanations, expandable evidence, and responsive retry/library actions.
5. **Settings and Archive** — clearer Data & backup, Archive, and About groups; responsive backup controls; more readable archive entries and visible keyboard focus.

Implementation notes and checkpoint-specific evidence are in [simplification-plan.md](simplification-plan.md). Changes affect presentation and accessibility only. Existing stores, data schemas, backup formats, source associations, saved answers, citations, and grades were not intentionally changed.

## Important constraints

- Keep IndexedDB at schema 4 and backup format at v5 unless a separately reviewed migration is authorized.
- Preserve guest access, source-linked materials, legacy readers, archived records, history, unfinished-attempt recovery, and immutable results.
- Quiz maps to internal `practice`; Exam maps to internal `test`.
- PDF text extraction stays local. Explain and retain explicit consent before any AI transfer.
- AI generation remains disabled; approved-format allowlist is empty. Do not make provider requests, add a verifier, or claim factual-quality acceptance without a separately authorized and validated phase.
- Do not seed sample material into a fresh library or associate legacy materials with sources by guessing.
- Physical-phone validation has not been performed. Browser viewport checks are not device tests.
- Lovable is connected to GitHub. Do not rewrite published history (no force push, rebase, amend, or squash of pushed commits).
- The 2026-11-28 owner instruction authorized documenting and pushing the completed UI/UX refinement snapshot. It did not authorize publication, AI enablement, or unrelated feature work.

## Validation evidence and limits

Previously completed checkpoint checks are recorded in [simplification-plan.md](simplification-plan.md). Highlights:

- New study: 20 affected tests passed; keyboard flow, retained selections, unavailable generation, and five viewport widths checked.
- Library: 9 projection/compatibility/UI tests passed; populated and empty states checked at 320, 390, 768, 1024, and 1440 px.
- Study screens: 28 affected tests passed; keyboard evidence disclosure, Quiz feedback, saved Quiz answers, and Exam draft reload/solution hiding checked.
- Results: 18 affected tests passed; saved Quiz/Exam routes, reload persistence, keyboard evidence disclosure, and five viewport widths checked.
- Settings/Archive: focused lint and TypeScript check completed. Browser review covered backup disclosure, archive deep link, read-only saved Quest expansion, 320 px no-overflow, and no console errors. No backup operation or deletion was performed during review.
- A production Node build/artifact verification passed after the Results checkpoint. Later Settings/Archive changes received focused lint and TypeScript checks; the production build was not rerun afterward.
- No live AI request or factual-quality acceptance occurred.

Do not inflate these checks into accessibility certification or physical-device validation. This handoff captures evidence available at the time of the checkpoints.

## Suggested pickup sequence for the next agent

1. Read `AGENTS.md`, this handoff, and the active simplification section in `docs/simplification-plan.md` before changing code.
2. Check `git status`, branch, and latest commit. Preserve unrelated owner edits and never rewrite the published history.
3. Confirm the requested next task with the owner if scope is not explicit. The completed UI checkpoints do not themselves authorize another product phase or AI work.
4. If continuing UI polish, inspect the running implementation at narrow, tablet, and desktop sizes and identify a concrete issue before editing. Preserve ProofQuest branding and behavior.
5. If asked to resume AI work, begin with the existing `docs/phase-6a-progress.md`, `docs/phase-6b-progress.md`, `docs/ai-local-setup.md`, and `docs/phase-6-study-flow.md`. Keep secrets server-only and generation disabled until the documented quality and usage-control gates are met.
6. Run only checks appropriate to the requested change, record exact evidence and limitations, and update this handoff plus `docs/simplification-plan.md` when the state changes.

## Useful commands

Run from the repository root in PowerShell:

```powershell
node node_modules/eslint/bin/eslint.js <changed-files>
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vitest/vitest.mjs run <relevant-test-files>
node scripts/build-target.mjs node
node scripts/verify-build.mjs node
```

Only run broader checks when the change or owner request calls for them. Never put credentials in command output, browser URLs, or this document.

## Ownership and project links

- Author: Maur1k
- License: MIT; see `LICENSE`.
- Source repository: https://github.com/Maur1k/ProofQuest
- Live Lovable host: https://proofquest.lovable.app/
- Vercel is the planned backup host; hosting changes require a separate request.
