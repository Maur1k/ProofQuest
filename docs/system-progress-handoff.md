# ProofQuest system progress and status handoff

Updated: 2026-11-28 (Asia/Singapore)  
Owner: Maur1k  
Repository: https://github.com/Maur1k/ProofQuest  
Current branch: `main`; latest pushed UI handoff commit: `a4d4844`

This is the broad system status for an agent taking over future ProofQuest work. For the narrower presentation checkpoint details, read [ui-ux-handoff.md](ui-ux-handoff.md). This document is the current summary; phase documents remain the detailed evidence and design record.

## Product and delivery status

ProofQuest is an open-source, guest-first, local-first web study app by Maur1k, licensed under MIT. The core user journey is:

**Add material → Choose study mode → Review and create → Study → Results**

Users can import PDFs and extract selected page text locally, or paste text. They can choose Flashcards, Quiz, Exam, or Reviewer. Saved sources, materials, progress, and quiz attempts live in browser storage and are accessible through Library. New study and Library are the two main destinations. Settings provides Data & backup, Archive, and About.

The five recent UI refinement checkpoints—New study, Library, study screens, Results, and Settings/Archive—are complete and pushed in `a4d4844`. The detailed behavior, validation evidence and limits are documented in [UI/UX handoff](ui-ux-handoff.md).

## Technical architecture

- **Client:** React 19, TypeScript, TanStack Start/Router, Tailwind CSS, PDF.js.
- **Domain:** pure rules and projections in `src/domain/`; keep scoring, validation and result interpretation out of UI components.
- **Application state:** one React context in `src/store/` exposes commands and state.
- **Persistence:** typed IndexedDB repositories in `src/data/`, guest/local-first operation, immutable quiz versions and submitted results. Current IndexedDB schema is **4**; current backup format is **v5**.
- **PDF handling:** local PDF.js extraction and original-page reader. Selected text and source revisions are retained for citations and reproducible materials. Scanned/image-dependent content is not supported by OCR.
- **AI boundary:** provider/server modules are separate from the browser and repositories. Text is sent only after user review and explicit consent. Provider credentials are server-only.
- **Compatibility:** legacy Quests, decks, reviewers, attempts and results remain available through adapters/read-only Archive. Do not invent source associations or regrade historical results.

Do not change schemas, migration behavior, source retention, backups, or legacy readers as incidental UI cleanup. Any data-contract change needs its own migration review and compatibility checks.

## Roadmap state

| Area | Status | Notes |
|---|---|---|
| Phases 0–5 | Complete | Foundations, data contracts, local PDF workflow, and Practice/Test/Results. Phase 5 implementation was pushed at `b9adce9`. See phase handoffs and [development phases](development-phases.md). |
| Phase 6 product workflow | Implemented | Four-choice study flow, unified source/revision contracts, local saving, history and compatibility. Current schema 4 / backup v5. |
| Phase 6A quality acceptance | **Incomplete / failed gate** | Manual review found incorrect or ambiguous MCQ answers from public PDF content. Structural validation and citations are not factual verification. Do not enable generation. See [6A progress](phase-6a-progress.md) and [validation record](phase-6-validation-2026-11-24.md). |
| Phase 6B source expansion | Implementation complete locally | Unified source/revision workflow and backup support are implemented and checked. Its progress document may say local-only; latest UI commit does not include or authorize pushing the Phase 6 implementation itself. See [6B progress](phase-6b-progress.md). |
| Phase 6C–6G | Not started | Expansion architecture is planning material, not implementation approval. See [study expansion architecture](study-expansion-architecture.md). |
| Phase 7 public beta | Not started | Requires integrated device/release, hosting, recovery, privacy and authorization checks. |

The simplification work S1–S3 and subsequent UI refinements are recorded in [simplification-plan.md](simplification-plan.md). UI refinements do not mean AI quality acceptance or Phase 6 is complete.

## AI generation and open decisions

AI generation is **disabled**. `PROOFQUEST_APPROVED_FORMATS` defaults to an empty allowlist, and all approved formats remain empty. Keep the normal shared cap at 20; do not use temporary test overrides in production. Do not send a private document or reveal `.env.local` values.

The current implementation has a Groq provider integration and Upstash shared usage controls in the local system configuration. The recorded model/profile were Groq `openai/gpt-oss-120b` and prompt profile `source-evidence-v2` at the last AI validation. Credentials are secrets and are intentionally not recorded here.

Outstanding release gates include:

