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
