# ProofQuest — Flutter implementation plan for Android and web

> Superseded on 2026-10-23 by [the responsive web implementation plan](web-implementation-plan.md). Flutter development is cancelled. Preserve this document and the starter as historical work; continue the existing Lovable source.

Prepared 2026-10-23 for Maur1k. Status: proposed implementation plan; the owner has created a Flutter starter locally. No remote project modified.

## Confirmed direction

- Android first, with a web target developed and checked alongside it; one Flutter/Dart codebase. The first product validation milestone remains Android.
- Repository: https://github.com/Maur1k/ProofQuest.git. Author credit: Maur1k.
- Open-source application; MIT selected for the code. Artwork terms remain separate.
- Existing local repository: `C:\Users\maurik\Documents\ProofQuest`.
- Flutter application: `C:\Users\maurik\Documents\ProofQuest\proof_quest` (Dart package `proof_quest`). Reuse this scaffold; do not create another app.
- Core journey: import PDF → generate quiz/test → answer → results.
- Visual reference: https://lovable.dev/projects/020eed6a-df65-4e71-b47f-c5ada619051b
- Source inspected at commit `8c1b2541b4e4e9c656a3fef00aab9be256da72ab`.

The existing implementation-brief.md describes the prior Lovable scope. This plan covers a new Flutter application for Android and browsers; it does not authorize changes to the Lovable app.

## Platform and availability

The owner-created Flutter starter already includes `web/index.html`, `web/manifest.json` and web icons. This establishes a web target, not a completed or deployed ProofQuest web app. Its current UI is still the generated counter example; a web build has not been validated during this planning update.

MIT licensing lets others use and modify the source under its terms. A public GitHub repository, a downloadable Android app and a hosted web app are separate deliverables. Open sourcing does not automatically deploy a website or provide free AI generation. The existing Lovable URL remains the separate reference prototype.

Develop Android and web from the same domain rules, feature controllers and adaptive widgets. Implement platform-specific document access, persistence and credentials behind small interfaces. Keep Android first while checking web compilation from the first feature so browser support does not become a rewrite.

## Source inspection findings

| Evidence in web source | Finding | Flutter treatment |
| --- | --- | --- |
| src/domain/types.ts | Questions are programming-specific: predict output, trace variables, fix code; subjects are fixed CS categories | Introduce general PDF questions and flexible topic labels; retain programming types as a later extension |
| src/domain/checking.ts | Deterministic checks; code fixes use normalized text comparison, not code execution or semantic equivalence | Reuse applicable rules in Dart; do not use text equality to grade general prose |
| src/store/reducer.ts | One unfinished attempt per quest; duplicate submissions ignored; completed history retained on deletion | Preserve these invariants with transactional persistence |
| src/domain/stats.ts | Accuracy, hint/reveal handling, mastery 0–5, continue-learning selection | Preserve resume and score behavior; defer mastery until meaningful topic tracking exists |
| src/domain/storage.ts | Validated browser JSON with partial recovery | Use versioned SQLite schema and tested migrations; explicit export/import if browser migration is later needed |
| src/demo/SampleDropZone.tsx | Only in-app sample metadata is accepted; real file drops are blocked without reading content | Implement actual Android document access |
| src/demo/logic.ts | Questions come from a deterministic static bank; difficulty only reduces hints | Replace with a real generation adapter; do not present sample selection as AI generation |
| src/routes/study.ready.tsx | Start practice opens a prototype dialog; no saved quest/attempt | Connect generated quiz directly to persisted practice |
| src/routes/results.$questId.tsx | Review reads current quest questions; deletion removes question review | Snapshot question content, options, key, explanation and evidence for each attempt |
| src/onboarding/accountDemo.ts and handoff | Login/register are sample-only with no authentication | Proposed: omit account screens from v1 |
| docs/development-handoff/ | Existing tokens, asset manifest, screenshots, specs and illustrative Flutter mapping | Reuse design references, not web-specific storage or routing assumptions |

Inspection was read-only. Existing QA reports 63 passing web tests, but those tests were not rerun here; no Flutter or physical-device testing has occurred.

## Proposed v1 scope

