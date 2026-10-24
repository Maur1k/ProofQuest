import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { RegisterDemoForm } from "@/onboarding/AccountForms";
import { AccountScreen } from "@/onboarding/AccountScreen";
import { markOnboardingSeen } from "@/onboarding/useOnboarding";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account (demo) — ProofQuest" },
      {
        name: "description",
        content: "Sample-only registration screen. No real account is created.",
      },
      { property: "og:title", content: "Create account (demo) — ProofQuest" },
      { property: "og:description", content: "Account demo: no real account is created." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  return (
    <AccountScreen title="Create account">
      <RegisterDemoForm
        onContinueAsGuest={() => {
          markOnboardingSeen();
          void navigate({ to: "/" });
        }}
        footer={
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have one?{" "}
            <Link
              to="/login"
              className="inline-flex min-h-11 items-center font-semibold text-primary"
            >
              Log in
            </Link>
          </p>
        }
      />
    </AccountScreen>
  );
}
