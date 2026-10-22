import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../components/Button';
import { TextField } from '../components/TextField';
import { useRegister, type RegisterInput } from '../features/auth/auth.api';
import { useShake } from '../features/auth/useShake';
import { hasErrors, validateRegister, type FormErrors } from '../features/auth/validation';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ApiError } from '../lib/api';

const FIELD_ORDER = ['name', 'email', 'password'] as const;

export function RegisterPage() {
  useDocumentTitle('Create account');

  const [values, setValues] = useState<RegisterInput>({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState<FormErrors<RegisterInput>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const fieldRefs = {
    name: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    password: useRef<HTMLInputElement>(null),
  };

  const register = useRegister();
  const { controls, shake } = useShake();

  function updateField(field: keyof RegisterInput, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function showErrors(found: FormErrors<RegisterInput>) {
    setErrors(found);
    const firstInvalid = FIELD_ORDER.find((field) => found[field]);
    if (firstInvalid) fieldRefs[firstInvalid].current?.focus();
    shake();
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const found = validateRegister(values);
    if (hasErrors(found)) {
      showErrors(found);
      return;
    }

    try {
      // On success the GuestOnly guard redirects to the dashboard.
      await register.mutateAsync({ name: values.name.trim(), email: values.email.trim(), password: values.password });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        showErrors({ email: 'An account with this email already exists. Try logging in.' });
      } else if (err instanceof ApiError && hasErrors(err.fieldErrors)) {
        showErrors(err.fieldErrors as FormErrors<RegisterInput>);
      } else {
        setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
        shake();
      }
    }
  }

  return (
    <motion.section className="auth-panel" animate={controls} aria-labelledby="register-title">
      <div className="auth-panel__head">
        <h2 id="register-title" className="auth-panel__title">
          Create your account
        </h2>
        <p className="auth-panel__sub">Takes 20 seconds. Your first quiz is waiting.</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {formError && (
          <div className="alert alert--error" role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            {formError}
          </div>
        )}

        <TextField
          ref={fieldRefs.name}
          label="Your name"
          name="name"
          autoComplete="name"
          placeholder="Ada Okafor"
          hint="Shown on the leaderboard."
          value={values.name}
          onChange={(e) => updateField('name', e.target.value)}
          error={errors.name}
        />
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
          autoComplete="new-password"
          hint="At least 8 characters."
          value={values.password}
          onChange={(e) => updateField('password', e.target.value)}
          error={errors.password}
        />

        <div className="auth-form__actions">
          <Button type="submit" variant="primary" block loading={register.isPending}>
            Create account
          </Button>
        </div>
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </motion.section>
  );
}
