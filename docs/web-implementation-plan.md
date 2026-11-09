# ProofQuest — responsive web implementation plan

Updated 2026-11-10. Owner: **Maur1k**. Status: Phases 0–2 accepted within documented verification limits; Phase 3 pushed; Phase 4 first 20% checkpoint complete and stopped at the owner-authorized limit. See the active roadmap and phase handoffs.

This supersedes `flutter-implementation-plan.md`. Stop Flutter development. The owner requested cleanup and the Flutter starter was removed on 2026-10-23. Keep the historical plan for reference. Continue the existing Lovable web application as the actual product, preserving its useful code, assets, data contracts and tests.

## Product direction

- Open-source code under MIT, authored by Maur1k; intended repository `Maur1k/ProofQuest`.
- A browser application usable on phones, tablets and desktop computers. No app-store installation required.
- Core flow: **Choose/drop PDF → configure quiz → answer → results with explanations and source references**.
- Proposed default: no required account; store documents, quizzes and history in the current browser. Optional sync can be considered later.
- Preserve the existing programming quests, manual creation, practice and progress alongside the new PDF workflow.
- Keep the existing navy/indigo/teal/gold design and explorer artwork, subject to separately documented artwork rights.
- Continue the existing Lovable project and its published URL, `https://proofquest.lovable.app/`, for the initial hosted release. A later custom domain is optional.

Open source, public website access and free AI generation are separate concerns. The source can be MIT-licensed and the website publicly accessible while generation remains subject to an operating budget. Do not promise unlimited free generation or automatic cross-device synchronization.

## Verified starting point

Source: https://lovable.dev/projects/020eed6a-df65-4e71-b47f-c5ada619051b

Latest commit verified during this update: `8c1b2541b4e4e9c656a3fef00aab9be256da72ab`.

The application already uses React, TypeScript, TanStack Start/Router, Tailwind, shadcn/Radix components, Zod, Vitest and Testing Library. Continue this stack and its existing lockfile. A replacement framework or new UI starter is unnecessary.

| Existing implementation | Reuse and extend |
| --- | --- |
| `src/domain/types.ts`, checking, validation and stats | Preserve predict/trace/fix programming types and grading rules; add a discriminated MCQ type and broader document topics |
| `src/store/reducer.ts` and `store.tsx` | Preserve duplicate-answer protection, one unfinished attempt per quest, resume and completed-history rules; put persistence behind a repository as needed |
| `src/domain/storage.ts` | Retain the legacy reader and recovery behavior for migration; do not overwrite the v1 key with a different schema |
| `QuestEditor`, `QuestionPractice`, practice/results routes | Extend the existing components and routes with MCQs and explicit practice/test modes |
| Study lesson/configure/review screens | Reuse useful layouts and controls; connect the real pipeline through separate production services |
| `src/demo/` | Preserve the static sample bank and clearly labeled sample path; it remains isolated from real document generation |
| Onboarding, `Brand`, tokens and artwork | Reuse visual identity; revise copy for real PDFs and route completed/skipped intro directly to Home |
| `AppShell` and navigation | Preserve destinations and unsaved-edit guards while adding responsive navigation and layout widths |
| Existing tests and development handoff | Establish a passing baseline; extend tests/specs rather than discard them |

Important gaps verified in source:

- `SampleDropZone.tsx` blocks real files and only opens static samples.
- `generateDemoQuestions` selects from a fixed bank; it does not read PDFs or use AI. Current sample difficulty only changes hint count.
- `/study/ready` opens a prototype dialog instead of creating a real quest/attempt.
- Existing question validation assumes JavaScript/Python code. General-document questions need their own validation branch.
- Attempts retain title metadata and recorded answers, but not a complete original question/count or score snapshot; results read question details from the current quest. Editing/deleting the quest can change/remove historical review.
- Login/register are demo forms, not real accounts.
- The shell limits main content and navigation to approximately 430px, including on desktop.

Pre-implementation validation on 2026-10-24: an isolated text-source snapshot installed successfully; all 63 tests, TypeScript checking and the existing Cloudflare-target production build passed. Lint reported 404 errors and 9 warnings; export formatting may contribute. No new browser/device or deployment checks are claimed. The snapshot excludes binary assets and is not a complete backup. See [validation report](plan-validation-report.md). The full source was subsequently imported during Phase 0; see [the Phase 0 handoff](phase-0-handoff.md) for current evidence.

