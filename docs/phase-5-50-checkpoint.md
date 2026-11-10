# Phase 5 — approximately 50% checkpoint

Owner: Maur1k. Date: 2026-11-10. Status: authorized packages 1–3 complete locally; stop before Test-mode UI. Percentage describes scope, not elapsed effort. Phase 5 is not complete.

## Delivered behavior

- Home has an explicitly labeled five-question sample MCQ Practice entry. No quiz data is seeded by viewing Home. An explicit start stores the immutable fixture and starts or resumes the same unfinished Practice session.
- `/quiz-practice/$sessionId` loads after storage initialization. Reload resumes at the first unanswered question. Saved questions remain reviewable in their saved order. Missing, unsupported and unreadable sessions have recovery messages.
- Native radio groups support keyboard selection, visible focus and responsive touch controls. Selection stays local until submission; navigation warns before abandoning it. Question navigation cannot silently discard an unsubmitted choice.
- Feedback and readonly answers appear only after the IndexedDB transaction commits. Correctness comes from the existing domain transition and presentation projection; the UI does not grade answers.
- Pending saves disable repeated submissions. A failed save keeps the choice and offers retry. Revision conflicts prevent stale overwrites and offer explicit reload with discard confirmation. Store operations share the existing durable-storage and mutation lock; temporary mode cannot start this durable quiz.
- After all five answers, the session remains available for feedback review with an honest notice that final results and Test mode are in development. It is deliberately not finalized or counted in legacy programming statistics. No invented PDF citations, AI calls or fake PDF-derived questions.

## Architecture and changes

`src/features/quizzes/` owns the sample entry and Practice UI. The existing store exposes typed start/load/submit operations. Existing repository transactions enforce one unfinished session per quiz/mode, immutable versions and optimistic revisions. The Phase 3 session schema and grading contracts are unchanged. Generated routing includes the new route.

Eight new tests cover asynchronous commit visibility and duplicate-submit protection, failure/retry with retained selection, revision-conflict recovery, reload positioning and readonly review, all-answered review state, explicit entry/persistence timing, temporary-mode gating, and concurrent repository starts/resume. Existing domain and storage regression tests remain applicable.

## Validation

- 165 tests across 15 files pass.
- TypeScript passes. Full ESLint: zero errors, nine pre-existing Fast Refresh warnings.
- Node production build, artifact verification (including local PDF assets) and server/route smoke checks pass.
- Local production browser at `127.0.0.1:4187`: explicit start; keyboard Space/arrow selection; canceling the unsaved-choice leave warning; incorrect and correct saved feedback; reload into the first unanswered question; two tabs with a real stale revision, blocked overwrite and confirmed reload; all five answers; Home start/resume returning the same session for review. No warning/error console entries observed.
- Browser viewport checks at 390×844 and 768×1024: no horizontal overflow; mobile feedback visually inspected; question navigation moved focus to its heading. These are browser viewport checks, not physical-device validation or full accessibility certification.
- Failed-save behavior is covered by component tests; no claim of real browser disk-exhaustion testing. Integrated acceptance and further recovery cases remain in the final Phase 5 package.

## Stop boundary

Packages 1–3 (0–50%) are complete. Do not start packages 4–6 without owner confirmation:

4. 50–70%: Test drafts, reload/resume and final submission UI.
5. 70–90%: final results, source availability, retries and history.
6. 90–100%: integrated acceptance and phase handoff.

This checkpoint is local only; no push, deployment or Lovable AI edit. Physical-phone testing is not claimed. Real PDF-to-quiz generation remains Phase 6.
