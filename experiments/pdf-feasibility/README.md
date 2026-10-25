# PDF feasibility experiment

This is an isolated Phase 1 experiment, not the app's real PDF import feature. All fixture content is synthetic and MIT licensed under the repository license. No user documents are included.

From this directory, with the repository's pinned Node/Bun versions:

```sh
bun install --frozen-lockfile
bun run test
bun run build
bun run preview
```

Open the displayed localhost URL (port 4174) and run each fixture button. Verify page sentinels and clear scan/password/invalid outcomes. Cancellation and expired-deadline buttons exercise failure handling. `test` checks fixture semantics in Node; it does not replace a browser-worker test. Browser measurements display in the Outcome panel; `results.local.json` is ignored local Node output.

The committed PDFs need no Python installation. To regenerate fixtures, `generate-fixtures.py` needs reportlab, Pillow and pypdf; inspect the resulting files and updated manifest. Encrypted output can differ between generations. Keep PDF.js's upstream license with redistributed bundles.

The 20 MiB/30-page limits are provisional. See [ADR 002](../../docs/decisions/002-pdf-feasibility.md) for measurements, limitations and the pending physical-phone check. Do not copy this harness directly into product UI; Phase 4 must integrate typed repositories, user-controlled page selection and production error handling.