## Repository and preservation strategy

1. Inspect the Lovable project's Git connection and the actual contents/history of `Maur1k/ProofQuest` before choosing how to bring source across. A locally configured remote alone does not establish Lovable sync.
2. Prefer the linked Git repository when available so original history is retained. If source is exported as an archive, record its exact Lovable revision and checksums; an archive does not contain Git history.
3. Preserve the full source, original images, optimized derivatives, handoff docs and tests before changing behavior. Establish a baseline commit/tag once the source is safely imported. Never force-push or overwrite unrelated remote content.
4. Preserve the existing Lovable-compatible root layout (`package.json`, `src/`, `public/`, config and lockfile). Merge this local README/plan/license deliberately. The unused `proof_quest/` starter has been removed at the owner's request; the repository is reserved for the web source and project documentation.
5. Lovable's documented connection flow creates a repository. If the intended name is already taken or a different repo is linked, resolve the connection and naming explicitly before setup; do not assume it can attach any existing repo. Plan for one authoritative source and avoid divergent Lovable/local code copies.
6. Review exact-code and third-party notices before applying the project's MIT license across imported files; retain dependency notices and separate asset provenance. Public repository visibility and production publishing are later explicit release actions.

## User journey

1. **Home:** prominent Choose PDF, desktop file-drop target, Continue learning, recent quizzes and a secondary Try sample/Manual quest action. Samples stay available without AI credentials.
2. **Document:** validate/open the PDF and show selected pages plus extracted-text quality. The document remains local unless a later, clearly explained operation sends selected content to the generation service.
3. **Quiz settings:** default to five single-answer MCQs and Practice mode; allow count, page range and Practice/Test selection. Do not block the primary flow with repeated onboarding or mandatory question editing.
4. **Generate:** show real stages (reading, generating, validating), cancellation, retry and actionable failure messages. Reject invalid output before saving. Do not display fabricated progress percentages.
5. **Practice/Test:** create a real saved quest/quiz version and attempt. Optional author review is available separately; do not reveal answers before a test by forcing everyone through the editor.
6. **Results:** score, correct/incorrect/skipped breakdown, answer explanations, page citations, retry incorrect questions or the whole quiz, and library/history access.

Practice locks an answer when submitted and may show immediate feedback/hints. Test permits draft answer changes before final submission, hides hints/solutions and grades all questions at completion; unanswered items count in the total denominator. Keep legacy programming scoring intact. Persist mode, grading version, question snapshot and option order. Implement separate persisted draft-upsert and atomic final-submit transitions for Test mode; the current locked-answer reducer cannot serve as editable drafts. Acceptance: change an answer twice, reload and retain it; submit one correct answer and four skipped questions for 20%; repeated submission produces one result. Audit every question-type consumer, including checking, practice and results, with exhaustive MCQ branches.

No required login in the proposed first release. Hide account-demo links from normal navigation; preserve safe handling of existing `/welcome`, `/login` and `/register` URLs through documented redirects to Home. Do not collect real credentials through prototype forms. Returning users must not encounter a new onboarding gate or lose existing progress.

## Responsive and accessible UI

Use one set of routes and shared components with CSS grid/flex/container constraints. Adapt to available space, not device labels or user-agent detection. Initial breakpoints are design starting points, adjusted after real content tests.

| Layout | Proposed behavior |
| --- | --- |
| Compact, below 768px | Single column, existing bottom navigation, full-width primary action, PDF/quiz content in separate tabs or steps, readable dialogs and keyboard clearance |
| Medium, 768–1199px | Two-column library where content fits, navigation rail where practical, optional document/quiz split when both remain readable; portrait can collapse to compact layout |
| Wide, 1200px and above | Sidebar navigation, document preview alongside settings/review, wider library grid and results summary; cap reading-column length |

