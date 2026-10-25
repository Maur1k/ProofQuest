# ADR 001: Portable builds with the preserved Lovable wrapper

Date: 2026-10-25. Status: accepted for local builds; live recovery remains Phase 7.

Keep the original React/TanStack Start application and its exact 2.26.5 Lovable Vite wrapper. The wrapper handles more than plugin ordering: it also preserves Lovable sandbox output and server integration. Replacing it is unnecessary for hosting portability.

The exact package is available on public npm. Change only its lockfile URL from the Lovable-controlled registry to public npm. Both registry metadata and the existing lock declare the same integrity:

`sha512-nRaztSS5BDM/d6oW/h2ev9l7RcjULxvWZtmrAwvI7rVQ9dPfNCBjNGmtiy8/THyYfFlcq+R2oLb4yaUBfneB6w==`

A frozen install into a new directory and new cache installed 515 packages successfully from public npm on 2026-10-25. No dependency versions or release-age exceptions changed. This removes the live Lovable registry requirement; it does not remove the wrapper or guarantee the future availability of npm. Preserve lockfiles and backups; revisit vendoring only if needed.

## Build contracts

Run from the repository root with the pinned Node 22.18.0 / Bun 1.4.4 tools:

| Command | Expected output | Local verification |
| --- | --- | --- |
| `bun run build:cloudflare` | `.output`, Cloudflare module | Manifest, server entry and public assets |
| `bun run build:lovable` | `dist/server` and `dist/client` | Local simulation of Lovable sandbox output |
| `bun run build:vercel` | `.vercel/output` | Build Output API v3, routing, Node 22 function and static assets |
| `bun run build:node` | `.output/server/index.mjs` | Node server preset, public assets |
| `bun run test:node` | Starts and stops local production server | `/`, `/intro`, `/quests`, `/progress`, `/study` and linked assets |

Build targets sequentially: Node and Cloudflare share `.output`. To run a Node server manually, build the Node target last, then run `node .output/server/index.mjs`; `PORT` and `HOST` configure binding. The smoke script uses loopback port 4183; it must be free.

`build` remains unchanged for the connected Lovable platform. Explicit portable targets reject the Lovable sandbox environment because the wrapper overrides runtime settings there. The local Lovable check simulates its default Cloudflare contract, not the hosted sandbox itself or its optional fetch-bundle mode.

`src/server.ts`, `src/start.ts` and the original CSRF middleware are unchanged. The smoke test verifies SSR and assets, not end-to-end CSRF behavior for future generation endpoints.

## Remaining deployment work

No host was provisioned or published. A successful Vercel artifact is not yet an operational backup. Phase 7 must verify actual preview deployment, deep links, worker delivery, credentials, generation quotas and data export/import on a hostname change. Vercel remains the chosen backup; Lovable remains primary.

References: [Vercel TanStack guide](https://vercel.com/kb/guide/deploy-a-tanstack-start-app-to-vercel), [Nitro Node runtime](https://nitro.build/deploy/runtimes/node). The generated artifacts for the pinned versions are the evidence for these local checks.
