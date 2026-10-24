import { createFileRoute, Link } from "@tanstack/react-router";
import { Brand } from "@/onboarding/Brand";
import { ART } from "@/onboarding/slides";
import { markOnboardingSeen } from "@/onboarding/useOnboarding";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "Welcome — ProofQuest" },
      {
        name: "description",
        content: "Continue as a guest to study and practice programming in ProofQuest.",
      },
      { property: "og:title", content: "Welcome — ProofQuest" },
      {
        property: "og:description",
        content: "Study a topic, practice it, and track your progress in your browser.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Welcome,
});

const secondary =
  "inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-input bg-card px-4 text-sm font-semibold text-foreground hover:border-primary/60";

function Welcome() {
  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-[430px] flex-col px-1 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <Brand />
      <div className="flex min-h-[200px] flex-1 items-center justify-center py-2">
        <img
          src={ART.welcome}
          alt=""
          width={640}
          height={640}
          className="h-full max-h-[360px] w-auto max-w-full object-contain"
        />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Learn it, then prove it.</h1>
      <p className="mt-1 text-[15px] text-muted-foreground">
        Study a programming topic, practice it with short questions, and watch your progress grow.
      </p>

      <Link
        to="/"
        onClick={markOnboardingSeen}
        className="mt-5 flex min-h-14 items-center justify-center rounded-2xl bg-gradient-primary text-base font-semibold text-primary-foreground shadow-glow"
      >
        Continue as guest
      </Link>
      <p className="mt-2 text-xs text-muted-foreground">
        As a guest, your quests and progress are saved in this browser only. The study demo resets
        when you reload.
      </p>

      <div className="mt-4 flex gap-2">
        <Link to="/register" className={secondary}>
          Create account
        </Link>
        <Link to="/login" className={secondary}>
          Log in
        </Link>
      </div>
      <p className="mt-2 text-center text-xs text-warning">
        Account screens are a demo. No account is created.
      </p>
    </div>
  );
}
