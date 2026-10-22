/**
 * Onboarding "seen" preference. The ONLY thing onboarding persists: one isolated,
 * versioned key, separate from the quest/progress data under STORAGE_KEY.
 * Pure functions take a Storage-like object so they are testable and portable
 * (Flutter: SharedPreferences bool under the same key).
 */
export const ONBOARDING_KEY = "proofquest:onboarding:v1";
export const ONBOARDING_SEEN_VALUE = "seen";

export type OnboardingStatus = "seen" | "unseen" | "unavailable";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function readOnboardingStatus(storage: StorageLike | null | undefined): OnboardingStatus {
  if (!storage) return "unavailable";
  try {
    return storage.getItem(ONBOARDING_KEY) === ONBOARDING_SEEN_VALUE ? "seen" : "unseen";
  } catch {
    return "unavailable";
  }
}

/** Returns true when the preference was written. Never throws. */
export function writeOnboardingSeen(storage: StorageLike | null | undefined): boolean {
  if (!storage) return false;
  try {
    storage.setItem(ONBOARDING_KEY, ONBOARDING_SEEN_VALUE);
    return true;
  } catch {
    return false;
  }
}

/**
 * Whether Home should send the visitor to the introduction. When storage is
 * unavailable we fall back to an in-memory flag for this tab so the intro is
 * shown once per session and can never loop.
 */
export function shouldShowIntro(status: OnboardingStatus, seenThisSession: boolean): boolean {
  if (seenThisSession) return false;
  return status !== "seen";
}