- Replace global `max-w-[430px]` wrappers with page-specific widths; do not simply stretch phone cards across a desktop monitor.
- Preserve all current navigation destinations. Keep Subjects as the existing programming collection while PDF topic filters extend the library; do not force arbitrary PDFs into fixed CS categories.
- The Choose PDF button must work on touch, mouse and keyboard. File dropping is an enhancement, never the only input method. Keep the existing sample-drag gesture separate from actual file dropping.
- Use semantic headings, labeled controls, visible focus, keyboard-operable menus and live status announcements. Target WCAG 2.2 AA behavior/contrast, verifying rather than claiming conformance from automated tests alone.
- Support 200% zoom/text enlargement, reduced motion, portrait/landscape, safe-area insets and on-screen keyboards. Use 44–48px touch controls. Use sticky panels only when they leave usable content space.
- Preserve unsaved-edit dialogs and native browser Back/Forward behavior; support direct route entry, reload and missing/deleted IDs without loops.
- Verify 320, 390, 768, 1024 and 1440px widths, short viewports and long content; check at least an Android phone browser and iOS/iPad Safari in addition to desktop browsers before claiming broad support.

## Clean implementation architecture

Keep established modules in place. Refactor incrementally when implementing a feature; avoid a large folder move before behavior is understood.

```text
src/
  routes/                     # existing thin TanStack route components
  components/                 # reusable UI and existing quest components
  domain/                     # pure types, validation, scoring, transitions
  store/                      # existing orchestration; scoped subscriptions
  features/
    documents/                # import, page extraction, reader UI
    generation/               # settings, jobs, output validation
  data/                       # repository adapters, migrations, fixtures
  server/                     # generation handler/adapters, if hosted option chosen
  demo/                       # isolated and explicitly labeled samples
  onboarding/                 # intro/branding, simplified guest entry
```

Boundaries:

- Routes/widgets display state and dispatch user intent; no AI calls, SQL/IndexedDB operations, PDF parsing or duplicate scoring rules in render functions.
- Domain logic stays pure TypeScript with no React, DOM, storage or provider SDK dependencies. Model questions and failures as discriminated unions; validate unknown JSON at the boundary with Zod.
- Define small contracts for `DocumentRepository`, `QuizRepository`, `AttemptRepository`, `PdfExtractor` and `QuestionGenerator`. Inject implementations; do not build generic frameworks for hypothetical providers.
- Keep the existing reducer invariants. Scope new document/generation state so a progress update does not rerender the full library. Use existing React/TanStack tools before adding another global state library.
- Keep browser-only APIs/workers behind client initialization so SSR/hydration remains correct. Load expensive PDF code on demand; bound concurrency and release document workers/object URLs when finished.
- Explicitly model cancellation, timeout, stale response, insufficient text, rate limit and storage failure. Cancel/ignore old jobs after the user changes documents. Prevent double-submit and duplicate committed attempts.
- Use transactional persistence and stable IDs. Inject time/randomness where deterministic tests need them; persist option order rather than reshuffling on reload.
- Maintain strict TypeScript settings, formatting and linting. Avoid `any`, broad suppression and catch-and-ignore fallbacks. Comments explain invariants/tradeoffs, not restate code.
- Record short architecture decisions for persistence and generation. Add abstractions only at real boundaries; one deployable app plus a bounded generation service is sufficient initially.

## PDF and storage implementation

Evaluate PDF.js (`pdfjs-dist`) with its matching worker for local PDF rendering and page-text extraction. Pin a compatible version, load parser/worker on the client, and verify the production build/worker paths under Lovable hosting. Extract incrementally and retain page mapping; avoid loading every rendered page into memory.

Initial proposal: text PDFs only, up to 20 MB and 30 selected pages per generation, plus an extracted-text/token budget. These limits are provisional until tested on mobile. Detect scanned/empty text, password protection, invalid PDFs, mixed text/image pages and extraction-quality problems; explain unsupported OCR. Do not silently invent text for diagrams/tables or omit pages without telling the user.

Use IndexedDB for imported PDF blobs/page text and new relationally linked quiz/attempt records. Keep small isolated preferences in localStorage. A thin typed adapter is sufficient; evaluate a helper library only if it materially reduces transaction/migration complexity. Do not put PDF base64 into localStorage.

Migration from `proofquest:data:v1`:

