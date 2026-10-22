import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { useLogin, type LoginInput } from '../features/auth/auth.api';
import { DEMO_ACCOUNT } from '../features/auth/demoAccount';
import { useShake } from '../features/auth/useShake';
import { hasErrors, validateLogin, type FormErrors } from '../features/auth/validation';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ApiError } from '../lib/api';

export function LoginPage() {
  useDocumentTitle('Log in');

  const [values, setValues] = useState<LoginInput>({ email: '', password: '' });
  const [errors, setErrors] = useState<FormErrors<LoginInput>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const fieldRefs = { email: useRef<HTMLInputElement>(null), password: useRef<HTMLInputElement>(null) };

  const login = useLogin();
  const { controls, shake } = useShake();
  const isDemoPending = login.isPending && login.variables?.email === DEMO_ACCOUNT.email;
  const isFormPending = login.isPending && !isDemoPending;

  function updateField(field: keyof LoginInput, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    // Clear a field's error as soon as the student starts fixing it.
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  // On success the GuestOnly guard sees the new user and redirects,
  // so this only has to deal with failures.
  async function logIn(credentials: LoginInput) {
    setFormError(null);
    try {
      await login.mutateAsync(credentials);
    } catch (err) {
      const isDemo = credentials.email === DEMO_ACCOUNT.email;
      if (isDemo && err instanceof ApiError && err.isUnauthorized) {
        // The student never typed these details, so a password error would confuse them.
        setFormError('The demo account isn’t available right now. Create an account instead, it takes 20 seconds.');
      } else if (err instanceof ApiError && hasErrors(err.fieldErrors)) {
        setErrors(err.fieldErrors as FormErrors<LoginInput>);
      } else {
        setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      }
      shake();
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validateLogin(values);
    setErrors(found);

    if (hasErrors(found)) {
      const firstInvalid = (['email', 'password'] as const).find((field) => found[field]);
      if (firstInvalid) fieldRefs[firstInvalid].current?.focus();
      shake();
      return;
    }

    void logIn({ email: values.email.trim(), password: values.password });
  }

  return (
    <motion.section className="auth-panel" animate={controls} aria-labelledby="login-title">
      <div className="auth-panel__head">
        <h2 id="login-title" className="auth-panel__title">
          Log in
        </h2>
        <p className="auth-panel__sub">Pick up where you left off.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {formError && (
          <div className="alert alert--error" role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            {formError}
          </div>
        )}

        <TextField
          ref={fieldRefs.email}
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={values.email}
          onChange={(e) => updateField('email', e.target.value)}
          error={errors.email}
        />
        <TextField
          ref={fieldRefs.password}
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          value={values.password}
          onChange={(e) => updateField('password', e.target.value)}
          error={errors.password}
        />

        <div className="auth-form__actions">
          <Button type="submit" variant="primary" block loading={isFormPending} disabled={login.isPending}>
            Log in
          </Button>
        </div>
      </form>

      <div className="auth-divider">or</div>

      <div>
        <Button
          variant="quiet"
          block
          loading={isDemoPending}
          disabled={login.isPending}
          onClick={() => void logIn({ ...DEMO_ACCOUNT })}
        >
          Explore with the demo account
        </Button>
        <p className="auth-demo__note">No sign-up needed. It starts at 0 XP, like a new student.</p>
      </div>

      <p className="auth-switch">
        New here? <Link to="/register">Create an account</Link>
      </p>
    </motion.section>
  );
}
