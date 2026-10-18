# ProofQuest — mobile-first prototype

Build all six screens from the brief as a working front-end prototype. No backend; data lives in the browser (localStorage) and starts from realistic sample quests.

## Screens (each its own page)
- `/` Home: greeting, study summary (quests done, accuracy, streak-free stats), Continue Learning, 4 subject cards, recent quests with progress, prominent Create Quest button.
- `/subjects` and `/subjects/$subjectId`: subjects with topics; subject detail lists its quests, with empty state.
- `/quests`: library with search, subject/difficulty/status filters, edit/delete (confirm dialog), create.
- `/quests/new` and `/quests/$questId/edit`: editor — title, subject, topic, difficulty; add/remove/reorder (up/down) questions of 3 types (Predict output, Trace variables, Fix bug), each with code, expected answer, explanation, hints. Validation before save; cancel confirms if unsaved changes.
- `/practice/$questId`: one question at a time, monospace code block, type-specific inputs (text output; per-step variable table for tracing; editable code area for bug fix), Check Answer / Show Hint / Reveal / Next; feedback + explanation after answering only.
- `/results/$questId`: correct, incorrect, accuracy, per-question review with explanations, Retry and Return to Library.
- `/progress`: per-subject accuracy and attempt history (the 4th nav tab).

Bottom nav: Home, Subjects, Quests, Progress, plus a center floating "+" for Create Quest.

## Visual direction
Dark navy background, subtle indigo accents, restrained gradients, rounded cards, Space Grotesk headings + DM Sans body, JetBrains Mono for code. Layout constrained to ~430px column centered on larger screens; 44px+ touch targets, visible focus states.

## Technical details
- `src/domain/`: types (Quest, Question union by type, Attempt), answer-checking logic (normalized whitespace/case for output; per-cell match for trace; normalized code compare for bug fix), validation.
- `src/data/sample-quests.ts`: ~6 quests across subjects with consistent code/answers.
- `src/store/`: small React context + reducer persisted to localStorage (read after hydration to avoid SSR mismatch).
- `src/components/`: AppShell, BottomNav, QuestCard, SubjectCard, CodeBlock, ProgressRing, EmptyState, question editors/answer inputs.
- Design tokens in `src/styles.css`; fonts via `<link>` in root head; per-route head() metadata.
- Vitest tests for answer checking and quest validation.