1. Owner decision on a second, independent semantic review call. The proposed approach and its free-tier capacity tradeoff are in [6A progress](phase-6a-progress.md). It is not implemented or approved by this handoff.
2. Agree a measurable factual-quality acceptance standard and complete the 30-question and representative-PDF gates. Existing structural and exact-citation checks do not satisfy these gates.
3. Validate durable guest/global reservations, concurrency, idempotency, failure accounting, origin/CSRF protection, and safe logs under the actual deployment runtime.
4. Validate request recovery across reload, cached-result retention/deletion, privacy copy, provider limits and counter outages.
5. Complete the authorized live browser path on real extracted PDF text, including saved material/result reload and source evidence.

See [Phase 6 overview](phase-6-progress.md), [AI setup and remaining checks](ai-local-setup.md), [6A quality gate](phase-6a-progress.md), [6B implementation](phase-6b-progress.md), and the [Nov 24 validation record](phase-6-validation-2026-11-24.md). Never state that a correct citation proves an answer is correct. Do not run live calls or broaden limits without explicit authorization.

## Hosting, source and release

- The published preview host is [proofquest.lovable.app](https://proofquest.lovable.app/).
- GitHub is the source of truth at [Maur1k/ProofQuest](https://github.com/Maur1k/ProofQuest), branch `main`. The repository is connected to Lovable; pushing to the connected branch synchronizes source into that project. Do not edit through Lovable AI and do not rewrite pushed history.
- Vercel is the planned backup host, not yet a verified standby/recovery deployment in this handoff. Phase 7 must verify runtime compatibility, server secrets, PDF assets/workers, routes, shared limits and a documented recovery rehearsal before calling it ready.
- No public release, publication, Vercel deployment, custom-domain change, paid service or billing enablement is authorized by this status document.

## Git and current working state

The last recorded push is `a4d4844` (`Polish ProofQuest study UI and add agent handoff`), following S3 commits `e1e8673` and `7a6f215`. Check `git status -sb` and the remote before editing. The intended baseline for a new agent is a clean `main` at `a4d4844`; preserve any newer owner changes if this document has become stale.

The owner requested this whole-system handoff, refreshed current-facing Markdown, generated-artifact cleanup, and a push of this documentation cleanup on 2026-11-28. No application-code changes are part of this scope.

## Safe pickup instructions

1. Read `AGENTS.md` first, then this document and the referenced active status files. Some older sections are historical and are superseded by later dated checkpoints; use the newest evidence, not the oldest future-tense plan.
2. Check current branch, upstream, working tree, and latest remote commit. Do not discard owner files or uncommitted work.
3. Identify the owner's explicit next objective. The next implementation area is not automatically authorized by this handoff. Ask only if the task scope or a consequential decision is genuinely missing.
4. Keep generation disabled, all format allowlists empty, and secrets out of chat, client bundles, logs and documents. Never make a provider call as an exploratory check.
5. For implementation, preserve domain/store/repository boundaries, schema 4, backup v5, legacy read access and immutable results. Make the narrowest change that meets the requested objective.
6. Validate only what the requested change needs; report commands and outcomes accurately. Browser viewport checks do not equal physical-device validation; lint/build/JSON checks do not equal factual AI validation.
7. Update the relevant phase handoff and this system snapshot when status changes. Commit/push only when explicitly authorized, and never force-push, rebase, amend, or squash published commits.

## Common local checks

Run from the repository root, using the package scripts or equivalent:

```powershell
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vitest/vitest.mjs run <relevant-test-files>
node scripts/build-target.mjs node
node scripts/verify-build.mjs node
node scripts/smoke-node.mjs
```

Use `node node_modules/eslint/bin/eslint.js <changed-files>` for focused lint. Full validation and historical counts vary by checkpoint; use the relevant handoff for the tested snapshot instead of repeating stale counts as current proof.

## Source-of-truth documents

- [Project instructions](../AGENTS.md)
- [Development roadmap](development-phases.md)
- [Simplification and UI checkpoints](simplification-plan.md)
- [UI/UX handoff](ui-ux-handoff.md)
- [Phase 6 overview](phase-6-progress.md)
- [AI local setup](ai-local-setup.md)
- [Phase 6A quality gate](phase-6a-progress.md)
- [Phase 6B source implementation](phase-6b-progress.md)
- [Phase 6 validation record](phase-6-validation-2026-11-24.md)
- [Study expansion proposal](study-expansion-architecture.md)
- [Phase 7 public beta plan](development-phases.md#phase-7--public-beta-and-backup-readiness)
