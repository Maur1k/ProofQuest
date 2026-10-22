import { useEffect, useState } from "react";
import { readOnboardingStatus, shouldShowIntro, writeOnboardingSeen } from "./preference";

// Tab-lifetime fallback when localStorage is blocked (private mode, quota, policy).
let seenThisSession = false;

function safeStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Marks the introduction as seen (persisted if possible, always in memory). */
export function markOnboardingSeen(): void {
  seenThisSession = true;
  writeOnboardingSeen(safeStorage());
}

/**
 * "pending" during SSR and the first client render (no storage on the server, so
 * rendering must match), then "intro" or "home" after hydration.
 */
export function useIntroDecision(): "pending" | "intro" | "home" {
  const [decision, setDecision] = useState<"pending" | "intro" | "home">("pending");
  useEffect(() => {
    const status = readOnboardingStatus(safeStorage());
    setDecision(shouldShowIntro(status, seenThisSession) ? "intro" : "home");
  }, []);
  return decision;
}
