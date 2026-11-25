# ProofQuest

A responsive, open-source learning web app by [Maur1k](https://github.com/Maur1k).
Core flow: **Add PDF or text → choose Flashcards, Quiz, Exam or Reviewer → review and create → study → results**.

## Current state

Updated 2026-11-26. ProofQuest preserves the original Lovable styling and runs as a responsive guest web app. Development and testing happen locally, without Lovable AI editing.

- Local PDF import, selected-page extraction, original-page previews and browser saving work without AI. Pasted text uses the same guided study flow.
- New study provides three steps and four study modes, exact-text review and explicit consent before any AI transfer.
- Library groups saved sources, study materials and related results. Quiz and Exam reuse saved questions. Older ambiguous records remain under Other saved materials.
- Retired Quests and identifiable samples remain readable in Archive. IndexedDB schema 4 and backup v5 preserve existing records and historical grades.

**Simplification S1, S2 and S3 are complete locally.** Unified Library, preserved legacy data, retired-entry redirects and unused-screen cleanup are validated. See the [completion handoff](docs/simplification-plan.md). Physical-phone testing is excluded; AI factual-quality acceptance remains a separate unresolved gate.

Groq generation and Upstash usage-control integration exist, but **AI generation remains disabled**. Factual-quality acceptance is unresolved; PDF-to-study generation is not a released feature. Passing workflow tests does not certify factual accuracy. See [AI setup](docs/ai-local-setup.md) and [Phase 6A status](docs/phase-6a-progress.md).

Development stops at owner-approved checkpoints. See the [phased roadmap](docs/development-phases.md) and [implementation specification](docs/web-implementation-plan.md). GitHub progress does not imply live-host publication or release acceptance.

## Development

Use **Node 22.18.0** and **Bun 1.4.4**:

```sh
bun install --frozen-lockfile
bun run dev
```

Open the local URL printed by Vite. No API key or account is needed for the
local import and saved-study workflows. Account routes redirect to the guest experience.

```sh
bun run lint
bun run typecheck
bun run test
bun run build
```

See [contributor instructions](CONTRIBUTING.md). Dependencies use the original
frozen Bun lockfile; avoid installing with another package manager.

## Source and hosting

Reuse the [Lovable project](https://lovable.dev/projects/020eed6a-df65-4e71-b47f-c5ada619051b).
All code editing/testing happens locally; no Lovable AI editing prompts.
Lovable is the primary host and Vercel the planned backup. Backup readiness
requires later build/runtime and recovery verification. The baseline build
targets Cloudflare; a successful build alone does not prove Vercel support.

Source import details and checksums are in docs/source-import/manifest.json.
The original ZIP preserves files only; the separate Phase 0 Git bundle also preserves the retrieved history.
Historical Flutter plans and handoff references remain for context; Flutter
development is cancelled.

## License

Original code and documentation: [MIT](LICENSE), copyright 2026 Maur1k.
Dependencies retain their own licenses. Artwork and branding have separate
provenance and terms in docs/development-handoff/asset-manifest.json; MIT does
not grant artwork rights. Distribution terms must be resolved before release.

## Portable builds and PDF feasibility

See [Phase 1 handoff](docs/phase-1-handoff.md) for verification and pending phone validation, and [hosting commands](docs/decisions/001-hosting-portability.md) for explicit Node, Vercel and Lovable build targets. The [PDF experiment](experiments/pdf-feasibility/README.md) is separate from the current sample-only study flow. Live backup deployment remains a later release step.

Phase 6 now includes all three study formats. The four-choice UI, saved reviewer/flashcard screens, durable storage and compatible backup recovery are implemented locally. Live generation remains disabled; provider integration and quality evaluation are still pending. See [study-flow verification](docs/phase-6-study-flow.md). See [expanded scope](docs/phase-6-expansion.md).