No mandatory login. Optional short first-run introduction leads straight to Home. Home offers Add PDF, Continue quiz, and recent items. Bottom navigation: Home, Library, Results; Settings is accessible from Home.

Main flow:

1. Add PDF via Android system picker or browser file picker/drop zone. Keep an accessible Choose PDF button on both. Implement Android external drag/drop only after verifying support; Android share-in can follow the first vertical slice.
2. Import selected bytes into platform-appropriate local storage; validate actual PDF content, not just the filename. Record checksum, title, size and page count. Store a platform-neutral document reference rather than exposing a native path to the UI.
3. Extract text per page with a responsive UI. Use background execution supported by the chosen platform/library; a native isolate strategy is not automatically a browser worker strategy. Show a document preview and page selection, with extraction quality/error feedback.
4. Configure count and mode. Proposed defaults: 5 multiple-choice questions, Practice mode, selected readable pages. Add difficulty only when generation quality is evaluated.
5. Generate questions grounded in selected page text. Show actual stages, cancellation and retry; never fake a percentage.
6. Start the saved quiz. Question editing/review is optional so it does not reveal answers before a test.
7. Display score, incorrect/skipped items, explanations, source page references, and retry actions. Save results locally.

Practice mode provides feedback after submission and optional hints. Test mode hides answers/hints until completion, permits changing selections before final submission, and counts unanswered questions separately while using the full quiz size as the score denominator. Persist mode and grading version with the attempt.

Start with single-answer multiple choice. Defer free-text AI grading, programming execution, scanned-PDF OCR, cloud sync, social features, and paid accounts. Detect image-only PDFs and explain that OCR is not yet supported; offer another document. Handle encrypted, corrupt, oversized, and empty PDFs explicitly.

Provisional limits: 20 MB per document and 30 selected pages per generation, with a separate extracted-text/token budget. Validate these against real Android devices before freezing limits. Do not silently truncate content or fill a requested count with unsupported questions.

## Flutter structure and dependencies

Use feature folders with presentation controllers, pure Dart domain rules, repositories, and external-service adapters. This follows Flutter's recommended separation of UI and data responsibilities without requiring a large framework of abstractions.

```text
lib/
  app/                 # bootstrap, routes, theme
  core/                # database, files, errors, shared widgets
  features/
    onboarding/
    documents/         # import, extraction, preview
    generation/        # settings, job state, provider adapters
    quizzes/           # models, library, optional editor
    attempts/          # practice/test, scoring, resume
    results/
    settings/
test/                  # domain, persistence, generation contracts, widgets
integration_test/      # shared journey plus platform-specific checks
assets/proofquest/     # originals plus optimized display assets
docs/                  # architecture, setup, privacy behavior, contributions
```

Proposed stack: Riverpod for asynchronous state/dependency injection; go_router for navigation; Drift/SQLite for documents, quiz versions and attempts, using a native database connection on Android and a supported browser backend on web; preferences only for small UI settings. PDFs use app-private files on Android and browser-managed binary storage on web. Evaluate pdfrx/PDFium for PDF display and page-text extraction on both platforms in the first milestone. Pin compatible versions after checking the installed Flutter SDK, native build requirements, Android ABI support, web assets and dependency licenses. No package has been installed yet.

Use Android's Storage Access Framework rather than broad storage access. Treat content URIs as streams, not ordinary filesystem paths. Survive rotation and process death; store completed extraction and generation stages. Cancelled/failed generation must not create an incomplete playable quiz.

## Maintainable-code requirements

These rules are implementation acceptance criteria, not a requirement to add every possible abstraction before the first feature works.

