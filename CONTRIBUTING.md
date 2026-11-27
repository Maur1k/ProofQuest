# Contributing to ProofQuest

Start with [AGENTS.md](AGENTS.md), the [system progress handoff](docs/system-progress-handoff.md), and the current [development roadmap](docs/development-phases.md). Confirm the owner's requested scope before beginning a new phase or resolving an open product decision.

## Setup

Use Node **22.18.0** and Bun **1.4.4** from the committed Bun lockfile:

```sh
bun install --frozen-lockfile
bun run dev
```

The PDF import and local saved-study workflows need no API credentials. Do not copy `.env.local` into issues, pull requests, logs, screenshots, or commits.

## Checks

Run the checks relevant to your changes:

```sh
bun run lint
bun run typecheck
bun run test
bun run build:node
bun run test:node
```

Other build targets are available as `bun run build:vercel`, `bun run build:cloudflare`, and `bun run build:lovable`. A local artifact check is not proof of a live deployment. Physical-device and factual AI acceptance must be described only when actually performed.

## Project rules

- Keep domain logic pure, routes thin, and persistence behind the existing typed repositories.
- Preserve IndexedDB schema 4, backup v5, legacy readers, source references, and immutable historical scores unless a migration is explicitly designed and authorized.
- Keep AI generation disabled. The Groq/Upstash integration does not pass the unresolved factual-quality gate.
- Never commit private PDFs, credentials, `.env` files, generated validation secrets, or deployment state.
- The repository syncs to Lovable. Make changes locally; do not use Lovable AI editing prompts or rewrite published Git history.
- Code/docs are MIT licensed. Artwork has separate terms in `docs/development-handoff/asset-manifest.json`.

For completed checkpoints, update the system handoff, README if user-facing project status changed, and relevant phase record. Commit/push only within the owner's explicit authorization.
