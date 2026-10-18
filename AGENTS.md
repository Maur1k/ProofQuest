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