- Keep code grouped by feature. Within a feature, separate `presentation/`, `domain/` and `data/` where those responsibilities exist. Put only genuinely shared infrastructure in `core/`; avoid a growing catch-all helpers file.
- Widgets render state, collect input and handle layout. They never perform SQL, HTTP requests, PDF parsing or scoring. Riverpod controllers own screen state and call explicit operations. Avoid a single global controller containing the entire app.
- Keep scoring, question validation, quiz-version rules and attempt transitions in pure Dart. Domain code does not import Flutter, Riverpod, database row types, browser APIs or provider SDKs.
- Define interfaces where an external dependency or platform implementation can change: files, extraction, generation and repositories. Infrastructure implements these contracts; bootstrap/providers supply concrete instances. Constructor/provider injection replaces hidden globals and service lookups.
- Keep cross-feature coordination in a named workflow, such as GenerateQuiz or FinishAttempt, only when it coordinates multiple steps or is reused. Do not create pass-through use-case classes for every getter or CRUD operation. Features must not import another feature's widget/controller internals or form dependency cycles.
- Use immutable, typed models and explicit states for loading, ready, failure and cancellation. Parse untrusted JSON at boundaries; do not pass `dynamic` maps around UI/domain code. Separate external response DTOs from persisted and domain models where their shapes differ.
- Expose typed failures with actionable recovery, such as unreadable PDF, insufficient text, unavailable storage and generation timeout. Do not swallow exceptions or translate every failure into a generic empty list. Log technical context without document contents, answers or credentials.
- Make job cancellation and stale-result handling explicit. Guard against double taps and old async results replacing newer selections. Save final quiz/attempt changes in transactions; test retries and concurrent events.
- Use stable IDs, schema versions and immutable quiz versions. Inject clock/ID/random sources where determinism matters. Store question/option order so resume and scoring do not depend on a fresh shuffle.
- Prefer small named widgets and focused functions. Extract shared behavior after a real repeated need; avoid premature generic base classes, speculative packages and duplicate implementations of business rules.
- Centralize theme tokens, user-facing strings and reusable controls. Use responsive constraints rather than phone-model checks or fixed desktop widths. Keep platform checks at adapter/bootstrap boundaries instead of scattering them through screens.
- Record meaningful architectural decisions in short ADRs (state, persistence, provider, platform tradeoffs). Commit dependency lockfiles for the application, keep upgrades deliberate, and document generation commands if code generation is introduced.

Scalability here means features and providers can be added without rewriting existing screens or corrupting data. It does not promise unlimited AI throughput. If a hosted generation service is selected, separately specify request limits, bounded document/token budgets, idempotency, job handling, operating cost and monitoring. Add server infrastructure when required by the chosen service model.

## Android and web implementation boundaries

| Concern | Android | Web |
| --- | --- | --- |
| PDF selection | System document picker and content URI stream | Browser picker and actual file drop, read as bytes/blob |
| PDF storage | App-private files behind DocumentStore | Browser binary store behind the same interface; assess IndexedDB/OPFS compatibility and quotas |
| Quiz/history storage | Drift native SQLite connection | Drift browser/WASM connection; inspect selected persistence mode and handle unsupported/temporary storage explicitly |
| PDF display/extraction | Native library build and ABI validation | Bundle/version required PDF/WASM/worker assets; verify page text and rendering in supported browsers |
| Async work | Native background work where supported | Library/browser workers or bounded cooperative work; do not assume `compute` creates a web worker |
| User AI key, if selected | Platform-protected credential storage | Session memory by default; no claim of equivalent native secret protection |
| Navigation | Android back, rotation, resume | URL entry, reload, browser back/forward, missing or deleted IDs |
| Input/layout | Touch, keyboard avoidance, safe areas | Mouse/touch/keyboard, focus, narrow and wide layouts |

Shared models use document IDs/storage handles, never `File` or browser `Blob` types. Use conditional imports/exports for native and web adapters; shared code cannot import `dart:io` or browser-only APIs. Native database/filesystem packages must not leak into the web dependency path.

Browser persistence is local to the browser profile and origin; it does not sync with Android or another device. Clearing site data, private browsing and eviction/quota limits may remove or prevent persistence. Detect temporary storage, show an honest status, and offer export; never show Saved until the write succeeds. Test multiple-tab conflicts and use the database's supported coordination strategy or explicitly restrict unsupported modes.

Web-hosting requirements belong in the release documentation: HTTPS, correct base path, worker/WASM asset paths and MIME types, route-refresh handling, and any headers required by the selected database/PDF setup. Verify behavior on the actual host; a development-server success is insufficient. Choose hash or path URL routing deliberately and configure matching hosting behavior. Do not select a host solely because GitHub stores the source.

