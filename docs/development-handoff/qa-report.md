# QA report — onboarding, welcome, account demo, visuals

Date: 2026-10-22. Environment: sandbox dev server, headless Chromium (Playwright), jsdom (Vitest).
**No physical-device, screen-reader or user testing was performed.** Human testing with the
two planned testers is **pending**.

## Automated commands

| Command | Result |
| --- | --- |
| `bunx vitest run` | 4 files, 63 tests passed (50 pre-existing unchanged + 13 new in `src/test/onboarding.test.tsx`) |
| `bunx tsgo --noEmit` | passed (strict, `exactOptionalPropertyTypes`) |
| `bunx vite build` | succeeded |

New tests cover: onboarding key isolation (quest data untouched), throwing storage, once-per-session fallback, slide copy, clamped navigation, swipe thresholds, login/register validation rules, first-error focus, show/hide password, Demo complete wording, fields cleared on success and on unmount, and no `fetch`/XHR/localStorage/sessionStorage/cookie/console leakage of the typed password.

## Browser checks (headless Chromium)

| Check | Result |
| --- | --- |
| First visit `/` → `/intro`, no bottom nav | pass |
| Skip visible on slides 1, 2, 3; Skip from slide 2 → `/welcome` | pass |
| Next ×2, last button "Get started" → `/welcome` | pass |
| Dot buttons (mouse and keyboard Enter), ←/→ keys, touch-type pointer swipe | pass |
| Preference not written before finishing; written after | pass |
| First Tab focuses Skip; focus outline visible | pass |
| Login: empty submit focuses Email with errors; show/hide toggles type; valid submit → Demo complete; typed email/password absent from DOM | pass |
| Register: leaving to Log in and back clears fields; mismatched confirm error; valid submit → Demo complete | pass |
| Network audit: zero requests during login and register submission | pass |
| localStorage contents semantically identical before/after forms; no cookies | pass |
| Continue as guest → Home with bottom nav | pass |
| Reload as returning guest stays on Home | pass |
| Replay introduction → Get started → Welcome; Back → intro; `/` afterwards no loop | pass |
| Study: Start studying → tap sample → loops lesson with diagram (accessible name present) | pass |
| Preview questions → review → edit prompt → remove Q2 (confirm) → Ready shows 2 questions, Predict 1 / Fix 1 → prototype dialog | pass |
| Quest data unchanged after the whole demo + onboarding; only `proofquest:data:v1` and `proofquest:onboarding:v1` keys exist | pass |
| Manual creation: typing a title then tapping Home shows the unsaved-changes dialog and stays on `/quests/new` | pass |
| No page errors or console errors during runs | pass |

## Responsive (320×568, 390×844, 768×1024, 1280×800; reduced motion on)

52/52 checks passed via `capture/capture_screenshots.py`: no horizontal overflow on `/intro`, `/welcome`, `/login`, `/register`, `/`, `/study`, loops lesson; intro Skip and Next inside the viewport at all sizes including 320×568; slide animation `none` with reduced motion; Home/Study/lesson last content clears the bottom nav. Screenshots in `screenshots/` were inspected visually (intro, welcome, register at 320; intro/welcome/home/study/login at 390; intro at 1280).

## Fixed during QA
- Loop diagram exposed its long description as part of its name; now name + `aria-describedby`.

## Known limitations
- Typing into a form before the page finishes hydrating (first fraction of a second after a full page load) can be lost; seen only in automation.
- Browsers may still offer to save a password after a demo submit; inputs use `autocomplete="off"`, no `name`, and nothing is sent, but browser password managers are outside app control.
- Long code lines scroll inside their code box by design.
- Favicon at 16 px uses a simplified hand-coded mark; the detailed artwork is used at 28 px and larger.
- Touch was simulated (pointer events with `pointerType: touch`), not on a real device.
