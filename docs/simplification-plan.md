# ProofQuest simplification

Approved direction, 2026-11-24: **Add material → Choose study mode → Review and create → Study → Results**.

Keep Flashcards, Quiz, Exam and Reviewer, guest access, current identity and responsive web support. Only New study and Library belong in primary navigation. Settings holds Data & backup, Archive and About. No landing dashboard, sample prompts, statistics or announcements.

## Checkpoint boundaries

Each checkpoint requires owner review and explicit confirmation before the next begins.

| Checkpoint | Scope | Status |
| --- | --- | --- |
| S1 | Navigation, retirement, read-only Archive, stop seeded samples | Accepted; S2 authorized to 20% |
| S2 | One three-step guided creation flow | Complete locally; awaiting owner review before S3 |
| S3 | Unified Library, compatibility acceptance and dead UI cleanup | Not started |

No push, publication, AI enablement, additional verifier or extra features is authorized. Physical-phone testing is excluded. Simplification is not factual-quality certification.

## S1 handoff

- New study is the default landing screen with PDF/text entry cards. These intentionally open the existing import screen until S2 replaces it.
- Primary navigation has New study and Library; Settings is a separate utility action. Existing backup controls are in Settings.
- Subjects, manual Quest creation/editing, Progress, legacy practice/results and demo study routes redirect to Archive. Relevant Quest/attempt links retain their selection. Intro redirects to New study; account routes remain guest redirects.
- Archive reads existing records directly: Quests, orphaned answers, original/reconstructed/missing snapshots, recorded results, saved sample source revisions and sample materials/sessions. No resume/edit controls or regrading. Sample session deep links redirect to Archive.
- Fresh storage starts empty. Existing records are not deleted or migrated. Samples are excluded from active source/material/history lists. The unused demo provider is disconnected; remaining readers and backup support stay intact.
- Library temporarily reuses existing saved-material readers. Source grouping and removal of overlapping library screens belong to S3.
- IndexedDB schema 4 and backup v5 remain unchanged. Generation endpoints, limits and disabled configuration remain unchanged. Existing real PDF/source material and result readers remain available.

### S1 validation

- Full regression suite: 302 passing, 18 opt-in live tests skipped; additional archived Exam redirect test added afterward and checked separately.
- Type check, production Node build, build verification and 28 route/redirect checks passed. Lint retains nine existing Fast Refresh warnings.
- Browser: fresh landing and empty Archive, Archive reload, Settings backup access and keyboard Enter navigation. New study had no horizontal overflow at 320, 390, 768, 1024 and 1440 pixels. Mobile Archive visually checked at 390 pixels. No browser console errors observed.
- Automated coverage includes fresh storage/reload, preservation of legacy migration, backup compatibility, orphaned archived answers, saved sample sessions, two-link navigation, and sample filtering. Full end-to-end acceptance across all future S2/S3 screens remains S3 work.

## S2 implementation contract

1. Add material: PDF upload/page selection/local extraction/original preview or titled pasted text. Explain local saving before Continue. Preserve limits; never silently truncate or select a partial oversized document.
2. Choose four consistent mode cards. Offer compatible saved material for the exact source revision and selection first. Quiz/Exam share saved questions and retain internal practice/test modes.
3. Review and create: title, selected pages/paragraphs, chosen format, expandable exact text, explicit AI-transfer consent and accessible provider/retention disclosure. Generate only the chosen format and open only after successful save.

Unavailable copy: “AI generation is currently unavailable. Your material is saved in Library.” Include enabled Open Library action. Relevant failures alone show Retry saving, Check request status, or Start a new request; never regenerate automatically. Back preserves selections; warn before abandoning unsaved work or an active operation. Preserve old unexpired request recovery on its original endpoint; all new requests use the unified source flow.

## S3 implementation contract

Use a typed view model over existing repositories, not another store or duplicated records. One entry per source contains Study materials and Results. Preserve attempts/resume, immutable grades, original PDFs and citations; old revisions are in source details. Ambiguous older real materials belong in Other saved materials, without invented associations. Retired content remains in Archive, exportable in full backups. Old library entry routes redirect to Library; document/result deep links remain valid. Remove unused demo UI/providers only after references are removed.

