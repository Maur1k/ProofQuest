# ProofQuest

A responsive, open-source learning web app by [Maur1k](https://github.com/Maur1k).
Planned core flow: **PDF → quiz/test → results with explanations**.

## Current state

ProofQuest reuses the original Lovable source and artwork. Guest access, manual
programming quests, local PDF import, selected-page text extraction, original-page
previews and browser-based document saving are implemented.

Phase 5 is approximately 50% complete locally: the labeled five-question sample
MCQ Practice quiz supports durable start/resume, submitted-answer feedback and
save recovery. It is not PDF-generated. Test-mode UI, new quiz results/history
and AI generation remain in development. This local checkpoint has not been
pushed or published.

Development stops at owner-approved checkpoints. See the
[phased roadmap](docs/development-phases.md),
[current Phase 5 checkpoint](docs/phase-5-50-checkpoint.md) and
[implementation specification](docs/web-implementation-plan.md).

## Development

Use **Node 22.18.0** and **Bun 1.4.4**:

```sh
bun install --frozen-lockfile
bun run dev
```

Open the local URL printed by Vite. No API key or account is needed for the
manual/sample app. Account routes redirect to guest Home.

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
