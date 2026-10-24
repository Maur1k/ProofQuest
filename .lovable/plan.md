# ProofQuest — mobile-first prototype

Working front-end prototype of all six screens. No backend, accounts, sync, or AI. Data persists in the browser (localStorage); sample quests are seeded only when no saved data exists.

## Screens (each its own page)
- `/` Home: greeting, study summary from real attempts, Continue Learning (resumes most recent unfinished quest at the exact question), "Suggested focus" topic, 4 subject cards, recent quests with progress, prominent Create Quest.
- `/subjects`, `/subjects/$subjectId`: subjects with topics and mastery; subject detail lists its quests, with empty state.
- `/quests`: library with search, subject/difficulty/status filters, edit, delete (confirm dialog), create.
- `/quests/new`, `/quests/$questId/edit`: title, subject, topic, difficulty; add/remove/reorder questions of 3 types (Predict output, Trace variables, Fix bug) with code, expected answer, explanation, hints. Full validation with inline errors; unsaved-changes warning on cancel and on navigating away (router blocker + beforeunload).
- `/practice/$questId`: one question at a time, monospace code, type-specific inputs (output text; step x variable grid; editable code), Check Answer / Show Hint / Reveal Answer / Next. Feedback and explanation only after answering or revealing. One answer record per question per attempt (no duplicates); revealed answers count as not independent.
- `/results/$questId`: correct, incorrect, accuracy from the recorded attempt, per-question review, Retry (new attempt, history kept) and Return to Library.
- `/progress`: per-subject and per-topic accuracy, mastery, attempt history.

Bottom nav fixed: Home, Subjects, [+ Create], Quests, Progress. Content padded so nav never covers it.

## Rules
- Output answers: trim, collapse whitespace per line, normalize line endings, ignore trailing blank lines; case-sensitive.
- Trace answers: compared per step and per variable after trimming; score shows which cells are wrong.
- Bug fix: normalized text comparison only (strip comments-free? no — trim lines, collapse internal whitespace, drop blank lines). UI labels it "matches expected fix", never claims semantic equivalence.
- Mastery per topic: +1 for a correct independent answer (no hint/reveal), -1 for incorrect, clamped 0–5. Suggested focus = lowest accuracy topic, ties broken by most recent incorrect.

## Visual direction
Dark navy background, subtle indigo accents, restrained gradients, rounded cards, Space Grotesk headings, DM Sans body, JetBrains Mono code. Content column ~430px centered; 44px+ touch targets, visible focus rings, keyboard accessible.

## Technical details
- `src/domain/`: types (Quest, Question discriminated union, Attempt, AnswerRecord), `checking.ts`, `validation.ts`, `mastery.ts` — pure functions.
- `src/data/sample-quests.ts`: ~6 quests across 4 subjects, all three types, verified answers.
- `src/store/`: context + reducer; loads localStorage in useEffect after hydration with a loading state; schema-checked parse with fallback to seed on malformed data (and an error notice); versioned key.
- `src/components/`: AppShell, BottomNav, QuestCard, SubjectCard, CodeBlock, ProgressRing, EmptyState, ConfirmDialog, editors and answer inputs.
- Tokens in `src/styles.css`; fonts via `<link>` in root head; unique head() per route.
- Vitest tests for checking, validation, mastery, and storage parsing edge cases; run them and confirm build is clean.
