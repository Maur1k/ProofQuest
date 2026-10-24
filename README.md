# ProofQuest

A responsive, open-source learning web app by [Maur1k](https://github.com/Maur1k).
Planned core flow: **PDF → quiz/test → results with explanations**.

## Current state

The existing Lovable source is imported locally, including original artwork,
optimized assets and reference screenshots. Programming quests and manual
practice work; document study and account forms are still labeled demos.
Real PDF import, AI generation and responsive expansion are later phases.

Phase 0 prepares the source and development baseline. Every subsequent phase
requires Maur1k’s explicit confirmation. See the
[phased roadmap](docs/development-phases.md),
[implementation specification](docs/web-implementation-plan.md) and
[Phase 0 handoff](docs/phase-0-handoff.md).

## Development

Use **Node 22.18.0** and **Bun 1.4.4**:

```sh
bun install --frozen-lockfile
bun run dev
```

Open the local URL printed by Vite. No API key or account is needed for the
existing manual/sample app. No real account is created by the prototype forms.

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
The ZIP backup preserves source files but not original Git history.
Historical Flutter plans and handoff references remain for context; Flutter
development is cancelled.

## License

Original code and documentation: [MIT](LICENSE), copyright 2026 Maur1k.
Dependencies retain their own licenses. Artwork and branding have separate
provenance and terms in docs/development-handoff/asset-manifest.json; MIT does
not grant artwork rights. Distribution terms must be resolved before release.
