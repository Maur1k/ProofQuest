import { useId, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, Eye, EyeOff, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  firstErrorField,
  validateLogin,
  validateRegister,
  type FieldErrors,
  type LoginInput,
  type RegisterInput,
} from "./accountDemo";

/**
 * Sample-only account forms. Values live in component state only: no network,
 * storage, cookies, logging or auth provider. Fields are cleared on success, and
 * unmounting (leaving the screen) discards them.
 */

export function AccountDemoNotice() {
  return (
    <p
      role="note"
      className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs font-medium text-warning"
    >
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      Account demo — no real account is created. Use sample details.
    </p>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | undefined;
  type?: "text" | "email";
  hint?: string;
  inputRef: (el: HTMLInputElement | null) => void;
}

function Field({ id, label, value, onChange, error, type = "text", hint, inputRef }: FieldProps) {
  const errId = `${id}-err`;
  const hintId = `${id}-hint`;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      <input
        ref={inputRef}
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(hint && hintId, error && errId) || undefined}
        className={cn(
          "mt-1 h-12 w-full rounded-xl border bg-background px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          error ? "border-destructive" : "border-input",
        )}
      />
      {error && (
        <p id={errId} className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function PasswordField(props: Omit<FieldProps, "type">) {
  const [shown, setShown] = useState(false);
  const { id, label, value, onChange, error, hint, inputRef } = props;
  const errId = `${id}-err`;
  const hintId = `${id}-hint`;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      <div className="relative mt-1">
        <input
          ref={inputRef}
          id={id}
          type={shown ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={cn(hint && hintId, error && errId) || undefined}
          className={cn(
            "h-12 w-full rounded-xl border bg-background pl-3 pr-12 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            error ? "border-destructive" : "border-input",
          )}
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-pressed={shown}
          aria-label={shown ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute right-0.5 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {shown ? (
            <EyeOff className="h-5 w-5" aria-hidden />
          ) : (
            <Eye className="h-5 w-5" aria-hidden />
          )}
        </button>
      </div>
      {error && (
        <p id={errId} className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function DemoComplete({
  onContinueAsGuest,
  what,
}: {
  onContinueAsGuest: () => void;
  what: string;
}) {
  return (
    <div role="status" className="rounded-2xl border border-border bg-card p-5 text-center">
      <CheckCircle2 className="mx-auto h-8 w-8 text-teal" aria-hidden />
      <h2 className="mt-2 font-display text-xl font-semibold text-foreground">Demo complete</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        That's how {what} would work. No account was created, you are not signed in, and the details
        you typed were cleared.
      </p>
      <Button onClick={onContinueAsGuest} className="mt-4 min-h-12 w-full text-base">
        Continue as guest
      </Button>
    </div>
  );
}

function useFieldRefs<T>() {
  const refs = useRef<Partial<Record<keyof T, HTMLInputElement | null>>>({});
  const bind = (k: keyof T) => (el: HTMLInputElement | null) => {
    refs.current[k] = el;
  };
  const focus = (k: keyof T | null) => {
    if (k) refs.current[k]?.focus();
  };
  return { bind, focus };
}

interface FormProps {
  onContinueAsGuest: () => void;
  /** Rendered under the form (links to the other account screen, guest access). */
  footer?: ReactNode;
}

const EMPTY_LOGIN: LoginInput = { email: "", password: "" };

export function LoginDemoForm({ onContinueAsGuest, footer }: FormProps) {
  const uid = useId();
  const [values, setValues] = useState<LoginInput>(EMPTY_LOGIN);
  const [errors, setErrors] = useState<FieldErrors<LoginInput>>({});
  const [done, setDone] = useState(false);
  const { bind, focus } = useFieldRefs<LoginInput>();
  const set = (k: keyof LoginInput) => (v: string) => {
    setValues((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  if (done) return <DemoComplete onContinueAsGuest={onContinueAsGuest} what="logging in" />;

  return (
    <>
      <form
        noValidate
        aria-label="Log in (demo)"
        onSubmit={(e) => {
          e.preventDefault();
          const errs = validateLogin(values);
          setErrors(errs);
          const first = firstErrorField<LoginInput>(["email", "password"], errs);
          if (first) return focus(first);
          setValues(EMPTY_LOGIN);
          setDone(true);
        }}
        className="space-y-4"
      >
        <Field
          id={`${uid}-email`}
          label="Email"
          type="email"
          value={values.email}
          onChange={set("email")}
          error={errors.email}
          inputRef={bind("email")}
        />
        <PasswordField
          id={`${uid}-pw`}
          label="Password"
          value={values.password}
          onChange={set("password")}
          error={errors.password}
          inputRef={bind("password")}
        />
        <Button type="submit" className="min-h-12 w-full text-base">
          Log in (demo)
        </Button>
      </form>
      {footer}
    </>
  );
}

const EMPTY_REGISTER: RegisterInput = { displayName: "", email: "", password: "", confirm: "" };

export function RegisterDemoForm({ onContinueAsGuest, footer }: FormProps) {
  const uid = useId();
  const [values, setValues] = useState<RegisterInput>(EMPTY_REGISTER);
  const [errors, setErrors] = useState<FieldErrors<RegisterInput>>({});
  const [done, setDone] = useState(false);
  const { bind, focus } = useFieldRefs<RegisterInput>();
  const set = (k: keyof RegisterInput) => (v: string) => {
    setValues((s) => ({ ...s, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  if (done)
    return <DemoComplete onContinueAsGuest={onContinueAsGuest} what="creating an account" />;

  return (
    <>
      <form
        noValidate
        aria-label="Create account (demo)"
        onSubmit={(e) => {
          e.preventDefault();
          const errs = validateRegister(values);
          setErrors(errs);
          const first = firstErrorField<RegisterInput>(
            ["displayName", "email", "password", "confirm"],
            errs,
          );
          if (first) return focus(first);
          setValues(EMPTY_REGISTER);
          setDone(true);
        }}
        className="space-y-4"
      >
        <Field
          id={`${uid}-name`}
          label="Display name"
          value={values.displayName}
          onChange={set("displayName")}
          error={errors.displayName}
          inputRef={bind("displayName")}
        />
        <Field
          id={`${uid}-email`}
          label="Email"
          type="email"
          value={values.email}
          onChange={set("email")}
          error={errors.email}
          inputRef={bind("email")}
        />
        <PasswordField
          id={`${uid}-pw`}
          label="Password"
          hint="At least 8 characters, with a letter and a number."
          value={values.password}
          onChange={set("password")}
          error={errors.password}
          inputRef={bind("password")}
        />
        <PasswordField
          id={`${uid}-confirm`}
          label="Confirm password"
          value={values.confirm}
          onChange={set("confirm")}
          error={errors.confirm}
          inputRef={bind("confirm")}
        />
        <Button type="submit" className="min-h-12 w-full text-base">
          Create account (demo)
        </Button>
      </form>
      {footer}
    </>
  );
}