Verify all four modes, selected-format generation, Quiz immediate feedback, Exam solutions only after submission, no AI call when switching saved Quiz/Exam, source-edit immutability, reload/save failures/interrupted and expired requests/missing PDFs, full backup preservation, keyboard/focus, and layouts at 320/390/768/1024/1440. Run type checks, relevant regression tests, production build and route checks. Keep five-question initial batches and no timer.

## S2 — 20% checkpoint

Owner authorized only the first 20% of S2. This milestone is the flow foundation, not a completed or connected wizard.

- Added a pure transient state model for three steps, deliberate mode choice, exact source selection, consent and active operations. Continue is blocked until source save success; failed saves retain dirty state. Back preserves source/selection/mode, while edits invalidate consent. Active operations block step changes.
- Added a reusable current-step frame with Back/Continue controls and focus transfer to the new heading. No additional persistence layer, routes or generation calls.
- Added regression checks for save failure, all four choices, invalid selection, consent reset, busy navigation and heading focus.
- Corrected stale sample-preview wording in the existing text source screen.
- The new state model/frame are deliberately not mounted in the live route yet. Existing import screens remain functional at this foundation checkpoint.

Next authorized increment must connect PDF/text input and durable saving to the frame, then mode selection, compatible material lookup, review/consent, unavailable state and existing recovery. Browser acceptance of the integrated wizard remains pending. No AI enablement, push or publication occurred. Stop here until the owner authorizes more S2 work.

## S2 completion handoff — 2026-11-25

The owner authorized finishing S2. The earlier 20% stop is superseded; stop before S3.

- `/` now hosts one guided flow: Add material, Choose study mode, Review and create. PDF and pasted text use the existing source adapters and repositories. Continue explains local saving and waits for durable source save success before advancing.
- PDF import keeps the existing 5 MiB/10-page limits, explicit page selection, cancellation and rejection of oversized selection. Original pages can be expanded alongside extracted text; blank pages are explicitly excluded from generation and retained in the PDF. Previews render on demand.
- Source text retains the 60,000-character/100-paragraph limit without truncation. Back preserves inputs, selected segments and mode. Discard and route-leave dialogs protect drafts. Failed saves retain the draft and expose Retry saving. A committed PDF is not duplicated if its source save must be retried.
- Four mode cards remain available even when AI is disabled. Compatible source material is offered before generation using exact source revision/content hash/segment selection/format matching. Quiz and Exam share questions and retain their internal practice/test modes. Original-PDF entry reuses an existing source revision.
- Review displays source title, format, selected page/paragraph labels and expandable exact text. Consent is fresh for each reviewed selection. Provider/retention/usage information is accessible in a disclosure. Disabled generation shows the approved unavailable copy and an enabled Open Library link.
- New requests use the unified endpoint only. Retry saving uses the returned in-memory material without another network request; Check request status retains the request identity; Start a new request appears only after a failure/recovery issue and resets consent. Reload restores exact selection for existing source requests without issuing a POST. Expired requests never regenerate automatically.
- Old PDF generation UI is now recovery-only, mounted by the original PDF reader only for retained requests or recovery errors. Existing endpoints remain untouched. Saved source versions remain reachable through source details, including recovery on an older revision. The old source/PDF creation panels are removed from active routes.
- Visible study labels use Quiz/Exam. Original document/result links, data schema 4 and backup v5 remain intact. No data deletion, historical regrading, AI enablement, second verifier, push or publication.

### Scope remaining for S3

Library still uses its existing readers and transitional saved-source links. S3 owns one-source grouping with Study materials/Results, Other saved materials, old-library route redirects, comprehensive compatibility acceptance and final dead-UI cleanup. Do not start S3 without owner confirmation. AI factual quality remains a separate unresolved release gate.

### S2 browser evidence

