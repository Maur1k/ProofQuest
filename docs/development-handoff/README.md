> Phase 5 update (2026-11-10): Home now offers a clearly labeled five-question sample MCQ Practice quiz with durable start/resume, saved feedback and save/conflict recovery. See [50% checkpoint](../phase-5-50-checkpoint.md). Test-mode UI, final results and generation remain pending.

> Current implementation update (2026-11-10): the active project is responsive web; Flutter mapping below is historical reference. Real local PDF import, selected-page extraction and saved reader now exist. See [completed Phase 4 handoff](../phase-4-handoff.md) for current behavior, evidence and limitations. No AI generation or accounts are implemented.

# ProofQuest — development handoff

Reference package for continuing ProofQuest (web) and for the planned Flutter rewrite.
Everything described as **working** runs in this repository today. Everything marked
**demo** or **future** is UI only: no generation backend, accounts or AI exist; the historical demo remains separate from real document processing.

| File | Contents |
| --- | --- |
| `README.md` | Setup, commands, revision guidance, screen inventory, navigation map |
| `design-tokens.json` | Color, type, space, radius, shadow, motion, touch tokens (oklch + hex) |
| `platform-guidance.md` | Cross-platform rules: safe areas, touch sizes, reduced motion, focus |
| `screen-specs.md` | Per-screen behavior: states, validation, back/focus/keyboard/swipe, onboarding rules |
| `asset-manifest.json` | Artwork paths, pixel sizes, alpha, uses, alt rules, provenance, checksums |
| `data-models.md` | Platform-neutral models, persistence contract, integration boundaries |
| `fixtures/demo-fixtures.json` | Intro slides, sample files, validation rules as JSON |
| `flutter-mapping.md` | React → Flutter widgets, routing/state equivalents, reference Dart snippets |
| `screenshots/` | Mobile (390×844), small (320×568) and desktop (1280×800) references |
| `capture/capture_screenshots.py` | Reproducible screenshot capture script |
| `qa-report.md` | Checks actually performed, results, limitations, pending human testing |

## Setup and commands

Requires Bun ≥ 1.1 (npm works too). From the repository root:

```sh
bun install            # install dependencies
bun run dev            # dev server at http://localhost:8080
bunx vitest run        # unit + component tests (src/test/*)
bunx tsgo --noEmit     # strict type check (or: bunx tsc --noEmit)
bunx vite build        # production build
```

Screenshots: with the dev server running, `python3 docs/development-handoff/capture/capture_screenshots.py`
(needs Python 3 + `pip install playwright && playwright install chromium`).

## Source revision guidance

- Work from the connected Git branch; this package was written against the revision
  that adds `src/onboarding/` and `docs/development-handoff/` (check `git log -- docs/development-handoff`).
- Before changing behavior, read the root `AGENTS.md` (architecture rules) and the
  screen spec for the screen you touch. Domain rules live in `src/domain/` and are
  covered by `src/test/domain.test.ts`; keep that suite green and do not loosen it.
- Theme changes: edit `src/styles.css`, then update `design-tokens.json` (hex = sRGB of the oklch value).
- Artwork: never overwrite `public/assets/proofquest/original/*`; regenerate derivatives with the command in `asset-manifest.json`.

## Screen inventory

| Route | Screen | Status | Bottom nav |
| --- | --- | --- | --- |
| `/intro` | Introduction (3 slides) | working | hidden |
| `/welcome` | Welcome / access | working (guest); account buttons → demo | hidden |
| `/login` | Log in | **demo**, no auth | hidden |
| `/register` | Create account | **demo**, no account | hidden |
| `/` | Home | working | shown |
| `/subjects`, `/subjects/$subjectId` | Subjects, subject detail | working | shown |
| `/quests` | Quest library | working | shown |
| `/quests/new`, `/quests/$questId/edit` | Quest editor (unsaved-change guard) | working | shown |
| `/practice/$questId` | Legacy programming Practice | working | shown |
| `/quiz-practice/$sessionId` | Saved sample MCQ Practice | working through Phase 5 50%; no final results yet | shown |
| `/results/$questId` | Results | working | shown |
| `/progress` | Progress | working | shown |
| `/study` | Study library + sample drop zone | **demo** | shown |
| `/study/lesson/$lessonId` | Lesson reader | **demo** content | shown |
| `/study/configure/$lessonId` | Customize questions | **demo** | shown |
| `/study/review` | Review demo questions | **demo**, memory only | shown |
| `/study/ready` | Ready to practice (prototype dialog) | **demo** | shown |

## Navigation map

```text
first launch:  /  --(onboarding unseen)-->  /intro --Skip (any slide) / Get started--> /welcome
/welcome --Continue as guest--> /
/welcome --Create account--> /register <--links--> /login
/login, /register --Back--> /welcome   --Continue as guest (header or Demo complete)--> /
returning:     /  (no gate)
Home --Start studying--> /study --tap/drop sample--> /study/lesson/:id
   --Preview questions--> /study/review --> /study/ready --Start practice (prototype)--> dialog only
   --Customize--> /study/configure/:id --> /study/review
Home --Continue learning--> /practice/:questId (exact question)
Home --Create quest manually--> /quests/new
Home footer --Replay introduction--> /intro ;  --Account demo--> /welcome
Bottom nav: Home · Subjects · [+ Create sheet: manual quest | sample lesson] · Quests · Progress
```

Deep links to any app route open directly, never redirected to the introduction; only
`/` decides whether to show it (see `screen-specs.md` → Onboarding rules).

## Responsive web shell checkpoint — 2026-10-25

The shared shell now uses phone bottom navigation (<768px), tablet top navigation (768–1023px) and desktop side navigation (>=1024px). This supersedes the original fixed 430px shell only. Colors, original artwork and product behavior are unchanged. Page-specific responsive design is still pending. See [Phase 2 checkpoint](../phase-2-checkpoint.md) for verified scope and remaining work.

## Guest entry and home/library checkpoint — 2026-10-25

Home is now the direct guest entry. Introduction is optional; old account URLs redirect to Home. Home and library have responsive layouts, with stacked compact filters and tablet/desktop card grids. Original account components remain unused reference code. See [60% checkpoint](../phase-2-60-checkpoint.md); other feature screens and integrated accessibility acceptance remain pending.

## Final Phase 2 layouts — acceptance pending

Editor/practice/results now use bounded reading widths; subject/progress lists use responsive grids. Shared labels and controls wrap, long code scrolls internally, and confirmation dialogs fit short viewports. See [final review](../phase-2-final-review.md) for completed checks and the browser-automation block. This entry does not declare Phase 2 accepted.

## Current phase handoff — 2026-10-30

Phase 2 is accepted for advancement by the owner; the native 200% zoom check is handed to the owner, not reported as an automated pass. The remaining desktop route/keyboard checks and 44px sheet-close fix are recorded in [Phase 2 final review](../phase-2-final-review.md). This supersedes the pending-acceptance notes above.

Phase 3 is authorized and in progress. Pure quiz contracts and migration preparation are tested; IndexedDB integration and recovery remain outstanding. See [Phase 3 checkpoint](../phase-3-checkpoint.md). Historical Flutter and account-demo descriptions above are reference material; the active web roadmap governs implementation.

## Phase 3 completion — 2026-11-01

IndexedDB persistence, atomic migration, immutable question history, backup/import and explicit temporary-session recovery are implemented. Existing programming pages use committed writes and saved history; the new MCQ/Test contracts are tested for later UI integration. See [completed handoff](../phase-3-handoff.md) and [data contracts](../phase-3-data-contracts.md), which supersede the initial checkpoint above. Phase 4 awaits owner confirmation.