1. Read and validate the old state using the existing reader after hydration. Export/retain the original payload before destructive replacement.
2. Transform valid records, preserving IDs, timestamps, legacy subjects and all predict/trace/fix questions. Add MCQs through a new schema branch, not by coercing old questions.
3. Preserve legacy recorded outcomes and their answered-only scoring denominator without regrading. Mark EVERY snapshot backfilled from current quest content as reconstructed: identical IDs do not establish unchanged wording or answer keys. Mark unavailable detail missing. Test same-ID edits, changed keys and deleted questions; never claim reconstructed content is the original.
4. Commit the migrated records atomically, verify counts/IDs, then mark migration complete. Retain the v1 source for rollback. Make migration repeatable without duplicating records.
5. Test malformed records, missing quests, quota failures, partial imports and multi-tab writes. Do not claim Saved before a successful write. Offer an export and explicit temporary-session mode if persistence is unavailable.

New records: Document (id/checksum/blob reference/status), PageText (page/text/warnings), QuizVersion (immutable questions/source references), Attempt (version snapshot/mode/order/timestamps), Answer (draft/submitted response/hints/reveal/grading), GenerationJob (configuration/status/result reference).

Local storage belongs to a browser profile and origin, not an account. Keeping the same published origin helps preserve existing access. Moving domains requires an export from the old origin and import into the new one; the new site cannot silently read the old origin's storage. Provide export/import and clear deletion choices. After deleting a source PDF, retained results keep explanations/excerpts but cannot reopen the original file.

## Real question generation and public access

To make the main journey approachable for nontechnical visitors, the recommended default is hosted generation with a limited guest allowance. This is a recommendation, not an approved spend or provider selection. Keep bring-your-own-key/self-hosted adapters optional for contributors; do not make API-key setup the only path if broad public access is the goal.

- Extract locally; send only selected, necessary text/page identifiers to the generation service after explaining the transfer. Avoid retaining raw documents server-side by default.
- Keep operator keys on the server. Client bundles and public repositories must never include them. A server-held key does not make an endpoint safe without usage controls.
- Validate request size/count/page selection, impose timeouts/concurrency limits, rate-limit guests, cap provider spending and handle retries without duplicate charges/results where the provider permits. Document allowance behavior honestly; anonymous limits are imperfect.
- Require structured questions with stable options, exactly one correct answer, explanations and valid source references. Check duplicate/ambiguous/unsupported output and insufficient evidence. PDF content is data, not instructions to the generator.
- Citation existence checks do not prove factual support. Evaluate correctness and explanation support against representative PDFs with human review before release.
- Keep quiz sessions and existing library usable when generation is unavailable. Provide a real sample quiz and an actionable retry/status message rather than a broken starting screen.
- Keep provider/network logic behind `QuestionGenerator`; do not bind the entire UI to one vendor. Publish a documented self-hosting configuration with environment-variable names and sample values only.

Generation safeguards required before public release:

- Use owner-controlled portable provider credentials, not an unexportable Lovable-managed AI connection.
- Enforce a shared durable, atomic allowance and global spend budget across active hosts, or disable generation on the standby. Browser counters are not enforcement. Fail closed for new generation if budget enforcement is unavailable; existing quizzes remain usable. Deduplicate jobs/retries and document provider billing limitations.
- Bound serialized UTF-8 request bytes, extracted tokens and response bytes separately from PDF size/page count. Vercel Functions currently limit request/response payloads to 4.5 MB; choose a lower application limit with overhead headroom. Never upload the proposed 20 MB PDF through that endpoint.
- Redact document text, secrets and provider error bodies before browser/server logging or error-reporting hooks. Current error capture traverses causes and forwards context. Test a synthetic document phrase and fake API key in nested failures; neither may appear in logs, telemetry or returned errors.

Provider, hosting backend, allowance and monthly budget remain undecided. Do not provision paid services during planning. First implement one real provider and validate end-to-end behavior; a deterministic bank is acceptable for tests, not as the claimed PDF-generation feature.

## Development phases

The authoritative delivery sequence, dependencies, work packages and exit checks are in [the phased development roadmap](development-phases.md). The technical requirements elsewhere in this specification apply within those phases.

