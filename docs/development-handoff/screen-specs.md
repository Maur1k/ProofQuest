# Screen behavior specs

Legend — **W**: working · **D**: demo (UI only, nothing real happens).

## Onboarding rules (W)

| Situation | Behavior |
| --- | --- |
| First launch at `/` | Home shows a loading skeleton until hydrated, reads `proofquest:onboarding:v1`; if not `seen` → `replace` navigate to `/intro` (no extra history entry, so Back doesn't bounce). |
| Returning visitor at `/` | Preference is `seen` → Home renders. No gate, no flicker of the intro. |
| Skip (every slide) / Get started | Writes `seen`, then navigates to `/welcome`. |
| Continue as guest (welcome, account header, Demo complete) | Writes `seen` (idempotent) → `/`. |
| Replay introduction (Home footer) | Opens `/intro`; preference unchanged. Skip/Get started → `/welcome` → guest → Home. No loop because `seen` is already stored. |
| Deep link to any other route on first visit | Opens that route directly; intro is not forced. The intro appears the next time `/` is opened while still unseen. |
| Deep link to `/intro`, `/welcome`, `/login`, `/register` | Renders that screen; no redirects. |
| Refresh on `/intro` | Starts at slide 1 (slide index is not persisted). |
| Back from `/welcome` | Returns to `/intro`; from `/intro` reached by redirect, Back leaves the app's previous page. |
| Storage unavailable / throws | Status = `unavailable`; intro shown once, an in-memory flag prevents it for the rest of the tab. Quest data handling is unchanged (existing warning banner). |
| SSR | Server renders the Home loading skeleton; decision happens in `useEffect`, so hydration markup matches. |
| Unsaved-change guards | Onboarding redirects only from Home, never from the editor, so `/quests/new` and edit guards are never bypassed. |

Only the onboarding key is ever written by onboarding/account code. Quest data (`proofquest:data:v1`) is untouched.

## Introduction `/intro` (W)
- 3 slides (copy in `fixtures/demo-fixtures.json`). Illustration fills remaining height (`min-height: 0` flex); title, body, dots and buttons never shrink, so controls stay visible down to 320×568 (min height 480).
- Controls on every slide: Skip (top right, "Skip introduction"), dots (3 buttons labelled "Slide n of 3: title", current has `aria-current="step"`), Back (slides 2–3), Next; slide 3's Next reads **Get started**.
- Swipe left/right, ←/→ keys when focus is inside the carousel, dots, buttons. Clamped at ends (no wrap). No autoplay. Reduced motion disables the fade.
- Slides 2 and 3 show a demo note; nothing implies real document or AI processing.

## Welcome `/welcome` (W)
- Icon + text wordmark, explorer art, purpose statement, **Continue as guest** (56 px), guest note: quests/progress saved in this browser only; study demo resets on reload. Secondary: Create account, Log in, with "Account screens are a demo" note. No sync promises.

## Log in `/login` and Create account `/register` (D)
- Header: Back (→ `/welcome`), Continue as guest (→ `/`). Notice: "Account demo — no real account is created. Use sample details."
- Fields: login = Email, Password; register = Display name, Email, Password (hint), Confirm password. `autocomplete="off"`, no `name`, no `action`.
- Validation on submit (rules in fixtures). Errors appear under each field with `aria-invalid` + `aria-describedby`; focus moves to the first invalid field in form order. Editing a field clears its error.
- Show/hide password: toggle button, `aria-pressed`, label switches Show/Hide.
- Success: fields reset to empty, then a **Demo complete** panel ("No account was created, you are not signed in…") with **Continue as guest**. Never says signed in / account created.
- Leaving the screen unmounts the form and discards values. Cross links: "Create account" ↔ "Log in".
- No network request, storage, cookie, console logging or auth provider. Covered by `src/test/onboarding.test.tsx` and the browser network audit.

## Home `/` (W)
- Loading skeleton until store + onboarding decision are ready.
- Order: greeting/title → **Continue learning** (only when an unfinished real quest exists; resumes exact question) → study card (explorer art, **Start studying** → `/study`; becomes an outline button when Continue learning is present so there is one prominent CTA) → summary stats → "No quest in progress" / suggested focus → **Create quest manually** (secondary, "saved to your library") → subjects → recent quests (empty state) → footer: Replay introduction, Account demo.

## Study `/study` (D)
- Drop zone with explorer art, "Drop a sample to start studying". Sample tiles show a drawn document thumbnail (PDF red / MD teal badge). Tap opens the lesson; mouse drag anywhere / touch drag from the grip; release over the zone opens, outside shows "Released outside the drop zone. Nothing opened." Real files dropped are blocked and never read.
- "What the demo can't open" shows validation messages for unsupported samples. Search + subject filter + empty state below.

## Lesson reader (D content)
- Outline & objectives disclosure, sections with code, key points, optional "Mark read" (memory only). Loops lesson section 1 includes a for-loop flow diagram (init → condition → body → update → back; false → end) with accessible name, description and caption.
- Practice card: Preview questions (default set) and Customize.

## Configure / Review / Ready (D)
- Unchanged from the previous iteration: configure validates title/sections/types/count; review edits prompts/answers/explanations, removes with confirm, preview answers; Ready summarizes count/types/sections, says Not saved, Start practice (prototype) opens an informational dialog only.

## Existing working screens
Subjects, Quests, Editor, Practice, Results, Progress are unchanged; see `.lovable/plan.md` and `src/domain/` tests for rules.
