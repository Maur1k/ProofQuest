import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  ONBOARDING_KEY,
  readOnboardingStatus,
  shouldShowIntro,
  writeOnboardingSeen,
} from "@/onboarding/preference";
import { validateLogin, validateRegister, firstErrorField } from "@/onboarding/accountDemo";
import { INTRO_SLIDES, nextSlideIndex, swipeDelta } from "@/onboarding/slides";
import { LoginDemoForm, RegisterDemoForm } from "@/onboarding/AccountForms";
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

describe("account demo forms never send or keep credentials", () => {
  const SECRET = "Secret123pw";
  let fetchSpy: ReturnType<typeof vi.fn>;
  let xhrSpy: ReturnType<typeof vi.spyOn>;
  let logSpies: ReturnType<typeof vi.spyOn>[];

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    xhrSpy = vi.spyOn(XMLHttpRequest.prototype, "open");
    logSpies = (["log", "info", "warn", "error", "debug"] as const).map((m) =>
      vi.spyOn(console, m),
    );
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function expectNoLeak() {
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrSpy).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(document.cookie).toBe("");
    for (const s of logSpies)
      for (const call of s.mock.calls) expect(JSON.stringify(call)).not.toContain(SECRET);
  }

  it("login: invalid submit focuses the first error; valid submit shows Demo complete and clears", () => {
    const onGuest = vi.fn();
    render(<LoginDemoForm onContinueAsGuest={onGuest} />);
    fireEvent.click(screen.getByRole("button", { name: "Log in (demo)" }));
    expect(screen.getByLabelText("Email")).toHaveFocus();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "sam@example.com" } });
    const pw = screen.getByLabelText("Password");
    fireEvent.change(pw, { target: { value: SECRET } });
    expect(pw).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(pw).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByRole("button", { name: "Log in (demo)" }));

    expect(screen.getByRole("heading", { name: "Demo complete" })).toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain(SECRET);
    expect(document.body.innerHTML).not.toContain("sam@example.com");
    expect(screen.queryByText(/signed in successfully|account created/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Continue as guest" }));
    expect(onGuest).toHaveBeenCalledOnce();
    expectNoLeak();
  });

  it("register: mismatched confirm is reported, valid submit clears without persisting", () => {
    render(<RegisterDemoForm onContinueAsGuest={() => {}} />);
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Sam" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "sam@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: SECRET } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "nope" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account (demo)" }));
    expect(screen.getByText("Passwords don't match.")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm password")).toHaveFocus();

    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: SECRET } });
    fireEvent.click(screen.getByRole("button", { name: "Create account (demo)" }));
    expect(screen.getByRole("heading", { name: "Demo complete" })).toBeInTheDocument();
    expect(document.body.innerHTML).not.toContain(SECRET);
    expectNoLeak();
  });

  it("leaving the screen discards typed values", () => {
    const { unmount } = render(<LoginDemoForm onContinueAsGuest={() => {}} />);
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: SECRET } });
    unmount();
    render(<LoginDemoForm onContinueAsGuest={() => {}} />);
    expect(screen.getByLabelText("Password")).toHaveValue("");
    expectNoLeak();
  });
});