- Saved two-paragraph biology text locally, reached all four review formats, used Back, and reopened the saved text after reload.
- Imported the existing public USGS PDF fixture, extracted its one page locally, inspected original-page preview beside text, saved it and reached the same study-mode/review screens. Original reader deep link and PDF/source persistence after reload passed.
- All three guided screens had no horizontal overflow at 320, 390, 768, 1024 and 1440 pixels. Keyboard Enter/Space navigation and new-step heading focus passed. No browser console errors observed. Physical-device testing excluded.
- AI remained disabled in browser validation; live provider factual acceptance was not attempted. Generation/save/recovery behavior is validated with deterministic regression tests, not a factual-quality claim.

### Final S2 validation

- Full regression run: 321 passed, 18 opt-in live tests skipped. After the final saved-PDF reuse fix, all 12 targeted workflow/PDF tests passed, including the added reuse regression.
- Type checks passed. Final lint: zero errors and nine existing Fast Refresh warnings. Final production build, build verification and all 28 route/redirect checks passed.
- Final browser recheck confirmed the original-PDF link reopens its retained source with selection intact and reaches the four-mode screen. No console errors. Preview remains local at http://127.0.0.1:4195/.
- S2 is complete locally. Stop before S3 pending owner confirmation.


## S3 halfway checkpoint — 2026-11-25

The owner authorized **50% of S3 only**, superseding the earlier stop-before-S3 instruction. This checkpoint is complete locally; stop before the remaining half.

- Library now groups saved PDF/text sources with their materials and attempts using a typed, read-only view model over existing repositories. It creates no store or duplicate persisted records. PDF records and matching unified sources share one entry.
- Source detail offers Study materials and Results, original-PDF access, and expandable retained source versions. Quiz/Exam use the existing saved-session API and the same questions. Results keep recorded scores and unfinished-attempt links.
- Missing or ambiguous associations appear under Other saved materials. Conflicting attempt snapshots remain separate; no title-based associations or historical regrading. Identifiable sample quizzes remain excluded from the active Library.
- Empty Library, missing original PDF, unavailable source and failed-load retry states are implemented. Existing material/result/document deep links remain available.

Validation: 329 tests passed; 18 opt-in live tests skipped. Seven new projection/UI tests cover grouping, ambiguity, snapshot isolation, sample exclusion, unified question deduplication, empty/missing-PDF states and failed-read retry. Type checking and focused lint passed. Production build and build verification passed; all 28 route/redirect checks passed. Browser check on port 4196 covered fresh empty Library, local text save, source detail after reload, Study materials/Results switching, and a 390-pixel layout with no horizontal overflow or console errors. No live AI call was made.

Remaining S3 half: comprehensive legacy deck/reviewer/question/result and backup compatibility fixtures; populated browser study/result/resume checks; full 320/390/768/1024/1440 keyboard/focus/layout acceptance; old library entry redirects; dead-UI cleanup and final handoff. Physical-phone testing remains excluded. These are pending, not certified by this checkpoint.

Schema 4 and backup v5 remain unchanged. Generation remains disabled; no push or publication.


### GitHub progress snapshot — 2026-11-25

The owner authorized committing and pushing current progress, including the earlier Phase 6 work and simplification through S3 at 50%. README and the roadmap now reflect this checkpoint. This supersedes earlier no-push notes for this snapshot only. It does not authorize publication, AI enablement or the remaining S3 implementation. Validation remains 329 passing tests, 18 skipped opt-in live tests, passing type/build/route checks and the documented limited browser checks.


## S3 completion handoff — 2026-11-26

The owner authorized finishing S3 and committing it locally. This supersedes the halfway stop; stop after S3. A new push/publication is not included.

### Delivered

- Unified Library remains a typed projection of existing repositories: sources own Study materials and Results, with explicit Other saved materials for uncertain associations. No copied store, schema migration or historical regrading.
- `/documents`, `/materials` without an ID, and `/quiz-history` redirect to Library. Original PDF, material-ID and result deep links remain intact. Reader/result return links now use Library.
- Quiz/Exam confirmations and results use mode-correct labels. Both reuse saved versions through existing session APIs. Retained source versions, citations, unfinished resume and immutable grades remain accessible.
- Removed unused demo UI/providers, account prototype screens, old source/PDF listing components, sample entry UI and competing saved-material/history lists. Removed their obsolete UI tests; retained archive readers, legacy data contracts and backup support.
- IndexedDB stays at schema 4 and backup v5. Generation stays disabled; no verifier, timer, new feature or paid operation was added.

