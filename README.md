# ProofQuest

A responsive, open-source learning web app by [Maur1k](https://github.com/Maur1k),
planned for desktop, mobile and tablet browsers.

Core flow: **PDF → quiz/test → results and explanations**.

## Current direction

Continue the existing [Lovable application](https://lovable.dev/projects/020eed6a-df65-4e71-b47f-c5ada619051b)
using its React, TypeScript, TanStack Start and Tailwind source. Reuse its artwork,
quest editor, programming practice engine, tests and development handoff.

The [published reference](https://proofquest.lovable.app/) currently supports real
programming quests, with a sample-only document study flow. Real PDF import and
AI quiz generation are planned; they are not implemented yet.

See the active [web implementation plan](docs/web-implementation-plan.md).
Flutter development is cancelled. The starter was removed on 2026-10-23. The
[earlier Flutter plan](docs/flutter-implementation-plan.md) remains as historical
reference.

## Local development status

The Lovable source has been inspected remotely but has not yet been imported
into this local repository. The first implementation step is to preserve/import
that source and resolve its GitHub connection before modifying the product.

Once the actual source and its lockfile are present at the repository root, the
existing scripts provide this starting workflow:

```sh
bun install --frozen-lockfile
bun run dev
bun run test
bun run lint
bun run build
```

A pinned typecheck
command, source revision and verification results will be documented during
baseline setup. No new app tests or build were run for the planning update.

The proposed first release requires no account and stores history locally.
The hosted AI provider, budget and guest allowance remain undecided. Public
source and website access do not imply unlimited free AI generation.

## License

ProofQuest's original code and documentation are licensed under the
[MIT License](LICENSE). Copyright (c) 2026 Maur1k.

Third-party dependencies retain their own licenses. Reference illustrations and
branding are not covered by this code license; their provenance and distribution
terms must be documented separately before they are included in a public release.