First browser acceptance targets: current desktop Chrome and Edge, with Firefox and Safari checked before claiming broader support. Check responsive mobile-browser behavior as a separate validation task. Treat PWA installation and offline cold start as optional later work: cached/local quiz use is distinct from offline app loading, and AI generation may still require internet.

Development commands inside `proof_quest/`: `flutter run -d chrome` and `flutter build web --release`. Building creates output under `build/web`; it does not deploy it. Maintainer documentation should explain both local development and self-hosting once the platform stack is validated.

## Data and service contracts

- Document: id, title, checksum, platform-neutral storage reference, page count, import timestamp, extraction status.
- DocumentPage: document id, page number, extracted text, extraction warnings.
- QuizVersion: immutable id, quiz id, title, source document id, selected pages, generation metadata, ordered questions.
- Question: id, type, prompt, stable option IDs, correct option ID, explanation, source page/excerpt references.
- Attempt: id, quiz version snapshot, mode, question/option order, current position, start/update/finish times, grading version.
- Answer: question id, chosen option, submission state, hints/reveal use, timestamp; correctness calculated by domain logic.
- GenerationJob: id, configuration hash, status, provider/model, failure category, resulting quiz id.

Interfaces: DocumentImporter, DocumentStore, PdfTextExtractor, QuestionGenerator, QuizRepository, AttemptRepository. Keep the fake generator in tests/sample mode only. Persist successful output before starting practice. Use atomic writes and duplicate-submission protection. Retries create new attempts; edits create new quiz versions.

Deleting a PDF offers explicit choices for keeping quizzes/results or deleting related records. Retained results keep their original question snapshot; opening the original PDF is unavailable after deletion. Explain that local data can be lost on uninstall and provide a versioned backup/export path before public release.

## Generation decision — unresolved

Recommended for a developer-focused first alpha: user-supplied provider key or configurable self-hosted endpoint, behind QuestionGenerator. This avoids a mandatory ProofQuest account but introduces setup friction. For a general audience with immediate generation, a hosted service operated by Maur1k is the better experience, with ongoing costs and usage controls. The user has not chosen either approach.

Implement one provider first. Never ship an operator-owned API key inside the APK, JavaScript/WASM bundle, build configuration delivered to clients or public repository. For user keys on Android, use platform-protected credential storage. On web, default to session-memory-only entry; explain that the browser cannot keep a key secret from the page/user. Exclude credentials from exports and logs, and provide deletion. Show which provider receives selected document text before the first transfer. Saved quizzes can operate without generation requests; web offline startup requires a separate caching/deployment decision.

Browser generation requests must be supported by the provider's CORS and client-usage policies. Otherwise use an explicitly configured self-hosted or operator backend; the browser cannot bypass CORS. A server-held operator key requires a backend with usage controls, not an unauthenticated unlimited proxy. The same QuestionGenerator contract supports these transports without coupling widgets to one provider. No backend is provisioned by this plan.

Send selected page chunks with stable page IDs. Treat PDF text as untrusted source material, not instructions. Require structured output, valid option/answer references, supported page citations and nonduplicate questions; reject malformed responses. Citation existence checks do not prove factual correctness: evaluate actual answer support using representative PDFs and manual review. Handle timeout, rate limit, invalid key, network loss, cancellation and insufficient source material distinctly.

## Visual migration

