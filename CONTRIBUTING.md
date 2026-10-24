# Contributing to ProofQuest

Use Node 22.18.0 and Bun 1.4.4. Install the exact dependency graph with
`bun install --frozen-lockfile`. Then run `bun run dev` and open the URL printed by Vite.

Before proposing a change, run:

```sh
bun run lint
bun run typecheck
bun run test
bun run build
```

Follow AGENTS.md and the active development roadmap. Keep domain logic pure,
routes thin, demo content labeled, and changes scoped to the authorized phase.
Preserve existing tests and data contracts. Do not force-push the Lovable-connected
branch. Generation credentials are not needed for the current sample/manual app.

The build currently uses the existing Lovable/Cloudflare configuration. Vercel
and portable Node verification belong to Phase 1; do not label them supported yet.
The Lovable build wrapper is fetched from a Lovable-controlled registry. A failed
registry install is not permission to regenerate the lockfile or upgrade dependencies.

Code/documentation use MIT; artwork has separate terms in
docs/development-handoff/asset-manifest.json. Do not assume MIT grants rights to
redistribute the illustrations. Never commit private PDFs, credentials or .env files.
