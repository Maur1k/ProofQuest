/**
 * Validation for the sample-only account screens. Pure; no I/O. Nothing here
 * authenticates, stores or transmits anything.
 */
export interface LoginInput {
  email: string;
  password: string;
}
export interface RegisterInput {
  displayName: string;
  email: string;
  password: string;
  confirm: string;
}
export type FieldErrors<T> = Partial<Record<keyof T, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_MIN = 8;

function emailError(email: string): string | undefined {
  const e = email.trim();
  if (!e) return "Enter an email address.";
  if (e.length > 254 || !EMAIL_RE.test(e)) return "Enter an email like name@example.com.";
  return undefined;
}

export function validateLogin(input: LoginInput): FieldErrors<LoginInput> {
  const errors: FieldErrors<LoginInput> = {};
  const em = emailError(input.email);
  if (em) errors.email = em;
  if (!input.password) errors.password = "Enter a password.";
  else if (input.password.length < PASSWORD_MIN)
    errors.password = `Password must be at least ${PASSWORD_MIN} characters.`;
  return errors;
}

export function validateRegister(input: RegisterInput): FieldErrors<RegisterInput> {
  const errors: FieldErrors<RegisterInput> = {};
  const name = input.displayName.trim();
  if (!name) errors.displayName = "Enter a display name.";
  else if (name.length < 2 || name.length > 40)
    errors.displayName = "Display name must be 2 to 40 characters.";
  const em = emailError(input.email);
  if (em) errors.email = em;
  if (!input.password) errors.password = "Enter a password.";
  else if (input.password.length < PASSWORD_MIN)
    errors.password = `Password must be at least ${PASSWORD_MIN} characters.`;
  else if (!/[A-Za-z]/.test(input.password) || !/\d/.test(input.password))
    errors.password = "Use at least one letter and one number.";
  if (!input.confirm) errors.confirm = "Confirm your password.";
  else if (input.confirm !== input.password) errors.confirm = "Passwords don't match.";
  return errors;
}

/** First field (in form order) that has an error, for focus management. */
export function firstErrorField<T>(order: (keyof T)[], errors: FieldErrors<T>): keyof T | null {
  return order.find((k) => errors[k]) ?? null;
}