Preserve navy background (#080F1F), surface (#11192C), indigo primary (#6E80F2), teal/gold accents, explorer illustrations and rounded cards. Translate handoff tokens into ThemeData/ThemeExtension. Use bundled licensed fonts, SafeArea, accessible semantics, 48dp controls, text scaling, reduced motion and Android back behavior. Do not carry over the fixed 430px web content width as a universal layout constraint.

Keep original artwork files and provenance metadata. The current asset manifest explicitly does not grant an open-source license; choose and document artwork distribution terms before release. A code license must not silently imply a new artwork license.

## Delivery sequence and acceptance gates

1. Repository and foundation: use the owner's existing `proof_quest/` Flutter starter in `C:\Users\maurik\Documents\ProofQuest`; the configured remote is `https://github.com/Maur1k/ProofQuest.git`. At initial inspection the local branch had no commits. Keep this directory layout. MIT license, author credit, README and plan have been added locally. Next add contribution guidance, ADRs, separate asset terms and CI for formatting, analysis, meaningful tests, Android debug build and web release build. Confirm Android SDK/toolchain. The Android application ID is still `com.example.proof_quest`; select a permanent ID before release. Flutter code remains the generated counter app.
2. Real PDF import: render and extract a representative text PDF on Android and in Chrome; preserve page mappings; handle picker/drop cancellation and unsupported files. Verify restart/reload persistence, browser storage capability and memory behavior before polishing screens. The PDF/database candidates must pass both platform checks before becoming fixed dependencies.
3. Real generation: choose provider model and ownership, implement one adapter, validate generated questions and explanations against source pages. This is required for the real PDF-to-quiz milestone; fixture output alone does not satisfy it.
4. Complete journey: generated quiz → Practice/Test → results → retry, with transactional saves and resume after process death. Cover duplicate taps, unanswered questions, shuffled option IDs and historical snapshots.
5. Design and accessibility: migrate tokens/art, introduction, library, results and settings; test small and wide screens, large text, TalkBack, keyboard/focus operation, browser back/refresh, Android back and dark theme contrast.
6. Open-source alpha: test valid/malformed/encrypted/scanned/large PDFs; provider failures; interrupted jobs; migrations; export/import; deletion; browser quotas and temporary storage. Run the quality gates below. Conduct actual device, browser and human review; document results and remaining limitations. Android publishing/signing and web deployment are separate release steps.

### Quality gates for implementation

- Formatting and static analysis: `dart format --output=none --set-exit-if-changed lib test integration_test` (include only existing source directories), then `flutter analyze`. Retain useful lints and consider strict casts/inference/raw-type checks during foundation work; avoid broad suppression to make checks pass.
- Unit tests: scoring, validation, practice/test transitions, snapshot integrity, duplicate submissions, stale generation responses and source citation validation. Cover behavior and edge cases, not private implementation details.
- Repository tests: transactions, migrations from old fixtures, deletion semantics, export/import and failures. Run the same contract cases against native and browser implementations where practical.
- Widget tests: loading/empty/error/retry states, keyboard/focus, navigation guards, text scaling and answer review. Use golden tests only for stable, valuable visual components.
- Integration: a real text PDF → real generation → five questions → results → restart/reload on Android and Chrome. Separate deterministic CI runs using fixtures from credentialed provider checks; fixture-only tests cannot establish generation quality. Conduct provider quality evaluation with a fixed set of representative documents and record factual-support/duplicate/invalid-output failures.
- Build checks: `flutter test`, `flutter build apk --debug` and `flutter build web --release`. Add browser-specific test execution for storage/import adapters; a successful web compile alone does not establish browser correctness.
- Review each feature against layer boundaries, cleanup/disposal, failure recovery and Android/web behavior. All changed behavior must have appropriate evidence. Do not rerun unrelated expensive checks after documentation-only changes.

First milestone demonstrating the product: import a real text PDF, generate five source-grounded MCQs, finish them, see explanations linked to pages, restart the app and retain the result. No login required under this proposal.

## Remaining decisions

1. AI access: bring-your-own-key/self-hosted alpha versus hosted generation funded by Maur1k.
2. Confirm general-subject PDFs and MCQ-first scope; the reference currently specializes in programming.
3. Code license is confirmed as MIT. Select separate artwork terms before public release.

## Technical references

- Flutter architecture: https://docs.flutter.dev/app-architecture/guide
- Flutter architecture recommendations: https://docs.flutter.dev/app-architecture/recommendations
- Flutter web capabilities and limitations: https://docs.flutter.dev/platform-integration/web/faq
- Flutter routing: https://docs.flutter.dev/ui/navigation
- Riverpod: https://pub.dev/packages/flutter_riverpod
- Drift: https://pub.dev/packages/drift
- Drift browser storage and deployment: https://drift.simonbinder.eu/platforms/web/
- PDF candidate: https://pub.dev/packages/pdfrx
- Android document access: https://developer.android.com/training/data-storage/shared/documents-files

These references were checked during planning. Versions and compatibility must be verified during scaffolding; no build compatibility is claimed by this document.