| Phase | Deliverable |
| --- | --- |
| 0 — Preserve and prepare | Full source/assets, resolved Git connection, reproducible setup and clean baseline |
| 1 — Technical feasibility | Portable runtime builds, dependency continuity and measured PDF extraction limits |
| 2 — Responsive guest experience | Existing screens and navigation adapted to mobile, tablet and desktop |
| 3 — Data and quiz foundations | Safe migration, repositories, immutable versions, export/import and tested scoring transitions |
| 4 — Real PDF import | Local choosing/drop, extraction, reader and durable documents |
| 5 — Practice, Test and results | Reliable quiz lifecycle demonstrated with labeled fixtures/manual data |
| 6 — Real generation | Provider-backed PDF → five MCQs → results → reload, with evidence and cost controls |
| 7 — Release and recovery | Integrated device checks, actual host verification, Vercel recovery drill and authorized public beta |
| Later | OCR, accounts/sync, PWA/offline, sharing and richer questions |

Phases 0–2 are accepted within the documented phone/owner-zoom verification limits. Phase 3 is complete and pushed. Phase 4 is at its authorized 20% checkpoint; Phases 5–7 have not started. See [the Phase 0 handoff](phase-0-handoff.md) for evidence. The isolated baseline investigation informs Phase 0 but does not complete it. Work proceeds through exit checks. Local work can continue within the authorized phase; stop after EVERY phase and obtain Maur1k’s explicit confirmation before starting the next phase. Unresolved provider/budget choices are settled before Phase 6; publishing and paid provisioning remain separate actions.

First complete core-product milestone is Phase 6: open the app on a phone or desktop, choose a real text PDF, generate five MCQs, finish a quiz, inspect explanations with page evidence, reload and retain the result. Existing manually created programming quests remain usable.

## Validation and contribution rules

Use the existing Bun lockfile and declared scripts once the source is imported. Baseline commands are `bun install --frozen-lockfile`, `bun run test`, `bun run lint`, `bun run build`; add a repository-pinned typecheck command using the existing compiler configuration. Prior handoff used `bunx tsgo --noEmit`; verify and pin the intended compiler before relying on that command in CI. Do not claim these checks passed until run locally.

- Preserve existing tests as the baseline. Update affected assertions deliberately when a documented behavior changes, such as retiring account demos; never remove tests or relax strictness merely to make a build pass.
- Unit tests: all existing programming grading, MCQ validation/scoring, state transitions, duplicate submissions, cancellation and stale generation output.
- Persistence tests: v1 migration, immutable history, old/deleted content, transaction failure, quota and multi-tab conflict behavior, export/import.
- Component/browser tests: Choose PDF and real drop, keyboard/touch, generation failure/retry, practice/test, unsaved guards, reload/back/deep links, sample isolation and no credential leakage.
- Responsive visual QA: inspect actual screenshots at the listed widths and with long content/large text. Check no page-level horizontal overflow, visible controls and readable PDF/quiz panels.
- Accessibility checks: automated checks plus keyboard, screen-reader and actual device review. Document what was tested and what remains unverified.
- CI runs deterministic tests and production build. Live AI quality checks run separately with controlled inputs and a budget; they are not replaced by mocks.
- Include reproducible setup, architecture notes, contributor guidance, environment examples, self-hosting instructions, license notices and sample PDFs with redistribution rights. No private PDFs or keys in fixtures/logs.

## Hosting and release

Because the existing Lovable application remains the product, the existing `proofquest.lovable.app` address can continue to serve the app when an updated project snapshot is published. The separate Flutter/Firebase hosting proposal is superseded.

All code edits and testing happen locally in Codex, with GitHub as the intended source repository. Do not send editing/build prompts to Lovable's AI. Lovable is the initial hosting target; Git synchronization and publishing are separate from editing.

Keep deployment portable by documenting the current TanStack Start runtime and server requirements. Do not assume a server-rendered app with generation endpoints can be uploaded unchanged to static-only hosting. If a separate generation backend is selected, configure its endpoint and CORS deliberately. Document a self-host path that does not require contributors to purchase Lovable.

The source may be public on GitHub while the app is served from Lovable. Verify source synchronization, build output, environment configuration, PDF worker URLs, route refresh, public audience and generated-question behavior before release. No code push, repository-visibility change or production publish is included in this planning update.

### Hosting continuity and fallback

