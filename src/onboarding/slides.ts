export interface IntroSlide {
  id: string;
  title: string;
  body: string;
  /** Short honesty note shown under the body. */
  note?: string;
  image: string;
}

export const ART = {
  welcome: "/assets/proofquest/proofquest-welcome-640.webp",
  study: "/assets/proofquest/proofquest-study-640.webp",
  practice: "/assets/proofquest/proofquest-practice-640.webp",
  icon: "/assets/proofquest/proofquest-icon-640.webp",
} as const;

export const INTRO_SLIDES: IntroSlide[] = [
  {
    id: "welcome",
    title: "Welcome to ProofQuest",
    body: "Understand a topic, practice what you learn, and see your progress.",
    image: ART.welcome,
  },
  {
    id: "study",
    title: "Start studying in one step",
    body: "Tap or drag a sample document to open a lesson.",
    note: "Demo: built-in sample documents only. Your own files aren't opened or uploaded.",
    image: ART.study,
  },
  {
    id: "practice",
    title: "Turn understanding into practice",
    body: "Preview questions and explore how practice works.",
    note: "Demo: question previews come from a fixed sample set, not AI.",
    image: ART.practice,
  },
];

/** Clamp-based slide navigation used by buttons, dots, keys and swipes. */
export function nextSlideIndex(current: number, delta: number, total: number): number {
  return Math.max(0, Math.min(total - 1, current + delta));
}

export const SWIPE_THRESHOLD_PX = 50;
/** Horizontal swipe direction, or 0 when the gesture is too short or mostly vertical. */
export function swipeDelta(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return 0;
  return dx < 0 ? 1 : -1;
}
