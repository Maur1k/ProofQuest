# Phase 6B — unified sources handoff

Owner: Maur1k. Updated 2026-11-24. **Implementation and workflow checks complete locally; AI release remains blocked by 6A factual acceptance.** No push, publication, 6C or physical-phone testing.

## Delivered

- PDF adapters reference existing local documents and real page numbers. Text and labeled samples use paragraph references, never manufactured PDF pages.
- Immutable hashed source revisions retain old text and citations after editing. Saves are atomic and reject stale edits.
- Four existing-design choices connect to selected-source generation: Flashcards, Quiz, Exam and Reviewer. Only reviewed, selected text is transmitted after explicit consent. Authored samples use no AI and are never substituted for failures.
- Quiz/Exam share one saved question version and the existing Practice/Test grading/history contracts. Flashcards and Reviewer have independent immutable material envelopes. Card index/reveal progress is stored separately with revision checks.
- Request recovery binds exact revision, ordered selection and format for 24 hours; renewed consent is required. Explicitly starting a new request clears the prior identity. Save retries retain the received result without regenerating. Provider keys remain server-only.
- IndexedDB schema **4**, retaining database name `proofquest:data:v2`, adds source heads/revisions, source materials and material progress. Backup **v5** includes all new records and explicitly migrates v2/v3/v4. Imports validate source hashes, links and quiz envelopes before atomic merge; old grades are not recomputed.
- Server-generated evidence IDs supply exact source quotations. Metadata distinguishes prompt/model/check versions and structural validation from factual review. AI-generated source quizzes now display that they are not fact-checked.

## Verification

Automated coverage includes old-schema upgrades, v2/v3/v4 imports, v5 round-trip, revision conflicts, source hash/reference rejection, immutable versions, quota rollback, card progress, consent/selection changes, request identity reset, cached retry, disabled-host denial and exact evidence materialization. The full regression has 298 passing tests and 18 opt-in live cases skipped; final build details are recorded in `phase-6-validation-2026-11-24.md`.

Browser at localhost 4193:

| Check | Result |
|---|---|
| Real USGS PDF extraction and saved original | Passed; one page, 2,334 characters |
| PDF → source → consent → live Quiz → result/reload → original page | Passed as workflow; question factual review failed, recorded under 6A |
| Authored sample Quiz and Exam | Immediate submitted Quiz feedback; Exam answer changed/saved/reloaded, explanations hidden until final submission |
| Pasted biology notes → live Flashcards | Five cards saved; keyboard reveal and position/reveal reload passed; all five cards audited |
| Same notes → live Reviewer | Five source-backed notes and a supported term saved and reopened |
| Source edited after material creation | Old Reviewer retained original wording and saved revision |
| Layout widths 320, 390, 768, 1024, 1440 | No document horizontal overflow on source choices; Reviewer visually checked at mobile/tablet size |
| Rate-limit feedback | Pacing denial preserved the request; retry succeeded without resetting limits |

Evidence screenshots: `C:/Users/maurik/Documents/ChatGPT/ProofQuest/validation/6b-reviewer-mobile-nov24.jpg` and `6b-reviewer-evidence-nov24.jpg`.

## Boundaries

Browser sizes are not physical-device validation. The 5 MiB/10-page local PDF guards and smaller AI request envelope remain development limits. Scanned/image-dependent content, OCR, bookmarks, mixed question types, written grading and timers are not delivered by 6B. Reviewer content is initially extractive; it is not a promise of unrestricted AI summaries. Default generation stays disabled until the separate 6A quality gate passes. No further phase has begun.
