# ProofQuest

ProofQuest is a responsive, open-source study app by [Maur1k](https://github.com/Maur1k). Add a PDF or text, choose how to study, then review saved material and results.

**Current status — 2026-11-28:** The local-first study workflow and UI simplification are implemented. AI provider and shared usage-control integration exist, but generation remains **disabled** because factual-quality acceptance failed. Do not present PDF-to-AI study generation as available. See the [system progress handoff](docs/system-progress-handoff.md) for the complete status and next-agent guide.

## What works

- Import a PDF, select pages, extract text locally, preview the original pages, and save the source in this browser; pasted text is also supported.
- Choose **Flashcards**, **Quiz**, **Exam**, or **Reviewer** in one guided flow.
- Read saved, source-linked material in Library. Quiz and Exam reuse the same saved question version.
- Resume attempts and view immutable Quiz/Exam results and explanations.
- Export or import a versioned backup. Older Quests, attempts, and identifiable sample content remain available as read-only Archive records.
- Use the app as a guest. No login is required.

Local PDF extraction and saved study workflows do not require AI. Scanned/image-only PDF content is not extracted with OCR. Saved data belongs to the current browser and site origin; use **Settings → Data & backup** before changing browser, device, or host.

## Current architecture

- React 19, TypeScript, TanStack Start/Router, Tailwind CSS, and PDF.js.
- Pure domain logic in `src/domain/`, UI in `src/features/`, application commands/state in `src/store/`, and typed IndexedDB repositories in `src/data/`.
- IndexedDB schema **4**, backup format **v5**. Preserve legacy adapters and immutable historical results.
- Server-only Groq generation integration and Upstash shared usage controls. Generation is off and the approved format allowlist is empty pending factual review and release checks.

## Development

Use Node **22.18.0** and Bun **1.4.4**. Install from the frozen lockfile:

```sh
bun install --frozen-lockfile
bun run dev
```

Run focused checks for the files you change:

```sh
bun run lint
bun run typecheck
bun run test
bun run build:node
bun run test:node
```

The repository is connected to Lovable; code changes are made locally and pushed through Git. Do not use Lovable AI editing prompts or rewrite published Git history. Read [AGENTS.md](AGENTS.md), [contributor guidance](CONTRIBUTING.md), and the [system progress handoff](docs/system-progress-handoff.md) before making changes.

## Roadmap and hosting

Phases 0–5 are complete; simplification milestones S1–S3 and UI/UX checkpoints 1–5 are complete. Phase 6A is **not accepted** because factual-quality review found incorrect/ambiguous AI questions. Phase 6B source implementation and workflow checks are complete; 6C–6G and Phase 7 have not started. See the [development roadmap](docs/development-phases.md), [simplification record](docs/simplification-plan.md), and [system handoff](docs/system-progress-handoff.md).

The public Lovable host is [proofquest.lovable.app](https://proofquest.lovable.app/). Vercel is the planned backup host; it has not been verified as a recovery deployment. GitHub commits sync source to the connected Lovable project, but a push alone does not confirm the public host was republished with that commit.

## Source and license

- Source: [github.com/Maur1k/ProofQuest](https://github.com/Maur1k/ProofQuest)
- Lovable project: [project editor](https://lovable.dev/projects/020eed6a-df65-4e71-b47f-c5ada619051b)
- Code and documentation: [MIT license](LICENSE), copyright Maur1k.
- Artwork retains separate provenance and terms in `docs/development-handoff/asset-manifest.json`; the code license does not grant artwork rights.

Historical phase records, source-import manifests, the early web proposal, and the cancelled Flutter plan remain under `docs/` as project history. Current product status and instructions are linked above.
