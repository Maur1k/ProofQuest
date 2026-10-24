<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Domain logic (types, answer checking, validation, stats/mastery, storage parsing) lives in `src/domain/` as pure functions; UI never re-implements it. Why: testable and portable to the planned Flutter rewrite.
- App state is one React context in `src/store/` persisted to localStorage, loaded only after hydration; malformed data is backed up under a `proofquest:backup:` key before being replaced. Why: no backend by design, and SSR has no storage.
- State changes go through the pure reducer in `src/store/reducer.ts`, which enforces one unfinished attempt per quest and one answer per question. Why: prevents duplicate records regardless of UI double-clicks.
- Attempts keep snapshots of quest title/subject/topic. Why: progress history survives quest edits and deletion.
- Study-to-Quest is a UI-only demo in `src/demo/`: static sample lessons, pure deterministic generation/validation in `logic.ts`, and a memory-only `DemoProvider` that never touches the store, reducer or localStorage; sample drag-and-drop uses pointer events with capture (touch-safe), never reads real files. Why: preview the flow without real uploads, AI or persistence, and keep real progress untouched.
- Onboarding/account demo lives in `src/onboarding/`: the only persisted value is the isolated `proofquest:onboarding:v1` key (pure read/write in `preference.ts`, in-memory fallback when storage fails); only Home decides to redirect to `/intro`, after hydration, so deep links and editor guards are untouched; login/register forms keep values in component state only and never submit, store or log them. Why: first-run polish without touching quest data or implying real auth.
- Full-screen routes (`/intro`, `/welcome`, `/login`, `/register`) are listed in `BARE_PATHS` in `AppShell` and render without bottom nav. Why: no app navigation behind onboarding/auth screens.
- Artwork originals live in `public/assets/proofquest/original/` and are never modified; the app uses resized WebP derivatives. `docs/development-handoff/` is the handoff package (tokens, specs, manifest, Flutter mapping, QA); update it when behavior or tokens change. Why: stable, project-owned assets and a spec the Flutter rewrite can follow.
