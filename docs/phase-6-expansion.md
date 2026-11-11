# Phase 6 expansion: study any subject

Owner-approved on 2026-11-11. Phase 6 now includes quizzes, reviewers and flashcards. Programming remains optional example content, not the primary product identity. Phase 6 is in progress; no live generation is enabled.

## Product flow and defaults

Home prioritizes the PDF library and the user's study materials. Existing programming quests, attempts and history remain intact and accessible as optional examples. Update page metadata and navigation labels without silently resetting existing data.

Import a PDF, select up to ten pages per generation batch, inspect extracted text, choose Quiz/Test, Reviewer or Flashcards, consent to the named provider's text transfer, then generate and save. Each format is requested independently; opening or studying saved material does not call AI again. Existing quiz generation retains five MCQs per request.

- Quiz/Test: reuse the current Practice, Test, result and immutable-version flows. Existing source questions may be converted only when their answers are supported by the selected source. Do not infer a verified answer key from unmarked options.
- Reviewer: source-linked topic sections and key points, optional key-term definitions and comparison tables. Omit unsupported content rather than supplementing it with unsourced model knowledge.
- Flashcards: up to twenty source-linked front/back cards per batch, explicit reveal, Previous/Next and progress within the deck. No automatic correctness scoring, spaced-repetition scheduling or mastery claims in this phase.
- Display source page/excerpt and a notice that generated content needs review. Show excluded page/reason entries for image-dependent material, missing answer support and insufficient text. Text citation matching proves location, not truth.

## Shared implementation

`src/domain/study-material.ts` adds a subject-neutral request and a StudyGenerator interface. Reviewer and flashcard output have separate strict schemas; unknown fields, wrong formats, missing citations, duplicate entries, unselected source pages and oversized output fail validation. Application code supplies identity and creation time. Quiz output continues through its existing validator; no legacy quiz data is coerced into another format.

Next wire the format selector through the server/client boundary and include format plus source fingerprint in the idempotency identity. Server controls remain shared across all formats and both hosts; failure or cancellation must not trigger automatic repeated provider calls. Keep all production formats disabled until the real adapter and durable controls pass acceptance.

Add a separate immutable study-material store for reviewer/deck records with a versioned IndexedDB upgrade that preserves current stores. Add storage validation, source checksum/text verification and transaction completion checks. Extend backup format with a new explicit version; accept existing version-2 backups with empty study-material collections, validate new records before atomic merge, and preserve source conflicts. Do not silently introduce new fields into existing strict backup version 2.

Persist flashcard position and revealed state separately from immutable content; reset reveal when changing cards. Save only after durable writes and show recoverable storage errors. Reviewer/deck access must survive reload and source deletion, retaining citation excerpts with an honest missing-original state. Export/import must preserve saved content and study position. Use source text as data; never execute instructions found inside a PDF.

## Larger PDFs and image limitations

The supplied parasitology PDF is 50 pages, 10,733,220 bytes, and contains extractable text plus image-dependent questions in the first five inspected pages. It is a local feasibility fixture only: never commit it or send its contents to a provider without consent. Its content has not been verified as an answer key.

Current 5 MiB import and ten-selected-page limits remain unchanged until extraction, worker cleanup, cancellation, preview and backup tests justify increasing capacity. Target a provisional 15 MiB file ceiling while retaining ten-page generation batches and existing text/request limits; validate the supplied file locally before enabling that ceiling. A larger file limit is not a promise of processing all fifty pages in one AI request. Physical-phone capacity remains unverified.

OCR, vision-based parasite identification and AI image interpretation are outside this text-first expansion. Preserve original-page previews. Exclude or flag image-dependent questions; never advertise full image understanding.

## Acceptance and remaining decisions

- All three formats work from a non-programming source through generation, evidence review, save, reload and backup round-trip. Quiz grading remains unchanged.
- Reviewer claims, term definitions, comparison rows and card answers have supporting citations. Human review checks factual support, including ambiguous answer keys, conflicting source claims and image references.
- Keyboard and compact/tablet/desktop layouts support format selection, long content, evidence links and card reveal/navigation. Saved study materials remain usable during provider outages.
- New migration/backup tests cover old databases, legacy backups, duplicate saves, stale text, quota/write failures and source deletion. Server tests cover format-bound request retries, output mismatch and shared allowance exhaustion.
- Provider/backend, actual account limits and final quality thresholds remain undecided. Groq Free and Upstash Free are proposals only; no spending or external provisioning is authorized. Live evaluation is required before completion.

Stop before Phase 7. No push or publication is included in this authorization.

## Four-choice implementation update

The owner-approved Flashcards / Quiz / Exam / Reviewer flow is implemented locally, including stored-material access, progress and backup support. See [implementation and verification](phase-6-study-flow.md) for current status. Earlier future-tense descriptions above are historical planning; live AI and larger-file limits remain pending.
