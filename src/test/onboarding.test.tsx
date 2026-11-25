import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ONBOARDING_KEY,
  readOnboardingStatus,
  shouldShowIntro,
  writeOnboardingSeen,
} from "@/onboarding/preference";
import { validateLogin, validateRegister, firstErrorField } from "@/onboarding/accountDemo";
import { INTRO_SLIDES, nextSlideIndex, swipeDelta } from "@/onboarding/slides";
import { STORAGE_KEY } from "@/domain/storage";

describe("onboarding preference", () => {
  beforeEach(() => localStorage.clear());

  it("first launch is unseen, then seen after writing", () => {
    expect(readOnboardingStatus(localStorage)).toBe("unseen");
    expect(writeOnboardingSeen(localStorage)).toBe(true);
    expect(readOnboardingStatus(localStorage)).toBe("seen");
  });

  it("writes only its own versioned key and leaves quest data untouched", () => {
    localStorage.setItem(STORAGE_KEY, '{"version":1,"quests":[],"attempts":[]}');
    writeOnboardingSeen(localStorage);
    expect(localStorage.length).toBe(2);
    expect(localStorage.getItem(ONBOARDING_KEY)).toBe("seen");
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{"version":1,"quests":[],"attempts":[]}');
  });

  it("treats throwing storage as unavailable without throwing", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readOnboardingStatus(broken)).toBe("unavailable");
    expect(writeOnboardingSeen(broken)).toBe(false);
  });

  it("shows the intro once per session when storage is unavailable (no loop)", () => {
    expect(shouldShowIntro("unavailable", false)).toBe(true);
    expect(shouldShowIntro("unavailable", true)).toBe(false);
    expect(shouldShowIntro("seen", false)).toBe(false);
    expect(shouldShowIntro("unseen", false)).toBe(true);
  });
});

describe("intro slides", () => {
  it("has exactly the three agreed titles", () => {
    expect(INTRO_SLIDES.map((s) => s.title)).toEqual([
      "Welcome to ProofQuest",
      "Start studying in one step",
      "Turn understanding into practice",
    ]);
  });
  it("clamps navigation at both ends", () => {
    expect(nextSlideIndex(0, -1, 3)).toBe(0);
    expect(nextSlideIndex(2, 1, 3)).toBe(2);
    expect(nextSlideIndex(1, 1, 3)).toBe(2);
  });
  it("ignores short or vertical swipes", () => {
    expect(swipeDelta(-80, 10)).toBe(1);
    expect(swipeDelta(80, 10)).toBe(-1);
    expect(swipeDelta(-30, 0)).toBe(0);
    expect(swipeDelta(-60, 120)).toBe(0);
  });
});

describe("account demo validation", () => {
  it("login requires a valid email and an 8+ character password", () => {
    expect(validateLogin({ email: "", password: "" })).toEqual({
      email: "Enter an email address.",
      password: "Enter a password.",
    });
    expect(validateLogin({ email: "a@b", password: "short" }).email).toBeDefined();
    expect(validateLogin({ email: "a@b.co", password: "short" }).password).toMatch(/8/);
    expect(validateLogin({ email: "a@b.co", password: "12345678" })).toEqual({});
  });
  it("register checks name length, letter+number password and matching confirm", () => {
    const ok = {
      displayName: "Ana",
      email: "ana@example.com",
      password: "abcd1234",
      confirm: "abcd1234",
    };
    expect(validateRegister(ok)).toEqual({});
    expect(validateRegister({ ...ok, displayName: "A" }).displayName).toBeDefined();
    expect(
      validateRegister({ ...ok, password: "abcdefgh", confirm: "abcdefgh" }).password,
    ).toBeDefined();
    expect(validateRegister({ ...ok, confirm: "abcd12345" }).confirm).toBe(
      "Passwords don't match.",
    );
  });
  it("focuses the first invalid field in form order", () => {
    expect(
      firstErrorField<{ displayName: string; email: string; password: string }>(
        ["displayName", "email", "password"],
        { password: "x", email: "y" },
      ),
    ).toBe("email");
  });
});
