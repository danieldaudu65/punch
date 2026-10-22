/**
 * Same rules as the server's Zod schemas, checked in the browser first so
 * students get instant feedback. The server still checks everything.
 */

export type FormErrors<T> = Partial<Record<keyof T, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function checkEmail(email: string): string | undefined {
  if (!email.trim()) return 'Enter your email address';
  if (!EMAIL_PATTERN.test(email.trim())) return 'Enter a valid email address';
  return undefined;
}

export function validateLogin(values: { email: string; password: string }) {
  const errors: FormErrors<typeof values> = {};
  const email = checkEmail(values.email);
  if (email) errors.email = email;
  if (!values.password) errors.password = 'Enter your password';
  return errors;
}

export function validateRegister(values: { name: string; email: string; password: string }) {
  const errors: FormErrors<typeof values> = {};
  const name = values.name.trim();

  if (name.length < 2) errors.name = 'Name must be at least 2 characters';
  else if (name.length > 40) errors.name = 'Name must be 40 characters or fewer';

  const email = checkEmail(values.email);
  if (email) errors.email = email;

  if (values.password.length < 8) errors.password = 'Password must be at least 8 characters';
  else if (values.password.length > 72) errors.password = 'Password must be 72 characters or fewer';

  return errors;
}

export function hasErrors(errors: object) {
  return Object.keys(errors).length > 0;
}
