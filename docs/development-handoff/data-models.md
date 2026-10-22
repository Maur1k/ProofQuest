# Data models and persistence contract

Canonical TypeScript: `src/domain/types.ts` (real data), `src/demo/lessons.ts` and
`src/demo/logic.ts` (demo), `src/onboarding/*` (onboarding / account demo).

## Real data (working, persisted)

```text
Quest      { id, title, subjectId, topic, difficulty: easy|medium|hard,
             questions: Question[], createdAt: ms, updatedAt: ms }
Question   = Predict { expectedOutput } | Trace { variables[], steps[{label, values[]}] } | Fix { fixedCode }
             common: { id, type, prompt, language: javascript|python, code, explanation, hints[] }
Attempt    { id, questId, quest snapshot (title/subjectId/topic), startedAt, completedAt|null,
             currentIndex, answers: { [questionId]: AnswerRecord }, hintsShown }
AnswerRecord { questionId, response, correct, hintsUsed, revealed, answeredAt }
AppData    { version: 1, quests: Quest[], attempts: Attempt[] }
```

Rules (enforced in `src/domain/` and the reducer): one unfinished attempt per quest, one
answer per question per attempt, mastery +1 only for independent correct answers.

## Persistence contract

| Key | Owner | Value | Lifetime |
| --- | --- | --- | --- |
| `proofquest:data:v1` | store | JSON `AppData` | until user clears browser data |
| `proofquest:backup:<ms>` | store | raw string of malformed data before recovery | same |
| `proofquest:onboarding:v1` | onboarding | `"seen"` | same |
| *(none)* | Study demo | memory only (`DemoProvider`) | resets on reload |
| *(none)* | Account demo | component state only | discarded on leave/success |

- Reads happen after hydration only. Every read/write is wrapped; failure never throws to the UI.
- Onboarding code must never read or write the data key. Account demo must never persist anything.
- Version bumps: new key suffix (`:v2`) plus a migration from the previous key; never reuse a key with a different shape.

## Integration boundaries (future — NOT implemented)

| Area | Today | Future boundary |
| --- | --- | --- |
| Accounts | Sample-only forms, `validateLogin/validateRegister` | `AuthService { signIn(email, pw), signUp(name, email, pw), signOut(), currentUser }`. Replace the `onSubmit` success branch; keep validation. Never store passwords client-side. |
| Sync | none | `QuestRepository` interface over AppData; local implementation is today's store. |
| Document upload | `DEMO_SAMPLE_FILES` metadata + `validateSampleFile` | `DocumentSource.pick()` → `UploadService.upload(file)` → server parse → `Lesson`. Real file reading starts only behind this boundary. |
| Question generation | `generateDemoQuestions` (deterministic bank) | `QuestionGenerator.generate(lesson, config)` server-side; output validated with `src/domain/validation.ts` before use. |
| Demo → real quest | not possible (by design) | `createQuest(QuestDraft)` from reviewed questions, after validation. |
