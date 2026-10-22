# Cross-platform guidance

Applies to the web build and the Flutter rewrite.

## Layout
- Single content column, max 430 px, 16 px gutters. Introduction may widen to 560 px on tablets.
- Bottom navigation is fixed; scrollable content reserves 128 px at the bottom so nothing is hidden behind it.
- Full-screen routes (`/intro`, `/welcome`, `/login`, `/register`) show no app navigation.

## Safe areas
- Web: `viewport-fit=cover`; full-screen routes pad top/bottom with `max(spacing, env(safe-area-inset-*))`; bottom nav pads `env(safe-area-inset-bottom)`.
- Flutter: wrap screens in `SafeArea`; the bottom bar uses `MediaQuery.paddingOf(context).bottom`.

## Touch and input
- Minimum target 44×44 (web px / Flutter logical px). Primary buttons 48, hero CTA 56.
- Inputs ≥ 16 px text (prevents iOS zoom). Password fields have a 44×44 show/hide toggle.
- Swipe: horizontal ≥ 50 px and more horizontal than vertical; vertical scrolling must keep working (`touch-action: pan-y`).
- Drag in Study starts only from the grip on touch so the list still scrolls; mouse can drag the whole tile. Tap always works as the alternative.

## Motion
- No autoplay anywhere. Slide fade 300 ms; dot width transition 150 ms.
- Reduced motion (`prefers-reduced-motion` / `MediaQuery.disableAnimations`): disable fades, transitions and scale effects; content changes instantly.

## Focus and accessibility
- Visible 2 px focus ring (`focusRing` token, offset 2) on every interactive element.
- Illustrations are decorative (empty alt / `excludeSemantics`); headings carry meaning.
- The loop diagram is an informative image: accessible name + long description + visible caption.
- Status is never conveyed by color alone (errors have text; dots have labels and `aria-current`).
- Demo screens always show a visible "Demo" label in the warning color.

## Storage
- Never assume storage exists (SSR, private mode, blocked). Read after first render; on failure keep working in memory.
