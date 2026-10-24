import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LoginDemoForm } from "@/onboarding/AccountForms";
import { AccountScreen } from "@/onboarding/AccountScreen";
import { markOnboardingSeen } from "@/onboarding/useOnboarding";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in (demo) — ProofQuest" },
      { name: "description", content: "Sample-only login screen. No real account or sign-in." },
      { property: "og:title", content: "Log in (demo) — ProofQuest" },
      { property: "og:description", content: "Account demo: no real account is created." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  return (
    <AccountScreen title="Log in">
      <LoginDemoForm
        onContinueAsGuest={() => {
          markOnboardingSeen();
          void navigate({ to: "/" });
        }}
        footer={
          <p className="mt-4 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link to="/register" className="inline-flex min-h-11 items-center font-semibold text-primary">
              Create account
            </Link>
          </p>
        }
      />
    </AccountScreen>
  );
}