### Acceptance evidence

- Final suite: **322 passed, 18 opt-in live tests skipped** across 47 files. Retired UI tests account for the lower total. Type checking, production Node build and build verification pass. Lint has zero errors and eight existing Fast Refresh warnings. All **31 SSR/asset/redirect checks** pass.
- New compatibility test round-trips legacy decks/reviewers, saved quiz versions and unfinished attempts alongside archived Quests/sample data; preserved user payloads and snapshots match. Import revision/migration bookkeeping is intentionally distinct. Deleting the original document retains text and material access without invented links.
- Existing regression coverage passes for source revision immutability, unavailable PDFs, failed saves, interrupted/expired generation recovery, backup conflicts, archived unfinished attempts, and Quiz/Exam feedback rules.
- A generated local-only biology fixture was imported through Settings on port 4197. Library shows one source and three saved formats. Flashcard reveal survives reload; Reviewer opens with source evidence. Quiz shows feedback after answer submission. Exam resumes its stored attempt, saves/reloads editable drafts, permits edits, hides solutions until final submission, and then shows the immutable score. Library Results opens the retained result deep links. No AI request is needed or enabled.
- Library overview, populated material detail and Results have no horizontal overflow at **320, 390, 768, 1024 and 1440 px**. Keyboard Enter opens a source; Space reveals cards and changes source sections; visible Results focus remains intact. Desktop and mobile layouts inspected visually. S2's three-step responsive checks remain applicable; no wizard layout changes in S3.
- Final build browser recheck confirms Exam results/Submit Exam labels and Library navigation. Archive displays retained Quests and sample questions read-only. No browser console errors observed.

### Limits and next decision

Physical-phone testing remains excluded. The browser compatibility fixture is deliberately synthetic; original real-PDF rendering was verified in S2 and is covered by existing PDF regression checks. No live provider request or factual-quality certification occurred. AI factual acceptance remains unresolved in Phase 6A. S3 is complete; obtain owner authorization for any next development checkpoint or push/publication.


### S3 GitHub handoff — 2026-11-26

The owner authorized pushing completed S3 and updating Markdown. Implementation commit: `e1e8673` (Complete S3 Library compatibility and simplification acceptance). This supersedes the local-only/no-new-push restriction for this handoff. The snapshot includes 322 passing tests, 18 skipped opt-in live tests, passing type/build checks and 31 route checks, as recorded above. No additional implementation changes were made for this push. Live publication, AI enablement and the next development phase remain separate decisions.


## UI/UX refinement checkpoint 1 — 2026-11-27

Owner authorized refining New study before returning to AI work. This checkpoint preserves the existing identity and behavior: three-step progress indicator, short contextual instructions, selected input/mode styling, a clearer PDF upload area, source summary, expandable local-saving details, framed exact-text review and a more visible unavailable-generation message. Continue stays consistently named and positioned; Back and focus handling are preserved. No changes to Library, study/results screens, storage, generation policy or request recovery.

Validation: 20 existing affected workflow/generation tests passed. Browser check covered all three steps at 320/390/768/1024/1440 px without horizontal overflow, keyboard selection/Continue, automatic heading focus, Back retaining the chosen mode, and disabled generation with an enabled Library link. Desktop upload and mobile mode screens visually inspected; no console errors. Physical-phone testing excluded. Stop for owner review before Library refinement. No commit, push, publication or AI enablement requested.


## UI/UX refinement checkpoint 2 — 2026-11-27

Owner authorized continuing to Library. Refined the overview with a prominent New study action, PDF/Text badges, readable source titles and clear zero-material wording. Source details retain on-demand original/version access, with a consistent two-column Study materials/Results switch. Material and attempt cards use clearer spacing and typography. Empty states explain the next action; ambiguous-source copy uses plain language. No repository, association, grading or generation behavior changed.