As checked on 2026-10-24, Lovable's publishing documentation gives published sites no fixed expiry date. For Free workspaces it may unpublish an app only when there have been no app visits for at least 12 months, no workspace-owner login for at least 12 months, and no connected custom domain. This is a current product policy, not a guarantee that the company, terms or service will remain available indefinitely. Built-in backend/AI availability also depends on applicable credits and service limits.

Confirmed hosting decision (2026-10-24): **Lovable is the primary host; Vercel is the backup host**, deployed from the same GitHub source. Its documented TanStack Start/Nitro support fits the current server-rendered stack and potential generation endpoints. The host choice is confirmed, but backup readiness requires the exact project to build and run there: inspect the Lovable Vite wrapper, Nitro version, runtime adapters, environment settings and execution limits. Do not assume static hosting alone can run SSR and server generation routes. No backup project has been created or deployed.

Maintain a second portable build route using Nitro's Node server output, with documented container/Node deployment instructions. This can run on another compatible Node host if either provider becomes unsuitable. Vercel's free Hobby plan has personal/non-commercial eligibility and quotas; MIT licensing does not automatically mean unlimited or permanently free hosting. Choose the plan against actual usage before provisioning.

Continuity requirements before public release:

1. Preserve complete source, lockfile, original assets and release tags in GitHub, plus a separate downloadable/local release backup. Phase 0 preserved the full source and assets, original Git history and a separate local ZIP; see its handoff. Future release tags/backups must include subsequent changes.
2. Recommend a custom domain controlled by the owner through independent registrar/DNS access. A `lovable.app` subdomain stays tied to Lovable and is not the portable address. A custom domain can be switched to the backup host after DNS/TLS and route checks. No domain purchase is authorized by this plan.
3. Prepare deployment configuration and a repeatable build for both primary and backup hosts. Store secret values securely outside Git and the browser bundle; document variable names and recovery steps. Keep the AI provider endpoint and any future database/storage integrations replaceable.
4. Test the same release on a backup deployment before calling it ready: routes/refresh, PDF worker assets, import/extraction, generation, saved quiz, restart, quota errors and responsive UI. A GitHub repository or a successful compile is not sufficient proof of recovery.
5. Decide whether the backup remains running or is deployed on demand. A running standby is faster but can have ongoing cost; on-demand recovery takes deployment/configuration time. Do not promise automatic or zero-downtime failover.
6. Use a manual recovery checklist: select last known-good release, deploy/configure the backup, restore server data if any, verify functions, switch owned-domain DNS, confirm TLS and test public access. Record the actual recovery duration during a drill instead of inventing an uptime target.
7. Preserve data independently of hosting. Current user data is browser-local, so neither GitHub nor a second server backs it up. Provide user export/import. Keeping exactly the same HTTPS origin and storage schema helps retain browser history through a host switch; a different hostname cannot read the old origin's storage. Export before migration when possible, and do not promise recovery from an inaccessible old origin.
8. If accounts/cloud storage are added later, define database and object-storage backups and test restores separately. A backup frontend must not depend on an unavailable Lovable-only backend to perform the core flow.

## Decisions to resolve before generation implementation

1. AI provider and the operating budget/guest allowance for hosted generation.
2. Confirm the proposed general-subject, MCQ-first scope; retain programming questions regardless.
3. Artwork distribution terms separate from the confirmed MIT code license.
4. Resolved in Phase 0: Lovable is connected to `Maur1k/ProofQuest`; the formerly empty repository is retained as `ProofQuest-reserved`.

## References

- Existing project: https://lovable.dev/projects/020eed6a-df65-4e71-b47f-c5ada619051b
- Lovable Git sync: https://docs.lovable.dev/integrations/github
- Lovable publishing: https://docs.lovable.dev/features/publish
- Lovable hosting: https://docs.lovable.dev/features/hosting
- Vercel TanStack Start deployment: https://vercel.com/kb/guide/deploy-a-tanstack-start-app-to-vercel
- Nitro Node deployment: https://nitro.build/deploy/runtimes/node
- Vercel Hobby scope/limits: https://vercel.com/docs/plans/hobby
- PDF.js: https://mozilla.github.io/pdf.js/getting_started/

These references inform the plan. Baseline checks have been run as recorded in the validation report; complete source import is recorded in the Phase 0 handoff; feature implementation, new feature tests and deployment remain pending.

- Vercel function limits: https://vercel.com/docs/functions/limitations


