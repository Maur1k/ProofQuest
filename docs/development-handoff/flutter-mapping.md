# Flutter mapping (reference only)

The snippets below are **illustrative and not compiled**. No Flutter app exists in this
repository; building it is out of scope for this handoff.

## Routing

| Web (TanStack Router) | Flutter (`go_router`) |
| --- | --- |
| `src/routes/*.tsx` file routes | `GoRoute(path: ...)` list |
| `__root.tsx` + `AppShell` bottom nav | `StatefulShellRoute.indexedStack` with `NavigationBar` |
| Full-screen `/intro`, `/welcome`, `/login`, `/register` | Top-level `GoRoute`s outside the shell |
| Home `useEffect` → `navigate({to:'/intro', replace:true})` | `redirect:` on `/` reading the onboarding flag (`context.go`) |
| Router blocker for unsaved edits | `PopScope(canPop: !dirty, onPopInvokedWithResult: …)` + confirm dialog |

## State

| Web | Flutter |
| --- | --- |
| `StoreProvider` + pure `dataReducer` | `Notifier<AppData>` (Riverpod) or `Cubit`; port reducer as pure Dart functions |
| `src/domain/*` pure functions | `lib/domain/*.dart` pure functions + unit tests (port `domain.test.ts` cases) |
| `DemoProvider` (memory) | Riverpod provider **without** persistence (`autoDispose` not required; resets on restart) |
| Onboarding key in localStorage | `SharedPreferences` bool `proofquest:onboarding:v1` — isolated from quest data |
| Quest data in localStorage | file / `shared_preferences` JSON string / sqflite, same JSON shape |
| Account form `useState` | `StatefulWidget` + `TextEditingController`s disposed on leave; clear on success |

## Components → widgets

| React | Flutter |
| --- | --- |
| `Button` (primary/outline) | `FilledButton` / `OutlinedButton`, `minimumSize: Size.fromHeight(48)` |
| Intro carousel + dots | `PageView` + `Semantics(label: 'Slide n of 3')` dot `IconButton`s; Skip `TextButton` |
| `<img alt="">` art | `Image.asset(..., excludeFromSemantics: true)` |
| `LoopDiagram` SVG | `CustomPaint` or `flutter_svg`, wrapped in `Semantics(label:, hint:)` |
| `PasswordField` | `TextField(obscureText:)` + suffix `IconButton` with tooltip Show/Hide |
| `SampleDropZone` pointer drag | `LongPressDraggable` / `Draggable` + `DragTarget`; `onTap` alternative |
| `Sheet` (Create choice) | `showModalBottomSheet` |
| `ConfirmDialog` | `showDialog` + `AlertDialog` |
| `CodeBlock` | `SelectableText` in `JetBrains Mono` inside horizontally scrollable container |

No browser-only assumptions should carry over: no `window`, `localStorage`, `pointer capture`, `env(safe-area-*)` — use `SafeArea`, `SharedPreferences`, gesture detectors.

## Reference snippets

```dart
// tokens.dart — from docs/development-handoff/design-tokens.json
abstract final class PQColors {
  static const background = Color(0xFF080F1F);
  static const surface = Color(0xFF11192C);
  static const onSurface = Color(0xFFEEF2F9);
  static const onSurfaceMuted = Color(0xFFA1ABBE);
  static const primary = Color(0xFF6E80F2);
  static const primaryGlow = Color(0xFF5FA1F3);
  static const border = Color(0xFF293248);
  static const focusRing = Color(0xFF889BFF);
  static const warning = Color(0xFFF0BA59);
  static const success = Color(0xFF4FCC92);
  static const danger = Color(0xFFF05653);
  static const teal = Color(0xFF26BDAE);
  static const gold = Color(0xFFEEC05B);
  static const cream = Color(0xFFF8EED5);
}
abstract final class PQSize { static const minTouch = 44.0; static const button = 48.0; static const maxContent = 430.0; }
```

```dart
// onboarding_preference.dart
const onboardingKey = 'proofquest:onboarding:v1';
bool _seenThisSession = false;

Future<bool> shouldShowIntro() async {
  if (_seenThisSession) return false;
  try {
    final prefs = await SharedPreferences.getInstance();
    return !(prefs.getBool(onboardingKey) ?? false);
  } catch (_) {
    return true; // unavailable: show once, memory flag prevents loops
  }
}

Future<void> markOnboardingSeen() async {
  _seenThisSession = true;
  try { (await SharedPreferences.getInstance()).setBool(onboardingKey, true); } catch (_) {}
}
```

```dart
// models.dart (subset)
enum QuestionType { predict, trace, fix }
sealed class Question { const Question(this.id, this.prompt, this.code, this.explanation, this.hints); final String id, prompt, code, explanation; final List<String> hints; }
final class PredictQuestion extends Question { const PredictQuestion(super.id, super.prompt, super.code, super.explanation, super.hints, this.expectedOutput); final String expectedOutput; }
```