Validation: all nine Library projection/compatibility/UI tests passed; focused lint, TypeScript and production build passed. Populated overview, materials and results checked at 320/390/768/1024/1440 pixels without horizontal overflow. Keyboard Enter opens a source; Space switches sections with visible focus. Existing recorded scores and unfinished-attempt links are intact. Mobile Results visually inspected; no browser console errors. Physical-device testing remains excluded. Stop for owner review before refining study screens. No commit, push, publication or AI enablement performed.


## UI/UX refinement checkpoint 3 — 2026-11-27

Owner authorized the four study screens. Quiz/Exam now use a bounded reading column, clearer question panels and progress rows, consistent navigation spacing and a Library return link. Legacy and unified Flashcards/Reviewer use roomier reading cards and expandable source evidence; original references and exclusions remain accessible. Unified flashcard reveal exposes its expanded state to assistive technology. Grading, saved-progress operations, consent and generation remain unchanged. Results-screen refinement remains a separate next checkpoint.

Validation: 28 affected study/quiz/source tests passed; focused lint, type checks and production build passed. Browser checks on the existing local biology fixture verified Flashcard evidence expansion via keyboard, Reviewer evidence disclosure, Quiz immediate feedback and locked submitted answers, and Exam draft saving/reload with solutions hidden. All four screens were checked across 320/390/768/1024/1440 px without observed horizontal overflow; viewport measurements were rechecked where browser resize applied asynchronously. Mobile Exam and desktop reading layouts visually inspected; no console errors. Unified material persistence is covered by automated tests; browser fixture uses legacy formats. Physical-phone testing excluded. Stop before Results refinement pending owner confirmation. No commit, push, publication or AI enablement.

## UI/UX checkpoint 4 — Results (2026-11-27)

Completed locally with owner authorization. Results now groups the recorded score and totals into a summary, separates answer review into readable cards, labels explanations, and keeps source evidence behind keyboard-accessible disclosures. Retry and Library actions stack on narrow screens; saved-result pages share the bounded reading layout. Existing scores, snapshots, storage and retry behavior are unchanged.

Validation: 18 relevant tests passed (quiz-results, mcq-practice, mcq-test); focused ESLint, TypeScript and Node production build/artifact checks passed. Browser checks covered saved Quiz and Exam results, Exam reload persistence, heading focus and keyboard source disclosure. No horizontal overflow at actual viewport widths 320, 390, 768, 1024 and 1440; mobile/desktop screenshots reviewed; no browser console errors. Physical-phone testing excluded. No AI requests or factual-quality claims.

Stop before checkpoint 5 (Settings/Archive), pending owner confirmation. Changes remain local and uncommitted; no push, publication or AI enablement.

## UI/UX refinement checkpoint 5 — Settings and Archive (2026-11-28)

Completed locally with owner authorization. Settings now groups Data & backup, Archive and About in a clearer page hierarchy; backup privacy/recovery copy and all actions remain intact. Backup import controls use responsive spacing and clearer focus styling. Archive uses a bounded reading column, clearer record spacing and consistent keyboard focus while preserving read-only content and recorded outcomes.

Validation: focused ESLint and TypeScript check completed. Browser review confirmed the Settings sections, keyboard expansion of Data & backup, available export/import/delete controls, Archive deep link, and keyboard expansion of a retained Quest. At 320 px Archive had no horizontal overflow. No browser console errors. No backup was imported/exported and no records were deleted. Physical-phone testing excluded. AI remains disabled.

UI/UX checkpoints 1–5 are complete locally. The edits remain uncommitted and unpushed; no publication or AI enablement.

## UI/UX refinement handoff — 2026-11-28

All five refinement checkpoints are complete. The agent-ready pickup guide is [ui-ux-handoff.md](ui-ux-handoff.md); it records architecture constraints, what changed, validation evidence and limits, AI/data guardrails, useful commands, and a suggested pickup sequence. The owner authorized pushing this completed UI refinement snapshot on 2026-11-28. Publication and AI enablement remain separate and unauthorized.

The whole-project status for a new agent is captured in [system-progress-handoff.md](system-progress-handoff.md). It consolidates roadmap status, architecture, the AI acceptance blocker, hosting state and source-of-truth documents.
